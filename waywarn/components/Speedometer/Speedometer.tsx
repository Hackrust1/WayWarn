"use client";

import { useMemo } from "react";
import styles from "./Speedometer.module.css";

interface SpeedometerProps {
  speed: number;       // Current speed in km/h
  maxSpeed?: number;   // Max speed for the dial (default 80)
  isSlowingDown?: boolean;
}

// Arc helpers
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const s = polarToCartesian(cx, cy, r, startAngle);
  const e = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
}

const CX = 80, CY = 80, R = 60;
const START_ANGLE = -135;
const END_ANGLE = 135;
const TOTAL_SWEEP = END_ANGLE - START_ANGLE; // 270°

export default function Speedometer({
  speed = 0,
  maxSpeed = 80,
  isSlowingDown = false,
}: SpeedometerProps) {
  const clampedSpeed = Math.min(Math.max(speed, 0), maxSpeed);
  const fraction = clampedSpeed / maxSpeed;
  const needleAngle = START_ANGLE + fraction * TOTAL_SWEEP;

  // Needle tip
  const needleTip = polarToCartesian(CX, CY, 46, needleAngle);
  const needleBase1 = polarToCartesian(CX, CY, 6, needleAngle - 90);
  const needleBase2 = polarToCartesian(CX, CY, 6, needleAngle + 90);

  // Color — green → amber → red based on speed fraction
  const arcColor = useMemo(() => {
    if (isSlowingDown || fraction > 0.85) return "#dc2626";
    if (fraction > 0.6) return "#d97706";
    return "#16a34a";
  }, [fraction, isSlowingDown]);

  // Fill arc up to current speed
  const filledEndAngle = needleAngle;
  const filledArc = describeArc(CX, CY, R, START_ANGLE, filledEndAngle);
  const trackArc = describeArc(CX, CY, R, START_ANGLE, END_ANGLE);

  // Tick marks
  const ticks = useMemo(() => {
    const marks = [];
    const count = 9; // 0, 10, 20 … 80
    for (let i = 0; i <= count; i++) {
      const angle = START_ANGLE + (i / count) * TOTAL_SWEEP;
      const inner = polarToCartesian(CX, CY, 50, angle);
      const outer = polarToCartesian(CX, CY, 56, angle);
      marks.push({ inner, outer, angle, i });
    }
    return marks;
  }, []);

  return (
    <div className={`${styles.wrapper} ${isSlowingDown ? styles.slowingDown : ""}`}>
      <svg
        viewBox="0 0 160 110"
        width="160"
        height="110"
        aria-label={`Speed: ${speed} km/h`}
      >
        {/* Track arc (background) */}
        <path
          d={trackArc}
          fill="none"
          stroke="rgba(79,70,229,0.1)"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Filled speed arc */}
        <path
          d={filledArc}
          fill="none"
          stroke={arcColor}
          strokeWidth="8"
          strokeLinecap="round"
          style={{ transition: "d 0.4s ease, stroke 0.5s ease" }}
        />

        {/* Tick marks */}
        {ticks.map(({ inner, outer, i }) => (
          <line
            key={i}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke="rgba(26,26,46,0.2)"
            strokeWidth={i % 2 === 0 ? 1.5 : 0.8}
          />
        ))}

        {/* Needle */}
        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
          fill={arcColor}
          style={{ transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}
        />

        {/* Centre hub */}
        <circle cx={CX} cy={CY} r={7} fill={arcColor} style={{ transition: "fill 0.5s ease" }} />
        <circle cx={CX} cy={CY} r={4} fill="white" />
      </svg>

      {/* Speed readout */}
      <div className={styles.readout}>
        <span className={styles.speedNum} style={{ color: arcColor }}>
          {speed}
        </span>
        <span className={styles.unit}>km/h</span>
      </div>

      {/* Pothole warning */}
      {isSlowingDown && (
        <div className={styles.slowLabel}>
          ⚠️ SLOWING — Pothole Ahead
        </div>
      )}
    </div>
  );
}
