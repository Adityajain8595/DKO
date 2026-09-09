import time
from typing import Any

import requests
from langchain_core.tools import tool
from pinecone import Pinecone

from backend.config import embed_model, hf_token, index_name, pinecone_key

pine_box: Pinecone | None = None
pine_idx = None
rank_box = None

def get_pinecone():
    global pine_box, pine_idx
    if pine_box is None and pinecone_key:
        try:
            pine_box = Pinecone(api_key=pinecone_key)
            pine_idx = pine_box.Index(index_name)
        except Exception:  # noqa: BLE001, S110
            pass
    return pine_box, pine_idx

def get_ranker():
    global rank_box
    if rank_box is None:
        try:
            from flashrank import Ranker
            rank_box = Ranker(model_name="ms-marco-TinyBERT-L-2-v2")
        except Exception:  # noqa: BLE001, S110
            pass
    return rank_box

def get_dense_embedding(query: str) -> list[float] | None:
    # Primary: Hugging Face serverless router inference
    hf_url = f"https://router.huggingface.co/hf-inference/models/intfloat/{embed_model}"
    headers = {"Authorization": f"Bearer {hf_token}"} if hf_token else {}
    
    try:
        res = requests.post(
            hf_url,
            headers=headers,
            json={"inputs": f"query: {query}", "parameters": {"truncate": True}},
            timeout=8
        )
        if res.status_code == 200:
            vec = res.json()
            if isinstance(vec, list) and len(vec) > 0:
                if isinstance(vec[0], list):
                    return vec[0]
                return vec
    except Exception:  # noqa: BLE001, S110
        pass

    # Secondary: Pinecone hosted inference
    pbox, _ = get_pinecone()
    if pbox:
        try:
            res = pbox.inference.embed(
                model=embed_model,
                inputs=[query],
                parameters={"input_type": "query", "truncate": "END"}
            )
            return res[0]["values"]
        except Exception:  # noqa: BLE001, S110
            pass

    return None

retrieval_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}
CACHE_MAX_SIZE = 300
CACHE_TTL = 1200

def get_cached_retrieval(query: str) -> list[dict[str, Any]] | None:
    key = query.strip().lower()
    if key in retrieval_cache:
        cached_time, hits = retrieval_cache[key]
        if time.time() - cached_time < CACHE_TTL:
            return hits
        del retrieval_cache[key]
    return None

def set_cached_retrieval(query: str, hits: list[dict[str, Any]]):
    key = query.strip().lower()
    if len(retrieval_cache) >= CACHE_MAX_SIZE:
        oldest_key = next(iter(retrieval_cache))
        del retrieval_cache[oldest_key]
    retrieval_cache[key] = (time.time(), hits)

def run_retrieval(query: str, top_k: int = 4) -> list[dict[str, Any]]:
    """Dense semantic search against the ICAR Agronomy Knowledgebase."""
    clean_q = query.strip()
    if not clean_q:
        return []

    cached = get_cached_retrieval(clean_q)
    if cached is not None:
        return cached

    dense_vec = get_dense_embedding(clean_q)
    if not dense_vec:
        return []

    _, pidx = get_pinecone()
    if not pidx:
        return []

    try:
        query_kwargs: dict[str, Any] = {
            "vector": dense_vec,
            "top_k": max(top_k * 3, 10),
            "include_metadata": True
        }

        res = pidx.query(**query_kwargs)
        matches = res.matches if hasattr(res, "matches") else []
        if not matches:
            return []

        passages = []
        for idx, m in enumerate(matches):
            if isinstance(m, dict):
                raw_meta = m.get("metadata") if isinstance(m.get("metadata"), dict) else m
            else:
                raw_meta = getattr(m, "metadata", None)
            meta = raw_meta if isinstance(raw_meta, dict) else {}
            doc_text = meta.get("text") or meta.get("body") or ""
            if doc_text:
                passages.append({
                    "id": idx,
                    "text": doc_text,
                    "meta": meta
                })

        if not passages:
            return []

        # FlashRank reranking
        ranker = get_ranker()
        if ranker:
            from flashrank import RerankRequest
            rank_req = RerankRequest(query=clean_q, passages=passages)
            rank_res = ranker.rerank(rank_req)
        else:
            rank_res = [{"text": p.get("text", ""), "score": 0.8, "meta": p.get("meta", {})} for p in passages]

        out_docs = []
        for scored in rank_res[:top_k]:
            if not isinstance(scored, dict):
                continue

            doc_text = scored.get("text") or ""
            if not doc_text:
                continue

            meta = scored.get("meta")
            source = None
            if isinstance(meta, dict):
                source = meta.get("source")
            elif isinstance(meta, str) and meta.strip():
                source = meta.strip()

            if not source:
                direct_src = scored.get("source")
                if isinstance(direct_src, str) and direct_src.strip():
                    source = direct_src.strip()

            if not source:
                source = "ICAR Scientific Agriculture Knowledgebase"

            raw_score = scored.get("score", 0.0)
            try:
                score_val = float(raw_score)
            except (ValueError, TypeError):
                score_val = 0.0

            out_docs.append({
                "text": str(doc_text),
                "score": score_val,
                "source": str(source)
            })

        set_cached_retrieval(clean_q, out_docs)
        return out_docs
    except Exception:  # noqa: BLE001
        return []

@tool
def query_icar_knowledge(query: str) -> str:
    """
    Search official ICAR (Indian Council of Agricultural Research), State Agricultural Universities,
    and verified crop lifecycle agronomy guidelines for scientific pest/disease control, fertilization,
    crop varieties, and agricultural management protocols.
    Args:
        query: Specific agronomic inquiry (e.g. "wheat yellow rust chemical control CIBRC", "paddy blast management", "mustard aphid IPM").
    """
    hits = run_retrieval(query, top_k=3)
    if not hits:
        return f"No specialized ICAR corpus passages matched query: '{query}'."
    passages_text = "\n\n".join([f"• [{h.get('source', 'ICAR Corpus')}]: {h.get('text', '')}" for h in hits if isinstance(h, dict)])
    return f"Retrieved Scientific Agronomic Passages:\n{passages_text}"
