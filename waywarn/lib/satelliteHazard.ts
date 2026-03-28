// ============================================================
// WayWarn — Satellite Hazard Intelligence Engine
// Simulates satellite-level environmental awareness using:
//   • Open-Meteo weather data (rainfall intensity)
//   • Hardcoded geographic risk datasets (India)
//   • Crowdsourced hazard density / clustering
// No paid APIs — 100% browser-side
// ============================================================

import {
  LatLng,
  Hazard,
  SatelliteZone,
  SatelliteZoneType,
  TrustTag,
} from "@/types";
import { haversineMetres } from "./maps";
import { WeatherFactor } from "./weatherApi";

// ─── Geographic Risk Datasets (India) ─────────────────────────────────────────

interface GeoZone {
  name: string;
  center: LatLng;
  radiusKm: number;
  type: SatelliteZoneType;
  baseTerrain: number; // 0–1 inherent risk
}

/** Known flood-prone zones across India */
const FLOOD_PRONE_ZONES: GeoZone[] = [
  // Delhi / NCR — Yamuna floodplain
  { name: "Yamuna Floodplain, Delhi",    center: { lat: 28.6560, lng: 77.2400 }, radiusKm: 3.5, type: "flood",    baseTerrain: 0.85 },
  { name: "ITO Underpass, Delhi",         center: { lat: 28.6289, lng: 77.2407 }, radiusKm: 1.2, type: "waterlog", baseTerrain: 0.80 },
  { name: "Minto Bridge, Delhi",          center: { lat: 28.6430, lng: 77.2197 }, radiusKm: 0.8, type: "waterlog", baseTerrain: 0.75 },
  { name: "Pul Bangash, Delhi",           center: { lat: 28.6567, lng: 77.2134 }, radiusKm: 0.9, type: "waterlog", baseTerrain: 0.70 },
  { name: "Sarita Vihar, Delhi",          center: { lat: 28.5452, lng: 77.2900 }, radiusKm: 1.5, type: "waterlog", baseTerrain: 0.65 },

  // Mumbai — notorious flood zones
  { name: "Hindmata, Mumbai",             center: { lat: 19.0215, lng: 72.8367 }, radiusKm: 1.0, type: "waterlog", baseTerrain: 0.92 },
  { name: "Kurla-Andheri, Mumbai",        center: { lat: 19.1035, lng: 72.8785 }, radiusKm: 2.5, type: "flood",    baseTerrain: 0.88 },
  { name: "Sion Low-lying Zone",          center: { lat: 19.0422, lng: 72.8615 }, radiusKm: 1.2, type: "waterlog", baseTerrain: 0.82 },
  { name: "Milan Subway, Mumbai",         center: { lat: 19.0785, lng: 72.8385 }, radiusKm: 0.6, type: "waterlog", baseTerrain: 0.90 },

  // Chennai — Adyar river zone
  { name: "Adyar River Basin, Chennai",   center: { lat: 13.0010, lng: 80.2485 }, radiusKm: 3.0, type: "flood",    baseTerrain: 0.85 },
  { name: "Taramani Underpass, Chennai",  center: { lat: 12.9930, lng: 80.2400 }, radiusKm: 0.8, type: "waterlog", baseTerrain: 0.78 },

  // Kolkata / Howrah — low-lying areas
  { name: "Tiljala, Kolkata",             center: { lat: 22.5321, lng: 88.3812 }, radiusKm: 2.0, type: "flood",    baseTerrain: 0.80 },
  { name: "Beliaghata Canal Zone",        center: { lat: 22.5621, lng: 88.3932 }, radiusKm: 1.5, type: "waterlog", baseTerrain: 0.75 },

  // Patna / Bihar — Ganga floodplain
  { name: "Ganga Floodplain, Patna",      center: { lat: 25.6100, lng: 85.1376 }, radiusKm: 8.0, type: "flood",    baseTerrain: 0.92 },

  // Bhubaneswar / Odisha
  { name: "Mahanadi Basin, Odisha",       center: { lat: 20.3500, lng: 85.7500 }, radiusKm: 10.0, type: "flood",   baseTerrain: 0.88 },

  // Hyderabad — Musi river
  { name: "Musi River Zone, Hyderabad",   center: { lat: 17.3680, lng: 78.5140 }, radiusKm: 2.5, type: "flood",    baseTerrain: 0.75 },
  { name: "Banjara Hills Underpass",      center: { lat: 17.4156, lng: 78.4373 }, radiusKm: 1.0, type: "waterlog", baseTerrain: 0.70 },

  // Bengaluru — poor drainage
  { name: "Bellandur Wetland, Bengaluru", center: { lat: 12.9240, lng: 77.6762 }, radiusKm: 2.0, type: "waterlog", baseTerrain: 0.72 },
  { name: "Koramangala Low Zone",         center: { lat: 12.9279, lng: 77.6271 }, radiusKm: 1.5, type: "waterlog", baseTerrain: 0.68 },

  // Ahmedabad — Sabarmati
  { name: "Sabarmati Riverside",          center: { lat: 23.0310, lng: 72.5880 }, radiusKm: 3.0, type: "flood",    baseTerrain: 0.78 },
];

