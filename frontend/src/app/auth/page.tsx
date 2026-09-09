"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sprout,
  Phone,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Sparkles,
} from "lucide-react";
import DemoLoginButton from "@/components/DemoLoginButton";
import DkoLogo from "@/components/DkoLogo";

import { useFarmer } from "@/context/FarmerContext";

export default function AuthPage() {
  const router = useRouter();
  const { loginAsFarmer } = useFarmer();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const rawDist = district.trim() || "Karnal";
      const parts = rawDist.split(",");
      const distName = parts[0].trim();
      const stateName = parts.length > 1 ? parts[1].trim() : "Haryana";

      const freshUser = {
        id: `farmer-${Date.now()}`,
        name: name.trim() || (tab === "signin" ? "Registered Farmer" : "Farmer"),
        phone: phoneNumber ? `+91 ${phoneNumber}` : "+91 98765 43210",
        email: "",
        state: stateName,
        district: distName,
        tehsil: "",
        village: "",
        pincode: "",
        landSizeAcres: 5.0,
        primaryCrops: ["Wheat", "Mustard"],
        soilType: "Alluvial Loam (pH 7.4)",
        irrigationType: "Tube well with drip line",
        alerts: { sms: true, email: false, whatsapp: true },
        alertCategories: { weather: true, market: true },
        isOnboarded: true,
        lastActive: new Date(),
      };
      loginAsFarmer(freshUser);
      router.push("/dashboard");
    }, 400);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between selection:bg-primary/20">
      {/* Top Navigation */}
      <header className="px-6 py-4 border-b border-border-light bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="cursor-pointer">
            <DkoLogo size="md" />
          </Link>

          <Link
            href="/"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden glass-card-solid border border-border shadow-xl">
          {/* Left / Decorative Agricultural Panel */}
          <div className="lg:col-span-5 bg-gradient-to-br from-primary/10 via-background to-primary/5 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border-light relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5" /> Empowering Indian Agriculture
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                Your AI Krishi Officer, Right in Your Pocket
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Connect your farm directly to verified agronomy science, official mandi markets, and hyperlocal weather intelligence.
              </p>

              <div className="mt-6 space-y-3.5">
                {[
                  "Voice-first diagnosis in your regional language",
                  "Direct live mandi rates via Agmarknet",
                  "Leaf pest & disease diagnosis in 3 seconds",
                  "Personalized crop, weather, and market intelligence",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-foreground">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border-light">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shadow-xs">
                  <Sprout className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Trusted by 50,000+ Farmers
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Across Haryana, Punjab, UP & Maharashtra
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right / Auth Form Panel */}
          <div className="lg:col-span-7 p-6 sm:p-10 bg-card flex flex-col justify-center">
            {/* Quick Demo Login Option */}
            <div className="mb-6">
              <DemoLoginButton />
            </div>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-border-light w-full" />
              <span className="bg-card px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Or Sign In with Mobile
              </span>
              <div className="border-t border-border-light w-full" />
            </div>

            {/* Tab Selector */}
            <div className="flex p-1 bg-muted rounded-xl mb-6">
              <button
                type="button"
                onClick={() => setTab("signin")}
                className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  tab === "signin"
                    ? "bg-card text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setTab("signup")}
                className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  tab === "signup"
                    ? "bg-card text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                New Farmer Registration
              </button>
            </div>

            {/* Forms */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {tab === "signup" && (
                  <motion.div
                    key="signup-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Full Name (नाम)
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        District & State (जिला / राज्य)
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          placeholder="e.g. Karnal, Haryana"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Mobile Number (मोबाइल नंबर)
                </label>
                <div className="flex rounded-xl border border-border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring/30 focus-within:border-primary transition-all">
                  <span className="inline-flex items-center px-3.5 bg-muted text-xs font-semibold text-primary border-r border-border">
                    IND +91
                  </span>
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="98765 43210"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-foreground">
                    6-Digit OTP / Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setOtpSent(true)}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {otpSent ? "Resend OTP" : "Send OTP"}
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-all tracking-wider"
                  />
                </div>
                {otpSent && (
                  <p className="text-[11px] text-secondary font-medium mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> OTP sent to +91 {phoneNumber} (Use demo code: 456789)
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-dark transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{tab === "signin" ? "Enter Advisory Workspace" : "Register & Continue"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Farmer data encrypted & compliant with Digital Agri-Stack protocols</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border-light">
        DKO Prototype • Digital Krishi Officer © 2025 • Ministry of Agriculture & Farmers Welfare aligned
      </footer>
    </div>
  );
}
