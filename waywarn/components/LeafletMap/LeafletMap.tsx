"use client";

import { useEffect, useRef } from "react";
import type { Map as LMap } from "leaflet";

interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  onMapReady?: (map: LMap) => void;
}

// CartoDB Voyager (light, crisp, readable) tile URL
const DARK_TILE =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export default function LeafletMap({
  center = [28.6139, 77.2090], // New Delhi default
  zoom = 13,
  onMapReady,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamically import Leaflet to avoid SSR issues
    import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return;

      // Fix default marker icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current, {
        center,
        zoom,
        zoomControl: false,
        attributionControl: true,
      });

      L.tileLayer(DARK_TILE, {
        attribution: TILE_ATTR,
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      // Move zoom control to top-right
      L.control.zoom({ position: "topright" }).addTo(map);

      mapRef.current = map;
      onMapReady?.(map);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
