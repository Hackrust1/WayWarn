// ============================================================
// WayWarn — Offline Storage (IndexedDB via idb)
// Caches routes + hazards, queues pending uploads
// ============================================================

import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Route, Hazard, PendingUpload } from "@/types";

interface WayWarnDB extends DBSchema {
  routes: {
    key: string;
    value: Route;
  };
  hazards: {
    key: string;
    value: Hazard;
  };
  pendingUploads: {
    key: string;
    value: PendingUpload;
  };
  alerts: {
    key: string;
    value: { id: string; message: string; timestamp: number; hazardType: string };
  };
}

const DB_NAME = "waywarn-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<WayWarnDB>> | null = null;

function getDB(): Promise<IDBPDatabase<WayWarnDB>> {
  if (!dbPromise) {
    dbPromise = openDB<WayWarnDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("routes"))
          db.createObjectStore("routes", { keyPath: "id" });
        if (!db.objectStoreNames.contains("hazards"))
          db.createObjectStore("hazards", { keyPath: "id" });
        if (!db.objectStoreNames.contains("pendingUploads"))
          db.createObjectStore("pendingUploads", { keyPath: "id" });
        if (!db.objectStoreNames.contains("alerts"))
          db.createObjectStore("alerts", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

// --- Routes ---
export async function cacheRoutes(routes: Route[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction("routes", "readwrite");
    await Promise.all(routes.map((r) => tx.store.put(r)));
    await tx.done;
  } catch { /* ignore offline errors */ }
}

export async function getCachedRoutes(): Promise<Route[]> {
  try {
    const db = await getDB();
    return await db.getAll("routes");
  } catch { return []; }
}

// --- Hazards ---
export async function cacheHazards(hazards: Hazard[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction("hazards", "readwrite");
    await Promise.all(hazards.map((h) => tx.store.put(h)));
    await tx.done;
  } catch { /* ignore */ }
}

export async function getCachedHazards(): Promise<Hazard[]> {
  try {
    const db = await getDB();
    return await db.getAll("hazards");
  } catch { return []; }
}

// --- Pending uploads (offline queue) ---
export async function queueUpload(upload: PendingUpload): Promise<void> {
  try {
    const db = await getDB();
    await db.put("pendingUploads", upload);
  } catch { /* ignore */ }
}

export async function getPendingUploads(): Promise<PendingUpload[]> {
  try {
    const db = await getDB();
    return await db.getAll("pendingUploads");
  } catch { return []; }
}

export async function removeUpload(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete("pendingUploads", id);
  } catch { /* ignore */ }
}

// --- Alert history ---
export async function saveAlertToHistory(alert: {
  id: string; message: string; timestamp: number; hazardType: string;
}): Promise<void> {
  try {
    const db = await getDB();
    await db.put("alerts", alert);
  } catch { /* ignore */ }
}

export async function getAlertHistory(): Promise<Array<{
  id: string; message: string; timestamp: number; hazardType: string;
}>> {
  try {
    const db = await getDB();
    const all = await db.getAll("alerts");
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
  } catch { return []; }
}
