from typing import Any


def resolve_context(param: Any = None, profile_field: Any = None, fallback_default: Any = "") -> str:
    """
    Dynamically resolves a parameter by checking query argument first,
    then the farmer's registered profile, before considering a fallback.
    Accepts string, list, or None, preventing rigid static assumptions.
    """
    def _clean(val: Any) -> str | None:
        if val is None:
            return None
        if isinstance(val, (list, tuple)):
            val = ", ".join(str(x) for x in val)
        s = str(val).strip()
        if s and s.lower() not in ("", "null", "none"):
            return s
        return None

    res = _clean(param)
    if res is not None:
        return res
    res = _clean(profile_field)
    if res is not None:
        return res
    return str(fallback_default or "")

def extract_text(content: Any) -> str:
    """
    Recursively extracts plain text from varied LLM response formats
    including strings, structured dictionaries, and message block arrays.
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict):
                val = part.get("text") or part.get("content")
                parts.append(str(val) if val is not None else str(part))
            else:
                text_attr = getattr(part, "text", None)
                if text_attr is not None:
                    parts.append(str(text_attr))
                else:
                    parts.append(str(part))
        return "".join(parts)
    return str(content) if content is not None else ""
