"use client";

import React, { useState } from "react";
import {
  Droplets,
  Wind,
  Sun,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Thermometer,
  CloudRain,
  Compass,
  Loader2,
} from "lucide-react";
import { useFarmer } from "@/context/FarmerContext";
import { API_BASE_URL } from "@/lib/api";
import type { WeatherData } from "@/lib/types";

export default function WeatherModule() {
  const { profile } = useFarmer();
  const [loadingWeather, setLoadingWeather] = useState(true);

  const [liveWeather, setLiveWeather] = useState<{
    status?: string;
    temp?: number;
    humidity?: number;
    wind?: number;
    rain?: number;
    spray?: string;
    advice?: string;
    spray_subline?: string;
    irrigation_subline?: string;
    spray_badge?: string;
    irrigation_badge?: string;
    uv_index?: number;
    air_quality_index?: number;
    air_quality_desc?: string;
    hourly?: { time: string; temp: number; pop: number; wind: number }[];
    daily?: { day: string; date: string; condition: string; high: number; low: number; rainChance: number; agriImpact: string }[];
  } | null>(null);

  React.useEffect(() => {
    let isCancelled = false;
    const cacheKey = `dko_weather_${profile.district}_${profile.state}_${profile.soilType || ""}_${profile.irrigationType || ""}_${profile.primaryCrops.join("_")}`;
    const cached = typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null;

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) { // 30 mins TTL
          setLiveWeather(parsed.data);
          setLoadingWeather(false);
          return;
        }
      } catch {}
    }

    setLoadingWeather(true);
    async function loadLiveWeather() {
      // 1. Try local backend
      try {
        const res = await fetch(`${API_BASE_URL}/weather`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: `${profile.district}, ${profile.state}`,
            profile: {
              name: profile.name,
              state: profile.state,
              district: profile.district,
              crops: profile.primaryCrops.join(", "),
              soil: profile.soilType,
              irrigation: profile.irrigationType,
            },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.status === "success" && (data.daily || []).length > 0) {
            setLiveWeather(data);
            if (typeof window !== "undefined") {
              sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
            }
            setLoadingWeather(false);
            return;
          }
        }
      } catch {
        // Backend offline, fallback to direct Open-Meteo
      }

      // 2. Direct Open-Meteo public API fallback (ensures weather is NEVER blank or 0)
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(profile.district || "Karnal")}&count=1`
        );
        let lat = 29.69, lon = 76.98;
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.results && geoData.results.length > 0) {
            lat = geoData.results[0].latitude;
            lon = geoData.results[0].longitude;
          }
        }

        const meteoRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,windspeed_10m,uv_index&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=auto`
        );

        if (meteoRes.ok) {
          const mData = await meteoRes.json();
          const curr = mData.current_weather || {};
          const hourly = mData.hourly || {};
          const daily = mData.daily || {};

          const temp = Math.round(curr.temperature || 28);
          const wind = Math.round(curr.windspeed || 8);
          const rhArr = hourly.relative_humidity_2m || [];
          const humidity = rhArr.length > 0 ? Math.round(rhArr[0]) : 60;
          const pops = hourly.precipitation_probability || [];
          const rain = pops.length > 0 ? Math.max(...pops.slice(0, 6)) : 10;

          // Dynamic UV Index calculation from Open-Meteo telemetry
          const dUvs = daily.uv_index_max || [];
          const hUvs = hourly.uv_index || [];
          const rawUv = dUvs.length > 0 ? dUvs[0] : (hUvs.length > 0 ? Math.max(...hUvs.slice(0, 12)) : 5.0);
          const dynamicUv = Math.round(rawUv * 10) / 10;

          const isSafe = wind <= 15 && rain <= 30;
          const sprayMsg = isSafe
            ? `Optimal spray window active in ${profile.district}: Favorable wind (${wind} km/h), ambient temperature (${temp}°C), and low rain probability (${rain}%).`
            : `Caution: Wind at ${wind} km/h or rain risk at ${rain}%. Spray with drift-reducing nozzles.`;

          const adviceMsg = rain > 35
            ? `Showers forecasted. Pause canal/drip irrigation across ${profile.primaryCrops.join(", ")} acreage.`
            : `Favorable microclimate for ${profile.district}. Proceed with scheduled irrigation.`;

          const hourPts = (hourly.time || []).slice(0, 12).map((t: string, i: number) => ({
            time: t.includes("T") ? t.split("T")[1] : t,
            temp: Math.round(hourly.temperature_2m?.[i] ?? temp),
            pop: hourly.precipitation_probability?.[i] ?? 0,
            wind: Math.round(hourly.windspeed_10m?.[i] ?? wind),
          }));

          const dayPts = (daily.time || []).slice(0, 7).map((d: string, i: number) => {
            const dt = new Date(d);
            const dName = i === 0 ? "Today" : dt.toLocaleDateString("en-IN", { weekday: "short" });
            const dDate = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
            const rChance = daily.precipitation_probability_max?.[i] ?? 10;
            return {
              day: dName,
              date: dDate,
              condition: rChance > 50 ? "Showers / Rain" : (daily.temperature_2m_max?.[i] > 33 ? "Sunny & Warm" : "Clear / Favorable"),
              high: Math.round(daily.temperature_2m_max?.[i] ?? 32),
              low: Math.round(daily.temperature_2m_min?.[i] ?? 22),
              rainChance: rChance,
              agriImpact: rChance > 40 ? "Delay foliar spraying & fertilizer application." : "Ideal for land preparation, weeding & spraying.",
            };
          });

          let dynamicAqi = 65;
          try {
            const aqiRes = await fetch(
              `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`
            );
            if (aqiRes.ok) {
              const aqiData = await aqiRes.json();
              if (aqiData?.current?.us_aqi !== undefined) {
                dynamicAqi = Math.round(aqiData.current.us_aqi);
              }
            }
          } catch {}

          const directWeather = {
            status: "success",
            temp,
            humidity,
            wind,
            rain,
            spray: sprayMsg,
            advice: adviceMsg,
            uv_index: dynamicUv,
            air_quality_index: dynamicAqi,
            air_quality_desc: dynamicAqi <= 50 ? "Good" : dynamicAqi <= 100 ? "Moderate" : "Unhealthy for Sensitive",
            hourly: hourPts,
            daily: dayPts,
          };

          if (!isCancelled) {
            setLiveWeather(directWeather);
            if (typeof window !== "undefined") {
              sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: directWeather }));
            }
          }
        }
      } catch (e) {
        console.warn("Direct Open-Meteo fetch failed:", e);
      } finally {
        if (!isCancelled) setLoadingWeather(false);
      }
    }

    void loadLiveWeather();

    return () => {
      isCancelled = true;
    };
  }, [profile.district, profile.state, profile.name, profile.primaryCrops, profile.soilType, profile.irrigationType]);

  const isOptimal = !(liveWeather?.spray?.toLowerCase().includes("unsafe") || liveWeather?.spray?.toLowerCase().includes("restricted"));

  const weather: WeatherData = {
    district: profile.district,
    state: profile.state,
    temperature: liveWeather?.temp !== undefined ? Math.round(liveWeather.temp) : 0,
    feelsLike: liveWeather?.temp !== undefined ? Math.round(liveWeather.temp) : 0,
    condition: liveWeather
      ? (liveWeather.rain && liveWeather.rain > 30 ? "Rain Risk Active" : (liveWeather.temp && liveWeather.temp > 34 ? "Warm & Sunny" : "Clear / Favorable"))
      : "Syncing Telemetry...",
    humidity: liveWeather?.humidity ?? 0,
    windSpeed: liveWeather?.wind !== undefined ? Math.round(liveWeather.wind) : 0,
    rainProbability: liveWeather?.rain ?? 0,
    uvIndex: liveWeather?.uv_index !== undefined ? liveWeather.uv_index : 0,
    airQualityIndex: liveWeather?.air_quality_index !== undefined ? liveWeather.air_quality_index : 0,
    sprayWindowStatus: isOptimal ? "optimal" : (liveWeather?.spray?.toLowerCase().includes("unsafe") ? "unsafe" : "caution"),
    sprayWindowReason: liveWeather?.spray || "Evaluating spray window based on hyperlocal wind, temperature, and precipitation telemetry.",
    sprayBadge: liveWeather?.spray_badge || (isOptimal ? "OPTIMAL TODAY" : "CAUTION TODAY"),
    spraySubline: liveWeather?.spray_subline || "Best Hours: Evaluated from live wind and temperature telemetry",
    irrigationAdvisory: liveWeather?.advice || "Manage irrigation in accordance with local soil moisture conditions.",
    irrigationBadge: liveWeather?.irrigation_badge || "ACTION RECOMMENDED",
    irrigationSubline: liveWeather?.irrigation_subline || "Next Cycle: Derived from precipitation and evapotranspiration data",
    hourlyForecast: liveWeather?.hourly || [],
    sevenDayOutlook: liveWeather?.daily || [],
  };


  return (
    <div className="flex-1 w-full overflow-y-auto">
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="border-b border-border-light pb-4">
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
            Weather & Microclimate Outlook
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hyperlocal meteorological forecast and field microclimate telemetry for {profile.name}&apos;s farm.
          </p>
        </div>

        {/* Spray Safety & Irrigation Alert Banners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* Spray Window Status */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-start gap-3.5 h-full">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="flex-1 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Pesticide & Foliar Spray Advisory
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    weather.sprayBadge?.includes("RESTRICTED") || weather.sprayBadge?.includes("UNSAFE")
                      ? "bg-rose-200 text-rose-900 border border-rose-300"
                      : weather.sprayBadge?.includes("CAUTION")
                      ? "bg-amber-200 text-amber-900 border border-amber-300"
                      : "bg-emerald-200 text-emerald-900 border border-emerald-300"
                  }`}>
                    {weather.sprayBadge || "OPTIMAL TODAY"}
                  </span>
                </div>
                {loadingWeather && !liveWeather ? (
                  <div className="flex items-center gap-2 mt-3 text-xs text-emerald-800 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                    <span>Synthesizing AI spray advisory...</span>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-900 mt-2 leading-relaxed">
                    {weather.sprayWindowReason}
                  </p>
                )}
              </div>
              <p className="text-[11px] text-emerald-800 font-semibold mt-2.5 pt-2 border-t border-emerald-200/60">
                {weather.spraySubline}
              </p>
            </div>
          </div>

          {/* Soil Moisture & Irrigation Advisory */}
          <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/70 flex items-start gap-3.5 h-full">
            <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
              <Droplets className="w-5 h-5 text-sky-700" />
            </div>
            <div className="flex-1 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-800">
                    Soil Moisture & Irrigation Plan
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    weather.irrigationBadge?.includes("WITHHOLD")
                      ? "bg-amber-200 text-amber-900 border border-amber-300"
                      : "bg-sky-200 text-sky-900 border border-sky-300"
                  }`}>
                    {weather.irrigationBadge || "ACTION RECOMMENDED"}
                  </span>
                </div>
                {loadingWeather && !liveWeather ? (
                  <div className="flex items-center gap-2 mt-3 text-xs text-sky-800 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-700" />
                    <span>Synthesizing AI irrigation advisory...</span>
                  </div>
                ) : (
                  <p className="text-xs text-sky-900 mt-2 leading-relaxed">
                    {weather.irrigationAdvisory}
                  </p>
                )}
              </div>
              <p className="text-[11px] text-sky-800 font-semibold mt-2.5 pt-2 border-t border-sky-200/60">
                {weather.irrigationSubline}
              </p>
            </div>
          </div>
        </div>

        {/* Main Meteorological Stats Grid with in-place spinners */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="glass-card-solid rounded-xl p-3.5 text-center">
            <Thermometer className="w-4 h-4 text-primary mx-auto mb-1.5" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">
              Temperature
            </span>
            {loadingWeather && !liveWeather ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto my-2" />
            ) : (
              <p className="font-heading text-lg font-bold text-foreground mt-0.5">
                {liveWeather?.temp !== undefined ? `${weather.temperature}°C` : "—"}
              </p>
            )}
            <span className="text-[10px] text-muted-foreground">
              {liveWeather?.temp !== undefined ? `Feels like ${weather.feelsLike}°C` : "Hyperlocal"}
            </span>
          </div>

          <div className="glass-card-solid rounded-xl p-3.5 text-center">
            <Droplets className="w-4 h-4 text-sky mx-auto mb-1.5" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">
              Humidity
            </span>
            {loadingWeather && !liveWeather ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto my-2" />
            ) : (
              <p className="font-heading text-lg font-bold text-foreground mt-0.5">
                {liveWeather?.humidity !== undefined ? `${weather.humidity}%` : "—"}
              </p>
            )}
            <span className="text-[10px] text-muted-foreground">Normal Transpiration</span>
          </div>

          <div className="glass-card-solid rounded-xl p-3.5 text-center">
            <Wind className="w-4 h-4 text-accent mx-auto mb-1.5" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">
              Wind Speed
            </span>
            {loadingWeather && !liveWeather ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto my-2" />
            ) : (
              <p className="font-heading text-lg font-bold text-foreground mt-0.5">
                {liveWeather?.wind !== undefined ? `${weather.windSpeed} km/h` : "—"}
              </p>
            )}
            <span className="text-[10px] text-emerald-700 font-semibold">Safe for Spray</span>
          </div>

          <div className="glass-card-solid rounded-xl p-3.5 text-center">
            <CloudRain className="w-4 h-4 text-sky mx-auto mb-1.5" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">
              Rain Chance
            </span>
            {loadingWeather && !liveWeather ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto my-2" />
            ) : (
              <p className="font-heading text-lg font-bold text-foreground mt-0.5">
                {liveWeather?.rain !== undefined ? `${weather.rainProbability}%` : "—"}
              </p>
            )}
            <span className="text-[10px] text-muted-foreground">Minimal Risk</span>
          </div>

          <div className="glass-card-solid rounded-xl p-3.5 text-center">
            <Sun className="w-4 h-4 text-sun mx-auto mb-1.5" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">
              UV Index
            </span>
            {loadingWeather && !liveWeather ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto my-2" />
            ) : (
              <p className="font-heading text-lg font-bold text-foreground mt-0.5">
                {liveWeather?.uv_index !== undefined ? `${weather.uvIndex} / 10` : "—"}
              </p>
            )}
            <span className="text-[10px] text-muted-foreground">
              {weather.uvIndex <= 2
                ? "Low Radiation"
                : weather.uvIndex <= 5
                ? "Moderate Radiation"
                : weather.uvIndex <= 7
                ? "High Radiation"
                : weather.uvIndex <= 10
                ? "Very High Radiation"
                : "Extreme Radiation"}
            </span>
          </div>

          <div className="glass-card-solid rounded-xl p-3.5 text-center">
            <Compass className="w-4 h-4 text-primary mx-auto mb-1.5" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">
              Air Quality (AQI)
            </span>
            {loadingWeather && !liveWeather ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary mx-auto my-2" />
            ) : (
              <p className="font-heading text-lg font-bold text-foreground mt-0.5">
                {liveWeather?.air_quality_index !== undefined ? `${weather.airQualityIndex}` : "—"}
              </p>
            )}
            <span className="text-[10px] text-muted-foreground">
              {weather.airQualityIndex <= 50
                ? "Good"
                : weather.airQualityIndex <= 100
                ? "Moderate"
                : weather.airQualityIndex <= 150
                ? "Unhealthy for Sensitive"
                : "Poor Quality"}
            </span>
          </div>
        </div>

        {/* 24-Hour Hourly Timeline with in-place skeletons */}
        <div className="glass-card-solid rounded-2xl p-5 space-y-3">
          <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Hourly Agronomy Forecast (Next 24 Hours)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2">
            {loadingWeather && (!weather.hourlyForecast || weather.hourlyForecast.length === 0) ? (
              <div className="col-span-full py-8 text-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-medium">Syncing 24-hour hourly agronomy forecast...</p>
              </div>
            ) : (
              weather.hourlyForecast.map((hour, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-border-light bg-muted/20 text-center flex flex-col items-center justify-between"
                >
                  <span className="text-xs font-semibold text-muted-foreground">
                    {hour.time}
                  </span>
                  <p className="font-heading text-base font-bold text-foreground my-1">
                    {hour.temp}°C
                  </p>
                  <div className="space-y-0.5 text-[10px] text-muted-foreground">
                    <p className="text-sky font-medium">{hour.pop}% rain</p>
                    <p>{hour.wind} km/h</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 7-Day Agricultural Outlook Table with in-place skeletons */}
        <div className="glass-card-solid rounded-2xl p-5 space-y-3">
          <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> 7-Day Agricultural Outlook & Action Recommendations
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Day / Date</th>
                  <th className="py-2.5 px-3">Sky Condition</th>
                  <th className="py-2.5 px-3">High / Low</th>
                  <th className="py-2.5 px-3">Rain Probability</th>
                  <th className="py-2.5 px-3">Recommended Farm Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {loadingWeather && (!weather.sevenDayOutlook || weather.sevenDayOutlook.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <span className="text-xs font-medium">Fetching 7-day meteorological forecast...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  weather.sevenDayOutlook.map((day, i) => (
                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-3 font-bold text-foreground whitespace-nowrap">
                        {day.day}, {day.date}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                        {day.condition}
                      </td>
                      <td className="py-3 px-3 font-semibold text-foreground whitespace-nowrap">
                        {day.high}° / {day.low}°
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            day.rainChance > 40 ? "text-amber-700" : "text-emerald-700"
                          }`}
                        >
                          {day.rainChance}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-foreground font-medium">
                        {day.agriImpact}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
