// ============================================================
// WayWarn — Multi-Hazard Prediction v4
// Predicts: potholes, cracks, waterlogging, construction sites
// Each bucket on the route is independently assessed for:
//   - Which hazard type is most likely
//   - Whether the hazard probability gate is passed
// Result: uniform distribution of varied hazards along the route
// ============================================================

import { LatLng, Hazard, HazardType } from "@/types";
import { haversineMetres } from "./maps";

// ─── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────
function makePRNG(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function coordSeed(lat: number, lng: number): number {
  const la = Math.round(lat * 1e5);
  const ln = Math.round(lng * 1e5);
  return Math.abs((la * 31337 + ln * 1337) % 2147483647);
}

// ─── Urban proximity ─────────────────────────────────────────────────────────
const URBAN_CENTERS: LatLng[] = [
  { lat: 28.6139, lng: 77.2090 }, // Delhi
  { lat: 19.0760, lng: 72.8777 }, // Mumbai
  { lat: 12.9716, lng: 77.5946 }, // Bangalore
  { lat: 22.5726, lng: 88.3639 }, // Kolkata
  { lat: 13.0827, lng: 80.2707 }, // Chennai
  { lat: 17.3850, lng: 78.4867 }, // Hyderabad
  { lat: 23.0225, lng: 72.5714 }, // Ahmedabad
  { lat: 26.9124, lng: 75.7873 }, // Jaipur
  { lat: 28.4595, lng: 77.0266 }, // Gurgaon
  { lat: 18.5204, lng: 73.8567 }, // Pune
  { lat: 26.8467, lng: 80.9462 }, // Lucknow
  { lat: 21.1458, lng: 79.0882 }, // Nagpur
];

function urbanScore(lat: number, lng: number): number {
  let min = Infinity;
  for (const c of URBAN_CENTERS) {
    const d = haversineMetres({ lat, lng }, c);
    if (d < min) min = d;
  }
  if (min < 5000)  return 1.0;
  if (min < 30000) return 0.3 + (1 - min / 30000) * 0.7;
  return 0.15;
}

// ─── Monsoon damage ───────────────────────────────────────────────────────────
function monsoonScore(lat: number, lng: number): number {
  if (lng < 76.5 && lat < 13) return 0.95;           // Kerala
  if (lat > 17 && lat < 21 && lng < 73.5) return 0.90; // Konkan/Mumbai
  if (lat > 24 && lng > 88) return 0.92;              // NE India
  if (lat > 18 && lat < 22 && lng > 81) return 0.75; // Odisha/Coastal AP
  if (lat > 25 && lat < 28 && lng > 79) return 0.60; // UP/Bihar
  return 0.40;
}

// ─── Junction / bend ─────────────────────────────────────────────────────────
function junctionScore(prev: LatLng, curr: LatLng, next: LatLng): number {
  const ax = curr.lng - prev.lng, ay = curr.lat - prev.lat;
  const bx = next.lng - curr.lng, by = next.lat - curr.lat;
  const dot  = ax * bx + ay * by;
  const magA = Math.sqrt(ax * ax + ay * ay);
  const magB = Math.sqrt(bx * bx + by * by);
  if (magA < 1e-10 || magB < 1e-10) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (magA * magB)));
  const deg = Math.acos(cos) * (180 / Math.PI);
  return deg > 60 ? 1.0 : deg > 25 ? 0.55 : 0.05;
}

// ─── Hazard-specific probability scores ──────────────────────────────────────
interface ZoneScores { urban: number; monsoon: number; junction: number; }

function potholeProb(z: ZoneScores): number {
  // Common everywhere; boosted by urban + monsoon
  return z.urban * 0.45 + z.monsoon * 0.30 + z.junction * 0.15 + 0.10;
}

function crackProb(z: ZoneScores): number {
  // Old-road effect: moderate urban, moderate-low monsoon, any junction
  const ageBoost = (1 - z.urban * 0.4) * 0.3; // rural/peri-urban roads crack more
  return z.urban * 0.30 + z.monsoon * 0.20 + z.junction * 0.20 + ageBoost + 0.05;
}

function waterlogProb(z: ZoneScores): number {
  // Waterlogging = monsoon + low-lying areas → urban drains fail
  return z.monsoon * 0.55 + z.urban * 0.30 + 0.05;
}

function constructionProb(z: ZoneScores): number {
  // Construction = active urban development zones
  return z.urban * 0.60 + z.junction * 0.20 + 0.05;
}

