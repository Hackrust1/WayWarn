"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertItem } from "@/types";
import { HAZARD_EMOJI } from "@/lib/hazards";
import styles from "./AlertModal.module.css";

interface AlertModalProps {
  alert: AlertItem | null;
  onDismiss: () => void;
  /** 0 = no auto-dismiss (stays until hazard is passed). Default: 2000ms */
  autoDismissMs?: number;
}

export default function AlertModal({ alert, onDismiss, autoDismissMs = 2000 }: AlertModalProps) {
  const spokenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!alert) return;

    // Auto-dismiss only when autoDismissMs > 0
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (autoDismissMs > 0) {
      timer = setTimeout(onDismiss, autoDismissMs);
    }

    // Voice + vibration fire once per unique alert ID (synced with popup appearance)
    if (!spokenRef.current.has(alert.id)) {
      spokenRef.current.add(alert.id);

      const typeLabel = alert.hazard.type.replace(/_/g, " ");
      const dist = Math.round(alert.distanceMeters);

      // 📳 Vibrate immediately
      if ("vibrate" in navigator) {
        navigator.vibrate([200, 80, 200]);
      }

      // 🔊 Speak after a tiny delay so it doesn't cut off the popup animation
      if ("speechSynthesis" in window) {
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(
            `Warning! ${typeLabel} ahead, ${dist} metres.`
          );
          utterance.lang = "en-IN";
          utterance.rate = 1.05;
          utterance.pitch = 1.1;
          utterance.volume = 1;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        }, 120);
      }
    }

    return () => { if (timer) clearTimeout(timer); };
  }, [alert, onDismiss, autoDismissMs]);

  const emoji = alert ? HAZARD_EMOJI[alert.hazard.type] ?? "⚠️" : "";
  const typeLabel = alert
    ? alert.hazard.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "";
  const severityColor =
    alert?.hazard.severity === "high"   ? "var(--danger)"  :
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
          {/* Pulsing severity dot */}
          <div className={styles.pulse} style={{ background: severityColor }} />

          <div className={styles.content}>
            <span className={styles.emoji}>{emoji}</span>
            <div className={styles.text}>
              <p className={styles.type}>{typeLabel}</p>
              <p className={styles.distance}>
                {Math.round(alert.distanceMeters)}m ahead
              </p>
            </div>
            <div
              className={styles.severity}
              style={{
                background: severityColor + "22",
                color: severityColor,
                border: `1px solid ${severityColor}55`,
              }}
            >
              {alert.hazard.severity.toUpperCase()}
            </div>
          </div>

          {/* Progress bar — only shown when auto-dismissing */}
          {autoDismissMs > 0 && (
            <motion.div
              className={styles.progressBar}
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: autoDismissMs / 1000, ease: "linear" }}
              style={{ background: severityColor }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

