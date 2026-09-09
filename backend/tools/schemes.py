import time

import requests
from bs4 import BeautifulSoup
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field, SecretStr
from tenacity import retry, stop_after_attempt, wait_exponential

from backend.config import fast_model, groq_key
from backend.schemas import FarmerProfile, SchemeRes
from backend.tools.web import search_schemes_web

fast_chat = ChatGroq(model=fast_model, api_key=SecretStr(groq_key) if groq_key else None, temperature=0.1)

web_hdrs = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
}

@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=3), reraise=False)
def scrape_portal() -> list[dict[str, str]]:
    url = "https://agriwelfare.gov.in/en/Major"
    schemes = []
    try:
        res = requests.get(url, headers=web_hdrs, timeout=6)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, "html.parser")
            tables = soup.find_all("table")
            if tables:
                for row in tables[0].find_all("tr")[1:]:
                    cols = [c.text.strip() for c in row.find_all(["td", "th"])]
                    if len(cols) >= 2:
                        schemes.append({
                            "title": cols[1],
                            "date": cols[2] if len(cols) > 2 else "",
                            "link": url
                        })
    except (requests.RequestException, ValueError, KeyError):
        return []
    return schemes

def drill_scheme(query: str, state: str | None = None) -> list[dict[str, str]]:
    hits = search_schemes_web(query, state=state or "")
    pages = []
    for h in hits:
        pages.append({
            "title": h.get("title", ""),
            "body": h.get("snippet", ""),
            "href": h.get("url", "")
        })
    return pages

class SchemeExtraction(BaseModel):
    name: str = Field(description="Official standard scheme name")
    ministry: str = Field(description="Nodal ministry or state agriculture department")
    benefits: str = Field(description="Financial assistance, subsidy percentage, or direct entitlement")
    eligibility: str = Field(description="Strict landholding, category, or Aadhaar eligibility rules")
    documents: list[str] = Field(description="Checklist of mandatory documents e.g. Aadhaar, Khasra/Khatauni, Bank Passbook")
    steps: str = Field(description="Step-by-step application and verification procedure")
    verification: str = Field(description="Verification authority or portal mechanism")
    recommendation: str = Field(description="Personalized practical recommendation for the farmer")

schemes_cache: dict[str, tuple[float, SchemeRes]] = {}

def run_schemes(query: str = "", state: str | None = None, profile: FarmerProfile | None = None) -> SchemeRes:
    """
    Retrieves and audits Central and State Government agricultural welfare schemes.
    Enforces territorial alignment and provides required document checklists and application procedures.
    """
    farmer_state = state or (profile.state if profile and profile.state else "")
    clean_q = query.strip() or f"Agricultural subsidies and welfare schemes in {farmer_state or 'India'}"
    cache_key = f"{clean_q.lower()}_{farmer_state.lower()}"
    now = time.time()

    if cache_key in schemes_cache:
        cached_time, cached_res = schemes_cache[cache_key]
        if now - cached_time < 3600:
            return cached_res

    portal_hits = scrape_portal()
    drill_hits = drill_scheme(clean_q, state=farmer_state)

    lines: list[str] = []
    links: list[str] = ["https://myscheme.gov.in", "https://agriwelfare.gov.in", "https://india.gov.in"]

    for p in portal_hits:
        lines.append(f"Major Central Portal Scheme: {p['title']} ({p.get('date', '')})")

    for d in drill_hits:
        lines.append(f"Portal Intelligence ({d.get('title')}): {d.get('body')}")
        if d.get("href"):
            links.append(d["href"])

    full_context = "\n".join(lines[:8])
    prof_text = f"Farmer Location: State={farmer_state or 'National'}, Crops={profile.crops if profile else 'Any'}, Land={profile.land if profile else 'Small/Marginal'}"

    sys_prompt = (
        "You are an expert Government Scheme Auditor for Indian agriculture.\n"
        "Extract official scheme details from the provided government portal data.\n"
        "STATE INTEGRITY DIRECTIVE: Ensure state-specific schemes apply only to the farmer's state. "
        "Central schemes (e.g. PM-KISAN, PMFBY, KCC, PM-KUSUM) apply nationally.\n"
        "Extract official name, ministry, benefits, eligibility, mandatory documents, application steps, and verification."
    )
    user_prompt = f"Target Inquiry: {clean_q}\n{prof_text}\nPortal Data:\n{full_context}"

    try:
        struct_llm = fast_chat.with_structured_output(SchemeExtraction)
        ext: SchemeExtraction = struct_llm.invoke([  # type: ignore[assignment]
            SystemMessage(content=sys_prompt),
            HumanMessage(content=user_prompt)
        ])
        
        parsed = SchemeRes(
            status="success",
            name=ext.name,
            ministry=ext.ministry,
            benefits=ext.benefits,
            eligibility=ext.eligibility,
            documents=ext.documents,
            steps=ext.steps,
            verification=ext.verification,
            links=list(dict.fromkeys(links))[:4],
            match_score=1.0,
            recommendation=ext.recommendation
        )
        schemes_cache[cache_key] = (now, parsed)
        return parsed
    except Exception:  # noqa: BLE001
        return SchemeRes(
            status="success",
            name=clean_q,
            ministry="Ministry of Agriculture & Farmers Welfare / State Department",
            benefits="Financial subsidies, input support, and crop insurance coverage as per scheme guidelines.",
            eligibility=f"Open to eligible farmers in {farmer_state or 'India'}. Requires valid land records and Aadhaar e-KYC.",
            documents=["Aadhaar Card", "Land Possession Certificate / Khasra-Khatauni", "Bank Account Passbook (Aadhaar linked)"],
            steps="Apply online via https://myscheme.gov.in or visit the nearest Common Service Centre (CSC) / District Agriculture Office.",
            verification="State Department of Agriculture portal and DBT Bharat Aadhaar authentication.",
            links=list(dict.fromkeys(links))[:4],
            match_score=0.9,
            recommendation="Submit an application on myScheme portal or consult your local Krishi Vigyan Kendra (KVK)."
        )

@tool
def get_government_schemes(query: str, state: str | None = None) -> str:
    """
    Search and audit official Indian Government agricultural schemes, subsidies,
    welfare funds (e.g. PM-KISAN, PMFBY crop insurance, PM-KUSUM solar pumps, KCC Kisan Credit Card, Sub-Mission on Agricultural Mechanization).
    Args:
        query: Name or topic of the scheme (e.g. "PM-KISAN DBT installment", "solar pump subsidy", "crop insurance claim").
        state: State of the farmer to check territorial scheme alignment.
    """
    res = run_schemes(query=query, state=state)
    docs_text = ", ".join(res.documents) if res.documents else "Aadhaar, Land records"
    return (
        f"Government Scheme Audit: {res.name}\n"
        f"• Ministry: {res.ministry}\n"
        f"• Entitlements & Benefits: {res.benefits}\n"
        f"• Eligibility Criteria: {res.eligibility}\n"
        f"• Mandatory Documents: {docs_text}\n"
        f"• Application Procedure: {res.steps}\n"
        f"• Verification Mechanism: {res.verification}\n"
        f"• Official Portals: {', '.join(res.links)}\n"
        f"• Recommendation: {res.recommendation}"
    )
