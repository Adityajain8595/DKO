import requests
import json
import sys

base = "http://localhost:8000"

print("==================================================================")
print("     VERIFYING LIVE BACKEND FASTAPI ENDPOINTS")
print("==================================================================")

try:
    print("\n1. Testing Health Endpoint...")
    h = requests.get(f"{base}/health", timeout=5).json()
    assert h["status"] == "online"
    print("   ✓ Health Status:", h)

    print("\n2. Testing Weather Endpoint with Hourly & Daily...")
    w = requests.post(f"{base}/weather", json={"location": "Karnal, Haryana"}, timeout=10).json()
    assert w["status"] in ("success", "partial")
    print(f"   ✓ Weather OK: Temp={w.get('temp')}°C, Rain={w.get('rain')}%, HourlyPoints={len(w.get('hourly', []))}, DailyPoints={len(w.get('daily', []))}")

    print("\n3. Testing Market Endpoint with APMC Items...")
    m = requests.post(f"{base}/market", json={"crop": "Wheat", "state": "Haryana"}, timeout=10).json()
    assert m["status"] == "success"
    print(f"   ✓ Market OK: Modal={m.get('modal')}, Band={m.get('band')}, ItemsCount={len(m.get('items', []))}")

    print("\n4. Testing Schemes Audit Endpoint (/schemes)...")
    s = requests.post(f"{base}/schemes", json={"query": "PM-Kisan DBT", "state": "Haryana"}, timeout=15).json()
    assert s["status"] == "success"
    print(f"   ✓ Schemes OK: Name={s.get('name')}, Ministry={s.get('ministry')}")

    print("\n5. Testing Advisory Chat Endpoint (/chat)...")
    c = requests.post(f"{base}/chat", json={
        "query": "Karnal mandi wheat rate today",
        "profile": {"name": "Farmer", "state": "Haryana", "district": "Karnal", "crops": "Wheat"}
    }, timeout=25).json()
    assert c["status"] == "success"
    print(f"   ✓ Chat OK: ResponseLen={len(c.get('response', ''))}, TracesCount={len(c.get('traces', []))}")

    print("\n==================================================================")
    print("     ALL LIVE ENDPOINTS SUCCESSFULLY VERIFIED (STATUS 200)")
    print("==================================================================")
except requests.exceptions.ConnectionError:
    print(f"\n[INFO] Backend server is not running on {base}.")
    print("Run `python backend/main.py` in a separate terminal before executing verify_live_data.py.")
