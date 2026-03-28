// ============================================================
// WayWarn — Hazards Library
// Reads/writes hazards from Firestore or demo fallback
// ============================================================

import { Hazard, HazardType, HazardSeverity, LatLng } from "@/types";
import { haversineMetres } from "./maps";

// --- Demo hazards near New Delhi (Rajpath / India Gate area) ---
const DEMO_HAZARDS: Hazard[] = [
  {
    id: "demo-1",
    type: "pothole",
    severity: "high",
    location: { lat: 28.6129, lng: 77.2295 },
    notes: "Large pothole near India Gate",
    timestamp: Date.now() - 3600000,
    isAIPredicted: false,
  },
  {
    id: "demo-2",
    type: "waterlog",
    severity: "medium",
    location: { lat: 28.6198, lng: 77.2112 },
    notes: "Waterlogging near Rajpath after rain",
    timestamp: Date.now() - 7200000,
    isAIPredicted: false,
  },
  {
    id: "demo-3",
    type: "crack",
    severity: "low",
    location: { lat: 28.6080, lng: 77.2210 },
    notes: "Road crack near National Museum",
    timestamp: Date.now() - 86400000,
    isAIPredicted: false,
  },
  {
    id: "demo-4",
    type: "speed_breaker",
    severity: "low",
    location: { lat: 28.6150, lng: 77.2350 },
    notes: "Unmarked speed breaker",
    timestamp: Date.now() - 172800000,
    isAIPredicted: false,
  },
  {
    id: "demo-5",
    type: "debris",
    severity: "high",
    location: { lat: 28.6055, lng: 77.2260 },
    notes: "Construction debris on road",
    timestamp: Date.now() - 43200000,
    isAIPredicted: false,
  },
];

// Hazard type emoji map
export const HAZARD_EMOJI: Record<HazardType, string> = {
  pothole:      "🕳️",
  crack:        "🗯️",
  waterlog:     "💧",
  speed_breaker:"⛰️",
  debris:       "🪨",
};

// Severity to risk weight
export const SEVERITY_WEIGHT: Record<HazardSeverity, number> = {
  low: 1,
  medium: 2,
  high: 4,
};

// --- Fetch hazards from Firestore or return demo hazards ---
export async function fetchHazards(nearLocation?: LatLng): Promise<Hazard[]> {
  try {
    // Try Firestore dynamic import
    const { db, collection, getDocs, query, isFirebaseConfigured } = await import("./firebase");

    if (!isFirebaseConfigured || !db) {
      return filterByProximity(DEMO_HAZARDS, nearLocation);
    }

    const q = query(collection(db, "hazards"));
    const snap = await getDocs(q);
    const hazards: Hazard[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Hazard, "id">),
    }));

    // If firestore is empty, seed with demo hazards
    if (hazards.length === 0) {
      await seedDemoHazards();
      return filterByProximity(DEMO_HAZARDS, nearLocation);
    }

    return filterByProximity(hazards, nearLocation);
  } catch {
    return filterByProximity(DEMO_HAZARDS, nearLocation);
  }
}

// --- Seed demo hazards into Firestore (first load) ---
async function seedDemoHazards(): Promise<void> {
  try {
    const { db, collection, addDoc, isFirebaseConfigured } = await import("./firebase");
    if (!isFirebaseConfigured || !db) return;

    for (const h of DEMO_HAZARDS) {
      const { id: _id, ...data } = h;
      await addDoc(collection(db, "hazards"), data);
    }
  } catch (e) {
    console.warn("Failed to seed hazards:", e);
  }
}

// --- Submit new hazard report ---
export async function submitHazardReport(
  hazard: Omit<Hazard, "id">
): Promise<string> {
  try {
    const { db, collection, addDoc, isFirebaseConfigured } = await import("./firebase");
    if (!isFirebaseConfigured || !db) {
      return `demo-${Date.now()}`;
    }
    const ref = await addDoc(collection(db, "hazards"), hazard);
    return ref.id;
  } catch {
    return `offline-${Date.now()}`;
  }
}

// --- Count hazards along a route ---
export function countHazardsAlongRoute(
  hazards: Hazard[],
  routeCoords: LatLng[],
  radiusMetres = 80
): number {
  return hazards.filter((h) =>
    routeCoords.some(
      (pt) => haversineMetres(pt, h.location) <= radiusMetres
    )
  ).length;
}

// --- Filter hazards within radius of a location ---
function filterByProximity(
  hazards: Hazard[],
  center?: LatLng,
  radiusKm = 50
): Hazard[] {
  if (!center) return hazards;
  return hazards.filter(
    (h) => haversineMetres(center, h.location) <= radiusKm * 1000
  );
}

// --- Find hazards within alert distance of current position ---
export function findNearbyHazards(
  hazards: Hazard[],
  position: LatLng,
  radiusMetres = 50
): Array<{ hazard: Hazard; distanceMetres: number }> {
  return hazards
    .map((h) => ({
      hazard: h,
      distanceMetres: haversineMetres(position, h.location),
    }))
    .filter((x) => x.distanceMetres <= radiusMetres)
    .sort((a, b) => a.distanceMetres - b.distanceMetres);
}
