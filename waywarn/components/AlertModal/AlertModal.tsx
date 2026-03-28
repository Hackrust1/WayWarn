"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertItem } from "@/types";
import { HAZARD_EMOJI } from "@/lib/hazards";
import styles from "./AlertModal.module.css";

interface AlertModalProps {
  alert: AlertItem | null;
  onDismiss: () => void;
}

export default function AlertModal({ alert, onDismiss }: AlertModalProps) {
  const spokenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!alert) return;

    // Auto-dismiss after 2 seconds
    const timer = setTimeout(onDismiss, 2000);

    // Web Speech API — speak alert aloud (Indian English)
    if ("speechSynthesis" in window && !spokenRef.current.has(alert.id)) {
      spokenRef.current.add(alert.id);
      const utterance = new SpeechSynthesisUtterance(
        `Warning! ${alert.hazard.type.replace(/_/g, " ")} ahead, ${Math.round(alert.distanceMeters)} metres.`
      );
      utterance.lang = "en-IN";
      utterance.rate = 1.1;
      utterance.volume = 1;
      window.speechSynthesis.cancel(); // clear queue
      window.speechSynthesis.speak(utterance);
    }

    // Vibration API
    if ("vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    return () => clearTimeout(timer);
  }, [alert, onDismiss]);

  const emoji = alert ? HAZARD_EMOJI[alert.hazard.type] : "";
  const severityColor =
    alert?.hazard.severity === "high" ? "var(--danger)" :
    alert?.hazard.severity === "medium" ? "var(--warning)" :
    "var(--safe)";

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          className={styles.toast}
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{ borderColor: severityColor }}
        >
          {/* Pulsing indicator */}
          <div className={styles.pulse} style={{ background: severityColor }} />

          <div className={styles.content}>
            <span className={styles.emoji}>{emoji}</span>
            <div className={styles.text}>
              <p className={styles.type}>
                {alert.hazard.type.replace(/_/g, " ").toUpperCase()}
              </p>
              <p className={styles.distance}>
                {Math.round(alert.distanceMeters)}m ahead
              </p>
            </div>
            <div
              className={styles.severity}
              style={{ background: severityColor + "22", color: severityColor, border: `1px solid ${severityColor}55` }}
            >
              {alert.hazard.severity}
            </div>
          </div>

          {/* Progress bar (auto-dismiss timer) */}
          <motion.div
            className={styles.progressBar}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 2, ease: "linear" }}
            style={{ background: severityColor }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
