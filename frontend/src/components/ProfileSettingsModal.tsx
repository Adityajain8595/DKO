"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Check,
  Save,
  RotateCcw,
  Sparkles,
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

export default function ProfileSettingsModal() {
  const {
    profile,
    updateProfile,
    isProfileModalOpen,
    setIsProfileModalOpen,
    resetToDemoProfile,
  } = useFarmer();

  const [activeTab, setActiveTab] = useState<"general" | "territory" | "farm">(
    "general"
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Local draft state
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

  React.useEffect(() => {
    if (isProfileModalOpen) {
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
    }
  }, [profile, isProfileModalOpen]);

  if (!isProfileModalOpen) return null;

  const toggleCrop = (crop: string) => {
    if (crops.includes(crop)) {
      if (crops.length > 1) {
        setCrops(crops.filter((c) => c !== crop));
      }
    } else {
      setCrops([...crops, crop]);
    }
  };

  const handleSave = () => {
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
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setIsProfileModalOpen(false);
    }, 800);
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-3xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-light bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DkoLogo size="sm" />
            <div className="h-4 w-px bg-border hidden sm:block" />
            <span className="font-heading text-sm font-bold text-foreground">
              Farmer Profile & System Settings
            </span>
          </div>

          <button
            onClick={() => setIsProfileModalOpen(false)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border-light px-6 bg-card text-xs font-semibold overflow-x-auto">
          {[
            { id: "general", label: "Contact & Identity" },
            { id: "territory", label: "Geographic Location" },
            { id: "farm", label: "Crops & Acreage" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "general" | "territory" | "farm")}
              className={`py-3 px-3.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto scrollbar-thin flex-1 space-y-5">
          {activeTab === "general" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Manage your official farmer credentials for personalized advisory and audit trails.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Farmer Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Registered Mobile
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Email Notification Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "territory" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2.5 text-xs text-primary-dark">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <span>
                  Modifying your district will immediately recalibrate live Mandi rates, weather spray forecasts, and local APMC yard comparisons.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
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
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    District
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Tehsil
                  </label>
                  <input
                    type="text"
                    value={tehsil}
                    onChange={(e) => setTehsil(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Village / Block
                  </label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "farm" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Cultivated Crops Portfolio
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
                            ? "bg-primary text-on-primary border-primary"
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
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Landholding (Acres)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={landSize}
                    onChange={(e) => setLandSize(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Soil Texture
                  </label>
                  <input
                    type="text"
                    value={soilType}
                    onChange={(e) => setSoilType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Irrigation Source
                  </label>
                  <input
                    type="text"
                    value={irrigation}
                    onChange={(e) => setIrrigation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-light bg-muted/20 flex items-center justify-between">
          <button
            type="button"
            onClick={resetToDemoProfile}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset to Demo Profile
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary-dark transition-colors cursor-pointer shadow-xs"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-on-primary" /> Saved & Synced!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
