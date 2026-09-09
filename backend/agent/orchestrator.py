import re
from collections.abc import Generator
from typing import Annotated, Any
from typing_extensions import TypedDict

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from pydantic import SecretStr

from backend.agent.rubric import audit_advisory
from backend.agent.subagents import DEEP_AGENT_TOOLS
from backend.config import fast_model, groq_key, reason_model
from backend.rag.memory import rewrite_query
from backend.rag.retriever import query_icar_knowledge
from backend.schemas import ChatReq, ChatRes, FarmerProfile, TraceItem
from backend.tools.market import get_mandi_prices
from backend.tools.schemes import get_government_schemes
from backend.tools.vision import diagnose_crop_specimen, set_active_specimen_image, reset_active_specimen_image
from backend.tools.weather import get_weather_telemetry
from backend.tools.web import cross_verify_claim, web_search
from backend.utils import extract_text

# Subagent delegation and agricultural tools available to the Agri-Orchestrator
AGRI_TOOLS = [
    *DEEP_AGENT_TOOLS,
    get_weather_telemetry,
    get_mandi_prices,
    get_government_schemes,
    query_icar_knowledge,
    web_search,
    cross_verify_claim,
    diagnose_crop_specimen
]

# Models
reason_chat = ChatGroq(model=reason_model, api_key=SecretStr(groq_key) if groq_key else None, temperature=0.1)
fast_chat = ChatGroq(model=fast_model, api_key=SecretStr(groq_key) if groq_key else None, temperature=0.0)

# Bind tools natively to the deep reasoning supervisor
model_with_tools = reason_chat.bind_tools(AGRI_TOOLS)

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    raw_query: str
    rewritten_query: str | None
    image: str | None
    profile: FarmerProfile | None
    sources: list[str]
    traces: list[TraceItem]
    audit_flags: list[str]
    iteration_count: int
    final_response: str

def preprocess_node(state: AgentState) -> dict[str, Any]:
    """
    Context Alignment & Preprocessing Node:
    Prepares conversation context, resolves contextual pronouns, and sets up
    the system prompt and user inquiry.
    """
    profile = state.get("profile")
    query = state.get("rewritten_query") or state["raw_query"]
    image = state.get("image")

    prof_bits = []
    if profile:
        if profile.name:
            prof_bits.append(f"Name: {profile.name}")
        if profile.district or profile.state:
            prof_bits.append(f"Location: {profile.district or ''}, {profile.state or ''}")
        if profile.crops:
            prof_bits.append(f"Registered Crops: {profile.crops}")
        if profile.land:
            prof_bits.append(f"Landholding: {profile.land}")
    prof_text = " | ".join(prof_bits) if prof_bits else "General Indian Farmer"

    system_prompt = (
        "You are Digital Krishi Officer (DKO), an expert, practical, and trusted agricultural advisor speaking directly to an Indian farmer in clear, natural English.\n\n"
        "CRITICAL COMMUNICATION DIRECTIVES:\n"
        "1. CLEAR-CUT, SHORT & NATURAL: Keep your responses concise, direct, and conversational (typically 2 to 4 focused paragraphs or clean bullet points). Never write long, bloated, multi-page essays.\n"
        "2. STRICTLY RELEVANT TO INQUIRY: Address ONLY what the farmer asked. If the inquiry is about a government scheme or DBT, explain only the scheme, eligibility, documents, and procedure. NEVER dump unrequested weather forecasts, crop fertilizer formulas, spray schedules, or mandi rates unless the farmer specifically asked for them.\n"
        "3. NO ROBOTIC HEADERS OR CHECKLISTS: Start immediately with the direct answer on the first line. Do NOT output robotic numbered emoji headings, unrequested Markdown tables, or cheerleading sign-offs. Speak naturally like an experienced agricultural officer.\n"
        "4. AUTONOMOUS TOOL DISPATCH: Only invoke tools directly pertinent to the inquiry:\n"
        "   - `get_government_schemes`: For Central/State subsidy policies, PM-KISAN, PMFBY, KCC, eligibility, and procedures.\n"
        "   - `get_weather_telemetry`: ONLY when asked about weather, rain, humidity, or spray timing.\n"
        "   - `get_mandi_prices`: ONLY when asked about mandi prices, APMC market arrivals, or selling.\n"
        "   - `query_icar_knowledge`: ONLY when asked about scientific crop agronomy, pest/disease management, or IPM.\n"
        "   - `diagnose_crop_specimen`: ONLY when [IMAGE UPLOADED] is present in the farmer context below.\n"
        "   - `web_search`: ONLY for live breaking circulars or real-time verification.\n"
        "5. STATUTORY SAFETY & TERRITORY: Recommend only approved CIBRC chemicals with precise safe dilutions; never suggest banned pesticides (e.g. Endosulfan, Monocrotophos). Ensure state-specific schemes match the farmer's registered state."
    )

    user_content = f"Farmer Profile: [{prof_text}]\nFarmer Inquiry: {query}"
    if image:
        user_content += "\n[IMAGE UPLOADED] Crop specimen photograph is attached and ready for optical pathology diagnosis."
    else:
        user_content += "\n[NO IMAGE] No photograph uploaded. Do NOT call diagnose_crop_specimen."

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_content)
    ]

    return {"messages": messages}

