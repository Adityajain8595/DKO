"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import type {
  FarmerProfile,
  UserActivity,
  AlertNotification,
  DashboardModule,
} from "@/lib/types";

export const demoProfile: FarmerProfile = {
  id: "farmer-001",
  name: "Ramesh Kumar",
  phone: "+91 98765 43210",
  email: "ramesh.kumar.karnal@gmail.com",
  state: "Haryana",
  district: "Karnal",
  tehsil: "Gharaunda",
  village: "Bastara",
  pincode: "132114",
  landSizeAcres: 4.5,
  primaryCrops: ["Wheat", "Basmati Rice"],
  soilType: "Alluvial Loam (pH 7.4)",
  irrigationType: "Tube well with drip line",
  alerts: {
    sms: true,
    email: true,
    whatsapp: true,
  },
  alertCategories: {
    weather: true,
    market: true,
  },
  isOnboarded: true,
  lastActive: new Date(),
};

export const freshProfile: FarmerProfile = {
  id: "farmer-001",
  name: "Ramesh Kumar",
  phone: "+91 98765 43210",
  email: "ramesh.kumar.karnal@gmail.com",
  state: "Haryana",
  district: "Karnal",
  tehsil: "Gharaunda",
  village: "Bastara",
  pincode: "132114",
  landSizeAcres: 5.0,
  primaryCrops: ["Wheat", "Basmati Rice"],
  soilType: "Alluvial Loam (pH 7.4)",
  irrigationType: "Tube well with drip line",
  alerts: {
    sms: true,
    email: true,
    whatsapp: true,
  },
  alertCategories: {
    weather: true,
    market: true,
  },
  isOnboarded: true,
  lastActive: new Date(),
};

export const demoActivities: UserActivity[] = [
  {
    id: "act-demo-1",
    type: "advisory",
    title: "Pesticide Spraying & Drift Assessment",
    description: "Evaluated foliar application safety window for Wheat plots against wind (16.5 km/h) and thermal thresholds.",
    badge: "Verified",
    timestamp: new Date(Date.now() - 3600 * 1000),
  },
  {
    id: "act-demo-2",
    type: "market",
    title: "Karnal APMC Rate Inspection",
    description: "Tracked live Wheat modal rates at ₹2,425/quintal with steady arrivals.",
    badge: "Live APMC",
    timestamp: new Date(Date.now() - 7200 * 1000),
  },
  {
    id: "act-demo-3",
    type: "weather",
    title: "Microclimate Telemetry Check",
    description: "Inspected temperature (35.2°C), wind speed (16.5 km/h), and air quality (AQI 143).",
    badge: "Telemetry",
    timestamp: new Date(Date.now() - 14400 * 1000),
  },
  {
    id: "act-demo-4",
    type: "media",
    title: "Field Specimen Image Upload",
    description: "Archived optical leaf photograph for diagnostic pathology record in Field Media.",
    badge: "Field Media",
    timestamp: new Date(Date.now() - 21600 * 1000),
  },
  {
    id: "act-demo-5",
    type: "advisory",
    title: "Fertilizer Schedule Optimization",
    description: "Calculated basal and top-dressing urea application rates for Basmati Rice seedlings.",
    badge: "Agronomy",
    timestamp: new Date(Date.now() - 28800 * 1000),
  },
];

interface FarmerContextType {
  profile: FarmerProfile;
  updateProfile: (updated: Partial<FarmerProfile>) => void;
  activities: UserActivity[];
  logActivity: (activity: Omit<UserActivity, "id" | "timestamp">) => void;
  alerts: AlertNotification[];
  dismissAlert: (id: string) => void;
  activeModule: DashboardModule;
  setActiveModule: (mod: DashboardModule) => void;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  resetToDemoProfile: () => void;
  resetToFreshUser: () => void;
  loginAsFarmer: (newProfile: FarmerProfile) => void;
}

const FarmerContext = createContext<FarmerContextType | undefined>(undefined);

