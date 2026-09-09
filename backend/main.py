import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from agent.orchestrator import generate_session_title, run_agent, stream_agent
from schemas import (
    ChatReq,
    ChatRes,
    MandiReq,
    MandiRes,
    SchemeReq,
    SchemeRes,
    TitleReq,
    TitleRes,
    VisionReq,
    VisionRes,
    WeatherReq,
    WeatherRes,
)
from tools.market import run_market
from tools.schemes import run_schemes
from tools.vision import get_recent_diagnoses, run_vision
from tools.weather import run_weather

app = FastAPI(
    title="Digital Krishi Officer (DKO) Autonomous Backend",
    version="4.0.0",
    description="Agentic RAG and Multimodal Agricultural Decision Intelligence System"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
@app.get("/health")
def api_health():
    return {
        "status": "online",
        "system": "Digital Krishi Officer Autonomous Agentic RAG",
        "version": "4.0.0"
    }

@app.post("/chat", response_model=ChatRes)
def chat_api(req: ChatReq):
    try:
        return run_agent(req)
    except Exception as err:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(err))

@app.post("/chat/stream")
def chat_stream_api(req: ChatReq):
    img_len = len(req.image) if req.image else 0
    print(f"[DEBUG] /chat/stream — image received: {bool(req.image)}, length: {img_len} chars", flush=True)

    def event_generator():
        try:
            for event in stream_agent(req):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as err:  # noqa: BLE001
            err_event = {"type": "error", "error": str(err)}
            yield f"data: {json.dumps(err_event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.post("/session-title", response_model=TitleRes)
def session_title_api(req: TitleReq):
    try:
        title = generate_session_title(req.query)
        return TitleRes(title=title)
    except Exception:  # noqa: BLE001
        return TitleRes(title="Crop Advisory")

@app.post("/market", response_model=MandiRes)
@app.post("/mandi", response_model=MandiRes)
def market_api(req: MandiReq):
    try:
        crop_val = req.get_crop()
        if not crop_val and req.profile and req.profile.crops:
            crop_val = req.profile.crops
        return run_market(crop=crop_val, state=req.state, profile=req.profile, refresh=bool(req.refresh))
    except Exception as err:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(err))

@app.post("/weather", response_model=WeatherRes)
def weather_api(req: WeatherReq):
    try:
        return run_weather(place=req.location, profile=req.profile)
    except Exception as err:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(err))

@app.post("/schemes", response_model=SchemeRes)
def schemes_api(req: SchemeReq):
    try:
        return run_schemes(query=req.query, state=req.state, profile=req.profile)
    except Exception as err:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(err))

@app.post("/diagnose", response_model=VisionRes)
def diagnose_api(req: VisionReq):
    try:
        return run_vision(image_payload=req.image, crop_name=req.crop or "")
    except Exception as err:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(err))

@app.get("/diagnoses")
def diagnoses_history_api():
    """Retrieve historical optical pathology diagnoses to display on Overview & History cards."""
    try:
        return {"diagnoses": get_recent_diagnoses(limit=15)}
    except Exception as err:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(err))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
