"use client";

import { motion } from "framer-motion";
import { Route } from "@/types";
import styles from "./RouteCard.module.css";

interface RouteCardProps {
  route: Route;
  isSelected?: boolean;
  onSelect: (route: Route) => void;
}

const LABEL_META = {
  Safest:   { emoji: "🟢", desc: "Fewest hazards" },
  Fastest:  { emoji: "⚡", desc: "Quickest arrival" },
  Shortest: { emoji: "📏", desc: "Minimum distance" },
};

export default function RouteCard({ route, isSelected, onSelect }: RouteCardProps) {
  const meta = LABEL_META[route.label];
  const riskColor =
    route.riskScore < 30 ? "var(--safe)" :
    route.riskScore < 65 ? "var(--warning)" :
    "var(--danger)";

  return (
    <motion.div
      className={`${styles.card} ${isSelected ? styles.selected : ""}`}
      onClick={() => onSelect(route)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ borderColor: isSelected ? route.color : undefined }}
    >
      {/* Label badge */}
      <div className={styles.header}>
        <span className={styles.labelEmoji}>{meta.emoji}</span>
        <span className={styles.label} style={{ color: route.color }}>
          {route.label}
        </span>
        <span className={styles.desc}>{meta.desc}</span>
        {isSelected && <span className={styles.activeBadge}>Active</span>}
      </div>

      {/* Stats row */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statVal}>{route.distanceKm} km</span>
          <span className={styles.statLabel}>Distance</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statVal}>{route.etaMinutes} min</span>
          <span className={styles.statLabel}>ETA</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statVal} style={{ color: riskColor }}>
            {route.hazardCount}
          </span>
          <span className={styles.statLabel}>Hazards</span>
        </div>
      </div>

      {/* Risk score bar */}
      <div className={styles.riskWrap}>
        <span className={styles.riskLabel}>Risk</span>
        <div className={styles.riskBar}>
          <motion.div
            className={styles.riskFill}
            initial={{ width: 0 }}
            animate={{ width: `${route.riskScore}%` }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            style={{ background: riskColor }}
          />
        </div>
        <span className={styles.riskScore} style={{ color: riskColor }}>
          {route.riskScore}
        </span>
      </div>
    </motion.div>
  );
}