export function FarmerProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<FarmerProfile>(demoProfile);
  const [activities, setActivities] = useState<UserActivity[]>(demoActivities);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);

  const [activeModule, setActiveModule] = useState<DashboardModule>("overview");
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const isLoaded = useRef(false);

  useEffect(() => {
    try {
      const savedProf = localStorage.getItem("dko_farmer_profile");
      if (savedProf) {
        const parsed = JSON.parse(savedProf);
        if (!parsed.name || parsed.name === "Farmer" || !parsed.village) {
          setProfile(demoProfile);
          localStorage.setItem("dko_farmer_profile", JSON.stringify(demoProfile));
        } else {
          parsed.isOnboarded = true;
          setProfile(parsed);
        }
      } else {
        setProfile(demoProfile);
        localStorage.setItem("dko_farmer_profile", JSON.stringify(demoProfile));
      }

      const savedActs = localStorage.getItem("dko_activities");
      if (savedActs) {
        const parsed = JSON.parse(savedActs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setActivities(parsed.map((a: UserActivity) => ({
            ...a,
            timestamp: new Date(a.timestamp),
          })));
        } else {
          setActivities(demoActivities);
        }
      } else {
        setActivities(demoActivities);
      }

      const savedAlerts = localStorage.getItem("dko_alerts");
      if (savedAlerts) {
        const parsed = JSON.parse(savedAlerts);
        if (Array.isArray(parsed)) {
          setAlerts(parsed.map((al: AlertNotification) => ({
            ...al,
            timestamp: new Date(al.timestamp),
          })));
        }
      }
    } catch {}
    isLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!isLoaded.current) return;
    try {
      localStorage.setItem("dko_farmer_profile", JSON.stringify(profile));
    } catch {}
  }, [profile]);

  useEffect(() => {
    if (!isLoaded.current) return;
    try {
      localStorage.setItem("dko_activities", JSON.stringify(activities));
    } catch {}
  }, [activities]);

  useEffect(() => {
    if (!isLoaded.current) return;
    try {
      localStorage.setItem("dko_alerts", JSON.stringify(alerts));
    } catch {}
  }, [alerts]);

  const updateProfile = (updated: Partial<FarmerProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updated, lastActive: new Date() };
      if (
        (updated.district && updated.district !== prev.district) ||
        (updated.primaryCrops &&
          JSON.stringify(updated.primaryCrops) !== JSON.stringify(prev.primaryCrops))
      ) {
        logActivity({
          type: "profile",
          title: "Farm Profile & Territory Updated",
          description: `Location set to ${next.district}, ${next.state}. Mandi and weather data re-indexed.`,
          badge: "Real-time Sync",
        });
      }
      return next;
    });
  };

  const logActivity = (activity: Omit<UserActivity, "id" | "timestamp">) => {
    const newAct: UserActivity = {
      ...activity,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date(),
    };
    setActivities((prev) => [newAct, ...prev.slice(0, 19)]);
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const resetToDemoProfile = () => {
    setProfile(demoProfile);
    setActivities([]);
    setAlerts([]);
    try {
      localStorage.setItem("dko_farmer_profile", JSON.stringify(demoProfile));
      localStorage.removeItem("dko_activities");
      localStorage.removeItem("dko_alerts");
      localStorage.setItem("dko_is_demo", "true");
    } catch {}
  };

  const resetToFreshUser = () => {
    setProfile(freshProfile);
    setActivities([]);
    setAlerts([]);
    try {
      localStorage.removeItem("dko_farmer_profile");
      localStorage.removeItem("dko_activities");
      localStorage.removeItem("dko_alerts");
      localStorage.removeItem("dko_is_demo");
      localStorage.removeItem("dko_user");
      localStorage.removeItem("dko_sessions");
      localStorage.removeItem("dko_media");
    } catch {}
  };

  const loginAsFarmer = (newProfile: FarmerProfile) => {
    setProfile(newProfile);
    setActivities([]);
    setAlerts([]);
    try {
      localStorage.setItem("dko_farmer_profile", JSON.stringify(newProfile));
      localStorage.setItem("dko_user", JSON.stringify(newProfile));
      localStorage.removeItem("dko_is_demo");
      localStorage.removeItem("dko_activities");
      localStorage.removeItem("dko_alerts");
      localStorage.removeItem("dko_sessions");
      localStorage.removeItem("dko_media");
    } catch {}
  };

  return (
    <FarmerContext.Provider
      value={{
        profile,
        updateProfile,
        activities,
        logActivity,
        alerts,
        dismissAlert,
        activeModule,
        setActiveModule,
        isOnboardingOpen,
        setIsOnboardingOpen,
        isProfileModalOpen,
        setIsProfileModalOpen,
        resetToDemoProfile,
        resetToFreshUser,
        loginAsFarmer,
      }}
    >
      {children}
    </FarmerContext.Provider>
  );
}

export function useFarmer() {
  const context = useContext(FarmerContext);
  if (!context) {
    throw new Error("useFarmer must be used within a FarmerProvider");
  }
  return context;
}
