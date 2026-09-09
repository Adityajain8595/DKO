"use client";

import React from "react";
import {
  TrendingUp,
  CloudSun,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

interface QuickChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

function getSuggestionMeta(text: string) {
  const lower = text.toLowerCase();
  if (
    lower.includes("mandi") ||
    lower.includes("rate") ||
    lower.includes("price") ||
    lower.includes("apmc")
  ) {
    return {
      category: "Mandi & Market",
      icon: TrendingUp,
      bgClass: "bg-emerald-500/10",
      textClass: "text-emerald-700",
    };
  }
  if (
    lower.includes("spray") ||
    lower.includes("weather") ||
    lower.includes("wind") ||
    lower.includes("humidity")
  ) {
    return {
      category: "Weather & Spraying",
      icon: CloudSun,
      bgClass: "bg-sky-500/10",
      textClass: "text-sky-700",
    };
  }
  if (
    lower.includes("pest") ||
    lower.includes("infestation") ||
    lower.includes("icar") ||
    lower.includes("pathology") ||
    lower.includes("ipm")
  ) {
    return {
      category: "Crop Health & IPM",
      icon: ShieldAlert,
      bgClass: "bg-rose-500/10",
      textClass: "text-rose-700",
    };
  }
  return {
    category: "Agronomic Advisory",
    icon: Sparkles,
    bgClass: "bg-primary/10",
    textClass: "text-primary",
  };
}

export default function QuickChips({ suggestions, onSelect }: QuickChipsProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="h-px w-8 bg-border"></span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Suggested Inquiries
        </span>
        <span className="h-px w-8 bg-border"></span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto">
        {suggestions.map((s, i) => {
          const meta = getSuggestionMeta(s);
          const IconComponent = meta.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(s)}
              className="group flex items-start gap-3 p-3 rounded-xl bg-card border border-border/80 hover:border-primary/60 hover:bg-primary/[0.03] hover:shadow-xs transition-all duration-200 text-left cursor-pointer"
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${meta.bgClass} ${meta.textClass} group-hover:scale-105 transition-transform duration-200`}
              >
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                  {meta.category}
                </span>
                <p className="text-xs font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {s}
                </p>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all shrink-0 mt-0.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
