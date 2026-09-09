import json
import time

from langchain_core.tools import tool

from backend.rag.retriever import run_retrieval
from backend.schemas import FarmerProfile
from backend.tools.market import run_market
from backend.tools.schemes import run_schemes
from backend.tools.vision import get_active_specimen_image, run_vision
from backend.tools.weather import run_weather
from backend.tools.web import cross_verify_tool_data, run_search


class VirtualFS:
    """
    Virtual Filesystem Backend for LangChain Deep Agents.
    Offloads heavy tool payloads (raw weather telemetry, APMC arrival tables,
    disease vision reports, scheme dossiers) from the prompt context to virtual files.
    """
    def __init__(self) -> None:
        self._files: dict[str, str] = {}
        self._timestamps: dict[str, float] = {}

    def write(self, filename: str, content: str) -> str:
        self._files[filename] = content
        self._timestamps[filename] = time.time()
        return f"Saved '{filename}' to VirtualFS ({len(content)} chars)."

    def read(self, filename: str) -> str:
        if filename in self._files:
            return self._files[filename]
        avail = ", ".join(self._files.keys()) if self._files else "none"
        return f"File '{filename}' not found in VirtualFS. Available files: [{avail}]"

    def list_files(self) -> list[str]:
        return list(self._files.keys())

    def clear(self) -> None:
        self._files.clear()
        self._timestamps.clear()

virtual_fs = VirtualFS()

# -------------------------------------------------------------------------
# Specialized Subagent Execution Handlers
# -------------------------------------------------------------------------

@tool
def call_market_subagent(commodity: str, state: str, district: str | None = None) -> str:
    """
    Spawns the Market Analyst Subagent.
    Fetches real-time APMC Mandi commodity arrivals, modal rates (Rs/quintal), price trading bands,
    and commercial marketing guidance. Offloads full arrival records to VirtualFS.
    """
    prof = FarmerProfile(state=state, district=district) if district else FarmerProfile(state=state)
    res = run_market(crop=commodity, state=state, profile=prof)

    # Offload raw market arrival records to VirtualFS
    raw_payload = json.dumps({
        "commodity": res.crop,
        "state": res.state,
        "modal": res.modal,
        "band": res.band,
        "trend": res.trend,
        "advice": res.advice,
        "sources": res.sources,
        "items": [it.model_dump() for it in res.items]
    }, indent=2, ensure_ascii=False)
    virtual_fs.write("mandi_rates.json", raw_payload)

    mandi_list = [f"{it.mandi}: ₹{it.modalPrice:.0f}/q ({it.minPrice:.0f}-{it.maxPrice:.0f})" for it in res.items[:4]]
    mandis_str = ", ".join(mandi_list) if mandi_list else "No individual yard records"

    return (
        f"Market Analyst Subagent Report for {commodity} in {state}:\n"
        f"• Modal Trading Rate: {res.modal}\n"
        f"• Price Range: {res.band} (Trend: {res.trend})\n"
        f"• Commercial Advice: {res.advice}\n"
        f"• Active Mandis: {mandis_str}\n"
        f"• Sources: {', '.join(res.sources[:3])}\n"
        f"[Context offloaded to VirtualFS: 'mandi_rates.json']"
    )

@tool
def call_climate_subagent(location: str, crops: str | None = None) -> str:
    """
    Spawns the Climate Specialist Subagent.
    Retrieves live hyperlocal meteorological telemetry (rain probability, wind velocity, temperature,
    humidity, UV, AQI) and evaluates chemical spraying window safety. Offloads telemetry to VirtualFS.
    """
    prof = FarmerProfile(district=location, crops=crops) if crops else FarmerProfile(district=location)
    res = run_weather(place=location, profile=prof)

    # Offload hourly and 7-day forecast telemetry to VirtualFS
    raw_payload = json.dumps({
        "location": location,
        "temp": res.temp,
        "humidity": res.humidity,
        "wind": res.wind,
        "rain": res.rain,
        "uv_index": res.uv_index,
        "aqi": res.air_quality_index,
        "aqi_desc": res.air_quality_desc,
        "spray": res.spray,
        "advice": res.advice,
        "daily": [d.model_dump() for d in res.daily]
    }, indent=2, ensure_ascii=False)
    virtual_fs.write("weather_telemetry.json", raw_payload)

    temp_str = f"{res.temp}°C" if res.temp is not None else "N/A"
    rain_str = f"{res.rain}%" if res.rain is not None else "N/A"
    wind_str = f"{res.wind} km/h" if res.wind is not None else "N/A"

    return (
        f"Climate Specialist Subagent Report for {location}:\n"
        f"• Temperature: {temp_str} | Rain Risk: {rain_str} | Wind: {wind_str} | Humidity: {res.humidity}%\n"
        f"• Spray Window Safety: {res.spray}\n"
        f"• Agronomic Advice: {res.advice}\n"
        f"[Context offloaded to VirtualFS: 'weather_telemetry.json']"
    )

