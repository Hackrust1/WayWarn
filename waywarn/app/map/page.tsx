"use client";

import React, { useEffect, useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav/BottomNav";
import SearchBar from "@/components/SearchBar/SearchBar";
import RouteCard from "@/components/RouteCard/RouteCard";
import DemoTour, { DemoScenario } from "@/components/DemoTour/DemoTour";
import SatelliteLayer from "@/components/SatelliteLayer/SatelliteLayer";
import SatToast from "@/components/SatToast/SatToast";
import styles from "./map.module.css";
import type { Map as LMap, Polyline as LPolyline } from "leaflet";
import { Route, Hazard, SatelliteZone } from "@/types";
import { geocode, fetchOSRMRoutes, buildRoutes } from "@/lib/maps";
import { fetchHazards, countHazardsAlongRoute } from "@/lib/hazards";
import { predictPotholes } from "@/lib/prediction";
import { NavigationEngine, createGpsDotIcon } from "@/lib/navigation";
import AlertModal from "@/components/AlertModal/AlertModal";
import { AlertItem, NavigationState } from "@/types";
import { saveRoutes, saveSelectedRoute } from "@/lib/routeStore";
import Speedometer from "@/components/Speedometer/Speedometer";
import { LatLng } from "@/types";
import { fetchWeather, WeatherFactor } from "@/lib/weatherApi";
import {
  generateSatelliteZones,
  checkProximityAlert,
} from "@/lib/satelliteHazard";

// Dynamically import LeafletMap — client-side only
const MapComponent = dynamic(
  () => import("@/components/LeafletMap/LeafletMap"),
  { ssr: false, loading: () => <div className={styles.mapLoading}>🗺️ Loading map...</div> }
);

// Single demo route — India Gate → Qutub Minar
const DEMO_SCENARIO: DemoScenario = {
  id: "classic",
  icon: "🏛️",
  label: "Classic Delhi Tour",
  sub: "India Gate → Qutub Minar",
  origin: "India Gate, New Delhi",
  destination: "Qutub Minar, New Delhi",
  color: "#4f46e5",
  originCoords: { lat: 28.6129, lng: 77.2295 },
  destCoords:   { lat: 28.5245, lng: 77.1855 },
};

// Delhi default center
const DELHI: LatLng = { lat: 28.6139, lng: 77.2090 };

export default function MapPage() {
  const { user, loading, isDemo } = useAuth();
  const router = useRouter();
  const mapRef = useRef<LMap | null>(null);
  const polylineRefs = useRef<LPolyline[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiMarkerRefs = useRef<any[]>([]);

  const [searchLoading, setSearchLoading] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [aiHazards, setAiHazards] = useState<Hazard[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [navState, setNavState] = useState<NavigationState | null>(null);
  const [activeAlert, setActiveAlert] = useState<AlertItem | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gpsDotRef = useRef<any>(null);
  const navEngineRef = useRef<NavigationEngine | null>(null);

  // ── Satellite Intelligence State ──────────────────────────────────────────
  const [satelliteEnabled, setSatelliteEnabled] = useState(false);
  const [satelliteZones, setSatelliteZones] = useState<SatelliteZone[]>([]);
  const [satLoading, setSatLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherFactor | null>(null);
  const [satAlert, setSatAlert] = useState<SatelliteZone | null>(null);
  const satAlertedIds = useRef<Set<string>>(new Set());

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  // Show beginner's guide only for first-time users
  useEffect(() => {
    if (!user) return;
    const key = `waywarn_tour_seen_${user.uid}`;
    const seen = localStorage.getItem(key);
    if (!seen) setTourOpen(true);
  }, [user]);

  const markTourSeen = useCallback(() => {
    if (!user) return;
    const key = `waywarn_tour_seen_${user.uid}`;
    localStorage.setItem(key, "1");
  }, [user]);

  // Load nearby hazards + weather on mount
  useEffect(() => {
    fetchHazards({ lat: DELHI.lat, lng: DELHI.lng }).then(setHazards);
    fetchWeather(DELHI.lat, DELHI.lng).then(setWeather);
  }, []);

  const handleMapReady = useCallback((map: LMap) => {
    mapRef.current = map;

    navEngineRef.current = new NavigationEngine(
      (state: NavigationState) => {
        setNavState(state);
        if (state.currentPosition && mapRef.current) {
          import("leaflet").then((leafletMod) => {
            const L = leafletMod.default;
            const pos: [number, number] = [state.currentPosition!.lat, state.currentPosition!.lng];
            if (!gpsDotRef.current) {
              gpsDotRef.current = L.marker(pos, { icon: createGpsDotIcon(L), zIndexOffset: 1000 }).addTo(mapRef.current!);
            } else {
              gpsDotRef.current.setLatLng(pos);
            }
          });
        } else if (!state.isActive && gpsDotRef.current) {
          gpsDotRef.current.remove();
          gpsDotRef.current = null;
        }
      },
      (alert: AlertItem) => {
        setActiveAlert(alert);
      }
    );
  }, []);

  // ── Satellite proximity check during navigation ──────────────────────────
  useEffect(() => {
    if (!navState?.isActive || !navState.currentPosition || !satelliteEnabled || satelliteZones.length === 0) return;

    const match = checkProximityAlert(navState.currentPosition, satelliteZones, 400);
    if (match && !satAlertedIds.current.has(match.id)) {
      satAlertedIds.current.add(match.id);
      setSatAlert(match);
    }
  }, [navState, satelliteEnabled, satelliteZones]);

  // ── Draw polylines ─────────────────────────────────────────────────────
  const drawRoutes = useCallback(
    async (routeList: Route[], selected: Route) => {
      if (!mapRef.current) return;
      const L = (await import("leaflet")).default;

      polylineRefs.current.forEach((p) => p.remove());
      polylineRefs.current = [];
      aiMarkerRefs.current.forEach((m) => m.remove());
      aiMarkerRefs.current = [];

      routeList.forEach((r) => {
        const isActive = r.id === selected.id;
        const line = L.polyline(
          r.coordinates.map((c) => [c.lat, c.lng] as [number, number]),
          { color: r.color, weight: isActive ? 5 : 3, opacity: isActive ? 0.95 : 0.4 }
        ).addTo(mapRef.current!);
        polylineRefs.current.push(line);
      });

      if (selected.coordinates.length) {
        const bounds = selected.coordinates.map((c) => [c.lat, c.lng] as [number, number]);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    },
    []
  );

  // ── Draw AI pothole markers ────────────────────────────────────────────
  const drawAiMarkers = useCallback(async (aiPotholes: Hazard[]) => {
    if (!mapRef.current || !aiPotholes.length) return;
    const L = (await import("leaflet")).default;

    aiMarkerRefs.current.forEach((m) => m.remove());
    aiMarkerRefs.current = [];

    aiPotholes.forEach((h) => {
      const conf = Math.round((h.aiConfidence ?? 0.7) * 100);
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:14px;height:14px;
          background:rgba(168,85,247,0.9);
          border:2px solid #c084fc;
          border-radius:50%;
          box-shadow:0 0 8px rgba(168,85,247,0.8),0 0 20px rgba(168,85,247,0.4);
          position:relative;
        "><div style="
          position:absolute;inset:-6px;
          border-radius:50%;
          border:1px solid rgba(168,85,247,0.4);
          animation:pulse-ring 1.4s ease-out infinite;
        "></div></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const marker = L.marker([h.location.lat, h.location.lng], { icon })
        .addTo(mapRef.current!)
        .bindPopup(`<b>🤖 AI Predicted Pothole</b><br/>Severity: ${h.severity}<br/>Confidence: ${conf}%`);
      aiMarkerRefs.current.push(marker);
    });
  }, []);

  // ── Update hazard counts on all routes ────────────────────────────────
  const applyAiHazardsToRoutes = useCallback(
    (allRoutes: Route[], targetRoute: Route, potholes: Hazard[]) => {
      const aiCount = potholes.length;
      const density = aiCount / Math.max(targetRoute.distanceKm, 1);
      const densityToRisk = (d: number) => Math.min(100, Math.round(d * 33));
      return allRoutes.map((r) => {
        if (r.id === targetRoute.id) {
          return { ...r, hazardCount: aiCount, riskScore: densityToRisk(density) };
        }
        const estimated = Math.round(density * r.distanceKm * (0.75 + Math.random() * 0.5));
        const estDensity = estimated / Math.max(r.distanceKm, 1);
        return { ...r, hazardCount: estimated, riskScore: densityToRisk(estDensity) };
      });
    },
    []
  );

  // ── Satellite zone generation ─────────────────────────────────────────
  const computeSatelliteZones = useCallback(
    async (routeCoords: LatLng[], allHazards: Hazard[], center: LatLng) => {
      setSatLoading(true);
      try {
        // Fetch fresh weather for the route start
        const wx = await fetchWeather(center.lat, center.lng);
        setWeather(wx);

        const { zones, envRisk } = await generateSatelliteZones(routeCoords, wx, allHazards);
        setSatelliteZones(zones);
        satAlertedIds.current.clear();
        return envRisk;
      } catch (e) {
        console.warn("Satellite zone generation failed:", e);
        return 0;
      } finally {
        setSatLoading(false);
      }
    },
    []
  );

  // ── Core routing pipeline ─────────────────────────────────────────────
  const runRouting = useCallback(
    async (originCoords: LatLng, destCoords: LatLng) => {
      const osrmRoutes = await fetchOSRMRoutes(originCoords, destCoords);
      if (!osrmRoutes.length) throw new Error("No routes found between these locations.");

      const hazardCounts = osrmRoutes.map((r) =>
        countHazardsAlongRoute(
          hazards,
          r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))
        )
      );

      const builtRoutes = buildRoutes(osrmRoutes, hazardCounts);
      const sorted = [...builtRoutes].sort((a, b) => a.riskScore - b.riskScore);
      sorted[0].label = "Safest";
      sorted[1] && (sorted[1].label = builtRoutes.length > 1 ? "Fastest" : "Shortest");
      sorted[2] && (sorted[2].label = "Shortest");

      const best = sorted[0];
      setRoutes(sorted);
      setSelectedRoute(best);
      saveRoutes(sorted);
      saveSelectedRoute(best);
      setSheetOpen(true);
      await drawRoutes(sorted, best);

      // Satellite zones run in background (always, auto-applied)
      const allHazards = [...hazards];
      computeSatelliteZones(best.coordinates, allHazards, originCoords).then((envRisk) => {
        // Apply envRisk to all routes (proportional estimate)
        setRoutes((prev) => {
          const updated = prev.map((r, i) => ({
            ...r,
            envRisk: i === 0 ? envRisk : Math.round(envRisk * (0.7 + Math.random() * 0.6)),
          }));
          // Re-label the weather-safe route (lowest envRisk)
          const safestEnv = [...updated].sort((a, b) => (a.envRisk ?? 100) - (b.envRisk ?? 100))[0];
          const relabeled = updated.map((r) =>
            r.id === safestEnv.id && (safestEnv.envRisk ?? 0) < 40
              ? { ...r, label: "Weather-Safe" as const }
              : r
          );
          saveRoutes(relabeled);
          return relabeled;
        });
        setSelectedRoute((prev) => prev ? { ...prev, envRisk } : prev);
      });

      // AI potholes in background
      setPredicting(true);
      predictPotholes(best.coordinates, best.distanceKm)
        .then((potholes) => {
          setAiHazards(potholes);
          drawAiMarkers(potholes);
          setRoutes((prev) => {
            const updated = applyAiHazardsToRoutes(prev, best, potholes);
            saveRoutes(updated);
            return updated;
          });
          setSelectedRoute((prev) =>
            prev ? { ...prev, hazardCount: potholes.length } : prev
          );
        })
        .catch(console.warn)
        .finally(() => setPredicting(false));
    },
    [hazards, drawRoutes, drawAiMarkers, applyAiHazardsToRoutes, computeSatelliteZones]
  );

  // ── Search handler ────────────────────────────────────────────────────
  const handleSearch = useCallback(
    async (origin: string, destination: string) => {
      setSearchLoading(true);
      setError(null);
      setRoutes([]);
      setSheetOpen(false);

      try {
        const [oCoords, dCoords] = await Promise.all([geocode(origin), geocode(destination)]);
        if (!oCoords) throw new Error(`Could not find "${origin}". Try a more specific location in India.`);
        if (!dCoords) throw new Error(`Could not find "${destination}". Try a more specific location in India.`);
        await runRouting(oCoords, dCoords);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Routing failed. Please try again.");
      } finally {
        setSearchLoading(false);
      }
    },
    [runRouting]
  );

  // ── Demo handler ──────────────────────────────────────────────────────
  const handleDemoScenario = useCallback(
    async (scenario: DemoScenario) => {
      markTourSeen();
      setActiveDemoId(scenario.id);
      setTourOpen(false);
      setSearchLoading(true);
      setError(null);
      setRoutes([]);
      setSheetOpen(false);

      try {
        const originCoords: LatLng = scenario.originCoords ?? (await geocode(scenario.origin))!;
        const destCoords:   LatLng = scenario.destCoords   ?? (await geocode(scenario.destination))!;
        if (!originCoords) throw new Error("Could not resolve demo origin.");
        if (!destCoords)   throw new Error("Could not resolve demo destination.");
        await runRouting(originCoords, destCoords);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Demo routing failed. Please try again.");
      } finally {
        setSearchLoading(false);
      }
    },
    [runRouting, markTourSeen]
  );

  // ── Skip tour → mark seen + immediately run demo ───────────────────────
  const handleSkipTour = useCallback(() => {
    markTourSeen();
    setTourOpen(false);
    handleDemoScenario(DEMO_SCENARIO);
  }, [markTourSeen, handleDemoScenario]);

  // ── Route select handler ──────────────────────────────────────────────
  const handleSelectRoute = useCallback(
    async (route: Route) => {
      setSelectedRoute(route);
      await drawRoutes(routes, route);
      setPredicting(true);
      predictPotholes(route.coordinates, route.distanceKm)
        .then((potholes) => {
          setAiHazards(potholes);
          drawAiMarkers(potholes);
          setRoutes((prev) => {
            const updated = applyAiHazardsToRoutes(prev, route, potholes);
            saveRoutes(updated);
            return updated;
          });
          setSelectedRoute((prev) =>
            prev ? { ...prev, hazardCount: potholes.length } : prev
          );
        })
        .catch(console.warn)
        .finally(() => setPredicting(false));
    },
    [routes, drawRoutes, drawAiMarkers, applyAiHazardsToRoutes]
  );

  // ── Satellite toggle handler ──────────────────────────────────────────
  const handleSatelliteToggle = useCallback(async () => {
    const next = !satelliteEnabled;
    setSatelliteEnabled(next);

    if (next && satelliteZones.length === 0 && selectedRoute) {
      // Zones not computed yet — compute now
      const allHazards = [...hazards, ...aiHazards];
      await computeSatelliteZones(selectedRoute.coordinates, allHazards, selectedRoute.coordinates[0] ?? DELHI);
    } else if (next && satelliteZones.length === 0) {
      // No route yet — compute for the current map center area using default coords
      const allHazards = [...hazards, ...aiHazards];
      const demoCoords: LatLng[] = [
        { lat: 28.6129, lng: 77.2295 },
        { lat: 28.5700, lng: 77.2100 },
        { lat: 28.5245, lng: 77.1855 },
      ];
      await computeSatelliteZones(demoCoords, allHazards, DELHI);
    }

    if (!next) {
      // Turning off — clear alert if showing
      setSatAlert(null);
    }
  }, [satelliteEnabled, satelliteZones.length, selectedRoute, hazards, aiHazards, computeSatelliteZones]);

  if (loading || !user) return null;

  // Weather pill text
  const weatherText = weather
    ? `${weather.isRaining ? "🌧️" : "☀️"} ${weather.description}`
    : null;

  return (
    <div className={styles.page}>
      {/* Fullscreen Map */}
      <div className={styles.mapContainer}>
        <MapComponent center={[DELHI.lat, DELHI.lng]} zoom={13} onMapReady={handleMapReady} />
      </div>

      {/* Satellite Hazard Overlay — purely Leaflet-imperative */}
      <SatelliteLayer
        map={mapRef.current}
        zones={satelliteZones}
        enabled={satelliteEnabled}
      />

      {/* Floating Search Bar */}
      <div className={styles.searchWrap}>
        <SearchBar onSearch={handleSearch} loading={searchLoading} />
      </div>

      {/* Satellite proximity alert toast */}
      <SatToast
        zone={satAlert}
        onDismiss={() => setSatAlert(null)}
      />

      {/* Error toast */}
      {error && (
        <div className={styles.errorToast}>
          ⚠️ {error}
        </div>
      )}

      {/* Badge row */}
      <div className={styles.badges}>
        {isDemo && !sheetOpen && !tourOpen && (
          <button
            className={styles.demoBadgeBtn}
            onClick={() => setTourOpen(true)}
            disabled={searchLoading}
            title="Open demo guide"
          >
            🎮 Demo Mode — New Delhi
          </button>
        )}
        {predicting && (
          <div className={styles.aiBadge}>🤖 AI predicting potholes...</div>
        )}
        {!predicting && aiHazards.length > 0 && (
          <div className={styles.aiBadge} style={{ background: "rgba(168,85,247,0.12)", borderColor: "rgba(168,85,247,0.35)", color: "#c084fc" }}>
            🟣 {aiHazards.length} AI-predicted potholes
          </div>
        )}
        {satLoading && (
          <div className={styles.satLoadingBadge}>🛰️ Scanning satellite data...</div>
        )}
        {!satLoading && satelliteEnabled && satelliteZones.length > 0 && (
          <div className={styles.satZoneBadge}>
            🛰️ {satelliteZones.length} environmental risk zone{satelliteZones.length !== 1 ? "s" : ""} detected
          </div>
        )}
        {weatherText && satelliteEnabled && (
          <div className={styles.weatherPill}>{weatherText}</div>
        )}
      </div>

      {/* 🛰️ Satellite View Toggle Button */}
      <button
        className={`${styles.satToggleBtn} ${satelliteEnabled ? styles.satToggleBtnOn : ""}`}
        onClick={handleSatelliteToggle}
        title={satelliteEnabled ? "Hide satellite hazard layer" : "Show satellite hazard intelligence"}
        id="satellite-toggle-btn"
      >
        <span className={styles.satDot} />
        🛰️ {satelliteEnabled ? "Satellite ON" : "Satellite View"}
      </button>

      {/* Guided Demo Tour Overlay — first-time users only */}
      {tourOpen && !navState?.isActive && (
        <DemoTour
          scenario={DEMO_SCENARIO}
          onPickScenario={handleDemoScenario}
          onSkip={handleSkipTour}
          searchLoading={searchLoading}
          activeDemoId={activeDemoId}
        />
      )}

      {/* Live nav progress HUD */}
      {navState?.isActive && (
        <div className={styles.navHud}>
          <Speedometer
            speed={navState.currentSpeed ?? 0}
            maxSpeed={80}
            isSlowingDown={navState.isSlowingDown ?? false}
          />
          <div className={styles.navInfo}>
            <div className={styles.navStatusRow}>
              <span className={styles.navDot} />
              <span className={styles.navText}>Navigating…</span>
            </div>
            <span className={styles.navProgress}>
              {Math.round((navEngineRef.current?.getProgress() ?? 0) * 100)}% complete
            </span>
          </div>
          <button
            className={styles.stopBtn}
            onClick={() => {
              navEngineRef.current?.stop();
              setNavState(null);
              setSheetOpen(true);
            }}
          >
            Stop
          </button>
        </div>
      )}

      {/* Proximity alert toast (road hazards) */}
      <AlertModal
        alert={activeAlert}
        onDismiss={() => setActiveAlert(null)}
      />

      {/* Route cards bottom sheet */}
      {sheetOpen && routes.length > 0 && (
        <div className={styles.bottomSheet}>
          <div className={styles.sheetHandle} />
          <p className={styles.sheetTitle}>Choose a Route</p>
          <div className={styles.routeList}>
            {routes.map((r) => (
              <RouteCard
                key={r.id}
                route={r}
                isSelected={selectedRoute?.id === r.id}
                onSelect={handleSelectRoute}
              />
            ))}
          </div>

          <button
            className={styles.navigateBtn}
            onClick={() => {
              if (!selectedRoute) return;
              const allHazards = [...hazards, ...aiHazards];
              navEngineRef.current?.start(selectedRoute, allHazards);
              setSheetOpen(false);
              satAlertedIds.current.clear();
            }}
          >
            🧭 Navigate with {selectedRoute?.label} Route
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
