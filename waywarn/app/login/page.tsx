"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import styles from "./login.module.css";

type Tab = "login" | "signup";

const features = [
  { icon: "🗺️", label: "Smart Routing" },
  { icon: "🤖", label: "AI Prediction" },
  { icon: "🔔", label: "Live Alerts" },
];

export default function LoginPage() {
  const { user, loading, isDemo, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/map");
  }, [user, loading, router]);

  if (loading) return null;

  const clearForm = () => {
    setName(""); setEmail(""); setPassword("");
    setConfirmPassword(""); setError("");
  };

  const switchTab = (t: Tab) => { setTab(t); clearForm(); };

  const friendlyError = (code: string) => {
    const map: Record<string, string> = {
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/user-not-found": "No account found with that email.",
      "auth/wrong-password": "Incorrect password. Please try again.",
      "auth/email-already-in-use": "An account with this email already exists.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/too-many-requests": "Too many attempts. Please wait a moment.",
      "auth/network-request-failed": "Network error. Check your connection.",
      "auth/invalid-credential": "Invalid email or password.",
    };
    return map[code] ?? "Something went wrong. Please try again.";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setSubmitting(true); setError("");
    try {
      await signInWithEmail(email, password);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(friendlyError(code));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) { setError("Please fill in all fields."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setSubmitting(true); setError("");
    try {
      await signUpWithEmail(name, email, password);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(friendlyError(code));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(""); setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(friendlyError(code));
    } finally {
      setSubmitting(false);
    }
  };

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
        transition={{ duration: 0.55, ease: "easeOut" }}
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
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>WayWarn</h1>
          <p className={styles.tagline}>AI-Powered Road Safety for Indian Roads</p>
        </div>

        {/* Feature pills */}
        <div className={styles.pills}>
          {features.map((f) => (
            <div key={f.label} className={styles.pill}>
              <span>{f.icon}</span><span>{f.label}</span>
            </div>
          ))}
        </div>

        {/* Demo badge */}
        {isDemo && (
          <motion.div
            className={styles.demoBadge}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            🎮 <strong>Demo Mode</strong> — Enter any credentials or skip below
          </motion.div>
        )}

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${tab === "login" ? styles.tabActive : ""}`}
            onClick={() => switchTab("login")}
            id="tab-login"
          >
            Login
          </button>
          <button
            className={`${styles.tabBtn} ${tab === "signup" ? styles.tabActive : ""}`}
            onClick={() => switchTab("signup")}
            id="tab-signup"
          >
            Sign Up
          </button>
          <motion.div
            className={styles.tabIndicator}
            animate={{ x: tab === "login" ? 0 : "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        </div>

        {/* Forms */}
        <div className={styles.formWrap}>
          <AnimatePresence mode="wait">
            {tab === "login" ? (
              <motion.form
                key="login"
                onSubmit={handleLogin}
                className={styles.form}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.22 }}
              >
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="login-email">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    className={styles.input}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="login-password">Password</label>
                  <div className={styles.passWrap}>
                    <input
                      id="login-password"
                      type={showPass ? "text" : "password"}
                      className={styles.input}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowPass(!showPass)}
                      aria-label={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.p
                    className={styles.errorMsg}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    ⚠️ {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  id="btn-login-submit"
                  className={styles.primaryBtn}
                  disabled={submitting}
                >
                  {submitting ? <span className={styles.spinner} /> : "Login →"}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="signup"
                onSubmit={handleSignup}
                className={styles.form}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22 }}
              >
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="signup-name">Full Name</label>
                  <input
                    id="signup-name"
                    type="text"
                    className={styles.input}
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="signup-email">Email</label>
                  <input
                    id="signup-email"
                    type="email"
                    className={styles.input}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="signup-password">Password</label>
                  <div className={styles.passWrap}>
                    <input
                      id="signup-password"
                      type={showPass ? "text" : "password"}
                      className={styles.input}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowPass(!showPass)}
                      aria-label={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="signup-confirm">Confirm Password</label>
                  <input
                    id="signup-confirm"
                    type={showPass ? "text" : "password"}
                    className={styles.input}
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>

                {error && (
                  <motion.p
                    className={styles.errorMsg}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    ⚠️ {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  id="btn-signup-submit"
                  className={styles.primaryBtn}
                  disabled={submitting}
                >
                  {submitting ? <span className={styles.spinner} /> : "Create Account →"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          <span className={styles.dividerText}>or</span>
          <span className={styles.dividerLine} />
        </div>

        {/* Google button */}
        <motion.button
          id="btn-google-signin"
          className={styles.googleBtn}
          onClick={handleGoogle}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          disabled={submitting}
        >
          <span className={styles.googleIcon}>
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
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
          <br />WayWarn uses AI predictions — always verify road conditions.
        </p>
      </motion.div>
    </div>
  );
}