@tool
def call_agronomy_subagent(crop_name: str | None = None, image_b64: str | None = None, query: str = "") -> str:
    """
    Spawns the Agronomist & Vision Subagent.
    Analyzes crop specimen photographs for pests/pathogens using optical AI and queries the ICAR
    scientific agronomy knowledge base for IPM and approved treatments. Offloads diagnosis to VirtualFS.
    """
    c_name = crop_name or "Standing Crop"
    findings: list[str] = []

    active_img = image_b64 or get_active_specimen_image()
    if active_img:
        vis_res = run_vision(active_img, crop_name=c_name)
        findings.append(f"Visual Pathology Diagnosis: {vis_res.finding}")
        findings.append(f"Pathogen: {vis_res.pathogen}")
        findings.append(f"Symptoms: {vis_res.symptoms}")
        findings.append(f"IPM & Cultural Care: {vis_res.ipm}")
        if vis_res.chemical and vis_res.chemical != "N/A":
            findings.append(f"Statutory Chemical Control: {vis_res.chemical}")

        virtual_fs.write("leaf_diagnosis.txt", json.dumps(vis_res.model_dump(), indent=2, ensure_ascii=False))

    search_q = query or (f"{c_name} pest disease management" if not image_b64 else f"{c_name} IPM advisory")
    try:
        icar_docs = run_retrieval(search_q, top_k=2)
        if icar_docs:
            ext_lines = [f"• {d.get('title', 'ICAR Standard')}: {d.get('text', '')[:160]}..." for d in icar_docs]
            findings.append("ICAR Scientific Extension Protocols:\n" + "\n".join(ext_lines))
            virtual_fs.write("icar_protocols.json", json.dumps(icar_docs, indent=2, ensure_ascii=False))
    except Exception:  # noqa: BLE001, S110
        pass

    if not findings:
        return f"Agronomist Subagent: No diagnostic symptoms found for {c_name}. Standing crop appears healthy."

    summary = "\n".join(findings)
    return (
        f"Agronomist & Vision Subagent Dossier for {c_name}:\n"
        f"{summary}\n"
        f"[Context offloaded to VirtualFS: 'leaf_diagnosis.txt' and 'icar_protocols.json']"
    )

@tool
def call_schemes_subagent(query: str, state: str | None = None, crop: str | None = None) -> str:
    """
    Spawns the Policy & Schemes Subagent.
    Dedicated scraper and auditor for Central & State Government agricultural welfare programs
    (PM-KISAN, PMFBY, KCC, Solar Subsidies). Enforces territorial state matching. Offloads dossier to VirtualFS.
    """
    prof = FarmerProfile(state=state, crops=crop) if state or crop else None
    res = run_schemes(query=query, state=state, profile=prof)

    raw_payload = json.dumps(res.model_dump(), indent=2, ensure_ascii=False)
    virtual_fs.write("schemes_dossier.json", raw_payload)

    docs_str = ", ".join(res.documents[:4]) if res.documents else "Aadhaar, Land Records, Bank Passbook"

    return (
        f"Policy & Schemes Subagent Audit ({res.name}):\n"
        f"• Ministry: {res.ministry}\n"
        f"• Benefits & Subsidies: {res.benefits}\n"
        f"• Eligibility Criteria: {res.eligibility}\n"
        f"• Mandatory Documents: {docs_str}\n"
        f"• Application Procedure: {res.steps}\n"
        f"• Official Portals: {', '.join(res.links[:3])}\n"
        f"[Context offloaded to VirtualFS: 'schemes_dossier.json']"
    )

@tool
def call_web_subagent(query: str, claim_to_verify: str | None = None) -> str:
    """
    Spawns the Web Intelligence & Cross-Verification Subagent.
    Searches active live agricultural web circulars and cross-verifies disputed facts against official portals.
    Offloads search intelligence to VirtualFS.
    """
    findings: list[str] = []

    if claim_to_verify:
        v_res = cross_verify_tool_data(claim_to_verify, context=query)
        findings.append(f"Fact Verification Result: {v_res.get('status', 'VERIFIED')}")
        findings.append(f"Notes: {v_res.get('notes', '')}")
        sources = v_res.get("sources", [])
        if sources:
            findings.append(f"Sources: {', '.join(sources[:3])}")
    else:
        hits = run_search(query, limit=3)
        if hits:
            lines = [f"• {h.get('title')}: {(h.get('snippet') or '')[:150]} ({h.get('url')})" for h in hits]
            findings.append("Live Web Search Circulars:\n" + "\n".join(lines))
        else:
            findings.append("No live breaking circulars found matching query.")

    virtual_fs.write("web_intelligence.json", json.dumps({"query": query, "findings": findings}, indent=2, ensure_ascii=False))

    return (
        "Web Intelligence & Cross-Verification Subagent Report:\n"
        + "\n".join(findings)
        + "\n[Context offloaded to VirtualFS: 'web_intelligence.json']"
    )

@tool
def read_virtual_file(file_name: str) -> str:
    """
    Reads an offloaded context file from the Deep Agents Virtual Filesystem.
    Use this to inspect deep data (e.g. 'leaf_diagnosis.txt', 'weather_telemetry.json', 'mandi_rates.json', 'schemes_dossier.json').
    """
    return virtual_fs.read(file_name)

@tool
def write_todos(todo_items: list[str]) -> str:
    """
    Formulates or updates the dynamic multi-step To-Do plan for addressing a complex farmer inquiry.
    Allows the Deep Agent to track completed steps and adapt its plan sequentially.
    """
    plan_lines = "\n".join(f"{i+1}. [ ] {item}" for i, item in enumerate(todo_items))
    virtual_fs.write("todo_plan.txt", plan_lines)
    return f"Active To-Do Plan Updated:\n{plan_lines}"

DEEP_AGENT_TOOLS = [
    call_market_subagent,
    call_climate_subagent,
    call_agronomy_subagent,
    call_schemes_subagent,
    call_web_subagent,
    read_virtual_file,
    write_todos
]
