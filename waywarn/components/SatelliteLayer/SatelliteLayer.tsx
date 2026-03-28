// ============================================================
// SatelliteLayer — draws environmental hazard zones on Leaflet map
// Flood: semi-transparent blue circles
// Landslide: orange/red circles
// Blockage: red warning marker icons
// ============================================================
"use client";

import { useEffect, useRef } from "react";
import type { Map as LMap, Circle, Marker } from "leaflet";
import { SatelliteZone } from "@/types";

interface SatelliteLayerProps {
  map: LMap | null;
  zones: SatelliteZone[];
  enabled: boolean;
}

export default function SatelliteLayer({ map, zones, enabled }: SatelliteLayerProps) {
  // Keep refs to all drawn layers so we can clean up
  const circleRefs  = useRef<Circle[]>([]);
  const markerRefs  = useRef<Marker[]>([]);

  useEffect(() => {
    if (!map) return;

    // Clear all existing satellite layers
    circleRefs.current.forEach((c) => c.remove());
    markerRefs.current.forEach((m) => m.remove());
    circleRefs.current = [];
    markerRefs.current = [];

    if (!enabled || zones.length === 0) return;

    // Dynamic Leaflet import (SSR-safe)
    import("leaflet").then((leafletMod) => {
      const L = leafletMod.default;

      for (const zone of zones) {
        const { center, radiusKm, type, color, riskLevel, riskScore, label, trustTag, alertMessage } = zone;

        if (type === "blockage") {
          // ─── Blockage: red warning icon marker ──────────────────────
          const icon = L.divIcon({
            className: "",
            html: `
              <div style="
                display:flex;align-items:center;justify-content:center;
                width:32px;height:32px;
                background:rgba(220,38,38,0.92);
                border:2px solid #fff;
                border-radius:50%;
                box-shadow:0 0 12px rgba(220,38,38,0.7),0 0 30px rgba(220,38,38,0.35);
                font-size:16px;
                position:relative;
              ">⚠️<div style="
                position:absolute;inset:-6px;border-radius:50%;
                border:2px solid rgba(220,38,38,0.4);
                animation:pulse-ring 1.4s ease-out infinite;
              "></div></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const marker = L.marker([center.lat, center.lng], { icon })
            .addTo(map)
            .bindPopup(`
              <div style="font-family:'Inter',system-ui,sans-serif;min-width:180px;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                  <span style="font-size:18px;">🚧</span>
                  <strong style="font-size:14px;color:#dc2626">${label}</strong>
                </div>
                <div style="font-size:12px;color:#374151;margin-bottom:4px;">${alertMessage}</div>
                <div style="display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap;">
                  <span style="background:#dc262622;color:#dc2626;border:1px solid #dc262655;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;">
                    ${riskLevel.toUpperCase()} RISK
                  </span>
                  <span style="background:#f3f4f6;color:#6b7280;padding:2px 7px;border-radius:999px;font-size:10px;">
                    🛰️ ${trustTag}
                  </span>
                </div>
              </div>
            `);
          markerRefs.current.push(marker);

        } else {
          // ─── Flood / Waterlog / Landslide: filled circle ────────────
          const fillOpacity = riskLevel === "high" ? 0.28 : riskLevel === "moderate" ? 0.18 : 0.10;
          const strokeOpacity = riskLevel === "high" ? 0.7 : 0.45;

          const circle = L.circle([center.lat, center.lng], {
            radius:       radiusKm * 1000,
            color,
            weight:       riskLevel === "high" ? 2 : 1.5,
            opacity:      strokeOpacity,
            fillColor:    color,
            fillOpacity,
            dashArray:    riskLevel === "low" ? "6 4" : undefined,
          })
            .addTo(map)
            .bindPopup(`
              <div style="font-family:'Inter',system-ui,sans-serif;min-width:200px;">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                  <span style="font-size:18px;">${type === "flood" ? "🌊" : type === "waterlog" ? "💧" : "⛰️"}</span>
                  <strong style="font-size:14px;color:#111827">${label}</strong>
                </div>
                <div style="font-size:12px;color:#374151;margin-bottom:8px;">${alertMessage}</div>
                <div style="background:#f9fafb;border-radius:8px;padding:8px;margin-bottom:8px;">
                  <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">SATELLITE RISK SCORE</div>
                  <div style="background:#e5e7eb;border-radius:999px;height:6px;overflow:hidden;">
                    <div style="width:${Math.round(riskScore*100)}%;height:100%;background:${color};border-radius:999px;"></div>
                  </div>
                  <div style="font-size:12px;font-weight:700;color:${color};margin-top:4px;">${Math.round(riskScore*100)}%</div>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  <span style="background:${color}22;color:${color};border:1px solid ${color}55;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;">
                    ${riskLevel.toUpperCase()} RISK
                  </span>
                  <span style="background:#f3f4f6;color:#6b7280;padding:2px 7px;border-radius:999px;font-size:10px;">
                    🛰️ ${trustTag}
                  </span>
                </div>
              </div>
            `);
          circleRefs.current.push(circle);
        }
      }
    });

    // Cleanup when effect re-runs or component unmounts
    return () => {
      circleRefs.current.forEach((c) => c.remove());
      markerRefs.current.forEach((m) => m.remove());
      circleRefs.current = [];
      markerRefs.current = [];
    };
  }, [map, zones, enabled]);

  return null; // purely imperative, no DOM output
}
