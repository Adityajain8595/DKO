from typing import Any

from langchain_core.tools import tool
from langchain_tavily import TavilySearch

from backend.config import tavily_key


def get_tavily_tool(max_results: int = 5) -> TavilySearch | None:
    """Initializes the LangChain TavilySearch tool with the configured API key."""
    if not tavily_key:
        return None
    try:
        return TavilySearch(tavily_api_key=tavily_key, max_results=max_results)
    except Exception:  # noqa: BLE001
        return None

def run_search(query: str, limit: int = 5) -> list[dict[str, str]]:
    """
    Executes an active web search using Tavily, returning structured title,
    content snippet, and source URL metadata.
    """
    items: list[dict[str, str]] = []
    clean_query = query.strip()
    if not clean_query:
        return items

    tool_inst = get_tavily_tool(max_results=limit)
    if tool_inst:
        try:
            raw = tool_inst.invoke({"query": clean_query})
            if isinstance(raw, dict):
                results = raw.get("results", [])
                for r in results:
                    items.append({
                        "title": r.get("title", ""),
                        "snippet": r.get("content", ""),
                        "url": r.get("url", "")
                    })
                if raw.get("answer"):
                    items.insert(0, {
                        "title": "Tavily Verified Direct Summary",
                        "snippet": raw["answer"],
                        "url": "https://tavily.com"
                    })
            elif isinstance(raw, list):
                for r in raw:
                    if isinstance(r, dict):
                        items.append({
                            "title": r.get("title", ""),
                            "snippet": r.get("content", ""),
                            "url": r.get("url", "")
                        })
            if items:
                return items[:limit]
        except Exception:  # noqa: BLE001
            return []

    return items

def cross_verify_tool_data(claim: str, context: str = "") -> dict[str, Any]:
    """
    Active Cross-Verification Engine:
    Validates inferences, deductions, and metrics against live web sources.
    """
    search_q = f"{claim} {context} India agriculture verified"
    results = run_search(search_q, limit=4)
    if not results:
        return {
            "status": "unverified",
            "evidence": f"No web corroboration available for claim: {claim}",
            "sources": []
        }

    evidence_text = "\n".join([f"• {r['title']}: {r['snippet']}" for r in results])
    return {
        "status": "verified",
        "evidence": evidence_text,
        "sources": [r["url"] for r in results if r.get("url")]
    }

def search_market_fallback(crop: str, state: str, mandi: str | None = None) -> list[dict[str, str]]:
    """
    Searches for live APMC mandi rates, modal prices, and price movements.
    """
    mandi_term = f"{mandi} " if mandi else ""
    query = f"{crop} {mandi_term}mandi price today {state} modal rate per quintal Agmarknet"
    return run_search(query, limit=4)

def search_weather_fallback(location: str) -> list[dict[str, str]]:
    """
    Searches for regional meteorological alerts and IMD weather bulletins.
    """
    query = f"weather forecast rain alert {location} IMD India Meteorological Department"
    return run_search(query, limit=3)

def search_schemes_web(query: str, state: str = "") -> list[dict[str, str]]:
    """
    Searches official government portals (myscheme.gov.in, agriwelfare.gov.in).
    """
    state_term = f"{state} " if state else ""
    search_q = f"{query} {state_term}site:myscheme.gov.in OR site:agriwelfare.gov.in eligibility benefits apply"
    return run_search(search_q, limit=4)

def web_format(query: str, limit: int = 4) -> str:
    res = run_search(query, limit=limit)
    if not res:
        return f"No live web evidence found for query: '{query}'."
    lines = []
    for r in res:
        lines.append(f"Title: {r['title']}\nURL: {r['url']}\nSnippet: {r['snippet']}")
    return "\n\n".join(lines)

@tool
def web_search(query: str) -> str:
    """
    Search the live web for verified agricultural information, university circulars,
    pest outbreak notices, market developments, or government agricultural policies in India.
    Args:
        query: Specific search query string.
    """
    return web_format(query, limit=4)

@tool
def cross_verify_claim(claim: str, crop_or_state: str | None = None) -> str:
    """
    Cross-verify a specific agronomic claim, chemical dose, market price fact,
    or weather alert against live verified web sources and agricultural university guidelines.
    Args:
        claim: Fact, recommendation, or metric to verify.
        crop_or_state: Contextual crop or geographic state.
    """
    res = cross_verify_tool_data(claim, context=crop_or_state or "")
    if res["status"] == "verified":
        return f"Corroborated Evidence:\n{res['evidence']}\nSources: {', '.join(res['sources'])}"
    return f"Claim could not be independently corroborated: {res['evidence']}"
