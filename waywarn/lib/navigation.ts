// ============================================================
// WayWarn — GPS Simulation & Proximity Alert Logic
// Simulates movement along a route every 1–1.5 seconds
// ============================================================

import { LatLng, Route, Hazard, AlertItem, NavigationState } from "@/types";
import { haversineMetres } from "./maps";
import { findNearbyHazards } from "./hazards";

export type NavCallback = (state: NavigationState) => void;
export type AlertCallback = (alert: AlertItem) => void;

const ALERT_AHEAD_METRES  = 100;    // fire alert when hazard is ≤100m ahead on path
const SLOWDOWN_RADIUS_METRES = 20;  // speed reduces within 20m of hazard
const LOOK_AHEAD_COORDS   = 30;    // how many upcoming coords to scan each tick
const ALERT_COOLDOWN_MS   = 1500;  // min gap between consecutive toasts

// Speed constants (km/h)
const BASE_SPEED_MIN = 32;
const BASE_SPEED_MAX = 52;
const SLOW_SPEED_MIN = 10;
const SLOW_SPEED_MAX = 18;

export class NavigationEngine {
  private route: Route | null = null;
  private hazards: Hazard[] = [];
  private currentIndex = 0;
  private prevIndex = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private alertedIds = new Set<string>();
  private lastAlertTime = 0;
  private onStateChange: NavCallback;
  private onAlert: AlertCallback;
  private isRunning = false;
  private currentSpeed = 0;
  private targetSpeed = 0;

  constructor(onStateChange: NavCallback, onAlert: AlertCallback) {
    this.onStateChange = onStateChange;
    this.onAlert = onAlert;
  }

  start(route: Route, hazards: Hazard[]) {
    this.stop();
    this.route = route;
    this.hazards = hazards;
    this.currentIndex = 0;
    this.prevIndex = 0;
    this.alertedIds.clear();
    this.lastAlertTime = 0;
    this.isRunning = true;
    this.currentSpeed = BASE_SPEED_MIN + Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN);
    this.targetSpeed = this.currentSpeed;
    this.tick();
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.isRunning = false;
    this.route = null;
    this.currentSpeed = 0;
    this.targetSpeed = 0;
    this.onStateChange({
      isActive: false,
      currentRoute: null,
      currentPositionIndex: 0,
      currentPosition: null,
      nearbyHazards: [],
      currentSpeed: 0,
      isSlowingDown: false,
    });
  }

  private tick() {
    if (!this.isRunning || !this.route) return;

    const coords = this.route.coordinates;
    if (this.currentIndex >= coords.length) {
      this.stop();
      return;
    }

    const currentPos = coords[this.currentIndex];

    // ── Look-ahead scan: find hazards on the UPCOMING path ──────────────
    // Walk the next LOOK_AHEAD_COORDS points, accumulate distance from
    // currentPos, and collect any hazard whose closest route-point is within
    // ALERT_AHEAD_METRES on the path ahead. This fires the alert before the
    // GPS reaches the hazard, regardless of coordinate spacing.
    const detectedMap = new Map<string, { hazard: Hazard; distanceMetres: number }>();
    let cumulativeDist = 0;
    const lookAheadEnd = Math.min(this.currentIndex + LOOK_AHEAD_COORDS, coords.length - 1);

    for (let i = this.currentIndex; i < lookAheadEnd; i++) {
      if (i > this.currentIndex) {
        cumulativeDist += haversineMetres(coords[i - 1], coords[i]);
      }
      if (cumulativeDist > ALERT_AHEAD_METRES) break; // past the look-ahead window

      for (const entry of findNearbyHazards(this.hazards, coords[i], 30)) {
        if (!detectedMap.has(entry.hazard.id)) {
          // Report the cumulative path distance, not radial distance
          detectedMap.set(entry.hazard.id, {
            hazard: entry.hazard,
            distanceMetres: Math.max(cumulativeDist, entry.distanceMetres),
          });
        }
      }
    }
    const nearby = Array.from(detectedMap.values());

    // Check slow-down zone at current position
    const closeHazards = findNearbyHazards(this.hazards, currentPos, SLOWDOWN_RADIUS_METRES);
    const isSlowingDown = closeHazards.length > 0;

    // Speed lerp
    if (isSlowingDown) {
      this.targetSpeed = SLOW_SPEED_MIN + Math.random() * (SLOW_SPEED_MAX - SLOW_SPEED_MIN);
    } else {
      this.targetSpeed = BASE_SPEED_MIN + Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN);
    }
    const lerpFactor = isSlowingDown ? 0.45 : 0.2;
    this.currentSpeed = this.currentSpeed + (this.targetSpeed - this.currentSpeed) * lerpFactor;

    // Emit state
    this.onStateChange({
      isActive: true,
      currentRoute: this.route,
      currentPositionIndex: this.currentIndex,
      currentPosition: currentPos,
      nearbyHazards: nearby.map((n) => n.hazard),
      currentSpeed: Math.round(this.currentSpeed),
      isSlowingDown,
    });

    // ── Fire an alert for every new hazard detected ───────────────────────
    const now = Date.now();
    for (const { hazard, distanceMetres } of nearby) {
      if (this.alertedIds.has(hazard.id)) continue;           // already alerted

      // Respect cooldown so toasts don't stack visually
      if (now - this.lastAlertTime < ALERT_COOLDOWN_MS) {
        // Schedule a deferred alert after the cooldown expires
        const delay = ALERT_COOLDOWN_MS - (now - this.lastAlertTime) + 100;
        setTimeout(() => {
          if (!this.alertedIds.has(hazard.id)) {
            this.alertedIds.add(hazard.id);
            this.lastAlertTime = Date.now();
            this.onAlert({
              id: `alert-${Date.now()}-${hazard.id}`,
              hazard,
              distanceMeters: distanceMetres,
              timestamp: Date.now(),
            });
          }
        }, delay);
      } else {
        this.alertedIds.add(hazard.id);
        this.lastAlertTime = now;
        this.onAlert({
          id: `alert-${now}-${hazard.id}`,
          hazard,
          distanceMeters: distanceMetres,
          timestamp: now,
        });
      }
    }

    // Advance GPS position (2 coords/tick for fine resolution)
    this.prevIndex = this.currentIndex;
    this.currentIndex += 2;

    const interval = 1000 + Math.random() * 500;
    this.timer = setTimeout(() => this.tick(), interval);
  }

  getProgress(): number {
    if (!this.route) return 0;
    return this.currentIndex / this.route.coordinates.length;
  }

  getCurrentPosition(): LatLng | null {
    if (!this.route || this.currentIndex >= this.route.coordinates.length) return null;
    return this.route.coordinates[this.currentIndex];
  }
}


// Helper: create glowing GPS dot icon
export function createGpsDotIcon(L: typeof import("leaflet")) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:16px;height:16px;
      background:rgba(79,70,229,0.95);
      border:3px solid #fff;
      border-radius:50%;
      box-shadow:0 0 12px rgba(79,70,229,0.7),0 0 30px rgba(79,70,229,0.3);
      position:relative;
    "><div style="
      position:absolute;
      inset:-8px;
      border-radius:50%;
      border:2px solid rgba(79,70,229,0.3);
      animation:pulse-ring 1.4s ease-out infinite;
    "></div></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