// Pick the best hazard type for this zone, plus a combined probability
function pickHazardType(
  z: ZoneScores,
  rng: () => number
): { type: HazardType; probability: number } {
  const scores: Record<HazardType, number> = {
    pothole:       potholeProb(z),
    crack:         crackProb(z),
    waterlog:      waterlogProb(z),
    debris:        constructionProb(z),  // using "debris" for construction
    speed_breaker: 0,                    // not AI-predicted
  };

  // In most buckets, just pick the dominant type; occasionally sample from all
  const roll = rng();
  let type: HazardType;

  if (roll < 0.15) {
    // 15% chance: randomly pick any type (variety)
    const all: HazardType[] = ["pothole", "crack", "waterlog", "debris"];
    type = all[Math.floor(rng() * 4)];
  } else {
    // 85%: pick the most likely type for this zone
    type = (Object.entries(scores) as [HazardType, number][])
      .filter(([t]) => t !== "speed_breaker")
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  // Combined gate probability = average of top-2 scores
  const top2 = Object.values(scores).sort((a, b) => b - a).slice(0, 2);
  const probability = (top2[0] + top2[1]) / 2;

  return { type, probability: Math.min(1, probability) };
}

// ─── Severity from combined score ────────────────────────────────────────────
function severityFromScore(s: number): "low" | "medium" | "high" {
  return s > 0.75 ? "high" : s > 0.55 ? "medium" : "low";
}

// ─── Hazard notes ─────────────────────────────────────────────────────────────
const HAZARD_LABELS: Record<HazardType, string> = {
  pothole:       "Pothole",
  crack:         "Road crack",
  waterlog:      "Waterlogged road",
  debris:        "Construction zone",
  speed_breaker: "Speed breaker",
};

// ─── Cumulative distance array ────────────────────────────────────────────────
function buildCumDist(coords: LatLng[]): number[] {
  const cum = [0];
  for (let i = 1; i < coords.length; i++) {
    cum.push(cum[i - 1] + haversineMetres(coords[i - 1], coords[i]));
  }
  return cum;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function predictPotholes(
  routeCoords: LatLng[],
  _routeDistanceKm: number
): Promise<Hazard[]> {
  if (routeCoords.length < 3) return [];

  const cum = buildCumDist(routeCoords);
  const totalM = cum[cum.length - 1]; // actual haversine total
  if (totalM < 100) return [];

  const s0 = coordSeed(routeCoords[0].lat, routeCoords[0].lng);
  const sN = coordSeed(
    routeCoords[routeCoords.length - 1].lat,
    routeCoords[routeCoords.length - 1].lng
  );
  const rng = makePRNG(s0 ^ (sN * 31));

  const actualKm = totalM / 1000;
  const bucketM  = actualKm > 20 ? 700 : actualKm > 5 ? 500 : 350;
  const nBuckets = Math.max(3, Math.round(totalM / bucketM));

  const results: Hazard[] = [];

  for (let b = 0; b < nBuckets; b++) {
    const bStart = (b / nBuckets) * totalM;
    const bEnd   = ((b + 1) / nBuckets) * totalM;

    // Collect points in bucket
    const pts: LatLng[] = [];
    for (let i = 0; i < routeCoords.length; i++) {
      if (cum[i] >= bStart && cum[i] < bEnd) pts.push(routeCoords[i]);
    }
    if (pts.length === 0) continue;

    // Score the midpoint of the bucket
    const mid = pts[Math.floor(pts.length / 2)];
    const midIdx = Math.floor(pts.length / 2);
    const prev = midIdx > 0 ? pts[midIdx - 1] : null;
    const next = midIdx < pts.length - 1 ? pts[midIdx + 1] : null;

    const z: ZoneScores = {
      urban:    urbanScore(mid.lat, mid.lng),
      monsoon:  monsoonScore(mid.lat, mid.lng),
      junction: (prev && next) ? junctionScore(prev, mid, next) : 0,
    };

    const { type, probability } = pickHazardType(z, rng);

    // Probability gate: skip low-risk stretches
    if (rng() > probability) continue;

    // Tiny jitter so marker is slightly off the polyline
    const jitterLat = (rng() - 0.5) * 0.00015;
    const jitterLng = (rng() - 0.5) * 0.00015;

    const score = (type === "pothole" ? potholeProb(z)
      : type === "crack"    ? crackProb(z)
      : type === "waterlog" ? waterlogProb(z)
      : constructionProb(z));

    const tags = [
      z.urban > 0.7 ? "urban" : "rural",
      z.monsoon > 0.7 ? "monsoon zone" : null,
      z.junction > 0.5 ? "near junction" : null,
    ].filter(Boolean).join(" · ");

    results.push({
      id: `ai-${s0}-b${b}`,
      type,
      severity: severityFromScore(score),
      location: { lat: mid.lat + jitterLat, lng: mid.lng + jitterLng },
      notes: `AI: ${HAZARD_LABELS[type]} · ${Math.round(score * 100)}% risk · ${tags}`,
      timestamp: Date.now(),
      aiConfidence: parseFloat(score.toFixed(3)),
      isAIPredicted: true,
    });
  }

  return results;
}
