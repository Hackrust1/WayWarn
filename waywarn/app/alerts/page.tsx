"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav/BottomNav";
import styles from "./alerts.module.css";
import { HAZARD_EMOJI } from "@/lib/hazards";
import { HazardType } from "@/types";

interface AlertRecord {
  id: string;
  message: string;
  timestamp: number;
  hazardType: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load alert history from IndexedDB
    import("@/lib/storage").then(({ getAlertHistory }) => {
      getAlertHistory().then((h) => {
        setAlerts(h);
        setLoaded(true);
      });
    });
  }, []);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>🔔 Alerts</h1>
        <p className={styles.sub}>Proximity alerts from your last navigation</p>
      </div>

      {!loaded ? (
        <div className={styles.loading}>
          <div className="spinner" />
        </div>
      ) : alerts.length === 0 ? (
        <motion.div
          className={styles.empty}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className={styles.emptyIcon}>🛡️</span>
          <p>No alerts yet</p>
          <p className={styles.emptySub}>
            Start navigation on the Map tab to receive live hazard alerts.
          </p>
        </motion.div>
      ) : (
        <div className={styles.list}>
          {alerts.map((alert, i) => (
            <motion.div
              key={alert.id}
              className={styles.alertCard}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <span className={styles.alertEmoji}>
                {HAZARD_EMOJI[alert.hazardType as HazardType] ?? "⚠️"}
              </span>
              <div className={styles.alertContent}>
                <p className={styles.alertMsg}>{alert.message}</p>
                <p className={styles.alertTime}>
                  {formatDate(alert.timestamp)} · {formatTime(alert.timestamp)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
