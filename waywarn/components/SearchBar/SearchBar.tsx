"use client";

import { useState, useRef } from "react";
import styles from "./SearchBar.module.css";

interface SearchBarProps {
  onSearch: (origin: string, destination: string) => void;
  loading?: boolean;
}

export default function SearchBar({ onSearch, loading = false }: SearchBarProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [locating, setLocating] = useState(false);
  const originRef = useRef<HTMLInputElement>(null);
  const destRef = useRef<HTMLInputElement>(null);

  const handleSearch = () => {
    if (!origin.trim() || !destination.trim()) return;
    onSearch(origin.trim(), destination.trim());
  };

  // Auto-fill origin with the user's current GPS position (reverse-geocoded)
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const label =
            data.address?.suburb ||
            data.address?.neighbourhood ||
            data.address?.city_district ||
            data.display_name?.split(",")[0] ||
            "My Location";
          setOrigin(label);
          destRef.current?.focus();
        } catch {
          setOrigin("My Location");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const handleVoice = (target: "origin" | "destination") => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = "en-IN";
    rec.onresult = (e: { results: { [x: string]: { [x: string]: { transcript: string; }; }; }; }) => {
      const text = e.results[0][0].transcript;
      if (target === "origin") setOrigin(text);
      else setDestination(text);
    };
    rec.start();
  };

  const handleExpand = () => {
    if (expanded) return;
    setExpanded(true);
    // Focus origin input after expand animation
    setTimeout(() => originRef.current?.focus(), 80);
  };

  return (
    <div className={`${styles.wrap} ${expanded ? styles.expanded : ""}`}>
      {!expanded ? (
        // Collapsed: single tap-to-expand bar
        <div className={styles.row} onClick={handleExpand} style={{ cursor: "pointer" }}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.input}
            placeholder="Where to? (tap to plan route)"
            value=""
            readOnly
            onFocus={handleExpand}
            onClick={handleExpand}
            style={{ cursor: "pointer" }}
          />
          <button
            className={styles.iconBtn}
            title="Voice input"
            onClick={(e) => { e.stopPropagation(); handleExpand(); }}
          >
            🎙️
          </button>
        </div>
      ) : (
        // Expanded: origin + destination
        <>
          <div className={styles.row}>
            <span className={styles.dot} style={{ background: "var(--safe)" }} />
            <input
              ref={originRef}
              className={styles.input}
              placeholder="From (e.g. Connaught Place, Delhi)"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && destRef.current?.focus()}
              autoFocus
            />
            <button
              className={styles.iconBtn}
              onClick={handleUseMyLocation}
              title="Use my current location"
              disabled={locating}
              style={{ fontSize: "16px" }}
            >
              {locating ? "⏳" : "📍"}
            </button>
          </div>

          <div className={styles.divider} />

          <div className={styles.row}>
            <span className={styles.dot} style={{ background: "var(--danger)" }} />
            <input
              ref={destRef}
              className={styles.input}
              placeholder="To (e.g. India Gate, Delhi)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              className={styles.iconBtn}
              onClick={() => handleVoice("destination")}
              title="Voice input"
            >
              🎙️
            </button>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.cancelBtn}
              onClick={() => { setExpanded(false); setOrigin(""); setDestination(""); }}
            >
              Cancel
            </button>
            <button
              className={styles.searchBtn}
              onClick={handleSearch}
              disabled={!origin.trim() || !destination.trim() || loading}
            >
              {loading ? <span className="spinner" /> : "Get Routes"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