def agent_reasoner_node(state: AgentState) -> dict[str, Any]:
    """
    Autonomous Deep Reasoning Agent Node:
    Invokes the reasoning LLM with bound tools. The model decides whether
    to call one or more tools or produce the final response.
    """
    messages = state["messages"]
    response = model_with_tools.invoke(messages)
    return {"messages": [response]}

def trace_collector_node(state: AgentState) -> dict[str, Any]:
    """
    Trace & Source Collector Node:
    Monitors tool messages from the state, builds UI trace records,
    and collects source citations.
    """
    messages = state.get("messages", [])
    traces = list(state.get("traces", []))
    sources = list(state.get("sources", []))

    for i in range(len(messages) - 1, -1, -1):
        msg = messages[i]
        if isinstance(msg, ToolMessage):
            tool_name = msg.name or "Agri Tool"
            content = str(msg.content)
            urls = re.findall(r"https?://[^\s,\)]+", content)
            sources.extend(urls)
            if "Agmarknet" in content and "Agmarknet APMC Portal" not in sources:
                sources.append("Agmarknet APMC Portal")
            if "Open-Meteo" in content and "Open-Meteo Hyperlocal Telemetry" not in sources:
                sources.append("Open-Meteo Hyperlocal Telemetry")
            if "ICAR" in content and "ICAR Scientific Agronomy Knowledgebase" not in sources:
                sources.append("ICAR Scientific Agronomy Knowledgebase")

            if not any(t.tool == tool_name for t in traces):
                traces.append(TraceItem(tool=tool_name, input="Executed via Agent", output=content))
        elif isinstance(msg, AIMessage) and not msg.tool_calls:
            break

    return {"traces": traces, "sources": list(dict.fromkeys(sources))}

def compliance_rubric_node(state: AgentState) -> dict[str, Any]:
    """
    CIBRC Safety & Territorial Compliance Guardrails Node:
    Audits the agent's drafted advisory against statutory pesticide registries
    and state boundaries. If non-compliant, attaches a critique for self-correction.
    """
    messages = state.get("messages", [])
    last_msg = messages[-1] if messages else None
    draft_text = extract_text(last_msg.content).strip() if isinstance(last_msg, AIMessage) else ""
    profile = state.get("profile")

    is_compliant, flags = audit_advisory(draft_text, profile)
    iteration_count = state.get("iteration_count", 0)

    traces = list(state.get("traces", []))
    if flags:
        traces.append(TraceItem(
            tool="Compliance Audit",
            input={"status": "flags_detected"},
            output=f"Safety critique: {'; '.join(flags)}"
        ))
    else:
        traces.append(TraceItem(
            tool="Compliance Audit",
            input={"status": "verified"},
            output="Statutory safety verified: 0 banned chemicals detected, territorial alignment confirmed."
        ))

    if not is_compliant and iteration_count < 1:
        critique_msg = (
            f"STATUTORY COMPLIANCE CORRECTION REQUIRED:\n"
            f"The advisory draft contains regulatory issues: {'; '.join(flags)}\n"
            f"Revise the response immediately: replace non-approved recommendations with approved CIBRC biological or chemical alternatives, or align schemes to {profile.state if profile else 'farmer state'}."
        )
        return {
            "messages": [HumanMessage(content=critique_msg)],
            "audit_flags": flags,
            "iteration_count": iteration_count + 1,
            "traces": traces
        }

    return {
        "final_response": draft_text,
        "audit_flags": flags,
        "traces": traces
    }

