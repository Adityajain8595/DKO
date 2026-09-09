"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import {
  Sprout,
  ArrowRight,
  ShieldCheck,
  Microscope,
  TrendingUp,
  CloudSun,
  FileCheck,
  CheckCircle2,
  Cpu,
  Layers,
  ChevronRight,
  Database,
  Zap,
  GitMerge,
  FlaskConical,
  Globe,
  BarChart3,
  Thermometer,
  BookOpenCheck,
} from "lucide-react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"vision" | "mandi" | "weather">("vision");

  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <Navbar />

      {/* Decorative ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-primary/15 via-accent/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-96 -left-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[800px] -right-48 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ==================== HERO SECTION ==================== */}
      <section className="pt-28 pb-20 sm:pt-36 sm:pb-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Col: Identity & Value Proposition */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-7 space-y-6 text-left"
            >
              {/* System Identity Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>LangGraph Agentic RAG · v4.0.0 · ICAR-Verified Intelligence</span>
              </div>

              {/* Primary Headline */}
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
                Your Dedicated <br />
                <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 bg-clip-text text-transparent">
                  Digital Krishi Officer
                </span>, <br />
                On-Field 24/7.
              </h1>

              {/* System Description */}
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                An autonomous multi-tool agronomic intelligence system grounded in verified ICAR extension research,
                live Agmarknet APMC price telemetry, and Open-Meteo hyperlocal microclimate data.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/auth"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-on-primary font-semibold hover:bg-primary-dark transition-all duration-200 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 cursor-pointer text-sm"
                >
                  <span>Launch Advisory Console</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#showcase"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-card text-foreground font-semibold border border-border hover:bg-muted transition-colors text-sm cursor-pointer"
                >
                  <span>Explore System Capabilities</span>
                </a>
              </div>

              {/* Key System Metrics */}
              <div className="pt-4 border-t border-border-light grid grid-cols-3 gap-4 text-left">
                <div>
                  <div className="font-heading text-xl sm:text-2xl font-bold text-foreground">73,600+</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Indexed ICAR Knowledge Vectors</div>
                </div>
                <div>
                  <div className="font-heading text-xl sm:text-2xl font-bold text-foreground">8</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Specialist Orchestration Tools</div>
                </div>
                <div>
                  <div className="font-heading text-xl sm:text-2xl font-bold text-foreground">v4.0.0</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Production Release · SSE Streaming</div>
                </div>
              </div>
            </motion.div>

            {/* Right Col: Interactive System Demonstration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-5"
            >
              <div className="glass-card-solid rounded-3xl p-5 sm:p-6 border border-border shadow-xl relative backdrop-blur-md">
                {/* System Header */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-border-light">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                      DK
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading font-bold text-sm text-foreground">Digital Krishi Officer</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">Agentic RAG · Multimodal · Streaming</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                    Live Demo
                  </span>
                </div>

                {/* Capability Selector Tabs */}
                <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-xl text-xs font-semibold mb-4">
                  <button
                    onClick={() => setActiveTab("vision")}
                    className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                      activeTab === "vision" ? "bg-card text-primary shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Pathology
                  </button>
                  <button
                    onClick={() => setActiveTab("mandi")}
                    className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                      activeTab === "mandi" ? "bg-card text-primary shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Mandi
                  </button>
                  <button
                    onClick={() => setActiveTab("weather")}
                    className={`py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                      activeTab === "weather" ? "bg-card text-primary shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Weather
                  </button>
                </div>

                {/* Demonstration Content */}
                <AnimatePresence mode="wait">
                  {activeTab === "vision" && (
                    <motion.div
                      key="vision"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-3"
                    >
                      <div className="p-3.5 rounded-xl bg-muted/60 border border-border-light text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-muted-foreground font-medium">
                          <span>Diagnostic Finding:</span>
                          <span className="font-bold text-destructive">Agrotis ipsilon (Black Cutworm)</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground font-medium">
                          <span>Observed Symptoms:</span>
                          <span className="text-foreground">Seedling severed at soil line; foliar clipping</span>
                        </div>
                        <div className="pt-2 border-t border-border-light text-[11px] text-muted-foreground">
                          <span className="font-bold text-primary">IPM Protocol:</span> Apply Chlorpyrifos 20% EC @ 2.5 ml/L along crop rows at dusk; deploy pheromone lure traps at field margins.
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                        <span>Validated via ICAR Standard Entomology Repositories · Vision Engine: Qwen3.8B-27B</span>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "mandi" && (
                    <motion.div
                      key="mandi"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-3"
                    >
                      <div className="p-3.5 rounded-xl bg-muted/60 border border-border-light space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-foreground">Wheat (Kalyan Sona / FAQ Grade)</div>
                            <div className="text-[10px] text-muted-foreground">Karnal APMC Market Yard, Haryana</div>
                          </div>
                          <div className="text-right">
                            <div className="font-heading text-lg font-extrabold text-primary">₹2,425 <span className="text-xs font-normal text-muted-foreground">/Qtl</span></div>
                            <div className="text-[10px] text-emerald-600 font-semibold">+₹150 premium over MSP (₹2,275)</div>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-border-light text-[11px] text-muted-foreground">
                          <span className="font-bold text-foreground">Disposition Strategy:</span> Bullish arrival trend observed. Recommended to offload 60% of Grade-A inventory within the current price window.
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                        <span>Live-synchronized via Agmarknet 2.0 & UPAg APMC Price Gateway</span>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "weather" && (
                    <motion.div
                      key="weather"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-3"
                    >
                      <div className="p-3.5 rounded-xl bg-muted/60 border border-border-light space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CloudSun className="w-6 h-6 text-amber-500" />
                            <div>
                              <div className="text-xs font-bold text-foreground">27.8°C · Relative Humidity 58%</div>
                              <div className="text-[10px] text-muted-foreground">Wind: 7.4 km/h (Calm) · Precipitation Probability: 5%</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            OPTIMAL TODAY
                          </span>
                        </div>
                        <div className="pt-2 border-t border-border-light text-[11px] text-muted-foreground">
                          <span className="font-bold text-foreground">Agronomic Assessment:</span> Minimal foliar drift risk. Complete pesticide and micronutrient foliar application before 10:30 AM.
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                        <span>Hyperlocal Forecast via Open-Meteo High-Resolution Microclimate API</span>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>

                {/* Console Entry Action */}
                <div className="mt-4 pt-3 border-t border-border-light flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Supports English & Hindi agronomic queries</span>
                  <Link
                    href="/auth"
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    <span>Launch Advisory Console</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ==================== CORE INTELLIGENCE PILLARS ==================== */}
      <section id="showcase" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-muted/30 border-y border-border-light">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground">
              Engineered for Real Indian Field Conditions
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Grounded exclusively in verified agronomic data — no synthetic placeholders, hallucinated market rates, or unattributed generic advice.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Pillar 1: Optical Pathology */}
            <div className="glass-card-solid rounded-2xl p-6 border border-border hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Microscope className="w-5 h-5" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">Optical Pathology Engine</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Submit crop specimen images for multimodal AI-assisted diagnosis. The vision model identifies pathogens, foliar necrosis patterns, and infestation severity, then cross-references ICAR IPM treatment protocols.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border-light text-[11px] font-semibold text-primary">
                50+ Indexed Crop Pathologies · Qwen3.8B-27B Vision
              </div>
            </div>

            {/* Pillar 2: APMC Price Intelligence */}
            <div className="glass-card-solid rounded-2xl p-6 border border-border hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">APMC Price Intelligence</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Direct integration with Agmarknet 2.0 and UPAg real-time feeds. Tracks daily APMC modal arrival prices, benchmarks against prevailing MSP, and generates optimal commodity disposition windows.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border-light text-[11px] font-semibold text-primary">
                Live Agmarknet & UPAg Feed Synchronization
              </div>
            </div>

            {/* Pillar 3: Microclimate Advisory */}
            <div className="glass-card-solid rounded-2xl p-6 border border-border hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <CloudSun className="w-5 h-5" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">Microclimate Spray & Irrigation Advisory</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Hyperlocal telemetry computes pesticide aerosol drift thresholds, droplet evaporation risk indices, UV radiation intensity, and root-zone irrigation scheduling requirements by district.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border-light text-[11px] font-semibold text-primary">
                Open-Meteo High-Resolution Forecast API
              </div>
            </div>

            {/* Pillar 4: Evidence Auditor */}
            <div className="glass-card-solid rounded-2xl p-6 border border-border hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">Agricultural Evidence Auditor</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Cross-checks farmer context against verified agronomy references, official guidance, and live agricultural information before an advisory is returned.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border-light text-[11px] font-semibold text-primary">
                Verified agricultural source gateways
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== LANGGRAPH PIPELINE ARCHITECTURE ==================== */}
      <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground">
              Autonomous LangGraph Orchestration Pipeline
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              A three-node stateful reasoning graph resolves complex agronomic queries with traceable, auditable tool execution.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Node 01 */}
            <div className="glass-card-solid rounded-2xl p-6 border border-border relative">
              <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center text-xs font-bold mb-4">
                01
              </div>
              <h3 className="font-heading text-base font-bold text-foreground mb-2">Context Preprocessing</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The preprocessing node extracts farmer profile context — registered crops, district, soil classification, and landholding — then resolves cross-turn pronoun references and rewrites the query using a dedicated fast-inference model before tool dispatch.
              </p>
              <div className="mt-4 pt-3 border-t border-border-light flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                <Cpu className="w-3.5 h-3.5 text-primary" />
                <span>Query Rewriter · GPT-OSS-20B</span>
              </div>
            </div>

            {/* Node 02 */}
            <div className="glass-card-solid rounded-2xl p-6 border border-border relative">
              <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center text-xs font-bold mb-4">
                02
              </div>
              <h3 className="font-heading text-base font-bold text-foreground mb-2">Multi-Tool Orchestration</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The deep reasoning supervisor model autonomously selects and dispatches from 8 specialist tools — querying 73,600+ Pinecone hybrid-search vectors, fetching live APMC mandi rates, retrieving microclimate telemetry, performing web cross-verification, and running optical crop diagnosis.
              </p>
              <div className="mt-4 pt-3 border-t border-border-light flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                <GitMerge className="w-3.5 h-3.5 text-primary" />
                <span>Supervisor · GPT-OSS-120B · ToolNode</span>
              </div>
            </div>

            {/* Node 03 */}
            <div className="glass-card-solid rounded-2xl p-6 border border-border relative">
              <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center text-xs font-bold mb-4">
                03
              </div>
              <h3 className="font-heading text-base font-bold text-foreground mb-2">Rubric Audit & Advisory Synthesis</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All tool outputs pass through an agronomic rubric auditor that enforces source attribution, flags unverified claims, and ensures dosage and safety constraints before synthesizing a final structured advisory with verifiable citations delivered over SSE.
              </p>
              <div className="mt-4 pt-3 border-t border-border-light flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                <BookOpenCheck className="w-3.5 h-3.5 text-primary" />
                <span>Rubric Auditor · SSE Streaming Response</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== STACK PROVENANCE STRIP ==================== */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 bg-muted/40 border-y border-border-light">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-7">
            Technology Provenance
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: GitMerge,    label: "LangGraph",     sub: "Agentic Orchestration" },
              { icon: Database,    label: "Pinecone",      sub: "Hybrid Vector Search" },
              { icon: Zap,         label: "Groq Inference",sub: "GPT-OSS-120B Reasoning" },
              { icon: Thermometer, label: "Open-Meteo",    sub: "Microclimate Telemetry" },
              { icon: BarChart3,   label: "Agmarknet",     sub: "APMC Price Gateway" },
              { icon: Globe,       label: "Tavily",        sub: "Web Claim Verification" },
            ].map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border text-center"
              >
                <Icon className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-xs font-bold text-foreground">{label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CTA BANNER ==================== */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white p-8 sm:p-12 shadow-2xl relative overflow-hidden text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold">
            <Sprout className="w-4 h-4 text-emerald-300" />
            <span>Precision Agronomy for Every Indian Cultivator</span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold max-w-2xl mx-auto leading-tight">
            Access Your Digital Krishi Officer
          </h2>

          <p className="text-sm sm:text-base text-emerald-100 max-w-xl mx-auto leading-relaxed">
            Access evidence-grounded crop diagnostics, real-time APMC price intelligence, and hyperlocal field intelligence via a live-streaming agentic interface on any device.
          </p>

          <div className="pt-2">
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-emerald-900 font-bold text-sm hover:bg-emerald-50 transition-colors shadow-lg cursor-pointer"
            >
              <span>Launch Advisory Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-light py-8 px-4 text-center space-y-1">
        <p className="text-xs text-muted-foreground">
          Digital Krishi Officer (DKO) v4.0.0 · LangGraph Agentic RAG · Multimodal Agricultural Decision Intelligence
        </p>
        <p className="text-[11px] text-muted-foreground/70">
          Powered by ICAR Extension Repositories · Agmarknet APMC Gateway · Open-Meteo Telemetry
        </p>
      </footer>
    </main>
  );
}
