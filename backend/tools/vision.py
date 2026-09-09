import json
import os
import time
from contextvars import ContextVar
from typing import Any

from groq import Groq
from langchain_core.tools import tool
from tenacity import retry, stop_after_attempt, wait_exponential

from backend.config import cache_dir, groq_key, vision_model
from backend.rag.retriever import run_retrieval
from backend.schemas import VisionRes

_global_active_specimen_image: str | None = None
active_specimen_image: ContextVar[str | None] = ContextVar("active_specimen_image", default=None)

def set_active_specimen_image(img: str | None):
    global _global_active_specimen_image
    _global_active_specimen_image = img
    return active_specimen_image.set(img)

def reset_active_specimen_image(token):
    global _global_active_specimen_image
    _global_active_specimen_image = None
    try:
        active_specimen_image.reset(token)
    except Exception:
        pass

def get_active_specimen_image() -> str | None:
    val = active_specimen_image.get()
    if val:
        return val
    return _global_active_specimen_image

diag_store_path = os.path.join(cache_dir, "diagnoses.json")

def get_groq_client() -> Groq:
    return Groq(api_key=groq_key)

def save_diagnosis_record(crop: str, finding: str, pathogen: str, symptoms: str, ipm: str):
    """Persists diagnosis records for display on frontend dashboard cards."""
    try:
        os.makedirs(cache_dir, exist_ok=True)
        records: list[dict[str, Any]] = []
        if os.path.exists(diag_store_path):
            with open(diag_store_path, "r", encoding="utf-8") as f:
                records = json.load(f)
        new_record = {
            "id": f"diag-{int(time.time()*1000)}",
            "timestamp": time.time(),
            "crop": crop or "Crop Specimen",
            "finding": finding,
            "pathogen": pathogen,
            "symptoms": symptoms,
            "ipm": ipm,
            "severity": "critical" if any(w in finding.lower() or w in pathogen.lower() for w in ["blight", "rot", "wilt", "borer", "rust"]) else "moderate"
        }
        records.insert(0, new_record)
        with open(diag_store_path, "w", encoding="utf-8") as f:
            json.dump(records[:25], f, indent=2, ensure_ascii=False)
    except OSError:
        pass

def get_recent_diagnoses(limit: int = 10) -> list[dict[str, Any]]:
    """Retrieves history of recent diagnoses."""
    if os.path.exists(diag_store_path):
        try:
            with open(diag_store_path, "r", encoding="utf-8") as f:
                records = json.load(f)
                return records[:limit]
        except (OSError, json.JSONDecodeError):
            return []
    return []

