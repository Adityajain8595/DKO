"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import type { ReasoningStep } from "@/lib/types";

interface ReasoningStepsProps {
  steps: ReasoningStep[];
  isLive?: boolean;
}

export default function ReasoningSteps({ steps, isLive = false }: ReasoningStepsProps) {
  const [expanded, setExpanded] = useState(isLive || false);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 overflow-hidden shadow-2xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center ${isLive ? "animate-pulse" : ""}`}>
            <Sparkles className="w-3 h-3" />
          </div>
          <span className="tracking-wide">
            {isLive ? "Deep Reasoning in Progress..." : "Agent Deep Reasoning"}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 font-mono">
            {steps.length} {steps.length === 1 ? "thought" : "thoughts"}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-primary" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-primary" />
        )}
      </button>

      {expanded && (
        <div className="px-3.5 py-2.5 border-t border-primary/15 space-y-2 bg-card/60 backdrop-blur-xs text-xs">
          {steps.map((step, i) => {
            // Clean out any backend payload transfer or internal log artifacts
            let desc = (step.description || "").trim();
            desc = desc.replace(/vfs:\/\/\S+/g, "").replace("Completed execution.", "").replace("Offloaded payload to", "").trim();

            while (desc.toLowerCase().startsWith("reasoning:")) {
              desc = desc.slice(10).trim();
            }
            while (desc.toLowerCase().startsWith("summary:")) {
              desc = desc.slice(8).trim();
            }

            let badge = step.tool && step.tool !== "Reasoning" ? step.tool : "Analysis";
            let detail = desc;

            // If desc starts with "Agent Name: detail", extract the agent name cleanly
            if (desc.includes(":") && desc.indexOf(":") < 45) {
              const colonIdx = desc.indexOf(":");
              const candidate = desc.slice(0, colonIdx).trim();
              if (
                candidate.toLowerCase() !== "summary" &&
                candidate.toLowerCase() !== "question" &&
                candidate.toLowerCase() !== "note"
              ) {
                badge = candidate;
                detail = desc.slice(colonIdx + 1).trim();
              }
            }

            // Strip any remaining "Summary:" prefixes from detail
            while (detail.toLowerCase().startsWith("summary:")) {
              detail = detail.slice(8).trim();
            }

            return (
              <div
                key={i}
                className="flex items-start gap-2.5 text-xs text-foreground/85 leading-relaxed"
              >
                {step.status === "complete" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <span className="font-semibold text-primary-dark dark:text-primary-light text-[11px] uppercase tracking-wider mr-2 px-1.5 py-0.5 rounded bg-primary/10">
                    {badge}
                  </span>
                  <span className="text-foreground/90 whitespace-pre-wrap">{detail}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

