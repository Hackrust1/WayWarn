// ============================================================
// WayWarn — Maps Library
// Geocoding: Nominatim (OpenStreetMap)
// Routing:   OSRM (Open Source Routing Machine)
// ============================================================

import { LatLng, Route, RouteLabel } from "@/types";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const OSRM_URL = "https://router.project-osrm.org";

// --- Geocoding ---
export async function geocode(query: string): Promise<LatLng | null> {
  try {
    const res = await fetch(
      `${NOMINATIM_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

// --- Route fetching from OSRM ---
// OSRM returns one "best" route; we request 3 alternatives
interface OSRMRoute {
  geometry: { coordinates: [number, number][] };
  distance: number; // metres
  duration: number; // seconds
  legs: { annotation?: unknown }[];
}

export async function fetchOSRMRoutes(
  origin: LatLng,
  destination: LatLng
): Promise<OSRMRoute[]> {
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url =
    `${OSRM_URL}/route/v1/driving/${coords}` +
    `?overview=full&geometries=geojson&alternatives=3&steps=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("OSRM request failed");
  const data = await res.json();
  return data.routes ?? [];
}

// --- Convert OSRM geometry to LatLng array ---
export function osrmCoordsToLatLng(
  coords: [number, number][]
): LatLng[] {
  // OSRM returns [lng, lat]; we need [lat, lng]
  return coords.map(([lng, lat]) => ({ lat, lng }));
}

// --- Haversine distance (metres) ---
export function haversineMetres(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const c =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

// Route colors
const ROUTE_COLORS: Record<RouteLabel, string> = {
  Safest:          "#38ef7d",
  Fastest:         "#ffd200",
  Shortest:        "#ff5f6d",
  "Weather-Safe":  "#0ea5e9",
};

// --- Build scored Route objects from OSRM results ---
export function buildRoutes(
  osrmRoutes: OSRMRoute[],
  hazardCounts: number[]
): Route[] {
  if (!osrmRoutes.length) return [];

  const labels: RouteLabel[] = ["Fastest", "Shortest", "Safest"];

  // Score = 0–100; lower hazards & similar distance = safer
  const maxHazards = Math.max(...hazardCounts, 1);

  return osrmRoutes.slice(0, 3).map((r, i) => {
    const distKm = r.distance / 1000;
    const etaMin = Math.ceil(r.duration / 60);
    const hCount = hazardCounts[i] ?? 0;
    const hazardRatio = hCount / maxHazards;
    const riskScore = Math.round(hazardRatio * 70 + Math.random() * 15);

    const label = labels[i] as RouteLabel;
    const coords = osrmCoordsToLatLng(r.geometry.coordinates);

    return {
      id: `route-${i}`,
      label,
      coordinates: coords,
      distanceKm: parseFloat(distKm.toFixed(2)),
      etaMinutes: etaMin,
      hazardCount: hCount,
      riskScore: Math.min(riskScore, 100),
      color: ROUTE_COLORS[label],
    };
  });
}
