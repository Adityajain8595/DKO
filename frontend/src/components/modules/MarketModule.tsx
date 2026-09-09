"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useFarmer } from "@/context/FarmerContext";
import { API_BASE_URL } from "@/lib/api";
import type { MandiRate } from "@/lib/types";

interface MandiBackendResponse {
  status?: string;
  crop?: string;
  state?: string;
  modal?: string;
  band?: string;
  trend?: string;
  advice?: string;
  sources?: string[];
  items?: MandiRate[];
}

export default function MarketModule() {
  const { profile } = useFarmer();
  const [searchTerm, setSearchTerm] = useState("");

  // Portfolio crops strictly from user profile (e.g. Wheat & Basmati Rice)
  const portfolioCrops = (profile.primaryCrops && profile.primaryCrops.length > 0)
    ? profile.primaryCrops
    : ["Wheat", "Basmati Rice"];

  // Single page-level filter: "All" or a specific crop from profile
  const filterOptions = ["All", ...portfolioCrops];
  const [pageFilterCrop, setPageFilterCrop] = useState<string>("All");

  // In-memory cache map for all responses: keyed by "All", "Wheat", "Basmati Rice"
  const [marketDataMap, setMarketDataMap] = useState<Record<string, MandiBackendResponse>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  // Unified loader that checks sessionStorage cache first, then calls backend if missing
  const loadMarketDataFor = async (cropKey: string) => {
    const isAll = cropKey.toLowerCase() === "all";
    const apiCropParam = isAll ? portfolioCrops.join(", ") : cropKey;
    const sessionKey = isAll
      ? `dko_market_portfolio_${profile.district.toLowerCase()}_${profile.state.toLowerCase()}`
      : `dko_market_${cropKey.toLowerCase().trim().replace(/[\s,]+/g, "_")}_${profile.state.toLowerCase()}`;

    // 1. Check session storage cache (purge any stale pre-Agmarknet entries)
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(sessionKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const staleText = JSON.stringify(parsed.data || "");
          const isStale =
            Date.now() - parsed.timestamp >= 30 * 60 * 1000 ||
            !parsed.data?.modal ||
            staleText.includes("Kisandeals") ||
            staleText.includes("CommodityOnline") ||
            staleText.includes("2,650") ||
            staleText.includes("hardcoded");
          if (!isStale) {
            setMarketDataMap((prev) => ({ ...prev, [cropKey]: parsed.data }));
            return;
          }
          // Remove stale/old entry
          sessionStorage.removeItem(sessionKey);
        } catch {
          sessionStorage.removeItem(sessionKey);
        }
      }
    }

    // 2. Fetch live data from backend
    setLoadingMap((prev) => ({ ...prev, [cropKey]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/market`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop: apiCropParam,
          state: profile.state,
          profile: {
            name: profile.name,
            state: profile.state,
            district: profile.district,
            crops: apiCropParam,
          },
        }),
      });
      const data = await res.json();
      if (data && data.status === "success") {
        setMarketDataMap((prev) => ({ ...prev, [cropKey]: data }));
        if (typeof window !== "undefined") {
          sessionStorage.setItem(sessionKey, JSON.stringify({ timestamp: Date.now(), data }));
        }
      }
    } catch (err) {
      console.warn(`Error fetching market data for ${cropKey}:`, err);
    } finally {
      setLoadingMap((prev) => ({ ...prev, [cropKey]: false }));
    }
  };

  // On mount and when profile changes, fetch/load all filter options in parallel
  useEffect(() => {
    filterOptions.forEach((opt) => {
      loadMarketDataFor(opt);
    });
  }, [profile.district, profile.state, profile.name, portfolioCrops.join(",")]);

  // Current active data based on single page filter
  const currentData = marketDataMap[pageFilterCrop] || null;
  const isLoading = Boolean(loadingMap[pageFilterCrop]);

  // Active items for the rates table:
  const activeItems: MandiRate[] = React.useMemo(() => {
    if (currentData?.items && currentData.items.length > 0) {
      return currentData.items;
    }
    // If viewing "All" and data isn't fully loaded in currentData, combine items from individual crops
    if (pageFilterCrop === "All") {
      const combined: MandiRate[] = [];
      const seen = new Set<string>();
      portfolioCrops.forEach((c) => {
        const cData = marketDataMap[c];
        if (cData?.items) {
          for (const it of cData.items) {
            const key = `${it.commodity}-${it.mandi}-${it.variety}`;
            if (!seen.has(key)) {
              seen.add(key);
              combined.push(it);
            }
          }
        }
      });
      return combined;
    }
    return [];
  }, [currentData, pageFilterCrop, marketDataMap, portfolioCrops]);

  // Filter items based on active search input
  const filteredRates = activeItems.filter((rate) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (rate.commodity || "").toLowerCase().includes(term) ||
      (rate.mandi || "").toLowerCase().includes(term) ||
      (rate.variety || "").toLowerCase().includes(term) ||
      (rate.district || "").toLowerCase().includes(term)
    );
  });

  // Current metrics for KPI cards
  const modalText = currentData?.modal || (isLoading ? "Syncing..." : "—");
  const bandText = currentData?.band || (isLoading ? "Calculating..." : "—");
  const trendText = (currentData?.trend || "STABLE").toUpperCase();

  const isBullish = trendText.includes("BULL") || trendText.includes("UP");
  const isBearish = trendText.includes("BEAR") || trendText.includes("DOWN");

  return (
    <div className="flex-1 w-full overflow-y-auto">
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Main Header */}
        <div className="border-b border-border-light pb-4">
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
            Mandi Rates & Market Intelligence
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time APMC mandi modal prices, arrival volumes, and AI selling advisories.
          </p>
        </div>

        {/* Single Page-Level Filter: All and Profile Crops (Exactly matching user request) */}
        <div className="flex items-center gap-2">
          {filterOptions.map((crop) => {
            const isSelected = pageFilterCrop.toLowerCase() === crop.toLowerCase();
            return (
              <button
                key={crop}
                onClick={() => setPageFilterCrop(crop)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary text-on-primary shadow-xs"
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border"
                }`}
              >
                {crop}
              </button>
            );
          })}
        </div>

        {/* Dynamic Live Telemetry Component (Consistent with Selected Filter) */}
        <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                {pageFilterCrop === "All"
                  ? `Live Portfolio Telemetry (${portfolioCrops.join(" & ")})`
                  : `Live Telemetry (${pageFilterCrop})`}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                State: {currentData?.state || profile.state} • District: {profile.district}
              </span>
            </div>

            {isLoading && !currentData ? (
              <div className="flex items-center gap-2 py-2 text-xs font-medium text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing APMC arrival trends & commercial selling advisory...</span>
              </div>
            ) : (
              <p className="text-xs text-foreground leading-relaxed font-medium">
                {currentData?.advice ||
                  `Real-time market telemetry for ${pageFilterCrop === "All" ? portfolioCrops.join(" and ") : pageFilterCrop} across ${profile.district} APMCs.`}
              </p>
            )}

            {/* Verified Sources with Clean Website Names (No Raw URLs) */}
            {currentData?.sources && currentData.sources.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Verified Sources:
                </span>
                {currentData.sources.map((sourceName, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-card/80 border border-border text-[11px] font-medium text-foreground shadow-2xs"
                  >
                    {sourceName}
                    <ExternalLink className="w-2.5 h-2.5 text-muted-foreground" />
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="md:text-right shrink-0 border-t md:border-t-0 md:border-l border-primary/20 pt-3 md:pt-0 md:pl-5">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {pageFilterCrop === "All" ? "Portfolio Modal Summary" : `${pageFilterCrop} Modal Rate`}
            </div>
            <div className="font-heading text-lg sm:text-xl font-bold text-primary mt-0.5">
              {modalText}
            </div>
            <div className="text-xs font-medium text-muted-foreground mt-0.5">
              Band: {bandText}
            </div>
          </div>
        </div>

        {/* 3 Live Mandi Metric Highlights (Controlled by Single Page Filter) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Modal Rate */}
          <div className="glass-card-solid rounded-xl p-4 flex flex-col justify-between border border-border/80 shadow-xs">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              {pageFilterCrop === "All" ? "Portfolio Modal Rate" : `${pageFilterCrop} Modal Rate`}
            </span>
            {isLoading && !currentData ? (
              <div className="flex items-center gap-2 my-3 py-0.5 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Syncing APMC yard rates...</span>
              </div>
            ) : (
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-heading text-2xl font-bold text-foreground">
                  {modalText}
                </span>
                {/* Dynamic Trend Sticker */}
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center border ${
                    isBullish
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : isBearish
                      ? "bg-rose-100 text-rose-800 border-rose-300"
                      : "bg-blue-100 text-blue-800 border-blue-300"
                  }`}
                >
                  {isBullish ? (
                    <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  ) : isBearish ? (
                    <TrendingDown className="w-3.5 h-3.5 mr-1 text-rose-600" />
                  ) : (
                    <Minus className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  )}
                  {trendText}
                </span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Audited for {profile.district}, {profile.state}
            </p>
          </div>

          {/* Card 2: Trading Band */}
          <div className="glass-card-solid rounded-xl p-4 flex flex-col justify-between border border-border/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                APMC Arrival Band
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Verified
              </span>
            </div>
            {isLoading && !currentData ? (
              <div className="flex items-center gap-2 my-3 py-0.5 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Calculating arrival range...</span>
              </div>
            ) : (
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-heading text-xl font-bold text-foreground">
                  {bandText}
                </span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Min / Max arrivals recorded across regional mandis
            </p>
          </div>

          {/* Card 3: Market Sentiment */}
          <div className="glass-card-solid rounded-xl p-4 flex flex-col justify-between border border-border/80 shadow-xs">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Market Sentiment
            </span>
            {isLoading && !currentData ? (
              <div className="flex items-center gap-2 my-3 py-0.5 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Analyzing market volume...</span>
              </div>
            ) : (
              <div className="flex items-baseline justify-between mt-2">
                <span className="font-heading text-2xl font-bold text-foreground uppercase tracking-tight">
                  {trendText}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {profile.district} APMC
                </span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Trade liquidity sentiment for {pageFilterCrop === "All" ? "all crops" : pageFilterCrop} in {profile.district}
            </p>
          </div>
        </div>

        {/* Mandi Rates Table Card (Search only, redundant secondary filter completely removed) */}
        <div className="glass-card-solid rounded-2xl p-4 space-y-3 border border-border">
          <div className="flex items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search commodity, variety, or mandi yard..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-primary"
              />
            </div>

            <div className="text-xs font-semibold text-muted-foreground hidden sm:block">
              Showing arrivals for <span className="text-foreground font-bold">{pageFilterCrop}</span>
            </div>
          </div>

          {/* Rates Table: Displays genuine APMC yards from Agmarknet API */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Commodity & Grade</th>
                  <th className="py-3 px-3">APMC Mandi Yard</th>
                  <th className="py-3 px-3">Modal Rate</th>
                  <th className="py-3 px-3">Min / Max Range</th>
                  <th className="py-3 px-3">Trend</th>
                  <th className="py-3 px-3 text-right">Last Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {isLoading && activeItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                      <p className="text-xs font-medium text-muted-foreground">
                        Retrieving live APMC mandi data from Agmarknet API for {pageFilterCrop}...
                      </p>
                    </td>
                  </tr>
                ) : filteredRates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No mandi records matching &ldquo;{searchTerm || pageFilterCrop}&rdquo; in {profile.district}.
                    </td>
                  </tr>
                ) : (
                  filteredRates.map((rate, idx) => {
                    const rowTrend = (rate.trend || "Stable").toLowerCase();
                    const rowIsBullish = rowTrend.includes("bull") || rowTrend.includes("up");
                    const rowIsBearish = rowTrend.includes("bear") || rowTrend.includes("down");

                    return (
                      <tr key={rate.id || idx} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-3">
                          <p className="font-bold text-foreground">{rate.commodity}</p>
                          <p className="text-[11px] text-muted-foreground">{rate.variety || "Standard"}</p>
                        </td>
                        <td className="py-3.5 px-3">
                          <p className="font-medium text-foreground">{rate.mandi}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {rate.district || profile.district}, {rate.state || profile.state}
                          </p>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-heading text-base font-bold text-foreground">
                            {rate.modalPrice ? `₹${rate.modalPrice.toLocaleString()}` : "N/A"}
                          </span>
                          <span className="text-[10px] text-muted-foreground"> /qtl</span>
                        </td>
                        <td className="py-3.5 px-3 text-muted-foreground font-medium">
                          {rate.minPrice && rate.maxPrice
                            ? `₹${rate.minPrice.toLocaleString()} – ₹${rate.maxPrice.toLocaleString()}`
                            : "Variable"}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1 font-bold">
                            {rowIsBullish ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <TrendingUp className="w-3 h-3 mr-1 text-emerald-600" /> Bullish
                              </span>
                            ) : rowIsBearish ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                <TrendingDown className="w-3 h-3 mr-1 text-rose-600" /> Bearish
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                <Minus className="w-3 h-3 mr-1 text-blue-600" /> Stable
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right text-muted-foreground">
                          {rate.lastUpdated || "Live"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
