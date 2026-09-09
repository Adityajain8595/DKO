import json
import logging
import re
import time
from datetime import date
from typing import Any
from urllib.parse import quote

import requests
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from pydantic import SecretStr
from tenacity import retry, stop_after_attempt, wait_exponential

from backend.config import fast_model, groq_key
from backend.schemas import DailyPoint, FarmerProfile, HourlyPoint, WeatherRes
from backend.tools.web import search_weather_fallback
from backend.utils import resolve_context

fast_chat = ChatGroq(
    model=fast_model,
    api_key=SecretStr(groq_key) if groq_key else None,
    temperature=0.1,
    max_tokens=1024,
) if groq_key else None

wmo_codes: dict[int, str] = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    71: "Slight Snow",
    73: "Moderate Snow",
    75: "Heavy Snow",
    80: "Rain Showers",
    81: "Moderate Showers",
    82: "Violent Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Hail"
}

def code_cond(code: int) -> str:
    return wmo_codes.get(code, "Partly Cloudy")

def code_impact(code: int, rain: int) -> str:
    if rain > 50 or code in (61, 63, 65, 80, 81, 82, 95, 96):
        return "Delay chemical spraying & fertilizer broadcasting."
    elif rain > 20:
        return "Monitor humidity pockets for early fungal emergence."
    elif code in (0, 1):
        return "Ideal for land preparation, weeding, and foliar spray."
    return "Normal agronomic conditions across standing crops."

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=3), reraise=False)
def fetch_geo(place: str) -> tuple[float, float, str] | None:
    url = f"https://geocoding-api.open-meteo.com/v1/search?name={quote(place)}&count=1"
    try:
        res = requests.get(url, timeout=6)
        if res.status_code == 200:
            items = res.json().get("results", [])
            if items:
                top = items[0]
                return float(top["latitude"]), float(top["longitude"]), str(top.get("name", place))
    except (requests.RequestException, ValueError, KeyError):
        return None
    return None

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=3), reraise=False)
def fetch_meteo(lat: float, lon: float) -> dict[str, Any]:
    url = (
        f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
        f"&current_weather=true&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,windspeed_10m,uv_index"
        f"&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=auto"
    )
    res = requests.get(url, timeout=6)
    if res.status_code == 200:
        return res.json()
    return {}

def fetch_air_quality(lat: float, lon: float) -> dict[str, Any]:
    url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=us_aqi,pm2_5"
    try:
        res = requests.get(url, timeout=5)
        if res.status_code == 200:
            return res.json().get("current", {})
    except (requests.RequestException, ValueError, KeyError):
        return {}
    return {}

ai_advisory_cache: dict[str, tuple[float, dict[str, Any]]] = {}

