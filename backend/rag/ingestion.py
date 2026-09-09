import json
import os
from collections.abc import Generator
from typing import Any

import fsspec
import pyarrow.parquet as pq
import requests
from pinecone import Pinecone
from pinecone_text.sparse.bm25_encoder import BM25Encoder

from backend.config import cache_dir, embed_model, hf_token, index_name, pinecone_key

pine_box = Pinecone(api_key=pinecone_key)
pine_idx = pine_box.Index(index_name)
os.makedirs(cache_dir, exist_ok=True)

auth_hdrs = {"Authorization": f"Bearer {hf_token}"} if hf_token else {}
web_fs = fsspec.filesystem("https")
state_file = os.path.join(cache_dir, "ingest_state.json")

def clean_txt(raw_text: str) -> str:
    if not raw_text:
        return ""
    bits = [b.strip() for b in raw_text.splitlines() if b.strip()]
    return " ".join(bits)

def get_parquets(ds_name: str) -> list[str]:
    api_url = f"https://datasets-server.huggingface.co/parquet?dataset={ds_name}"
    res = requests.get(api_url, headers=auth_hdrs, timeout=30)
    if res.status_code != 200:
        return []
    file_list = res.json().get("parquet_files", [])
    return [f["url"] for f in file_list if f.get("split") == "train"]

def load_state() -> dict[str, Any]:
    if os.path.exists(state_file):
        try:
            with open(state_file, "r") as f:
                return json.load(f)
        except (OSError, json.JSONDecodeError):
            return {}
    return {}

def save_state(state_data: dict[str, Any]):
    with open(state_file, "w") as f:
        json.dump(state_data, f)

def stream_talha() -> Generator[dict[str, Any], None, None]:
    urls = get_parquets("talhakk/agriculture-qa")
    for url in urls:
        with web_fs.open(url) as f:
            pf = pq.ParquetFile(f)
            for rg_idx in range(pf.num_row_groups):
                rg = pf.read_row_group(rg_idx)
                for idx, row in enumerate(rg.to_pylist()):
                    quest = clean_txt(str(row.get("question", "")))
                    ans = clean_txt(str(row.get("answer", "")))
                    if quest and ans:
                        body = f"Question: {quest}\nPractice: {ans}"
                        yield {
                            "id": f"talha_{rg_idx}_{idx}",
                            "text": body[:900],
                            "meta": {"text": body[:850], "source": "Talha Agronomy Lifecycle"}
                        }

def stream_kisan() -> Generator[dict[str, Any], None, None]:
    urls = get_parquets("KisanVaani/agriculture-qa-english-only")
    for url in urls:
        with web_fs.open(url) as f:
            pf = pq.ParquetFile(f)
            for rg_idx in range(pf.num_row_groups):
                rg = pf.read_row_group(rg_idx)
                for idx, row in enumerate(rg.to_pylist()):
                    quest = clean_txt(str(row.get("question", "")))
                    answers = row.get("answers", "")
                    ans = clean_txt(str(answers[0])) if isinstance(answers, list) and answers else clean_txt(str(answers))
                    if quest and ans:
                        body = f"Farmer Question: {quest}\nExpert Guidance: {ans}"
                        yield {
                            "id": f"kisan_{rg_idx}_{idx}",
                            "text": body[:900],
                            "meta": {"text": body[:850], "source": "KisanVaani Extension"}
                        }

def stream_slm(start_shard: int = 0) -> Generator[dict[str, Any], None, None]:
    urls = get_parquets("AnmolNimmala0/agri-slm-corpus")
    for shard_idx, url in enumerate(urls):
        if shard_idx < start_shard:
            continue
        with web_fs.open(url) as f:
            pf = pq.ParquetFile(f)
            for rg_idx in range(pf.num_row_groups):
                rg = pf.read_row_group(rg_idx)
                for idx, row in enumerate(rg.to_pylist()):
                    txt = clean_txt(str(row.get("text", "")))
                    if len(txt) >= 80:
                        yield {
                            "id": f"slm_{shard_idx}_{rg_idx}_{idx}",
                            "text": txt[:900],
                            "meta": {"text": txt[:850], "source": "ICAR Extension Research"},
                            "_shard": shard_idx
                        }