def should_continue(state: AgentState) -> str:
    """Determines whether the agent needs to execute more tools or proceed to compliance."""
    messages = state.get("messages", [])
    if not messages:
        return "compliance"
    last_message = messages[-1]
    if isinstance(last_message, AIMessage) and last_message.tool_calls:
        return "tools"
    return "compliance"

def check_compliance_outcome(state: AgentState) -> str:
    """Routes to end if compliant or max iterations reached, otherwise self-corrects."""
    flags = state.get("audit_flags", [])
    iteration_count = state.get("iteration_count", 0)
    if flags and iteration_count == 1:
        return "agent"
    return END

def compile_orchestrator_graph():
    """Constructs the stateful LangGraph execution pipeline."""
    workflow = StateGraph(AgentState)  # type: ignore[reportArgumentType]

    workflow.add_node("preprocess", preprocess_node)
    workflow.add_node("agent", agent_reasoner_node)
    workflow.add_node("tools", ToolNode(AGRI_TOOLS))
    workflow.add_node("trace_collector", trace_collector_node)
    workflow.add_node("compliance", compliance_rubric_node)

    workflow.add_edge(START, "preprocess")
    workflow.add_edge("preprocess", "agent")

    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "tools",
            "compliance": "compliance"
        }
    )

    workflow.add_edge("tools", "trace_collector")
    workflow.add_edge("trace_collector", "agent")

    workflow.add_conditional_edges(
        "compliance",
        check_compliance_outcome,
        {
            "agent": "agent",
            END: END
        }
    )

    return workflow.compile()

# Global compiled orchestrator graph instance
orchestrator_graph = compile_orchestrator_graph()

def generate_session_title(query: str) -> str:
    """Generates a concise 3-4 word title for the session."""
    sys_prompt = "Generate a concise session title in MAXIMUM 4 WORDS describing this agronomic inquiry. Return strictly the title text, no quotes."
    try:
        res = fast_chat.invoke([SystemMessage(content=sys_prompt), HumanMessage(content=query[:150])])
        raw = extract_text(res.content).strip().strip('"').strip("'")
        words = raw.split()
        return " ".join(words[:4]) if words else "Crop Advisory"
    except Exception:  # noqa: BLE001
        return "Crop Advisory"

def run_agent(req: ChatReq) -> ChatRes:
    """Synchronous execution of the LangGraph agentic RAG orchestrator."""
    raw_query = req.get_query()
    rewritten = None
    if req.history and len(req.history) > 0:
        rewritten = rewrite_query(raw_query, history=req.history, profile=req.profile, has_image=bool(req.image))

    initial_state: AgentState = {
        "messages": [],
        "raw_query": raw_query,
        "rewritten_query": rewritten if rewritten != raw_query else None,
        "image": req.image,
        "profile": req.profile,
        "sources": [],
        "traces": [],
        "audit_flags": [],
        "iteration_count": 0,
        "final_response": ""
    }

    img_token = set_active_specimen_image(req.image)
    try:
        result = orchestrator_graph.invoke(initial_state)
    finally:
        reset_active_specimen_image(img_token)

    is_first_turn = not req.history or len(req.history) == 0
    session_title = generate_session_title(raw_query) if is_first_turn else None

    final_text = result.get("final_response", "")
    if not final_text:
        for msg in reversed(result.get("messages", [])):
            if isinstance(msg, AIMessage) and msg.content:
                final_text = extract_text(msg.content).strip()
                break

    return ChatRes(
        status="success",
        response=final_text or "Advisory synthesized successfully.",
        session_title=session_title,
        rewritten_query=rewritten if rewritten != raw_query else None,
        traces=result.get("traces", []),
        sources=result.get("sources", [])
    )