@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=3), reraise=False)
def run_vision(image_payload: str = "", crop_name: str = "") -> VisionRes:
    """
    Multimodal Optical Crop Pathology & Pest Diagnostic Engine using qwen/qwen3.8-27b on Groq.
    Inspects specimen photo, classifies infection or insect damage, identifies biological causal agent,
    and formulates CIBRC-compliant IPM controls.
    """
    active_img = get_active_specimen_image()
    img_to_use = (image_payload or "").strip()

    # Detect placeholder/empty payload from LLM and fall back to ContextVar
    is_placeholder = (
        not img_to_use
        or "<image" in img_to_use[:60].lower()
        or "placeholder" in img_to_use[:60].lower()
        or (len(img_to_use) < 100 and not img_to_use.startswith(("http://", "https://", "data:image")))
    )
    if is_placeholder:
        img_to_use = (active_img or "").strip()

    if not img_to_use or len(img_to_use) < 30:
        return VisionRes(
            status="error",
            finding="No Image Supplied",
            pathogen="N/A",
            symptoms="No valid crop specimen photograph was received for optical pathology inspection.",
            ipm="Capture and upload a clear daylight photo of the affected plant foliage, stem, or fruit.",
            chemical="N/A",
            care="Maintain field hygiene."
        )

    # Format image_uri safely for Groq Vision API
    if img_to_use.startswith("data:image"):
        image_uri = img_to_use.replace("\r", "").replace("\n", "").strip()
    elif img_to_use.startswith(("http://", "https://")):
        image_uri = img_to_use.strip()
    elif os.path.isfile(img_to_use):
        try:
            import base64
            with open(img_to_use, "rb") as f:
                raw_b64 = base64.b64encode(f.read()).decode("utf-8")
            image_uri = f"data:image/jpeg;base64,{raw_b64}"
        except Exception as read_err:
            return VisionRes(
                status="error",
                finding="Image File Unreadable",
                pathogen="N/A",
                symptoms=f"Could not read local image file: {read_err!s}",
                ipm="Ensure the image file is accessible and valid.",
                chemical="N/A",
                care="Maintain field hygiene."
            )
    else:
        clean_b64 = img_to_use.replace("\r", "").replace("\n", "").replace(" ", "").strip()
        image_uri = f"data:image/jpeg;base64,{clean_b64}"

    sys_text = (
        "You are an expert AI Agricultural Pathologist & Entomologist for Indian farming.\n"
        "Inspect the crop specimen photograph and output strictly valid JSON matching this schema:\n"
        "{\n"
        '  "finding": "Specific pest, disease, or nutritional deficiency name and host crop",\n'
        '  "pathogen": "Scientific binomial name or causal organism (fungus, bacterium, virus, or pest species)",\n'
        '  "symptoms": "Clear visible foliar, stem, or fruit damage symptoms",\n'
        '  "ipm": "Immediate practical IPM and prevention measures",\n'
        '  "chemical": "Approved CIBRC chemical with precise dilution dose (e.g. ml/L or g/L)",\n'
        '  "care": "Cultural and preventive follow-up field practices"\n'
        "}\n"
        "Return ONLY the raw JSON object, without markdown code fences, without thoughts or commentary."
    )

    crop_hint = f"Reported field crop: {crop_name}." if crop_name and crop_name.lower() not in ["standing crops", "crop specimen", "general"] else "Identify the crop foliage and condition directly from the visual evidence."
    user_text = f"Analyze this agricultural specimen photograph. {crop_hint}"

    try:
        client = get_groq_client()
        chat = client.chat.completions.create(
            model=vision_model,
            messages=[
                {"role": "system", "content": sys_text},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_text},
                        {"type": "image_url", "image_url": {"url": image_uri}}
                    ]
                }
            ],
            temperature=0.1,
            max_tokens=600
        )
        raw_content = chat.choices[0].message.content
        if not raw_content or not raw_content.strip():
            raise ValueError("Vision model returned an empty diagnostic response.")

        clean_json = raw_content.strip()
        if "```json" in clean_json:
            clean_json = clean_json.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_json:
            clean_json = clean_json.split("```")[1].split("```")[0].strip()

        data = json.loads(clean_json)

        finding_str = str(data.get("finding", "Foliar Condition Assessment"))
        pathogen_str = str(data.get("pathogen", "Environmental / Physiological factor"))
        symptoms_str = str(data.get("symptoms", "Visual tissue and canopy characteristics observed."))
        ipm_str = str(data.get("ipm", "Follow good agricultural practices and crop rotation."))
        chem_str = str(data.get("chemical", "Apply approved bio-controls or targeted micronutrients as per extension guidelines."))
        care_str = str(data.get("care", "Maintain balanced fertigation, optimal drainage, and field sanitation."))

        # Augment with ICAR Agronomic memory if vector DB has relevant disease protocols
        try:
            vec_hits = run_retrieval(f"{crop_name} {finding_str} management", top_k=1)
            if vec_hits and vec_hits[0].get("text"):
                top_hit = vec_hits[0]["text"].strip()
                if len(top_hit) > 20:
                    ipm_str += f"\nICAR Extension Guideline: {top_hit}"
        except Exception:  # noqa: BLE001, S110
            pass

        save_diagnosis_record(crop_name, finding_str, pathogen_str, symptoms_str, ipm_str)

        return VisionRes(
            status="success",
            finding=finding_str,
            pathogen=pathogen_str,
            symptoms=symptoms_str,
            ipm=ipm_str,
            chemical=chem_str,
            care=care_str
        )
    except Exception as err:  # noqa: BLE001
        return VisionRes(
            status="error",
            finding="Optical Pathology Inspection Unavailable",
            pathogen="Not identified",
            symptoms=f"Image inspection notice: {err!s}",
            ipm="Please upload a sharp, well-lit daylight photo of the affected leaf or fruit.",
            chemical="No chemical advice without verified visual symptoms.",
            care="Monitor field moisture levels and isolate infected plants if symptoms spread."
        )

@tool
def diagnose_crop_specimen(crop_name: str | None = None) -> str:
    """
    Diagnose a plant disease, pest infestation, or leaf damage symptom from the farmer's uploaded crop photograph.
    The photograph is automatically used from the current session — no image data argument is needed.
    Args:
        crop_name: Optional name of the crop (e.g. wheat, rice, mustard, cabbage, tomato). Helps narrow the diagnosis.
    """
    res = run_vision(image_payload="", crop_name=crop_name or "")
    if res.status == "success":
        return (
            f"Optical Pathology Diagnosis:\n"
            f"• Specimen Finding: {res.finding}\n"
            f"• Causal Pathogen / Organism: {res.pathogen}\n"
            f"• Symptoms: {res.symptoms}\n"
            f"• Recommended IPM Controls: {res.ipm}\n"
            f"• Approved CIBRC Chemicals: {res.chemical}\n"
            f"• Field Care: {res.care}"
        )
    return f"Optical Pathology Notice: {res.symptoms}"
