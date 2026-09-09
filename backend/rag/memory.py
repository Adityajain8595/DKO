
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from pydantic import SecretStr

from backend.config import fast_model, groq_key
from backend.schemas import FarmerProfile, UserTurn
from backend.utils import extract_text

fast_chat = ChatGroq(model=fast_model, api_key=SecretStr(groq_key) if groq_key else None, temperature=0.0)

def is_contextual_query(q: str) -> bool:
    q_lower = q.lower()
    context_tokens = {
        "it", "its", "this", "that", "these", "those", "they", "them", "their",
        "there", "here", "same", "also", "again", "above", "mentioned", "earlier",
        "previous"
    }
    words = set(q_lower.replace("?", " ").replace(".", " ").replace(",", " ").split())
    return bool(words & context_tokens) or len(words) < 5

def rewrite_query(
    raw_query: str,
    history: list[UserTurn] | None = None,
    profile: FarmerProfile | None = None,
    has_image: bool = False
) -> str:
    # Strictly do NOT rewrite on first turn or when history is empty
    if not history or len(history) < 1:
        return raw_query

    # If the user asks a completely self-contained query with ample detail, bypass LLM rewrite
    if not is_contextual_query(raw_query) and len(raw_query.split()) >= 6:
        return raw_query

    # Maintain up to 10 conversational turns
    recent_history = history[-10:]
    ctx_lines = []
    if profile:
        ctx_lines.append(f"Farmer: {profile.name}, {profile.district}, {profile.state}, Crops: {profile.crops}, Land: {profile.land}")
    for t in recent_history:
        ctx_lines.append(f"{t.role}: {t.content}")

    if not ctx_lines:
        return raw_query

    if has_image:
        # When an image is attached, only resolve location/person references.
        # Do NOT inject crop names from prior history — the actual crop is visible in the image.
        sys_text = (
            "You are a conversational query resolver for Indian agriculture. "
            "The user has attached a photograph for visual diagnosis. "
            "Rewrite the question as standalone by substituting only the farmer's name, location, or general reference words "
            "('there', 'here') with explicit values from the context. "
            "Do NOT add or assume a specific crop name — the crop will be identified from the photograph. "
            "Output ONLY the rewritten question in English, no explanations."
        )
    else:
        sys_text = (
            "You are an expert conversational query contextualizer for Indian agriculture. "
            "Rewrite the user's latest follow-up question into a standalone, explicit search query in English by substituting all pronouns and references "
            "('it', 'this', 'its', 'these', 'those', 'there') with the explicit crop, disease/pest, or location from the provided conversation context. "
            "Output ONLY the final rewritten question text in English without explanations or quotes."
        )

    user_text = "Context:\n" + "\n".join(ctx_lines) + f"\n\nLatest Question to rewrite: {raw_query}"

    try:
        msgs = [
            SystemMessage(content=sys_text),
            HumanMessage(content=user_text)
        ]
        res = fast_chat.invoke(msgs)
        clean_ans = extract_text(res.content).strip()
        return clean_ans if clean_ans else raw_query
    except Exception:  # noqa: BLE001
        return raw_query
