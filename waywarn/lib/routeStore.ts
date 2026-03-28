// ============================================================
// WayWarn — Routes Store (Zustand-free, sessionStorage based)
// Shares route data between map page and routes comparison page
// ============================================================

import { Route } from "@/types";

const KEY = "waywarn_routes";
const SEL_KEY = "waywarn_selected_route";

export function saveRoutes(routes: Route[]): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(routes));
  } catch {/* ignore */}
}

export function loadRoutes(): Route[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveSelectedRoute(route: Route): void {
  try {
    sessionStorage.setItem(SEL_KEY, JSON.stringify(route));
  } catch {/* ignore */}
}

export function loadSelectedRoute(): Route | null {
  try {
    const raw = sessionStorage.getItem(SEL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
