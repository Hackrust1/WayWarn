// ============================================================
// WayWarn — GPS Simulation & Proximity Alert Logic
// Simulates movement along a route every 1–1.5 seconds
// ============================================================

import { LatLng, Route, Hazard, AlertItem, NavigationState } from "@/types";
import { haversineMetres } from "./maps";
import { findNearbyHazards } from "./hazards";

export type NavCallback = (state: NavigationState) => void;
export type AlertCallback = (alert: AlertItem) => void;

const ALERT_RADIUS_METRES = 50;
const SLOWDOWN_RADIUS_METRES = 30;
const MAX_QUEUED_ALERTS = 3;

// Speed constants (km/h)
const BASE_SPEED_MIN = 32;
const BASE_SPEED_MAX = 52;
const SLOW_SPEED_MIN = 10;
const SLOW_SPEED_MAX = 18;

export class NavigationEngine {
  private route: Route | null = null;
  private hazards: Hazard[] = [];
  private currentIndex = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private alertedIds = new Set<string>();
  private alertQueue: string[] = [];
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
    this.alertedIds.clear();
    this.alertQueue = [];
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
      // Reached destination
      this.stop();
      return;
    }

    const currentPos = coords[this.currentIndex];

    // Find hazards within alert radius
    const nearby = findNearbyHazards(this.hazards, currentPos, ALERT_RADIUS_METRES);

    // Find hazards within slow-down radius
    const closeHazards = findNearbyHazards(this.hazards, currentPos, SLOWDOWN_RADIUS_METRES);
    const isSlowingDown = closeHazards.length > 0;

    // Determine target speed based on proximity
    if (isSlowingDown) {
      this.targetSpeed = SLOW_SPEED_MIN + Math.random() * (SLOW_SPEED_MAX - SLOW_SPEED_MIN);
    } else {
      // Drift naturally within normal range for realism
      this.targetSpeed = BASE_SPEED_MIN + Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN);
    }

    // Lerp current speed toward target (smooth transition)
    const lerpFactor = isSlowingDown ? 0.45 : 0.2;
    this.currentSpeed = this.currentSpeed + (this.targetSpeed - this.currentSpeed) * lerpFactor;

    // Emit state update (for moving dot on map + speedometer)
    this.onStateChange({
      isActive: true,
      currentRoute: this.route,
      currentPositionIndex: this.currentIndex,
      currentPosition: currentPos,
      nearbyHazards: nearby.map((n) => n.hazard),
      currentSpeed: Math.round(this.currentSpeed),
      isSlowingDown,
    });

    // Emit alerts for new hazards (deduplicated, max 3 queued)
    for (const { hazard, distanceMetres } of nearby) {
      if (
        !this.alertedIds.has(hazard.id) &&
        this.alertQueue.length < MAX_QUEUED_ALERTS
      ) {
        this.alertedIds.add(hazard.id);
        this.alertQueue.push(hazard.id);

        const alert: AlertItem = {
          id: `alert-${Date.now()}-${hazard.id}`,
          hazard,
          distanceMeters: distanceMetres,
          timestamp: Date.now(),
        };
        this.onAlert(alert);
      }
    }

    // Advance position — skip every 3 points for speed (demo feel)
    this.currentIndex += 3;

    // Random interval: 1000–1500ms
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