/** Known landslide-prone zones across India */
const LANDSLIDE_ZONES: GeoZone[] = [
  // Western Ghats
  { name: "Ghats near Amboli, Goa",         center: { lat: 15.9570, lng: 74.0000 }, radiusKm: 12.0, type: "landslide", baseTerrain: 0.82 },
  { name: "Idduki, Kerala",                  center: { lat: 9.8543,  lng: 77.1025 }, radiusKm: 15.0, type: "landslide", baseTerrain: 0.88 },
  { name: "Wayanad, Kerala",                 center: { lat: 11.6854, lng: 76.1320 }, radiusKm: 20.0, type: "landslide", baseTerrain: 0.85 },
  { name: "Munnar, Kerala",                  center: { lat: 10.0889, lng: 77.0595 }, radiusKm: 10.0, type: "landslide", baseTerrain: 0.80 },
  { name: "Kodagu, Karnataka",               center: { lat: 12.4200, lng: 75.7400 }, radiusKm: 18.0, type: "landslide", baseTerrain: 0.83 },
  { name: "Mahabaleshwar, Maharashtra",      center: { lat: 17.9307, lng: 73.6477 }, radiusKm: 8.0,  type: "landslide", baseTerrain: 0.75 },

  // Uttarakhand / Himalayas
  { name: "Chamoli, Uttarakhand",            center: { lat: 30.4000, lng: 79.3400 }, radiusKm: 25.0, type: "landslide", baseTerrain: 0.92 },
  { name: "Tehri, Uttarakhand",              center: { lat: 30.3780, lng: 78.4800 }, radiusKm: 12.0, type: "landslide", baseTerrain: 0.88 },
  { name: "Pithoragarh, Uttarakhand",        center: { lat: 29.5831, lng: 80.2181 }, radiusKm: 15.0, type: "landslide", baseTerrain: 0.85 },
  { name: "Rudraprayag, Uttarakhand",        center: { lat: 30.2840, lng: 78.9820 }, radiusKm: 10.0, type: "landslide", baseTerrain: 0.87 },

  // Himachal Pradesh
  { name: "Kinnaur, HP",                     center: { lat: 31.5950, lng: 78.1530 }, radiusKm: 20.0, type: "landslide", baseTerrain: 0.90 },
  { name: "Kullu-Manali, HP",                center: { lat: 32.2396, lng: 77.1887 }, radiusKm: 18.0, type: "landslide", baseTerrain: 0.85 },
  { name: "Mandi, HP",                       center: { lat: 31.6450, lng: 76.9290 }, radiusKm: 12.0, type: "landslide", baseTerrain: 0.80 },

  // Darjeeling / Sikkim
  { name: "Darjeeling Hills",                center: { lat: 27.0360, lng: 88.2627 }, radiusKm: 15.0, type: "landslide", baseTerrain: 0.88 },
  { name: "Sikkim Highway",                  center: { lat: 27.5330, lng: 88.5122 }, radiusKm: 10.0, type: "landslide", baseTerrain: 0.85 },

  // NE India
  { name: "Arunachal Foothills",             center: { lat: 27.0844, lng: 93.6053 }, radiusKm: 30.0, type: "landslide", baseTerrain: 0.87 },
  { name: "Mizoram Hills",                   center: { lat: 23.1645, lng: 92.9376 }, radiusKm: 20.0, type: "landslide", baseTerrain: 0.83 },
  { name: "Meghalaya Slopes",                center: { lat: 25.4670, lng: 91.3662 }, radiusKm: 15.0, type: "landslide", baseTerrain: 0.80 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Look up the closest geo zone from a list, within maxRadiusKm */
function closestZone(
  point: LatLng,
  zones: GeoZone[],
  maxRadiusKm = 50
): GeoZone | null {
  let best: GeoZone | null = null;
  let bestDist = Infinity;
  for (const z of zones) {
    const d = haversineMetres(point, z.center) / 1000;
    if (d <= z.radiusKm && d < bestDist && d <= maxRadiusKm) {
      bestDist = d;
      best = z;
    }
  }
  return best;
}

/** Detect clusters of 3+ hazards within radiusM → these become "blockage" zones */
export function detectHazardClusters(
  hazards: Hazard[],
  radiusM = 400,
  minCount = 3
): LatLng[] {
  if (hazards.length < minCount) return [];
  const centers: LatLng[] = [];
  const used = new Set<string>();

  for (const h of hazards) {
    if (used.has(h.id)) continue;
    const group = hazards.filter(
      (x) => !used.has(x.id) && haversineMetres(h.location, x.location) <= radiusM
    );
    if (group.length >= minCount) {
      group.forEach((x) => used.add(x.id));
      // Centroid
      const avgLat = group.reduce((s, x) => s + x.location.lat, 0) / group.length;
      const avgLng = group.reduce((s, x) => s + x.location.lng, 0) / group.length;
      centers.push({ lat: avgLat, lng: avgLng });
    }
  }
  return centers;
}

/** Compute hazard density score (0–1) around a point */
function hazardDensityScore(
  point: LatLng,
  hazards: Hazard[],
  radiusM = 500
): number {
  const count = hazards.filter(
    (h) => haversineMetres(point, h.location) <= radiusM
  ).length;
  // 0 → 0, 5 → 0.5, 10+ → 1.0
  return Math.min(1, count / 10);
}

/** Classify risk score (0–1) into level */
function classify(score: number): "low" | "moderate" | "high" {
  if (score >= 0.65) return "high";
  if (score >= 0.35) return "moderate";
  return "low";
}

/** Pick color for a zone by type and risk */
function zoneColor(
  type: SatelliteZoneType,
  riskLevel: "low" | "moderate" | "high"
): string {
  if (type === "flood" || type === "waterlog") {
    return riskLevel === "high" ? "#0ea5e9" : riskLevel === "moderate" ? "#38bdf8" : "#7dd3fc";
  }
  if (type === "landslide") {
    return riskLevel === "high" ? "#ef4444" : riskLevel === "moderate" ? "#f97316" : "#fb923c";
  }
  // blockage
  return "#dc2626";
}

/** Pick trust tag based on scoring factors */
function trustTag(
  rainfallFactor: number,
  densityScore: number
): TrustTag {
  if (densityScore >= 0.3 && rainfallFactor >= 0.3) return "Crowd + AI Verified";
  if (rainfallFactor >= 0.4) return "Weather-Driven Alert";
  return "Satellite Estimated Risk";
}

/** Human-readable alert message */
function alertMsg(type: SatelliteZoneType, riskLevel: "low" | "moderate" | "high"): string {
  const severity = riskLevel === "high" ? "heavy" : riskLevel === "moderate" ? "moderate" : "mild";
  switch (type) {
    case "flood":     return `${severity === "heavy" ? "Heavy" : "Possible"} flooding detected ahead`;
    case "waterlog":  return `${severity === "heavy" ? "Severe" : "Moderate"} waterlogging detected ahead`;
    case "landslide": return `High landslide risk zone approaching`;
    case "blockage":  return `Possible road blockage ahead`;
  }
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export interface SatelliteRiskResult {
  zones: SatelliteZone[];
  envRisk: number; // 0–100 overall env risk for the route
}

/**
 * Generate satellite hazard zones for a route.
 * Combines weather, terrain, and crowd data into scored zones.
 */
export async function generateSatelliteZones(
  routeCoords: LatLng[],
  weather: WeatherFactor,
  existingHazards: Hazard[]
): Promise<SatelliteRiskResult> {
  if (routeCoords.length < 2) return { zones: [], envRisk: 0 };

  const zones: SatelliteZone[] = [];
  const seen = new Set<string>(); // avoid duplicate geo zones

  // 1. Flood + waterlog zones along route
  const allGeoZones = [...FLOOD_PRONE_ZONES, ...LANDSLIDE_ZONES];

  // Sample route at ~500m intervals for efficiency
  const SAMPLE_STEP = Math.max(1, Math.floor(routeCoords.length / 40));
  for (let i = 0; i < routeCoords.length; i += SAMPLE_STEP) {
    const pt = routeCoords[i];

    for (const geo of allGeoZones) {
      if (seen.has(geo.name)) continue;
      const distKm = haversineMetres(pt, geo.center) / 1000;
      if (distKm > geo.radiusKm) continue;

      // Found — compute risk score
      const rainfallFactor = weather.rainfallFactor;
      const terrainFactor  = geo.baseTerrain;
      const density        = hazardDensityScore(geo.center, existingHazards);

      const riskScore = Math.min(
        1,
        0.40 * rainfallFactor + 0.35 * terrainFactor + 0.25 * density
      );

      const riskLevel  = classify(riskScore);
      const tag        = trustTag(rainfallFactor, density);
      const color      = zoneColor(geo.type, riskLevel);

      seen.add(geo.name);
      zones.push({
        id:           `sat-${geo.name.replace(/\s+/g, "-").toLowerCase()}-${i}`,
        type:         geo.type,
        center:       geo.center,
        radiusKm:     geo.radiusKm,
        riskScore,
        riskLevel,
        label:        geo.name,
        trustTag:     tag,
        color,
        alertMessage: alertMsg(geo.type, riskLevel),
      });
    }
  }

  // 2. Blockage zones from hazard clusters
  const clusterCenters = detectHazardClusters(existingHazards);
  for (const c of clusterCenters) {
    // Only add if cluster is near the route
    const nearRoute = routeCoords.some(
      (pt) => haversineMetres(pt, c) <= 500
    );
    if (!nearRoute) continue;

    const density   = hazardDensityScore(c, existingHazards, 400);
    const riskScore = Math.min(1, 0.5 * density + 0.3 * weather.rainfallFactor + 0.2);
    const riskLevel = classify(riskScore);

    zones.push({
      id:           `sat-cluster-${c.lat.toFixed(4)}-${c.lng.toFixed(4)}`,
      type:         "blockage",
      center:       c,
      radiusKm:     0.3,
      riskScore,
      riskLevel,
      label:        "Clustered Hazard Zone",
      trustTag:     "Crowd + AI Verified",
      color:        "#dc2626",
      alertMessage: "Possible road blockage ahead — multiple hazards reported",
    });
  }

  // 3. Weather-only zone: if raining heavily, add a route-midpoint waterlog zone
  //    (simulates conditions not covered by the static dataset)
  if (weather.rainfallFactor >= 0.5 && zones.length === 0) {
    const mid = routeCoords[Math.floor(routeCoords.length / 2)];
    const riskScore = Math.min(1, weather.rainfallFactor * 0.9);
    const riskLevel = classify(riskScore);
    zones.push({
      id:           "sat-rain-midpoint",
      type:         "waterlog",
      center:       mid,
      radiusKm:     1.5,
      riskScore,
      riskLevel,
      label:        "Active Rain Zone",
      trustTag:     "Weather-Driven Alert",
      color:        zoneColor("waterlog", riskLevel),
      alertMessage: "Heavy waterlogging detected ahead due to active rainfall",
    });
  }

  // 4. Compute overall env risk (max zone score, weighted)
  const envRisk = zones.length > 0
    ? Math.round(Math.max(...zones.map((z) => z.riskScore)) * 100)
    : 0;

  return { zones, envRisk };
}

/**
 * Check if a position is within alert distance of a high/moderate risk zone.
 * Returns the matching zone or null.
 */
export function checkProximityAlert(
  position: LatLng,
  zones: SatelliteZone[],
  radiusM = 400
): SatelliteZone | null {
  // Prioritise high over moderate
  const sorted = [...zones]
    .filter((z) => z.riskLevel !== "low")
    .sort((a, b) => b.riskScore - a.riskScore);

  for (const zone of sorted) {
    const d = haversineMetres(position, zone.center);
    if (d <= Math.max(radiusM, zone.radiusKm * 1000)) {
      return zone;
    }
  }
  return null;
}
