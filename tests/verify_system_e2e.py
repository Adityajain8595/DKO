import os
import sys
import base64
import io
from PIL import Image, ImageDraw
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    reconfig = getattr(sys.stdout, "reconfigure", None)
    if callable(reconfig):
        reconfig(encoding="utf-8", errors="replace")
except Exception:
    pass

print("================================================================================")
print("     DIGITAL KRISHI OFFICER (DKO) — FULL-STACK SYSTEM AUDIT & VERIFICATION")
print("================================================================================\n")

# [TEST 1/7] Vector DB
print("[TEST 1/7] Auditing Pinecone Hybrid Vector Database...")
from backend.rag.retriever import run_retrieval
ret_res = run_retrieval("wheat crown root initiation irrigation schedule", top_k=2)
assert len(ret_res) > 0, "Vector DB returned 0 matches!"
top_score = float(ret_res[0]["score"])
print(f"  ✓ Hybrid search executed successfully.")
print(f"  ✓ Top fused score: {top_score}")
print(f"  ✓ Matches retrieved: {len(ret_res)}")
print(f"  ✓ Sample snippet preview: {ret_res[0]['text'][:90]}...")

# [TEST 2/7] Schemes
print("\n[TEST 2/7] Auditing Government Schemes Discovery & Procedure Tool...")
from backend.tools.schemes import run_schemes
from backend.schemas import FarmerProfile
prof = FarmerProfile(state="Punjab")
scheme_res = run_schemes("PM-KISAN eligibility, e-KYC procedure, and benefits", state="Punjab", profile=prof)
assert scheme_res.status == "success", f"Schemes lookup failed with status {scheme_res.status}"
assert scheme_res.name is not None and len(scheme_res.name) > 0, "Scheme name empty"
assert scheme_res.benefits is not None and len(scheme_res.benefits) > 0, "Scheme benefits empty"
assert len(scheme_res.documents) > 0, "No documents specified in scheme audit"
print(f"  ✓ Scheme Name: {scheme_res.name}")
print(f"  ✓ Ministry: {scheme_res.ministry}")
print(f"  ✓ Benefits: {scheme_res.benefits[:80]}...")
print(f"  ✓ Mandatory Documents: {', '.join(scheme_res.documents)}")
print(f"  ✓ Application Steps: {scheme_res.steps[:80]}...")

# [TEST 3/7] Mandi
print("\n[TEST 3/7] Auditing Mandi Market Commodity Price Tool...")
from backend.tools.market import run_market
mandi_res = run_market(crop="Wheat", state="Punjab")
assert mandi_res.status == "success", f"Mandi lookup failed with status {mandi_res.status}"
assert mandi_res.modal is not None, "Modal rate is None"
assert len(mandi_res.sources) > 0, "No data sources gathered"
print(f"  ✓ Mandi intelligence returned:")
print(f"    Commodity: {mandi_res.crop}")
print(f"    State: {mandi_res.state}")
print(f"    Modal Price: {mandi_res.modal}")
print(f"    Price Band: {mandi_res.band}")
print(f"    Market Trend: {mandi_res.trend}")
print(f"    Advice: {mandi_res.advice}")

# [TEST 4/7] Weather
print("\n[TEST 4/7] Auditing Hyperlocal Agro-Weather & Spray Safety Window...")
from backend.tools.weather import run_weather
weather_res = run_weather(place="Ludhiana, Punjab")
assert weather_res.status == "success", f"Weather lookup failed: {weather_res.advice}"
assert weather_res.temp is not None, "Temperature is None"
assert weather_res.spray is not None, "Spray advisory is None"
assert len(weather_res.hourly) > 0, "Hourly telemetry empty"
assert len(weather_res.daily) > 0, "Daily telemetry empty"
print("  ✓ Weather, wind velocity, humidity, and spray safety evaluated.")
print(f"    Location: Ludhiana, Punjab")
print(f"    Temperature: {weather_res.temp}°C")
print(f"    Humidity: {weather_res.humidity}%")
print(f"    Wind Velocity: {weather_res.wind} km/h")
print(f"    Precipitation Probability: {weather_res.rain}%")
print(f"    Spray Safety Window: {weather_res.spray}")

