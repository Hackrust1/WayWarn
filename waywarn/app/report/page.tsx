"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav/BottomNav";
import { classifyHazardImage, ClassificationResult } from "@/lib/classifier";
import { submitHazardReport } from "@/lib/hazards";
import { HazardType, HazardSeverity } from "@/types";
import styles from "./report.module.css";

const HAZARD_TYPES: { value: HazardType; label: string; emoji: string }[] = [
  { value: "pothole",       label: "Pothole",       emoji: "🕳️" },
  { value: "crack",         label: "Road Crack",    emoji: "🗯️" },
  { value: "waterlog",      label: "Waterlogging",  emoji: "💧" },
  { value: "speed_breaker", label: "Speed Breaker", emoji: "⛰️" },
  { value: "debris",        label: "Debris",        emoji: "🪨" },
];

const SEVERITIES: { value: HazardSeverity; label: string; color: string }[] = [
  { value: "low",    label: "Low",    color: "var(--safe)"    },
  { value: "medium", label: "Medium", color: "var(--warning)" },
  { value: "high",   label: "High",   color: "var(--danger)"  },
];

type Step = "form" | "classifying" | "success";

export default function ReportPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [hazardType, setHazardType] = useState<HazardType>("pothole");
  const [severity, setSeverity] = useState<HazardSeverity>("medium");
  const [notes, setNotes] = useState("");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = useCallback(async (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setStep("classifying");

    try {
      const result = await classifyHazardImage(file);
      setClassification(result);
      setHazardType(result.type);
    } catch {
      // Ignore classifier errors — user can manually select
    } finally {
      setStep("form");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => {
        // Fallback: use New Delhi coords in demo
        setGps({ lat: 28.6139 + (Math.random() - 0.5) * 0.01, lng: 77.2090 + (Math.random() - 0.5) * 0.01 });
        setGpsLoading(false);
      },
      { timeout: 5000 }
    );
  };

  const handleSubmit = async () => {
    if (!imageFile && !gps) return;
    setSubmitting(true);
    try {
      await submitHazardReport({
        type: hazardType,
        severity,
        location: gps ?? { lat: 28.6139, lng: 77.2090 },
        notes: notes.trim(),
        reportedBy: user?.uid ?? "demo",
        timestamp: Date.now(),
        aiConfidence: classification?.confidence,
        isAIPredicted: false,
      });
      setStep("success");
    } catch {
      // Still show success for demo
      setStep("success");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push("/map")}>← Map</button>
        <h1 className={styles.title}>📷 Report Hazard</h1>
      </div>

      <AnimatePresence mode="wait">
        {/* ── Success card ── */}
        {step === "success" ? (
          <motion.div
            key="success"
            className={styles.successCard}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <span className={styles.successIcon}>✅</span>
            <h2 className={styles.successTitle}>Report Submitted!</h2>
            <p className={styles.successSub}>Thank you for making Indian roads safer.</p>

            {classification && (
              <div className={styles.aiCard}>
                <p className={styles.aiLabel}>🤖 AI Classification</p>
                <p className={styles.aiType}>{classification.label}</p>
                <div className={styles.aiBar}>
                  <motion.div
                    className={styles.aiBarFill}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(classification.confidence * 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  />
                </div>
                <p className={styles.aiConf}>{Math.round(classification.confidence * 100)}% confidence</p>
              </div>
            )}

            <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => router.push("/map")}>
              Back to Map
            </button>
          </motion.div>

        ) : (
          <motion.div
            key="form"
            className={styles.form}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Image upload */}
            <div
              className={`${styles.uploadZone} ${imagePreview ? styles.hasImage : ""}`}
              onClick={() => fileInputRef.current?.click()}
            >
              {step === "classifying" ? (
                <div className={styles.classifying}>
                  <div className="spinner" />
                  <p>🤖 AI analysing image…</p>
                </div>
              ) : imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="preview" className={styles.preview} />
              ) : (
                <div className={styles.uploadHint}>
                  <span className={styles.uploadIcon}>📸</span>
                  <p>Tap to take photo or upload</p>
                  <p className={styles.uploadSub}>Camera or gallery</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>

            {/* AI classification badge */}
            {classification && (
              <div className={styles.classificationBadge}>
                🤖 AI detected: <strong>{classification.label}</strong> ({Math.round(classification.confidence * 100)}%)
              </div>
            )}

            {/* Hazard type selector */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>Hazard Type</label>
              <div className={styles.typeGrid}>
                {HAZARD_TYPES.map((t) => (
                  <button
                    key={t.value}
                    className={`${styles.typeBtn} ${hazardType === t.value ? styles.typeActive : ""}`}
                    onClick={() => setHazardType(t.value)}
                  >
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity selector */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>Severity</label>
              <div className={styles.severityRow}>
                {SEVERITIES.map((s) => (
                  <button
                    key={s.value}
                    className={`${styles.sevBtn} ${severity === s.value ? styles.sevActive : ""}`}
                    style={severity === s.value ? { borderColor: s.color, color: s.color, background: s.color + "18" } : {}}
                    onClick={() => setSeverity(s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>Notes (optional)</label>
              <textarea
                className={styles.textarea}
                placeholder="Describe the hazard..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* GPS */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>Location</label>
              <button className={styles.gpsBtn} onClick={handleDetectGPS} disabled={gpsLoading}>
                {gpsLoading ? <span className="spinner" /> : "📍"}
                {gps ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : "Detect my location"}
              </button>
            </div>

            {/* Submit */}
            <button
              className={`btn btn-primary ${styles.submitBtn}`}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <><span className="spinner" /> Submitting…</> : "🚨 Submit Report"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
