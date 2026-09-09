import re

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from pydantic import SecretStr

from backend.config import fast_model, groq_key
from backend.schemas import FarmerProfile
from backend.utils import extract_text

fast_chat = ChatGroq(model=fast_model, api_key=SecretStr(groq_key) if groq_key else None, temperature=0.0)

# Central Insecticides Board & Registration Committee (CIBRC) Statutory Registry of Banned / Severely Restricted Chemicals
# Mapped to statutory ban status & approved biological / safe CIBRC alternatives
BANNED_PESTICIDES: dict[str, str] = {
    "endosulfan": "Neem seed kernel extract (NSKE 5%) or Bacillus thuringiensis",
    "monocrotophos": "Azadirachtin 10,000 ppm or Acephate 75% SP (for approved non-vegetable crops)",
    "ddt": "Biological pest management or pheromone traps",
    "aldrin": "Chlorantraniliprole 18.5% SC or Trichoderma harzianum",
    "dieldrin": "Bio-nematicides or soil solarization",
    "chlordane": "Beauveria bassiana or Metarhizium anisopliae",
    "heptachlor": "Trichoderma viride bio-fungicide / certified seed treatment",
    "lindane": "Neem oil formulation (1500 ppm) or Spinosad 45% SC",
    "methyl parathion": "Emamectin benzoate 5% SG or NSKE 5%",
    "diazinon": "Cartap hydrochloride 50% SP or bio-agent release",
    "phosphamidon": "Imidacloprid 17.8% SL or Neem oil 1500 ppm",
    "paraquat": "Approved mechanical mulching / selective non-hazardous herbicides",
    "phorate": "Paecilomyces lilacinus or neem cake soil incorporation",
    "benzene hexachloride": "De-oiled neem cake soil application",
    "carbofuran": "Fipronil 0.3% GR or Trichoderma soil application",
    "chlorfenvinphos": "Chlorpyrifos 20% EC (where approved) or bio-control",
}

ALL_INDIAN_STATES: dict[str, str] = {
    "Andhra Pradesh": "AP",
    "Arunachal Pradesh": "AR",
    "Assam": "AS",
    "Bihar": "BR",
    "Chhattisgarh": "CG",
    "Goa": "GA",
    "Gujarat": "GJ",
    "Haryana": "HR",
    "Himachal Pradesh": "HP",
    "Jharkhand": "JH",
    "Karnataka": "KA",
    "Kerala": "KL",
    "Madhya Pradesh": "MP",
    "Maharashtra": "MH",
    "Manipur": "MN",
    "Meghalaya": "ML",
    "Mizoram": "MZ",
    "Nagaland": "NL",
    "Odisha": "OD",
    "Punjab": "PB",
    "Rajasthan": "RJ",
    "Sikkim": "SK",
    "Tamil Nadu": "TN",
    "Telangana": "TG",
    "Tripura": "TR",
    "Uttar Pradesh": "UP",
    "Uttarakhand": "UK",
    "West Bengal": "WB",
    "Delhi": "DL",
    "Jammu and Kashmir": "JK",
    "Ladakh": "LA",
    "Puducherry": "PY",
    "Chandigarh": "CH",
}

INDIAN_STATES: list[str] = list(ALL_INDIAN_STATES.keys())
BANNED_CHEMICAL_NAMES: list[str] = list(BANNED_PESTICIDES.keys())

def check_banned_chemicals(text: str) -> list[tuple[str, str]]:
    """Scans advisory text against statutory CIBRC banned chemicals dictionary."""
    lowered = text.lower()
    found: list[tuple[str, str]] = []
    for chemical, alternative in BANNED_PESTICIDES.items():
        if re.search(rf"\b{re.escape(chemical)}\b", lowered):
            found.append((chemical, alternative))
    return found

def check_state_mismatch(text: str, farmer_state: str | None) -> list[str]:
    """Validates that state-specific schemes apply only to the farmer's state."""
    if not farmer_state:
        return []
    farmer_st_lower = farmer_state.strip().lower()
    mismatched: list[str] = []
    lowered = text.lower()

    for st in ALL_INDIAN_STATES:
        st_lower = st.lower()
        if st_lower == farmer_st_lower:
            continue
        pattern = rf"\b{re.escape(st_lower)}\s+(government|govt|state|scheme|yojana|subsidy|portal)\b"
        if re.search(pattern, lowered):
            mismatched.append(st)
    return mismatched

def audit_advisory(text: str, profile: FarmerProfile | None = None) -> tuple[bool, list[str]]:
    """
    Statutory Compliance & Territorial Integrity Audit:
    Returns (is_compliant, list_of_critique_flags).
    """
    if not text.strip():
        return True, []

    flags: list[str] = []
    farmer_state = profile.state if profile and profile.state else None

    # 1. Chemical safety check
    banned_hits = check_banned_chemicals(text)
    for chem, alt in banned_hits:
        flags.append(
            f"CRITICAL SAFETY HAZARD: Advisory recommends CIBRC-banned chemical '{chem}'. "
            f"Statutory mandate requires replacement with approved alternative: '{alt}'."
        )

    # 2. Territorial scheme integrity check
    state_hits = check_state_mismatch(text, farmer_state)
    for st in state_hits:
        flags.append(
            f"TERRITORY MISMATCH: Advisory references schemes from '{st}', but the farmer is registered in '{farmer_state}'."
        )

    return len(flags) == 0, flags

def correct_advisory(draft_advisory: str, profile: FarmerProfile | None, flags: list[str]) -> str:
    """
    Executes a self-correction pass using fast LLM to substitute safe alternatives
    and remove mismatched schemes while preserving verified facts.
    """
    if not flags:
        return draft_advisory

    farmer_state = profile.state if profile and profile.state else "National / General"
    critique = "\n".join(flags)

    sys_prompt = (
        "You are the Senior Agronomic Compliance & Safety Auditor for Digital Krishi Officer (DKO).\n"
        "The draft agricultural advisory requires safety or territorial adjustments:\n"
        "1. REPLACE any banned or hazardous chemical with the approved CIBRC alternative provided in the critique.\n"
        f"2. REMOVE any state schemes belonging to other states. Only retain schemes for {farmer_state} or Central schemes.\n"
        "3. Preserve all verified agronomic recommendations, dilution rates, and helpful advice.\n"
        "4. Speak directly, professionally, and naturally in English. Do not output document headers, metadata banners, or apologies.\n"
        "Output ONLY the corrected advisory."
    )
    user_prompt = (
        f"Farmer State: {farmer_state}\n"
        f"Compliance Violations to Fix:\n{critique}\n\n"
        f"Draft Advisory to Correct:\n{draft_advisory}"
    )

    try:
        msgs = [SystemMessage(content=sys_prompt), HumanMessage(content=user_prompt)]
        res = fast_chat.invoke(msgs)
        cleaned = extract_text(res.content).strip()
        return cleaned if cleaned else draft_advisory
    except Exception:  # noqa: BLE001
        return draft_advisory

def audit_and_correct(draft_advisory: str, profile: FarmerProfile | None = None) -> tuple[bool, str, list[str]]:
    """Legacy helper for backward compatibility."""
    is_valid, flags = audit_advisory(draft_advisory, profile)
    if is_valid:
        return True, draft_advisory, []
    corrected = correct_advisory(draft_advisory, profile, flags)
    return False, corrected, flags
