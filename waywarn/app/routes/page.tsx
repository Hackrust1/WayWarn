"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav/BottomNav";
import RouteCard from "@/components/RouteCard/RouteCard";
import { Route } from "@/types";
import { loadRoutes, loadSelectedRoute, saveSelectedRoute } from "@/lib/routeStore";
import styles from "./routes.module.css";

export default function RoutesPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selected, setSelected] = useState<Route | null>(null);

  useEffect(() => {
    const r = loadRoutes();
    const s = loadSelectedRoute();
    setRoutes(r);
    setSelected(s);
  }, []);

  const handleSelect = useCallback((route: Route) => {
    setSelected(route);
    saveSelectedRoute(route);
    // Navigate back to map after a short delay
    setTimeout(() => router.push("/map"), 300);
  }, [router]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>🛣️ Route Comparison</h1>
        <p className={styles.sub}>Tap a route to select it</p>
      </div>

      {routes.length === 0 ? (
        <motion.div
          className={styles.empty}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className={styles.emptyIcon}>🗺️</span>
          <p>No routes yet.</p>
          <p className={styles.emptySub}>Go to Map and search a destination first.</p>
          <button className="btn btn-primary" onClick={() => router.push("/map")}>
            Go to Map
          </button>
        </motion.div>
      ) : (
        <>
          {/* Summary row */}
          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryVal}>{routes.length}</span>
              <span className={styles.summaryLabel}>Routes</span>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryItem}>
              <span className={styles.summaryVal}>
                {Math.min(...routes.map((r) => r.distanceKm))} km
              </span>
              <span className={styles.summaryLabel}>Shortest</span>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryItem}>
              <span className={styles.summaryVal}>
                {Math.min(...routes.map((r) => r.hazardCount))}
              </span>
              <span className={styles.summaryLabel}>Min Hazards</span>
            </div>
          </div>

          {/* Route cards */}
          <div className={styles.list}>
            {routes.map((route, i) => (
              <motion.div
                key={route.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <RouteCard
                  route={route}
                  isSelected={selected?.id === route.id}
                  onSelect={handleSelect}
                />
              </motion.div>
            ))}
          </div>

          {/* Comparison legend */}
          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "var(--safe)" }} />
              <span>Safest — fewest hazards</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "var(--warning)" }} />
              <span>Fastest — quickest ETA</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "var(--danger)" }} />
              <span>Shortest — minimum km</span>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
