// ============================================================
// WayWarn — Shared TypeScript Types
// ============================================================

// --- Geolocation ---
export interface LatLng {
  lat: number;
  lng: number;
}

// --- Hazard ---
export type HazardType =
  | "pothole"
  | "crack"
  | "waterlog"
  | "speed_breaker"
  | "debris";

export type HazardSeverity = "low" | "medium" | "high";

export interface Hazard {
  id: string;
  type: HazardType;
  severity: HazardSeverity;
  location: LatLng;
  notes?: string;
  imageUrl?: string;
  reportedBy?: string;
  timestamp: number; // Unix ms
  aiConfidence?: number; // 0–1
  isAIPredicted?: boolean;
}

// --- Route ---
export type RouteLabel = "Safest" | "Fastest" | "Shortest";

export interface Route {
  id: string;
  label: RouteLabel;
  coordinates: LatLng[]; // ordered waypoints
  distanceKm: number;
  etaMinutes: number;
  hazardCount: number;
  riskScore: number; // 0–100
  color: string; // CSS color string
}

// --- Navigation ---
export interface NavigationState {
  isActive: boolean;
  currentRoute: Route | null;
  currentPositionIndex: number;
  currentPosition: LatLng | null;
  nearbyHazards: Hazard[];
  currentSpeed: number; // km/h — simulated speed
  isSlowingDown: boolean; // true when near a pothole
}

// --- Alert ---
export interface AlertItem {
  id: string;
  hazard: Hazard;
  distanceMeters: number;
  timestamp: number;
}

// --- Auth ---
export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

// --- Prediction ---
export interface PredictionFeatures {
  lat: number;
  lng: number;
  segmentLengthKm: number;
  curvature: number; // 0–1
  distanceFromStartKm: number;
  cityProximityScore: number; // 0–1
  monsoonRiskScore: number; // 0–1
  roadAgeEstimate: number; // 0–1
  terrainType: number; // 0=flat, 0.5=hilly, 1=mountain
}

// --- Offline Queue ---
export interface PendingUpload {
  id: string;
  type: "hazard_report";
  payload: Omit<Hazard, "id">;
  createdAt: number;
}

// --- Weather ---
export interface WeatherData {
  isRaining: boolean;
  description: string;
  city: string;
}
