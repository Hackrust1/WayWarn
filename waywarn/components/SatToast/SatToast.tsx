"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SatelliteZone } from "@/types";
import styles from "./SatToast.module.css";

interface SatToastProps {
  zone: SatelliteZone | null;
  onDismiss: () => void;
}

const ZONE_EMOJI: Record<string, string> = {
  flood:     "🌊",
  waterlog:  "💧",
  landslide: "⛰️",
  blockage:  "🚧",
};

const ZONE_HEADLINE: Record<string, string> = {
  flood:     "Flood Risk Ahead",
  waterlog:  "Waterlogging Detected",
  landslide: "Landslide Zone",
  blockage:  "Road Blockage Alert",
};

export default function SatToast({ zone, onDismiss }: SatToastProps) {
  const spokenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!zone) return;

    // Auto-dismiss after 3 seconds
    const timer = setTimeout(onDismiss, 3000);

    // TTS — speak the alert message
    if ("speechSynthesis" in window && !spokenRef.current.has(zone.id)) {
      spokenRef.current.add(zone.id);
      const utterance = new SpeechSynthesisUtterance(zone.alertMessage);
      utterance.lang = "en-IN";
      utterance.rate = 1.05;
      utterance.volume = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }

    // Haptic vibration
    if ("vibrate" in navigator) {
      navigator.vibrate([150, 80, 150, 80, 250]);
    }

    return () => clearTimeout(timer);
  }, [zone, onDismiss]);

  return (
    <AnimatePresence>
      {zone && (
        <motion.div
          className={`${styles.toast} ${styles[zone.type]}`}
          initial={{ opacity: 0, y: -24, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        >
          <div className={styles.body}>
            {/* Icon */}
            <div className={styles.iconWrap}>
              {ZONE_EMOJI[zone.type]}
            </div>

            {/* Text */}
            <div className={styles.text}>
              <p className={styles.headline}>
                {ZONE_HEADLINE[zone.type]}
              </p>
              <p className={styles.message}>{zone.alertMessage}</p>
            </div>

            {/* Trust tag */}
            <span className={styles.tag}>
              🛰️ {zone.trustTag}
            </span>
          </div>

          {/* Auto-dismiss progress bar */}
          <motion.div
            className={styles.progress}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 3, ease: "linear" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