def run_ingest():
    bm25_path = os.path.join(cache_dir, "bm25.json")
    bm25 = BM25Encoder()
    if os.path.exists(bm25_path):
        bm25.load(bm25_path)
    else:
        sample_texts = []
        for doc in stream_talha():
            sample_texts.append(doc["text"])
            if len(sample_texts) >= 15000:
                break
        bm25.fit(sample_texts)
        bm25.dump(bm25_path)

    state = load_state()
    done_talha = state.get("talha_done", False)
    done_kisan = state.get("kisan_done", False)
    cur_shard = state.get("slm_shard", 0)
    total_upserted = state.get("total_upserted", 0)

    batch_docs = []
    chunk_size = 96

    def push_batch(docs: list[dict[str, Any]]):
        nonlocal total_upserted
        sub_texts = [d["text"] for d in docs]
        res = pine_box.inference.embed(
            model=embed_model,
            inputs=sub_texts,
            parameters={"input_type": "passage", "truncate": "END"}
        )
        dense_vecs = [d["values"] for d in res]
        sparse_raw: Any = bm25.encode_documents(sub_texts)
        sparse_vecs: list[dict[str, Any]] = sparse_raw if isinstance(sparse_raw, list) else [sparse_raw]
        vec_payload = []
        for i, doc in enumerate(docs):
            vec_payload.append({
                "id": doc["id"],
                "values": dense_vecs[i],
                "sparse_values": sparse_vecs[i],
                "metadata": doc["meta"]
            })
        pine_idx.upsert(vectors=vec_payload)
        total_upserted += len(docs)

    if not done_talha:
        print("Streaming Talha QA (25,410 records)...")
        for doc in stream_talha():
            batch_docs.append(doc)
            if len(batch_docs) >= chunk_size:
                push_batch(batch_docs)
                batch_docs = []
                if total_upserted % 960 == 0:
                    print(f"Total upserted so far: {total_upserted}")
        if batch_docs:
            push_batch(batch_docs)
            batch_docs = []
        state["talha_done"] = True
        state["total_upserted"] = total_upserted
        save_state(state)
        print(f"Talha QA completed. Total: {total_upserted}")

    if not done_kisan:
        print("Streaming KisanVaani QA (22,615 records)...")
        for doc in stream_kisan():
            batch_docs.append(doc)
            if len(batch_docs) >= chunk_size:
                push_batch(batch_docs)
                batch_docs = []
                if total_upserted % 960 == 0:
                    print(f"Total upserted so far: {total_upserted}")
        if batch_docs:
            push_batch(batch_docs)
            batch_docs = []
        state["kisan_done"] = True
        state["total_upserted"] = total_upserted
        save_state(state)
        print(f"KisanVaani QA completed. Total: {total_upserted}")

    print(f"Streaming Agri-SLM Corpus from shard {cur_shard} (195,781 records)...")
    last_shard = cur_shard
    for doc in stream_slm(start_shard=cur_shard):
        shard_id = doc.get("_shard", cur_shard)
        if shard_id != last_shard:
            state["slm_shard"] = last_shard
            state["total_upserted"] = total_upserted
            save_state(state)
            last_shard = shard_id
        batch_docs.append(doc)
        if len(batch_docs) >= chunk_size:
            push_batch(batch_docs)
            batch_docs = []
            if total_upserted % 960 == 0:
                print(f"Total upserted so far: {total_upserted} | Current shard: {shard_id}/10")
                state["total_upserted"] = total_upserted
                save_state(state)

    if batch_docs:
        push_batch(batch_docs)
        batch_docs = []

    state["slm_shard"] = 10
    state["slm_done"] = True
    state["total_upserted"] = total_upserted
    save_state(state)
    print(f"Ingestion finished! Total indexed vectors: {total_upserted}")

if __name__ == "__main__":
    run_ingest()
