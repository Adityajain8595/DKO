export interface FarmerProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  state: string;
  district: string;
  tehsil: string;
  village: string;
  pincode: string;
  landSizeAcres: number;
  primaryCrops: string[];
  soilType: string;
  irrigationType: string;
  alerts: {
    sms: boolean;
    email: boolean;
    whatsapp: boolean;
  };
  alertCategories: {
    weather: boolean;
    market: boolean;
  };
  isOnboarded: boolean;
  lastActive: Date;
}

export interface UserActivity {
  id: string;
  timestamp: Date;
  type: "advisory" | "weather" | "market" | "media" | "profile";
  title: string;
  description: string;
  badge: string;
}

export interface AlertNotification {
  id: string;
  type: "weather" | "market";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  timestamp: Date;
  channel: "sms" | "email" | "whatsapp" | "in_app";
  read: boolean;
}

export interface SourceBadge {
  label: string;
  color: string;
}

export interface ReasoningStep {
  tool: string;
  description: string;
  status: "pending" | "complete" | "error";
}

export interface Message {
  id: string;
  role: "farmer" | "ai";
  content: string;
  timestamp: Date;
  sources?: SourceBadge[];
  reasoningSteps?: ReasoningStep[];
  hasAudio?: boolean;
  imageUrl?: string;
  imageAnalysis?: string;
}

export interface Session {
  id: string;
  title: string;
  preview: string;
  cropCategory: "wheat" | "rice" | "cotton" | "mustard" | "potato" | "general";
  date: Date;
  messages: Message[];
}

export interface MediaItem {
  id: string;
  thumbnailUrl: string;
  uploadDate: Date;
  cropName: string;
  diagnosisTag: string;
  severity: "healthy" | "mild" | "moderate" | "severe";
  status: "diagnosed" | "pending" | "analyzing";
  fullDiagnosis?: string;
  sessionId?: string;
  messageId?: string;
}

export interface WeatherData {
  district: string;
  state: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  rainProbability: number;
  uvIndex: number;
  airQualityIndex: number;
  sprayWindowStatus: "optimal" | "caution" | "unsafe";
  sprayWindowReason: string;
  sprayBadge?: string;
  spraySubline?: string;
  irrigationAdvisory: string;
  irrigationBadge?: string;
  irrigationSubline?: string;
  hourlyForecast: {
    time: string;
    temp: number;
    pop: number;
    wind: number;
  }[];
  sevenDayOutlook: {
    day: string;
    date: string;
    condition: string;
    high: number;
    low: number;
    rainChance: number;
    agriImpact: string;
  }[];
}

export interface MandiRate {
  id: string;
  commodity: string;
  variety: string;
  mandi: string;
  district: string;
  state: string;
  modalPrice: number;
  minPrice: number;
  maxPrice: number;
  msp: number;
  trend: "up" | "down" | "stable";
  changePct: number;
  lastUpdated: string;
}

export type DashboardModule =
  | "overview"
  | "advisory"
  | "weather"
  | "market"
  | "media";

export type RecordingState = "idle" | "recording" | "processing";