# [TEST 5/7] Autonomous Agent
print("\n[TEST 5/7] Auditing Autonomous Agent Reasoning & Multi-Tool Calling...")
from backend.agent.orchestrator import run_agent
from backend.schemas import ChatReq
test_query = "What is the modal price of mustard in Haryana, and is it safe to spray insecticides in Karnal today?"
prof_obj = FarmerProfile(name="Sukhwinder Singh", state="Haryana", district="Karnal", crops="Mustard, Wheat")
req = ChatReq(message=test_query, profile=prof_obj)
agent_output = run_agent(req)
assert agent_output.status == "success", "Agent returned failure"
assert len(agent_output.response) > 50, "Agent response too short"
assert len(agent_output.traces) > 0, "No tools executed by agent"
executed_tool_names = [t.tool for t in agent_output.traces]
print(f"  ✓ Agent Status: {agent_output.status}")
print(f"  ✓ Tools Executed: {executed_tool_names}")
print(f"  ✓ Sources Gathered: {len(agent_output.sources)} citations")
print(f"  ✓ Final Answer Length: {len(agent_output.response)} chars")
print(f"  ✓ Advisory Preview: {agent_output.response[:140]}...")

# [TEST 6/7] Multimodal Vision
print("\n[TEST 6/7] Auditing Multimodal Crop Pathology Diagnostic (qwen/qwen3.8-27b)...")
from backend.tools.vision import run_vision
img = Image.new("RGB", (64, 64), color=(34, 139, 34))
draw = ImageDraw.Draw(img)
draw.ellipse((20, 20, 44, 44), fill=(218, 165, 32))
buffer = io.BytesIO()
img.save(buffer, format="JPEG")
b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")

vision_res = run_vision(image_payload=b64_str, crop_name="Tomato Leaf")
assert vision_res.status == "success", f"Vision failed: {vision_res.symptoms}"
assert vision_res.finding is not None and len(vision_res.finding) > 0, "Finding is empty"
assert vision_res.pathogen is not None, "Pathogen is empty"
print(f"  ✓ Vision Diagnostic Status: {vision_res.status}")
print(f"  ✓ Specimen Finding: {vision_res.finding}")
print(f"  ✓ Pathogen: {vision_res.pathogen}")
print(f"  ✓ Symptoms: {vision_res.symptoms[:80]}...")
print(f"  ✓ Recommended Chemical: {vision_res.chemical}")

# [TEST 7/7] FastAPI Endpoints
print("\n[TEST 7/7] Auditing FastAPI Server Endpoints...")
from fastapi.testclient import TestClient
from backend.main import app
client = TestClient(app)

r_root = client.get("/")
assert r_root.status_code == 200, f"Root failed: {r_root.status_code}"

r_health = client.get("/health")
assert r_health.status_code == 200, f"Health failed: {r_health.status_code}"

r_weather = client.post("/weather", json={"location": "Ludhiana, Punjab"})
assert r_weather.status_code == 200, f"Weather endpoint failed: {r_weather.status_code}"

r_mandi = client.post("/mandi", json={"commodity": "Paddy", "state": "Punjab"})
assert r_mandi.status_code == 200, f"Mandi endpoint failed: {r_mandi.status_code}"

r_schemes = client.post("/schemes", json={"query": "PM-KUSUM", "state": "Punjab"})
assert r_schemes.status_code == 200, f"Schemes endpoint failed: {r_schemes.status_code}"

r_diagnose = client.post("/diagnose", json={"image": b64_str, "crop": "Wheat"})
assert r_diagnose.status_code == 200, f"Diagnose endpoint failed: {r_diagnose.status_code}"

print("  ✓ FastAPI /root, /health, /weather, /mandi, /schemes, and /diagnose verified (Status 200 OK).")

print("\n================================================================================")
print("     ALL 7 CORE MODULES RIGOROUSLY AUDITED AND VERIFIED OPERATIONAL.")
print("================================================================================\n")
