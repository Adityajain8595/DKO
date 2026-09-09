import os
import sys
import base64
import io
from PIL import Image, ImageDraw
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.schemas import (
    FarmerProfile, ChatReq, ChatRes, MandiReq, MandiRes,
    WeatherReq, WeatherRes, SchemeReq, SchemeRes, VisionReq, VisionRes
)
from backend.agent.rubric import check_banned_chemicals, check_state_mismatch, audit_advisory
from backend.tools.weather import compute_agro_weather, run_weather
from backend.tools.market import run_market
from backend.tools.schemes import run_schemes
from backend.tools.vision import run_vision
from backend.rag.retriever import run_retrieval
from backend.agent.orchestrator import run_agent
from backend.main import app

client = TestClient(app)

# Helper to generate a dummy crop specimen leaf image
def create_test_image() -> str:
    img = Image.new("RGB", (64, 64), color=(34, 139, 34))
    draw = ImageDraw.Draw(img)
    draw.ellipse((20, 20, 44, 44), fill=(218, 165, 32))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

# -----------------------------------------------------------------------------
# 1. Pydantic Schema Unit Tests
# -----------------------------------------------------------------------------
def test_farmer_profile_crop_normalization():
    p1 = FarmerProfile(name="Ramesh", crops=["Wheat", "Basmati Rice"], state="Punjab")
    assert p1.crops == "Wheat, Basmati Rice"
    
    p2 = FarmerProfile(crops="Mustard")
    assert p2.crops == "Mustard"

def test_chat_req_query_resolution():
    req1 = ChatReq(message="How to treat yellow rust?")
    assert req1.get_query() == "How to treat yellow rust?"

    req2 = ChatReq(query="Wheat market price")
    assert req2.get_query() == "Wheat market price"

    req3 = ChatReq()
    assert req3.get_query() == "Agricultural assistance"

def test_mandi_req_commodity_resolution():
    m1 = MandiReq(crop="Paddy")
    assert m1.get_crop() == "Paddy"

    m2 = MandiReq(commodity="Cotton")
    assert m2.get_crop() == "Cotton"

# -----------------------------------------------------------------------------
# 2. Rubric & Regulatory Safety Unit Tests
# -----------------------------------------------------------------------------
def test_banned_chemicals_detection():
    hazardous_text = "Apply 2 ml of Endosulfan and some Monocrotophos to kill aphids."
    hits = check_banned_chemicals(hazardous_text)
    chems = [h[0] for h in hits]
    assert "endosulfan" in chems
    assert "monocrotophos" in chems

def test_safe_chemicals_pass():
    safe_text = "Apply Azadirachtin 10000 ppm or Chlorantraniliprole 18.5% SC."
    hits = check_banned_chemicals(safe_text)
    assert len(hits) == 0

def test_state_mismatch_detection():
    mismatched_text = "You can claim ₹6,000 under Haryana government subsidy scheme."
    mismatches = check_state_mismatch(mismatched_text, farmer_state="Punjab")
    assert "Haryana" in mismatches

def test_audit_advisory_rubric():
    bad_advisory = "Spray Endosulfan immediately across your fields in Punjab."
    prof = FarmerProfile(state="Punjab")
    is_compliant, flags = audit_advisory(bad_advisory, profile=prof)
    assert is_compliant is False
    assert any("endosulfan" in f.lower() for f in flags)

# -----------------------------------------------------------------------------
# 3. Weather Logic Unit Tests
# -----------------------------------------------------------------------------
def test_agro_weather_spray_logic():
    # High wind condition
    spray, _ = compute_agro_weather(temp=25.0, humidity=60, wind=20.0, rain=10, place="Karnal")
    assert "Unsafe for spraying: High wind" in spray

    # High rain condition
    spray, _ = compute_agro_weather(temp=25.0, humidity=60, wind=5.0, rain=60, place="Karnal")
    assert "Unsafe for spraying: High rain" in spray

    # Extreme heat condition
    spray, _ = compute_agro_weather(temp=38.0, humidity=40, wind=5.0, rain=0, place="Karnal")
    assert "Restricted spray window" in spray

    # Optimal condition
    spray, _ = compute_agro_weather(temp=26.0, humidity=55, wind=6.0, rain=5, place="Karnal")
    assert "Optimal spray window active" in spray

# -----------------------------------------------------------------------------
# 4. End-to-End Live Tool Tests
# -----------------------------------------------------------------------------
def test_live_weather_tool():
    res = run_weather(place="Karnal, Haryana")
    assert res.status == "success"
    assert res.temp is not None
    assert res.humidity is not None
    assert res.spray is not None
    assert len(res.hourly) > 0
    assert len(res.daily) > 0

def test_live_market_tool():
    res = run_market(crop="Wheat", state="Haryana")
    assert res.status == "success"
    assert res.crop == "Wheat"
    assert res.state == "Haryana"
    assert res.modal is not None
    assert len(res.sources) > 0

def test_live_schemes_tool():
    res = run_schemes(query="PM-KISAN DBT", state="Punjab")
    assert res.status == "success"
    assert res.name is not None
    assert res.benefits is not None
    assert len(res.documents) > 0
    assert len(res.links) > 0

def test_live_vision_tool():
    b64_img = create_test_image()
    res = run_vision(image_payload=b64_img, crop_name="Tomato")
    assert res.status == "success", f"Vision failed with: {res.symptoms}"
    assert res.finding is not None
    assert res.pathogen is not None
    assert res.chemical is not None

def test_live_retrieval_rag():
    hits = run_retrieval("wheat crown root initiation irrigation schedule", top_k=2)
    assert isinstance(hits, list)
    assert len(hits) > 0
    assert "text" in hits[0]
    assert hits[0]["score"] > 0

# -----------------------------------------------------------------------------
# 5. Autonomous Agent LangGraph Orchestrator Test
# -----------------------------------------------------------------------------
def test_live_autonomous_agent_orchestrator():
    prof = FarmerProfile(name="Harpreet Singh", state="Punjab", district="Ludhiana", crops="Wheat, Mustard")
    req = ChatReq(
        message="What is the current wheat mandi rate in Punjab, and is it safe to spray in Ludhiana today?",
        profile=prof
    )
    res = run_agent(req)
    assert res.status == "success"
    assert len(res.response) > 50
    assert len(res.traces) > 0
    executed_tools = [t.tool for t in res.traces]
    assert any("weather" in t.lower() or "climate" in t.lower() or "mandi" in t.lower() or "market" in t.lower() for t in executed_tools)

# -----------------------------------------------------------------------------
# 6. FastAPI Endpoints Integration Tests
# -----------------------------------------------------------------------------
def test_api_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "online"

def test_api_weather_endpoint():
    resp = client.post("/weather", json={"location": "Ludhiana, Punjab"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "temp" in data

def test_api_market_endpoint():
    resp = client.post("/market", json={"crop": "Wheat", "state": "Punjab"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "modal" in data

def test_api_schemes_endpoint():
    resp = client.post("/schemes", json={"query": "PM-KISAN", "state": "Punjab"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "benefits" in data

def test_api_diagnose_endpoint():
    b64_img = create_test_image()
    resp = client.post("/diagnose", json={"image": b64_img, "crop": "Wheat"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["finding"] is not None

def test_api_chat_endpoint():
    resp = client.post("/chat", json={
        "message": "Hello officer, what precautions should I take for wheat in Ludhiana?",
        "profile": {"name": "Gurdev", "state": "Punjab", "district": "Ludhiana", "crops": "Wheat"}
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert len(data["response"]) > 20
