"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import styles from "./login.module.css";

const features = [
  { icon: "🗺️", label: "Smart Routing" },
  { icon: "🤖", label: "AI Prediction" },
  { icon: "🔔", label: "Live Alerts" },
];

export default function LoginPage() {
  const { user, loading, isDemo, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/map");
    }
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div className={styles.page}>
      {/* Animated blobs */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />
      <div className={styles.blob3} />

      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Logo */}
        <div className={styles.logoWrap}>
          <motion.div
            className={styles.logoCircle}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <div className={styles.logoRing} />
          </motion.div>
          <span className={styles.logoIcon}>🛡️</span>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className={styles.title}>WayWarn</h1>
          <p className={styles.tagline}>AI-Powered Road Safety for Indian Roads</p>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          className={styles.pills}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          {features.map((f) => (
            <div key={f.label} className={styles.pill}>
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Demo badge */}
        {isDemo && (
          <motion.div
            className={styles.demoBadge}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 }}
          >
            🎮 Demo Mode — No Firebase needed
          </motion.div>
        )}

        {/* Sign-in button */}
        <motion.button
          className={styles.googleBtn}
          onClick={signInWithGoogle}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <span className={styles.googleIcon}>
            <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
              <path d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" fill="#FFC107"/>
              <path d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" fill="#FF3D00"/>
              <path d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.5 26.8 36 24 36c-5.2 0-9.6-3.4-11.2-8l-6.5 5C9.5 39.6 16.2 44 24 44z" fill="#4CAF50"/>
              <path d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l6.2 5.2C37.1 39 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" fill="#1976D2"/>
            </svg>
          </span>
          {isDemo ? "Continue in Demo Mode" : "Continue with Google"}
        </motion.button>

        <p className={styles.disclaimer}>
          By continuing, you agree to safe driving practices.
          <br />
          WayWarn uses AI predictions — always verify road conditions.
        </p>
      </motion.div>
    </div>
  );
}
