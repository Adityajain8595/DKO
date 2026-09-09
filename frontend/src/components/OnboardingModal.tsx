"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Check,
  Bell,
} from "lucide-react";
import { useFarmer } from "@/context/FarmerContext";
import DkoLogo from "./DkoLogo";

const IndianStates = [
  "Haryana",
  "Punjab",
  "Uttar Pradesh",
  "Madhya Pradesh",
  "Rajasthan",
  "Maharashtra",
  "Gujarat",
  "Karnataka",
];

const AvailableCrops = [
  "Wheat",
  "Basmati Rice",
  "Paddy (Non-Basmati)",
  "Mustard",
  "Cotton",
  "Sugarcane",
  "Potato",
  "Soyabean",
  "Maize",
  "Gram (Chana)",
];

export default function OnboardingModal() {
  const { profile, updateProfile, isOnboardingOpen, setIsOnboardingOpen, logActivity } =
    useFarmer();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State initialized from current profile
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [state, setState] = useState(profile.state);
  const [district, setDistrict] = useState(profile.district);
  const [tehsil, setTehsil] = useState(profile.tehsil);
  const [village, setVillage] = useState(profile.village);
  const [pincode, setPincode] = useState(profile.pincode);
  const [landSize, setLandSize] = useState(profile.landSizeAcres);
  const [crops, setCrops] = useState<string[]>(profile.primaryCrops);
  const [soilType, setSoilType] = useState(profile.soilType);
  const [irrigation, setIrrigation] = useState(profile.irrigationType);
  const [smsAlerts, setSmsAlerts] = useState(profile.alerts.sms);
  const [emailAlerts, setEmailAlerts] = useState(profile.alerts.email);
  const [whatsappAlerts, setWhatsappAlerts] = useState(profile.alerts.whatsapp);

  React.useEffect(() => {
    if (isOnboardingOpen) {
      setName(profile.name);
      setPhone(profile.phone);
      setEmail(profile.email);
      setState(profile.state);
      setDistrict(profile.district);
      setTehsil(profile.tehsil);
      setVillage(profile.village);
      setPincode(profile.pincode);
      setLandSize(profile.landSizeAcres);
      setCrops(profile.primaryCrops);
      setSoilType(profile.soilType);
      setIrrigation(profile.irrigationType);
      setSmsAlerts(profile.alerts?.sms ?? true);
      setEmailAlerts(profile.alerts?.email ?? false);
      setWhatsappAlerts(profile.alerts?.whatsapp ?? true);
    }
  }, [profile, isOnboardingOpen]);

  if (!isOnboardingOpen) return null;

  const toggleCrop = (crop: string) => {
    if (crops.includes(crop)) {
      if (crops.length > 1) {
        setCrops(crops.filter((c) => c !== crop));
      }
    } else {
      setCrops([...crops, crop]);
    }
  };

  const handleFinish = () => {
    updateProfile({
      name,
      phone,
      email,
      state,
      district,
      tehsil,
      village,
      pincode,
      landSizeAcres: Number(landSize),
      primaryCrops: crops,
      soilType,
      irrigationType: irrigation,
      alerts: {
        sms: smsAlerts,
        email: emailAlerts,
        whatsapp: whatsappAlerts,
      },
      isOnboarded: true,
    });

    logActivity({
      type: "profile",
      title: "Farmer Profile Configured",
      description: `Farm profile initialized for ${district}, ${state} with ${crops.join(", ")}.`,
      badge: "Onboarding Complete",
    });

    setIsOnboardingOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-light bg-muted/40 flex items-center justify-between">
          <DkoLogo size="sm" />
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                  step === s
                    ? "bg-primary text-on-primary"
                    : step > s
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto scrollbar-thin flex-1">
          <AnimatePresence mode="wait">
            {/* Step 1: Personal & Alert Channels */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Step 1: Farmer Identity & Alert Channels
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Provide your contact details so the DKO system can dispatch timely mandi price triggers and weather warnings.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Email Address (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ramesh.farmer@example.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Alert Notification Opt-ins */}
                <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      Dispatch Notification Channels
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer p-2 rounded-lg bg-card border border-border">
                      <input
                        type="checkbox"
                        checked={smsAlerts}
                        onChange={(e) => setSmsAlerts(e.target.checked)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span>SMS Alerts</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer p-2 rounded-lg bg-card border border-border">
                      <input
                        type="checkbox"
                        checked={whatsappAlerts}
                        onChange={(e) => setWhatsappAlerts(e.target.checked)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span>WhatsApp Alerts</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer p-2 rounded-lg bg-card border border-border">
                      <input
                        type="checkbox"
                        checked={emailAlerts}
                        onChange={(e) => setEmailAlerts(e.target.checked)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span>Email Briefs</span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Location Details */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Step 2: Geographical Territory & Mandi Hub
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Location data enables hyper-local meteorological forecasts and nearby APMC mandi price discovery.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      State
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                      {IndianStates.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      District (APMC Benchmark)
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                      <input
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="e.g. Karnal, Ludhiana, Nashik"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Tehsil / Sub-District
                    </label>
                    <input
                      type="text"
                      value={tehsil}
                      onChange={(e) => setTehsil(e.target.value)}
                      placeholder="e.g. Gharaunda"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Village / Settlement
                    </label>
                    <input
                      type="text"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="e.g. Bastara"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Postal PIN Code
                    </label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g. 132114"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Farm & Crop Profile */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Step 3: Farm Attributes & Crop Portfolio
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tailors fertilizer dosage schedules, field diagnostics, and RAG advisory to your farm.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">
                    Primary Cultivated Crops (Select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AvailableCrops.map((crop) => {
                      const isSelected = crops.includes(crop);
                      return (
                        <button
                          key={crop}
                          type="button"
                          onClick={() => toggleCrop(crop)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                            isSelected
                              ? "bg-primary text-on-primary border-primary shadow-xs"
                              : "bg-card text-foreground border-border hover:bg-muted"
                          }`}
                        >
                          {crop}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Landholding (Acres)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={landSize}
                      onChange={(e) => setLandSize(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Soil Type
                    </label>
                    <select
                      value={soilType}
                      onChange={(e) => setSoilType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                      <option value="Alluvial Loam (pH 7.4)">Alluvial Loam (pH 7.4)</option>
                      <option value="Clay Loam (pH 7.8)">Clay Loam (pH 7.8)</option>
                      <option value="Sandy Loam (pH 6.8)">Sandy Loam (pH 6.8)</option>
                      <option value="Black Cotton Soil (pH 8.1)">Black Cotton Soil (pH 8.1)</option>
                      <option value="Red Laterite (pH 6.2)">Red Laterite (pH 6.2)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Irrigation Infrastructure
                    </label>
                    <select
                      value={irrigation}
                      onChange={(e) => setIrrigation(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                      <option value="Tube well with drip line">Tube well with drip line</option>
                      <option value="Canal irrigation network">Canal irrigation network</option>
                      <option value="Rainfed / Monsoon dependent">Rainfed / Monsoon dependent</option>
                      <option value="Solar borewell sprinkler">Solar borewell sprinkler</option>
                    </select>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                  <p className="text-xs text-primary-dark">
                    Your profile will automatically synchronize across Mandi live feeds, ICAR RAG models, and weather intelligence.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-4 border-t border-border-light bg-muted/20 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Previous
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsOnboardingOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Skip for now
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as 2 | 3)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-dark transition-colors cursor-pointer shadow-xs"
            >
              Continue <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-dark transition-colors cursor-pointer shadow-sm"
            >
              Save & Launch Platform <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