def synthesize_ai_weather_advisories(
    place: str,
    temp: float,
    humidity: int,
    wind: float,
    rain: int,
    daily_pts: list[DailyPoint],
    profile: FarmerProfile | None = None,
) -> dict[str, Any]:
    """
    Generates tailored, concise, well-reasoned AI agronomic advisories with matching lengths
    for pesticide spray and irrigation, along with 7 daily one-liner operations.
    Results are cached to prevent redundant LLM invocations.
    """
    crops_str = (profile.crops or "").strip().lower() if profile else ""
    soil_str = (profile.soil or "").strip().lower() if profile else ""
    first_date = daily_pts[0].date if daily_pts else ""
    cache_key = f"{place.lower().strip()}_{crops_str}_{soil_str}_{first_date}"
    now = time.time()

    if cache_key in ai_advisory_cache:
        c_time, c_data = ai_advisory_cache[cache_key]
        if now - c_time < 7200:  # 2 hours cache
            return c_data

    crop_name = profile.crops if profile and profile.crops else "Wheat, Basmati Rice, and Mustard"
    soil_type = profile.soil if profile and profile.soil else "Alluvial Loam"
    irrig_type = profile.irrigation if profile and profile.irrigation else "tube-well drip system"

    # Default calibrated baseline guaranteeing matching length (~35-45 words each, strictly 2 sentences)
    has_heavy_rain = any(getattr(d, "rainChance", 0) > 35 for d in daily_pts)

    if wind > 15:
        base_spray_badge = "RESTRICTED TODAY"
        base_spray_adv = (
            f"Elevated wind velocity ({wind:.1f} km/h) creates significant foliar chemical drift into non-target zones across {crop_name}. "
            f"Postpone all pesticide and nutrient spraying until evening when gusts subside below 10 km/h."
        )
        base_spray_sub = "Best Hours: 05:30 PM – 07:00 PM (Wind calms below drift threshold)"
    elif rain > 35:
        base_spray_badge = "RESTRICTED TODAY"
        base_spray_adv = (
            f"Precipitation probability is elevated at {rain}%, presenting immediate risk of foliar agrochemical wash-off across {crop_name}. "
            f"Withhold chemical applications until the active weather front clears completely."
        )
        base_spray_sub = "Best Hours: Postpone spraying until rainfall ceases and foliage dries"
    else:
        base_spray_badge = "OPTIMAL TODAY"
        base_spray_adv = (
            f"Favorable wind speeds of {wind:.1f} km/h and ambient temperature of {temp:.1f}°C create an optimal foliar application window for {crop_name}. "
            f"Ensure uniform leaf-surface coverage during morning hours before midday heat rises."
        )
        base_spray_sub = "Best Hours: 06:30 AM – 10:00 AM (Calm winds, avoids midday heat)"

    if has_heavy_rain:
        base_irrig_badge = "WITHHOLD CYCLE"
        base_irrig_adv = (
            f"Approaching precipitation front will replenish root-zone moisture across your {soil_type} holdings in {place}. "
            f"Hold off on scheduled {irrig_type} operations to prevent field waterlogging and save electricity."
        )
        base_irrig_sub = "Next Cycle: Hold irrigation runs; ensure perimeter field drainage is clear"
    else:
        base_irrig_badge = "ACTION RECOMMENDED"
        base_irrig_adv = (
            f"Moderate ambient evapotranspiration requires maintaining consistent soil moisture across your {soil_type} plots in {place}. "
            f"Run a scheduled {irrig_type} cycle during early hours to support root development in {crop_name}."
        )
        base_irrig_sub = "Next Cycle: Run early-morning cycle to sustain root-zone moisture"

    rain_actions = [
        f"Pause field irrigation and inspect drainage channels across {crop_name.split(',')[0]} plots.",
        "Scout crop canopy for early fungal foliar symptoms and withhold chemical spraying.",
        "Clear perimeter drainage ditches to prevent root waterlogging from heavy rainfall.",
        "Withhold fertilizer top-dressing until standing moisture dissipates across plots.",
        "Inspect field bunds and drainage outlets to safeguard root systems.",
    ]
    dry_actions = [
        "Optimal conditions for shallow weeding, foliar biostimulant spraying, and intercultural tasks.",
        "Inspect crop stand vigor and conduct routine soil aeration across acreage.",
        "Favorable microclimate for vegetative crop inspection and pest monitoring.",
        "Execute scheduled early-morning fertigation and moisture maintenance.",
    ]
    rain_idx = 0
    dry_idx = 0
    base_daily_ops = []
    for d in daily_pts[:7]:
        rc = getattr(d, "rainChance", 0)
        cond = getattr(d, "condition", "").lower()
        if rc > 40 or "rain" in cond or "storm" in cond:
            base_daily_ops.append(rain_actions[rain_idx % len(rain_actions)])
            rain_idx += 1
        elif rc > 25:
            base_daily_ops.append("Scout for early foliar blight symptoms; avoid fertilizer top-dressing ahead of showers.")
        else:
            base_daily_ops.append(dry_actions[dry_idx % len(dry_actions)])
            dry_idx += 1

    while len(base_daily_ops) < 7:
        base_daily_ops.append("Monitor root-zone moisture and scout crop canopy across acreage.")

    advisories = {
        "spray_advisory": base_spray_adv,
        "spray_subline": base_spray_sub,
        "spray_badge": base_spray_badge,
        "irrigation_advisory": base_irrig_adv,
        "irrigation_subline": base_irrig_sub,
        "irrigation_badge": base_irrig_badge,
        "daily_operations": base_daily_ops,
    }

    # Dynamic LLM generation via fast_chat with SystemMessage & clean JSON extraction
    if fast_chat:
        try:
            weekly_desc = "; ".join([
                f"{getattr(d, 'day', '')} ({getattr(d, 'date', '')}): {getattr(d, 'condition', '')}, High {getattr(d, 'high', '')}C / Low {getattr(d, 'low', '')}C, Rain {getattr(d, 'rainChance', 0)}%"
                for d in daily_pts[:7]
            ])
            sys_msg = SystemMessage(
                content=(
                    "You are an expert ICAR agricultural meteorology advisor. "
                    "You must output ONLY valid JSON without any markdown fences, backticks, or preamble."
                )
            )
            prompt = (
                f"Analyze this weekly weather telemetry for a farmer in {place}.\n"
                f"Farmer Profile:\n"
                f"- Crops: {crop_name}\n"
                f"- Soil: {soil_type}\n"
                f"- Irrigation: {irrig_type}\n\n"
                f"Live Microclimate Telemetry:\n"
                f"- Today: Temp {temp:.1f}C, Humidity {humidity}%, Wind {wind:.1f} km/h, Rain Chance {rain}%\n"
                f"- 7-Day Forecast: {weekly_desc}\n\n"
                f"Generate practical, scientific agronomic recommendations in EXACTLY this JSON structure:\n"
                f"{{\n"
                f'  "spray_advisory": "<Concise 2-sentence agronomic analysis of chemical/foliar spray safety for this week based on wind, humidity, and rainfall for {crop_name}>",\n'
                f'  "spray_subline": "Best Hours: <e.g. 06:30 AM - 10:00 AM (avoid midday heat)>",\n'
                f'  "spray_badge": "<OPTIMAL TODAY | CAUTION TODAY | RESTRICTED TODAY>",\n'
                f'  "irrigation_advisory": "<Concise 2-sentence agronomic analysis of soil moisture and irrigation scheduling for {crop_name} on {soil_type} given rain forecast>",\n'
                f'  "irrigation_subline": "Next Cycle: <Actionable timing recommendation based on rainfall>",\n'
                f'  "irrigation_badge": "<ACTION RECOMMENDED | SCHEDULED RUN | WITHHOLD CYCLE>",\n'
                f'  "daily_operations": [\n'
                f'    "<Actionable farm operation for Day 1 under 14 words>",\n'
                f'    "<Actionable farm operation for Day 2 under 14 words>",\n'
                f'    "<Actionable farm operation for Day 3 under 14 words>",\n'
                f'    "<Actionable farm operation for Day 4 under 14 words>",\n'
                f'    "<Actionable farm operation for Day 5 under 14 words>",\n'
                f'    "<Actionable farm operation for Day 6 under 14 words>",\n'
                f'    "<Actionable farm operation for Day 7 under 14 words>"\n'
                f"  ]\n"
                f"}}\n\n"
                f"STRICT CONSTRAINTS:\n"
                f"1. MATCHING LENGTH: 'spray_advisory' and 'irrigation_advisory' MUST have identical visual length (strictly 2 sentences each, 35-45 words).\n"
                f"2. DISTINCT OPERATIONS: All 7 'daily_operations' entries must be distinct, non-repetitive, actionable farm operations tailored to that specific day's weather and crops.\n"
                f"3. Return ONLY valid JSON."
            )
            response = fast_chat.invoke([sys_msg, HumanMessage(content=prompt)])
            raw_text = str(response.content).strip()
            match = re.search(r"\{.*\}", raw_text, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
                if (
                    parsed.get("spray_advisory")
                    and parsed.get("irrigation_advisory")
                    and isinstance(parsed.get("daily_operations"), list)
                    and len(parsed["daily_operations"]) >= 7
                ):
                    advisories = {
                        "spray_advisory": str(parsed["spray_advisory"]).strip(),
                        "spray_subline": str(parsed.get("spray_subline") or base_spray_sub).strip(),
                        "spray_badge": str(parsed.get("spray_badge") or base_spray_badge).strip(),
                        "irrigation_advisory": str(parsed["irrigation_advisory"]).strip(),
                        "irrigation_subline": str(parsed.get("irrigation_subline") or base_irrig_sub).strip(),
                        "irrigation_badge": str(parsed.get("irrigation_badge") or base_irrig_badge).strip(),
                        "daily_operations": [str(op).strip() for op in parsed["daily_operations"][:7]],
                    }
        except Exception as e:
            logging.getLogger("weather").warning("AI weather synthesis fallback used: %s", e)

    ai_advisory_cache[cache_key] = (now, advisories)
    return advisories

weather_cache: dict[str, tuple[float, WeatherRes]] = {}

def run_weather(place: str | None = None, profile: FarmerProfile | None = None) -> WeatherRes:
    """
    Retrieves live hyperlocal microclimate telemetry from Open-Meteo.
    Resolves location dynamically from input place or registered farmer profile.
    """
    loc_from_profile = None
    if profile and profile.district and profile.state:
        loc_from_profile = f"{profile.district}, {profile.state}"
    elif profile and profile.district:
        loc_from_profile = profile.district

    target_place = resolve_context(place, loc_from_profile, None)
    if not target_place:
        return WeatherRes(
            status="unavailable",
            temp=None,
            humidity=None,
            wind=None,
            rain=None,
            spray="Location required",
            advice="Please specify your farm district or territory to check live weather telemetry.",
            hourly=[],
            daily=[]
        )

    crops_context = profile.crops if profile else None
    cache_key = target_place.strip().lower()
    now = time.time()
    if cache_key in weather_cache:
        cached_time, cached_res = weather_cache[cache_key]
        if now - cached_time < 1800:
            return cached_res

    geo_res = fetch_geo(target_place)
    if not geo_res:
        # Fallback to meteorological web search if geocoding fails
        fallback_hits = search_weather_fallback(target_place)
        advice_snip = " ".join([h.get("snippet", "") for h in fallback_hits[:2]])
        res = WeatherRes(
            status="partial",
            temp=None,
            humidity=None,
            wind=None,
            rain=None,
            spray="Standard foliar spray precautions apply.",
            advice=f"Geocoding coordinates unavailable for '{target_place}'. Meteorological bulletin: {advice_snip or 'Refer to local IMD station bulletin.'}",
            uv_index=5.0,
            air_quality_index=100,
            air_quality_desc="Moderate",
            hourly=[],
            daily=[]
        )
        weather_cache[cache_key] = (now, res)
        return res

    try:
        lat, lon, label = geo_res
        data = fetch_meteo(lat, lon)
        if not data:
            raise ValueError("No forecast data returned from Open-Meteo")

        aqi_data = fetch_air_quality(lat, lon)
        curr = data.get("current_weather", {})
        temp = float(curr.get("temperature", 25.0))
        wind = float(curr.get("windspeed", 5.0))

        hourly = data.get("hourly", {})
        h_times = hourly.get("time", [])
        h_temps = hourly.get("temperature_2m", [])
        h_pops = hourly.get("precipitation_probability", [])
        h_winds = hourly.get("windspeed_10m", [])
        rh_vals = hourly.get("relative_humidity_2m", [55])

        humidity = int(rh_vals[0]) if rh_vals else 55
        rain = int(max(h_pops[:6])) if h_pops else 0

        hour_pts: list[HourlyPoint] = []
        for i in range(min(12, len(h_times))):
            raw_time = h_times[i]
            clock_str = raw_time.split("T")[1] if "T" in raw_time else raw_time
            t_val = float(h_temps[i]) if i < len(h_temps) else temp
            p_val = int(h_pops[i]) if i < len(h_pops) else 0
            w_val = float(h_winds[i]) if i < len(h_winds) else wind
            hour_pts.append(HourlyPoint(time=clock_str, temp=t_val, pop=p_val, wind=w_val))

        daily = data.get("daily", {})
        d_times = daily.get("time", [])
        d_codes = daily.get("weathercode", [])
        d_highs = daily.get("temperature_2m_max", [])
        d_lows = daily.get("temperature_2m_min", [])
        d_rains = daily.get("precipitation_probability_max", [])
        d_uvs = daily.get("uv_index_max", [])

        day_pts: list[DailyPoint] = []
        for i in range(min(7, len(d_times))):
            d_str = d_times[i]
            d_obj = date.fromisoformat(d_str)
            day_name = "Today" if i == 0 else d_obj.strftime("%a")
            date_name = d_obj.strftime("%d %b")
            code_val = int(d_codes[i]) if i < len(d_codes) else 0
            cond_str = code_cond(code_val)
            high_val = float(d_highs[i]) if i < len(d_highs) else temp + 4.0
            low_val = float(d_lows[i]) if i < len(d_lows) else temp - 4.0
            rain_val = int(d_rains[i]) if i < len(d_rains) else 10
            impact_str = code_impact(code_val, rain_val)
            day_pts.append(DailyPoint(
                day=day_name,
                date=date_name,
                condition=cond_str,
                high=high_val,
                low=low_val,
                rainChance=rain_val,
                agriImpact=impact_str
            ))

        uv_val = float(d_uvs[0]) if d_uvs else 5.5
        aqi_val = int(aqi_data.get("us_aqi", 0)) if aqi_data and aqi_data.get("us_aqi") is not None else 85
        if aqi_val <= 50:
            aqi_desc = "Good"
        elif aqi_val <= 100:
            aqi_desc = "Moderate"
        elif aqi_val <= 150:
            aqi_desc = "Unhealthy for Sensitive Groups"
        else:
            aqi_desc = "Unhealthy"

        ai_adv = synthesize_ai_weather_advisories(
            place=label,
            temp=temp,
            humidity=humidity,
            wind=wind,
            rain=rain,
            daily_pts=day_pts,
            profile=profile
        )

        for i, pt in enumerate(day_pts):
            if i < len(ai_adv.get("daily_operations", [])):
                pt.agriImpact = ai_adv["daily_operations"][i]

        res = WeatherRes(
            status="success",
            temp=round(temp, 1),
            humidity=humidity,
            wind=round(wind, 1),
            rain=rain,
            spray=ai_adv["spray_advisory"],
            advice=ai_adv["irrigation_advisory"],
            spray_subline=ai_adv["spray_subline"],
            irrigation_subline=ai_adv["irrigation_subline"],
            spray_badge=ai_adv["spray_badge"],
            irrigation_badge=ai_adv["irrigation_badge"],
            uv_index=round(uv_val, 1),
            air_quality_index=aqi_val,
            air_quality_desc=aqi_desc,
            hourly=hour_pts,
            daily=day_pts
        )
        weather_cache[cache_key] = (now, res)
        return res
    except Exception as err:  # noqa: BLE001
        return WeatherRes(
            status="unavailable",
            temp=None,
            humidity=None,
            wind=None,
            rain=None,
            spray="Telemetry temporarily unavailable.",
            advice=f"Live weather data could not be retrieved for '{target_place}': {err!s}",
            hourly=[],
            daily=[]
        )

@tool
def get_weather_telemetry(location: str, crops: str | None = None) -> str:
    """
    Retrieve live hyperlocal weather, rainfall probability, wind velocity, ambient temperature,
    and agronomic chemical spraying window safety advisory for any Indian district or city.
    Args:
        location: City, district, or state name in India (e.g. "Karnal", "Ludhiana, Punjab").
        crops: Optional crops grown by the farmer to customize spray and irrigation recommendations.
    """
    res = run_weather(place=location, profile=FarmerProfile(crops=crops) if crops else None)
    if res.status == "success":
        forecast_days = [f"{d.day}: {d.condition}, High {d.high}°C, Low {d.low}°C, Rain {d.rainChance}%" for d in res.daily[:3]]
        return (
            f"Weather Telemetry for {location}:\n"
            f"• Current Temperature: {res.temp}°C\n"
            f"• Relative Humidity: {res.humidity}%\n"
            f"• Wind Velocity: {res.wind} km/h\n"
            f"• Precipitation Probability (Rain Chance): {res.rain}%\n"
            f"• Spray Window Assessment: {res.spray}\n"
            f"• Agronomic Irrigation Advice: {res.advice}\n"
            f"• 3-Day Forecast: {'; '.join(forecast_days)}"
        )
    return f"Weather Telemetry Notice for {location}: {res.advice}"