def stream_agent(req: ChatReq) -> Generator[dict[str, Any], None, None]:
    """Streaming execution of the LangGraph agentic RAG orchestrator emitting Server-Sent Events."""
    raw_query = req.get_query()
    clean_snip = raw_query.replace("\n", " ")
    prof_name = req.profile.name if req.profile and req.profile.name else "Farmer"
    prof_loc = f"{req.profile.district}, {req.profile.state}" if req.profile and req.profile.district and req.profile.state else "India"

    is_first_turn = not req.history or len(req.history) == 0
    session_title = None
    if is_first_turn:
        session_title = generate_session_title(raw_query)
        yield {
            "type": "title",
            "title": session_title
        }

    yield {
        "type": "thought",
        "content": f"Cognitive Analysis: Evaluating inquiry \"{clean_snip}\" for {prof_name} in {prof_loc}."
    }

    rewritten = None
    if req.history and len(req.history) > 0:
        yield {
            "type": "thought",
            "content": "Conversation Memory: Cross-referencing conversation history to resolve contextual crop and field references."
        }
        rewritten = rewrite_query(raw_query, history=req.history, profile=req.profile, has_image=bool(req.image))

    initial_state: AgentState = {
        "messages": [],
        "raw_query": raw_query,
        "rewritten_query": rewritten if rewritten != raw_query else None,
        "image": req.image,
        "profile": req.profile,
        "sources": [],
        "traces": [],
        "audit_flags": [],
        "iteration_count": 0,
        "final_response": ""
    }

    executed_tool_calls = set()
    img_token = set_active_specimen_image(req.image)

    try:
        for chunk in orchestrator_graph.stream(initial_state, stream_mode="updates"):
            if not isinstance(chunk, dict):
                continue

            for node_name, node_output in chunk.items():
                if not isinstance(node_output, dict):
                    continue

                for k, v in node_output.items():
                    if k == "messages":
                        initial_state["messages"].extend(v)
                    else:
                        initial_state[k] = v  # type: ignore[literal-required]

                if node_name == "agent":
                    latest_msgs = node_output.get("messages", [])
                    if latest_msgs and isinstance(latest_msgs[-1], AIMessage):
                        ai_msg = latest_msgs[-1]
                        if ai_msg.tool_calls:
                            for tc in ai_msg.tool_calls:
                                tc_id = tc.get("id", tc.get("name"))
                                if tc_id not in executed_tool_calls:
                                    executed_tool_calls.add(tc_id)
                                    tool_display = tc.get("name", "Tool").replace("_", " ").title()
                                    args_str = ", ".join(f"{k}={v}" for k, v in tc.get("args", {}).items())
                                    yield {
                                        "type": "thought",
                                        "content": f"Autonomous Action: Dispatched {tool_display} ({args_str})."
                                    }

                elif node_name == "tools":
                    latest_msgs = node_output.get("messages", [])
                    for m in latest_msgs:
                        if isinstance(m, ToolMessage):
                            t_name = (m.name or "Tool").replace("_", " ").title()
                            yield {
                                "type": "thought",
                                "content": f"{t_name} Telemetry: {m.content}"
                            }

                elif node_name == "compliance":
                    flags = node_output.get("audit_flags", [])
                    if flags:
                        yield {
                            "type": "thought",
                            "content": "Regulatory Audit: Flagged chemical safety or territorial adjustment. Executing self-correction pass."
                        }
                    else:
                        yield {
                            "type": "thought",
                            "content": "Compliance Verified: CIBRC statutory safety and territorial alignment approved."
                        }

        final_text = initial_state.get("final_response", "")
        if not final_text:
            for msg in reversed(initial_state.get("messages", [])):
                if isinstance(msg, AIMessage) and msg.content:
                    final_text = extract_text(msg.content).strip()
                    break

        yield {
            "type": "done",
            "response": final_text or "Advisory synthesized successfully.",
            "session_title": session_title,
            "rewritten_query": rewritten if rewritten != raw_query else None,
            "traces": [t.model_dump() for t in initial_state.get("traces", [])],
            "sources": initial_state.get("sources", [])
        }
    finally:
        reset_active_specimen_image(img_token)

