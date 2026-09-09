"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  CloudSun,
  Coins,
  ArrowRight,
  Camera,
  MessageSquare,
  Clock,
  Sprout,
  Droplets,
  Wind,
  Sun,
  Calendar,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { useFarmer } from "@/context/FarmerContext";
import type { DashboardModule } from "@/lib/types";
import { API_BASE_URL } from "@/lib/api";

interface OverviewModuleProps {
  onNavigate: (module: DashboardModule) => void;
}

export default function OverviewModule({ onNavigate }: OverviewModuleProps) {
  const { profile, activities, setIsProfileModalOpen } = useFarmer();

  const [cachedWeather, setCachedWeather] = useState<{
    temp?: number;
    rain?: number;
    wind?: number;
    humidity?: number;
    uv_index?: number;
    air_quality_index?: number;
    spray?: string;
    daily?: Array<{
      day?: string;
      date?: string;
      condition?: string;
      high?: number;
      low?: number;
      rainChance?: number;
      wind?: number;
      agriImpact?: string;
    }>;
  } | null>(null);

  // Live real-time Mandi dictionary keyed by crop name
  const [liveMandiByCrop, setLiveMandiByCrop] = useState<
    Record<string, { modal: string; band: string; trend: string; advice: string; isLive: boolean }>
  >({});

  // Dynamic crop filter support for Mandi Benchmark
  const crops = (profile.primaryCrops && profile.primaryCrops.length > 0)
    ? profile.primaryCrops
    : ["Wheat", "Basmati Rice"];

  const [selectedMandiCrop, setSelectedMandiCrop] = useState<string>(crops[0] || "Wheat");


  useEffect(() => {
    // 1. Live Hyperlocal Weather Telemetry from Backend (Open-Meteo API)
    // Cache key MUST match WeatherModule.tsx exactly so both components share the same cached data
    try {
      const cacheKey = `dko_weather_${profile.district}_${profile.state}_${profile.soilType || ""}_${profile.irrigationType || ""}_${profile.primaryCrops.join("_")}`;
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          // Respect the same 30 min TTL as WeatherModule
          if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
            setCachedWeather(parsed.data);
          } else {
            sessionStorage.removeItem(cacheKey);
          }
        } catch {}
      }
      if (!sessionStorage.getItem(cacheKey)) {
        fetch(`${API_BASE_URL}/weather`, {
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
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.status === "success") {
              setCachedWeather(d);
              sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: d }));
            }
          })
          .catch(() => {});
      }
    } catch {}

    // 2. Live Dynamic Mandi APMC Telemetry from Backend (Real-Time per Selected Crop)
    try {
      const mandiKey = selectedMandiCrop.toLowerCase().trim().replace(/[\s,]+/g, "_");
      const mandiCacheKey = `dko_market_${mandiKey}_${profile.state.toLowerCase()}`;
      const rawMandi = sessionStorage.getItem(mandiCacheKey);
      let usedCache = false;
      if (rawMandi) {
        try {
          const parsed = JSON.parse(rawMandi);
          const staleText = JSON.stringify(parsed.data || "");
          const isStale =
            Date.now() - parsed.timestamp >= 30 * 60 * 1000 ||
            !parsed.data?.modal ||
            staleText.includes("Kisandeals") ||
            staleText.includes("CommodityOnline") ||
            staleText.includes("2,650");
          if (!isStale && parsed?.data?.modal) {
            setLiveMandiByCrop((prev) => ({
              ...prev,
              [selectedMandiCrop]: {
                modal: parsed.data.modal,
                band: parsed.data.band || "",
                trend: (parsed.data.trend || "STABLE").toUpperCase(),
                advice: parsed.data.advice || "",
                isLive: true,
              },
            }));
            usedCache = true;
          } else {
            sessionStorage.removeItem(mandiCacheKey);
          }
        } catch {
          sessionStorage.removeItem(mandiCacheKey);
        }
      }
      if (!usedCache) {
        fetch(`${API_BASE_URL}/market`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            crop: selectedMandiCrop,
            state: profile.state,
            profile: {
              name: profile.name,
              state: profile.state,
              district: profile.district,
              crops: selectedMandiCrop,
            },
          }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.status === "success" && d.modal) {
              const dataObj = {
                modal: d.modal,
                band: d.band || "",
                trend: (d.trend || "STABLE").toUpperCase(),
                advice: d.advice || "",
                isLive: true,
              };
              setLiveMandiByCrop((prev) => ({
                ...prev,
                [selectedMandiCrop]: dataObj,
              }));
              sessionStorage.setItem(mandiCacheKey, JSON.stringify({ timestamp: Date.now(), data: d }));
            }
          })
          .catch(() => {});
      }
    } catch {}
  }, [profile.district, profile.state, selectedMandiCrop, profile.name, profile.primaryCrops, profile.soilType, profile.irrigationType]);

  // Granular 7-day meteorological forecast telemetry (derived dynamically from live Open-Meteo API)
  const forecastDays = (cachedWeather?.daily && cachedWeather.daily.length >= 5)
    ? cachedWeather.daily.slice(0, 7).map((d: any, idx: number) => {
        const rainChance = d.rainChance ?? 0;
        return {
          day: d.day || (idx === 0 ? "Today" : `Day ${idx + 1}`),
          date: d.date || `${new Date(Date.now() + idx * 86400000).getDate()} ${new Date(Date.now() + idx * 86400000).toLocaleString("en-IN", { month: "short" })}`,
          high: Math.round(d.high ?? 0),
          low: Math.round(d.low ?? 0),
          rainChance,
          condition: d.condition || (rainChance > 50 ? "Rainy" : rainChance > 20 ? "Partly Cloudy" : "Sunny"),
          impact: d.agriImpact || (rainChance > 35 ? "Rain expected; pause irrigation." : "Clear sky; favorable for fieldwork."),
        };
      })
    : [];

  return (
    <div className="flex-1 w-full overflow-y-auto">
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Welcome Banner */}
        <div className="glass-card-solid rounded-2xl p-5 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
            <div>
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                Krishi Intelligence Dashboard — {profile.name}
              </h1>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer shadow-2xs"
              >
                Update Territory & Profile
              </button>
              <button
                onClick={() => onNavigate("advisory")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-dark transition-colors cursor-pointer shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Ask Krishi Officer
              </button>
            </div>
          </div>
        </div>

        {/* KPI Metric Cards — 100% Live Telemetry Derived */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Farm Soil Profile */}
          <div className="glass-card-solid rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Soil Health Profile
              </span>
              <div className="w-8 h-8 rounded-lg bg-secondary/15 text-primary flex items-center justify-center">
                <Activity className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-lg font-bold text-foreground truncate">
                  {profile.soilType.split("(")[0].trim() || "Alluvial Loam"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Holding: {profile.landSizeAcres} Acres • {profile.irrigationType}
              </p>
            </div>
          </div>

          {/* Weather & Microclimate */}
          <div
            onClick={() => onNavigate("weather")}
            className="glass-card-solid rounded-xl p-4 flex flex-col justify-between cursor-pointer hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Weather & Microclimate
              </span>
              <div className="w-8 h-8 rounded-lg bg-sun/15 text-sun flex items-center justify-center">
                <CloudSun className="w-4 h-4 text-accent" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-2xl font-bold text-foreground">
                  {cachedWeather?.temp !== undefined ? `${Math.round(cachedWeather.temp)}°C` : "Syncing..."}
                </span>
                <span className="text-xs text-primary font-semibold">
                  {cachedWeather?.daily?.[0]?.condition || (cachedWeather?.rain !== undefined ? (cachedWeather.rain > 30 ? "Rain Risk" : "Partly Cloudy") : "Live Telemetry")}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {cachedWeather?.wind !== undefined
                  ? `Wind ${Math.round(cachedWeather.wind)} km/h • Humidity ${cachedWeather.humidity ?? 0}% • ${profile.district}`
                  : `Live Microclimate for ${profile.district}`}
              </p>
            </div>
          </div>

          {/* Mandi Benchmark with Dynamic 3-Crop Filter */}
          <div className="glass-card-solid rounded-xl p-4 flex flex-col justify-between border border-border/80 hover:border-primary/40 transition-all shadow-xs">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                Mandi Benchmark
                {liveMandiByCrop[selectedMandiCrop]?.isLive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live Real-Time APMC Feed" />
                )}
              </span>
              {/* Dynamic 3-Crop Segmented Selector */}
              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border-light">
                {crops.map((cropName) => {
                  const isSelected = selectedMandiCrop.toLowerCase() === cropName.toLowerCase();
                  return (
                    <button
                      key={cropName}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMandiCrop(cropName);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary text-on-primary shadow-2xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-card"
                      }`}
                      title={`Inspect ${cropName} benchmark`}
                    >
                      {cropName.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 cursor-pointer" onClick={() => onNavigate("market")}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-heading text-xl font-bold text-foreground">
                  {liveMandiByCrop[selectedMandiCrop]?.modal || "Syncing APMC..."}
                </span>
                {liveMandiByCrop[selectedMandiCrop]?.trend && (() => {
                  const trendText = (liveMandiByCrop[selectedMandiCrop]?.trend || "STABLE").toUpperCase();
                  const isBearish = trendText.includes("BEAR") || trendText.includes("DOWN");
                  return (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border shadow-2xs ${
                        isBearish
                          ? "bg-rose-100 text-rose-800 border-rose-300"
                          : "bg-emerald-100 text-emerald-800 border-emerald-300"
                      }`}
                    >
                      {isBearish ? <TrendingDown className="w-3 h-3 text-rose-700" /> : <TrendingUp className="w-3 h-3 text-emerald-700" />}
                      {trendText}
                    </span>
                  );
                })()}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                {liveMandiByCrop[selectedMandiCrop]?.band
                  ? `${selectedMandiCrop} • Band: ${liveMandiByCrop[selectedMandiCrop].band}`
                  : `${selectedMandiCrop} • Live APMC Modal • ${profile.district}`}
              </p>
            </div>
          </div>

          {/* Cultivated Crops & Holding Portfolio */}
          <div
            onClick={() => onNavigate("market")}
            className="glass-card-solid rounded-xl p-4 flex flex-col justify-between cursor-pointer hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Crop Portfolio
              </span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Sprout className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-xl font-bold text-foreground">
                  {profile.primaryCrops.length} Active Crops
                </span>
                <span className="text-xs text-primary font-semibold">
                  {profile.landSizeAcres} Ac
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                {profile.primaryCrops.join(" • ")}
              </p>
            </div>
          </div>
        </div>


        {/* Weather Telemetry & Granular Outlook */}
        <div className="grid grid-cols-1 gap-6">
          {/* 7-Day Weather & Microclimate Forecast */}
          <div className="glass-card-solid rounded-2xl p-5 sm:p-6 flex flex-col justify-between h-full space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-border-light pb-3">
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                    <CloudSun className="w-4 h-4 text-primary" /> 7-Day Agro-Weather Outlook
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hyperlocal daily temperature ranges, rain chances, and conditions for {profile.district}.
                  </p>
                </div>
              </div>

              {/* 7-Day Granular Bar Visualizer */}
              {forecastDays.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <CloudSun className="w-5 h-5 animate-spin text-primary" />
                  <span>Loading live 7-day microclimate telemetry for {profile.district}...</span>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1.5 pt-3 overflow-x-auto pb-1">
                  {forecastDays.map((d, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col items-center justify-between p-2 rounded-xl bg-card border border-border/80 text-center min-w-[58px] hover:border-primary/40 transition-colors group"
                    >
                      <span className="text-[11px] font-bold text-foreground">{d.day}</span>
                      <span className="text-[9px] text-muted-foreground">{d.date}</span>

                      {/* Weather Condition Icon */}
                      <div className="my-1 text-primary">
                        {d.rainChance > 40 ? (
                          <Droplets className="w-3.5 h-3.5 text-blue-500" />
                        ) : d.rainChance > 20 ? (
                          <CloudSun className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>

                      {/* Temperature Bar Visualizer */}
                      <div className="my-1.5 w-full flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-foreground">{d.high}°</span>
                        <div className="w-2 h-12 bg-muted/40 rounded-full relative overflow-hidden flex flex-col justify-end">
                          <div
                            className="w-full rounded-full transition-all duration-500"
                            style={{
                              height: `${Math.min(100, Math.max(25, ((d.high - 15) / 25) * 100))}%`,
                              backgroundColor: d.high > 35 ? "#ef4444" : d.high > 30 ? "#f59e0b" : "#10b981",
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground">{d.low}°</span>
                      </div>

                      {/* Rain Chance Metric */}
                      <div className="flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400 font-medium mb-1">
                        <Droplets className="w-2.5 h-2.5" />
                        <span>{d.rainChance}%</span>
                      </div>

                      {/* Clean Condition Badge */}
                      <span className="text-[9px] font-semibold text-muted-foreground px-1 py-0.5 rounded bg-muted/50 w-full truncate">
                        {d.condition}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Granular Field Indicators Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-3 border-t border-border-light text-xs">
                <div className="p-2 rounded-lg bg-muted/20 flex flex-col">
                  <span className="text-[10px] text-muted-foreground">Relative Humidity</span>
                  <span className="font-semibold text-foreground mt-0.5">
                    {cachedWeather?.humidity !== undefined ? `${cachedWeather.humidity}%` : "—"}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-muted/20 flex flex-col">
                  <span className="text-[10px] text-muted-foreground">Wind Velocity</span>
                  <span className="font-semibold text-foreground mt-0.5">
                    {cachedWeather?.wind !== undefined ? `${Math.round(cachedWeather.wind)} km/h` : "—"}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-muted/20 flex flex-col">
                  <span className="text-[10px] text-muted-foreground">Solar UV Index</span>
                  <span className="font-semibold text-foreground mt-0.5">
                    {cachedWeather?.uv_index !== undefined ? `${cachedWeather.uv_index}` : "—"}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-muted/20 flex flex-col">
                  <span className="text-[10px] text-muted-foreground">Air Quality</span>
                  <span className="font-semibold text-foreground mt-0.5 truncate">
                    {cachedWeather?.air_quality_index !== undefined ? `AQI ${cachedWeather.air_quality_index}` : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Weather Card Matching Footer */}
            <div className="pt-2 text-[11px] text-muted-foreground flex items-center justify-between border-t border-border-light">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Open-Meteo verified telemetry
              </span>
              <span>Hyperlocal for {profile.district}</span>
            </div>
          </div>

        </div>

        {/* User Activity Tracking Timeline + Launchers */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* User Activity Timeline */}
          <div className="lg:col-span-7 glass-card-solid rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-light pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Farm Activity Timeline
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recent activity records across your advisory, market, and field telemetry sessions.
                </p>
              </div>
            </div>

            <div className="max-h-[224px] overflow-y-auto scrollbar-thin space-y-2.5 pr-1.5">
              {activities.length === 0 ? (
                <div className="p-6 text-center rounded-xl border border-dashed border-border bg-muted/10">
                  <p className="text-xs font-semibold text-foreground">No farm queries logged yet</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Ask the AI Krishi Officer an agronomy question, check live APMC mandi rates, or inspect weather telemetry.
                  </p>
                </div>
              ) : (
                activities.slice(0, 5).map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-border-light bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-primary shrink-0 mt-0.5">
                      {act.type === "advisory" && <MessageSquare className="w-4 h-4" />}
                      {act.type === "weather" && <CloudSun className="w-4 h-4" />}
                      {act.type === "market" && <Coins className="w-4 h-4" />}
                      {act.type === "media" && <Camera className="w-4 h-4" />}
                      {act.type === "profile" && <ShieldCheck className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground truncate">
                          {act.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>
                          {new Date(act.timestamp).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {act.description}
                      </p>
                    </div>

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-card border border-border text-foreground shrink-0">
                      {act.badge}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Enterprise Action Launchers */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-card-solid rounded-2xl p-5 space-y-3">
              <h3 className="font-heading text-sm font-bold text-foreground">
                Direct Agronomy Workflows
              </h3>
              <p className="text-xs text-muted-foreground">
                Launch purpose-built intelligence modules calibrated for {profile.district}, {profile.state}.
              </p>

              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => onNavigate("advisory")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Ask Krishi Officer</p>
                      <p className="text-[11px] text-muted-foreground">Multi-agent scientific RAG with ICAR guidelines</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>

                <button
                  onClick={() => onNavigate("weather")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sun/10 text-sun flex items-center justify-center group-hover:bg-accent group-hover:text-on-accent transition-colors">
                      <CloudSun className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Microclimate & Weather Outlook</p>
                      <p className="text-[11px] text-muted-foreground">Hyperlocal forecast & precipitation telemetry</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>

                <button
                  onClick={() => onNavigate("market")}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors cursor-pointer group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">APMC Mandi Intelligence</p>
                      <p className="text-[11px] text-muted-foreground">Live modal rates & selling advisories</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
