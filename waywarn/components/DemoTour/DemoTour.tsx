"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import styles from "./DemoTour.module.css";

export interface DemoScenario {
  id: string;
  icon: string;
  label: string;
  sub: string;
  origin: string;
  destination: string;
  color: string;
  /** Pre-resolved coords — skip geocoding when present */
  originCoords?: { lat: number; lng: number };
  destCoords?: { lat: number; lng: number };
}


interface DemoTourProps {
  scenario: DemoScenario;
  onPickScenario: (scenario: DemoScenario) => void;
  onSkip: () => void;
  searchLoading?: boolean;
  activeDemoId?: string | null;
}

/* ─── Step definitions ─── */
interface SymbolRow {
  icon: string;
  color?: string;
  label: string;
  desc: string;
}

interface Step {
  id: string;
  phase: "intro" | "learn" | "pick";
  emoji: string;
  tag?: string;
  title: string;
  subtitle: string;
  body: string;
  symbols?: SymbolRow[];
  mockType?: "routeCard" | "riskBar" | "aiDot" | "alertToast" | "bottomNav" | "speedometer" | "searchBar";
}

const STEPS: Step[] = [
  {
    id: "welcome",
    phase: "intro",
    emoji: "🛡️",
    title: "Welcome to WayWarn",
    subtitle: "AI-Powered Road Safety · New Delhi",
    body: "WayWarn keeps you safe by showing potholes, hazards & the safest routes — powered by real community data and machine learning. This tour introduces every symbol and feature.",
  },
  {
    id: "map-symbols",
    phase: "learn",
    emoji: "🗺️",
    tag: "Map Layer",
    title: "Map Symbols at a Glance",
    subtitle: "Every icon you'll see on the map",
    body: "The map uses colour-coded markers and lines. Here's what each one means:",
    symbols: [
      { icon: "🟠", color: "#f97316", label: "Orange Marker", desc: "Community-reported hazard (pothole, road damage…)" },
      { icon: "🟣", color: "#a855f7", label: "Purple Glow Dot", desc: "AI-predicted pothole (pulsing ring = high confidence)" },
      { icon: "🔵", color: "#3b82f6", label: "Blue Dot", desc: "Your live GPS position during navigation" },
      { icon: "🟢", color: "#22c55e", label: "Green Line", desc: "Safest route (fewest hazards)" },
      { icon: "⚡", color: "#eab308", label: "Yellow Line", desc: "Fastest route (quickest arrival)" },
      { icon: "📏", color: "#6366f1", label: "Purple Line", desc: "Shortest route (minimum distance)" },
    ],
  },
  {
    id: "search",
    phase: "learn",
    emoji: "🔍",
    tag: "Top of screen",
    title: "Search Bar",
    subtitle: "Enter start & destination to plan a route",
    body: "Tap the search bar at the top of the screen to enter your starting point and destination. WayWarn will calculate up to 3 routes ranked by safety.",
    mockType: "searchBar",
    symbols: [
      { icon: "📍", label: "From field", desc: "Your starting location (or tap GPS)" },
      { icon: "🏁", label: "To field", desc: "Your destination" },
      { icon: "🔍", label: "Search button", desc: "Triggers geocoding & route fetch" },
    ],
  },
  {
    id: "routes",
    phase: "learn",
    emoji: "🛣️",
    tag: "Bottom sheet",
    title: "Route Cards",
    subtitle: "Swipe up to see up to 3 route options",
    body: "Each route card shows the label (Safest / Fastest / Shortest), distance in km, estimated travel time, and hazard count. Tap 'Navigate' to begin.",
    mockType: "routeCard",
    symbols: [
      { icon: "🟢", label: "Safest", desc: "Route with fewest hazards" },
      { icon: "⚡", label: "Fastest", desc: "Quickest arrival time" },
      { icon: "📏", label: "Shortest", desc: "Minimum total distance" },
    ],
  },
  {
    id: "risk",
    phase: "learn",
    emoji: "📊",
    tag: "On each Route Card",
    title: "Risk Score",
    subtitle: "0 = perfectly safe · 100 = very dangerous",
    body: "Every route has a Risk Score — a number from 0 to 100 shown as a coloured progress bar. It's calculated from hazard density along the route.",
    mockType: "riskBar",
    symbols: [
      { icon: "🟢", color: "#22c55e", label: "0 – 29", desc: "Safe road, drive normally" },
      { icon: "🟡", color: "#eab308", label: "30 – 64", desc: "Moderate risk, stay alert" },
      { icon: "🔴", color: "#ef4444", label: "65 – 100", desc: "High risk, drive slowly" },
    ],
  },
  {
    id: "hazard-types",
    phase: "learn",
    emoji: "⚠️",
    tag: "Tap any map marker",
    title: "Hazard Types",
    subtitle: "Community-reported dangers",
    body: "Orange markers are real hazards submitted by drivers. Tap any marker to see the hazard type, severity, and when it was reported.",
    symbols: [
      { icon: "🕳️", label: "Pothole", desc: "Road surface damage — most common" },
      { icon: "🚦", label: "Speed Breaker", desc: "Physical speed bump" },
      { icon: "🚧", label: "Construction", desc: "Active road work zone" },
      { icon: "💧", label: "Waterlogging", desc: "Flooded road section" },
      { icon: "🐄", label: "Animal Crossing", desc: "Risk of animals on road" },
      { icon: "🔦", label: "Poor Lighting", desc: "Low-light danger zone" },
    ],
  },
  {
    id: "ai",
    phase: "learn",
    emoji: "🤖",
    tag: "On the map · after route loads",
    title: "AI Pothole Prediction",
    subtitle: "Purple pulsing dots = ML-predicted danger",
    body: "Our machine learning model scans your selected route and predicts where potholes are likely to exist — even before they're reported. Each dot shows a confidence score.",
    mockType: "aiDot",
    symbols: [
      { icon: "🟣", color: "#a855f7", label: "Glowing Purple Dot", desc: "AI-predicted pothole location" },
      { icon: "✨", label: "Pulsing ring", desc: "High confidence (>80%) prediction" },
      { icon: "📊", label: "Confidence %", desc: "Tap dot to see the ML score" },
      { icon: "🤖", label: "AI Badge", desc: "'AI predicting...' badge at bottom of screen" },
    ],
  },
  {
    id: "nav-hud",
    phase: "learn",
    emoji: "🧭",
    tag: "Top HUD · while navigating",
    title: "Navigation HUD",
    subtitle: "Live feedback while you drive",
    body: "Tap '🧭 Navigate' to start. A heads-up display (HUD) appears at the top showing your current speed, % of route completed, and a Stop button.",
    mockType: "speedometer",
    symbols: [
      { icon: "🏎️", label: "Speedometer", desc: "Current simulated speed in km/h" },
      { icon: "📍", label: "GPS Dot", desc: "Blue dot moves along your route on the map" },
      { icon: "⏱️", label: "Progress %", desc: "Shows how much of the route is complete" },
      { icon: "🛑", label: "Stop button", desc: "Ends navigation and returns to route sheet" },
    ],
  },
  {
    id: "alerts",
    phase: "learn",
    emoji: "🔔",
    tag: "Toast notification · during navigation",
    title: "Proximity Alerts",
    subtitle: "Warned before you reach danger",
    body: "When you're within 150 metres of a hazard during navigation, WayWarn pops a colour-coded alert toast and automatically slows your simulated speed.",
    mockType: "alertToast",
    symbols: [
      { icon: "🔴", color: "#ef4444", label: "Red border", desc: "High-severity hazard (e.g. deep pothole)" },
      { icon: "🟡", color: "#eab308", label: "Yellow border", desc: "Medium hazard (e.g. speed breaker)" },
      { icon: "🟢", color: "#22c55e", label: "Green border", desc: "Low severity — be aware" },
      { icon: "🔊", label: "Voice alert", desc: "Indian English voice reads hazard type & distance" },
      { icon: "📳", label: "Vibration", desc: "Phone vibrates twice" },
      { icon: "🐢", label: "Auto-slowdown", desc: "Simulated speed drops near the hazard" },
    ],
  },
  {
    id: "bottom-nav",
    phase: "learn",
    emoji: "🗂️",
    tag: "Bottom bar · always visible",
    title: "Navigation Tabs",
    subtitle: "5 tabs · active tab glows blue",
    body: "The bottom bar gives you quick access to all WayWarn features. The currently active tab glows with a blue indicator line.",
    mockType: "bottomNav",
    symbols: [
      { icon: "🗺️", label: "Map", desc: "Live map, routing & navigation" },
      { icon: "🛣️", label: "Routes", desc: "History of previously searched routes" },
      { icon: "📷", label: "Report", desc: "Submit a new hazard with a photo" },
      { icon: "🔔", label: "Alerts", desc: "Past proximity alerts you received" },
      { icon: "👤", label: "Profile", desc: "Your account info & demo status" },
    ],
  },
  {
    id: "pick",
    phase: "pick",
    emoji: "🎮",
    title: "Ready to Experience WayWarn?",
    subtitle: "India Gate → Qutub Minar · New Delhi",
    body: "WayWarn will load a real road route with live AI pothole prediction — no login needed. Experience every feature you just learned on an actual New Delhi route.",
  },
];

/* ─── Animated mockups ─── */

function MockRoutCard() {
  return (
    <div className={styles.mockCard}>
      <div className={styles.mockCardHeader}>
        <span className={styles.mockEmoji}>🟢</span>
        <span className={styles.mockLabel} style={{ color: "#22c55e" }}>Safest</span>
        <span className={styles.mockDesc}>Fewest hazards</span>
        <span className={styles.mockActive}>Active</span>
      </div>
      <div className={styles.mockStats}>
        <div className={styles.mockStat}><span className={styles.mockVal}>12.4 km</span><span className={styles.mockStatLabel}>Distance</span></div>
        <div className={styles.mockDivider} />
        <div className={styles.mockStat}><span className={styles.mockVal}>28 min</span><span className={styles.mockStatLabel}>ETA</span></div>
        <div className={styles.mockDivider} />
        <div className={styles.mockStat}><span className={styles.mockVal} style={{ color: "#22c55e" }}>3</span><span className={styles.mockStatLabel}>Hazards</span></div>
      </div>
      <div className={styles.mockRiskRow}>
        <span className={styles.mockRiskLabel}>Risk</span>
        <div className={styles.mockRiskTrack}>
          <div className={styles.mockRiskFill} style={{ width: "22%", background: "#22c55e" }} />
        </div>
        <span className={styles.mockRiskNum} style={{ color: "#22c55e" }}>22</span>
      </div>
    </div>
  );
}

function MockRiskBar() {
  return (
    <div className={styles.mockRiskDemo}>
      {[
        { label: "Safest Route", score: 22, color: "#22c55e" },
        { label: "Fastest Route", score: 48, color: "#eab308" },
        { label: "Shortest Route", score: 71, color: "#ef4444" },
      ].map((r) => (
        <div key={r.label} className={styles.mockRiskRow2}>
          <span className={styles.mockRiskName}>{r.label}</span>
          <div className={styles.mockRiskTrack}>
            <div
              className={`${styles.mockRiskFill} ${styles.mockRiskAnimate}`}
              style={{ width: `${r.score}%`, background: r.color }}
            />
          </div>
          <span className={styles.mockRiskNum} style={{ color: r.color }}>{r.score}</span>
        </div>
      ))}
    </div>
  );
}

function MockAiDot() {
  return (
    <div className={styles.mockAiWrap}>
      <div className={styles.mockMapBg}>
        <div className={styles.mockRoute} />
        <div className={styles.mockAiDot}>
          <div className={styles.mockAiRing} />
        </div>
        <div className={styles.mockAiDot2}>
          <div className={styles.mockAiRing2} />
        </div>
        <div className={styles.mockOrangeMarker}>🟠</div>
      </div>
      <div className={styles.mockAiBadge}>🤖 AI predicting potholes…</div>
    </div>
  );
}

function MockAlertToast() {
  return (
    <div className={styles.mockToast}>
      <div className={styles.mockPulse} />
      <span className={styles.mockToastEmoji}>🕳️</span>
      <div className={styles.mockToastText}>
        <span className={styles.mockToastType}>POTHOLE</span>
        <span className={styles.mockToastDist}>78m ahead</span>
      </div>
      <div className={styles.mockSeverity}>high</div>
      <div className={styles.mockProgressBar} />
    </div>
  );
}

function MockBottomNav() {
  const tabs = [
    { icon: "🗺️", label: "Map", active: true },
    { icon: "🛣️", label: "Routes", active: false },
    { icon: "📷", label: "Report", active: false },
    { icon: "🔔", label: "Alerts", active: false },
    { icon: "👤", label: "Profile", active: false },
  ];
  return (
    <div className={styles.mockNav}>
      {tabs.map((t) => (
        <div key={t.label} className={`${styles.mockTab} ${t.active ? styles.mockTabActive : ""}`}>
          <span className={styles.mockTabIcon}>{t.icon}</span>
          <span className={styles.mockTabLabel}>{t.label}</span>
          {t.active && <div className={styles.mockIndicator} />}
        </div>
      ))}
    </div>
  );
}

function MockSpeedometer() {
  return (
    <div className={styles.mockHud}>
      <div className={styles.mockSpeed}>
        <div className={styles.mockSpeedNum}>42</div>
        <div className={styles.mockSpeedUnit}>km/h</div>
        <div className={styles.mockSpeedArc} />
      </div>
      <div className={styles.mockHudInfo}>
        <div className={styles.mockNavStatus}>
          <span className={styles.mockNavDot} />
          <span>Navigating…</span>
        </div>
        <div className={styles.mockProgress}>67% complete</div>
        <div className={styles.mockProgressTrack}>
          <div className={styles.mockProgressFill} style={{ width: "67%" }} />
        </div>
      </div>
    </div>
  );
}

function MockSearchBar() {
  return (
    <div className={styles.mockSearch}>
      <div className={styles.mockSearchRow}>
        <span className={styles.mockSearchIcon}>📍</span>
        <div className={styles.mockSearchInput}>
          <span className={styles.mockSearchPlaceholder}>From: India Gate, New Delhi</span>
        </div>
      </div>
      <div className={styles.mockSearchDivider} />
      <div className={styles.mockSearchRow}>
        <span className={styles.mockSearchIcon}>🏁</span>
        <div className={styles.mockSearchInput}>
          <span className={styles.mockSearchPlaceholder}>To: Qutub Minar, New Delhi</span>
        </div>
      </div>
      <button className={styles.mockSearchBtn}>🔍 Search Routes</button>
    </div>
  );
}

const MOCK_COMPONENTS: Record<string, () => React.ReactElement> = {
  routeCard: MockRoutCard,
  riskBar: MockRiskBar,
  aiDot: MockAiDot,
  alertToast: MockAlertToast,
  bottomNav: MockBottomNav,
  speedometer: MockSpeedometer,
  searchBar: MockSearchBar,
};

/* ─── Main Component ─── */

export default function DemoTour({
  scenario,
  onPickScenario,
  onSkip,
  searchLoading,
  activeDemoId,
}: DemoTourProps) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"left" | "right">("right");
  const [animKey, setAnimKey] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const progressPct = ((step) / (STEPS.length - 1)) * 100;

  const go = useCallback((to: number) => {
    setDir(to > step ? "right" : "left");
    setStep(to);
    setAnimKey((k) => k + 1);
  }, [step]);

  const next = useCallback(() => {
    if (!isLast) go(step + 1);
  }, [isLast, step, go]);

  const prev = useCallback(() => {
    if (!isFirst) go(step - 1);
  }, [isFirst, step, go]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, onSkip]);

  const MockComp = current.mockType ? MOCK_COMPONENTS[current.mockType] : null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="WayWarn guided tour">
      <div className={styles.card}>

        {/* ── Header bar ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerLogo}>🛡️</span>
            <span className={styles.headerBrand}>WayWarn</span>
            <span className={styles.headerGuide}>Beginner&apos;s Guide</span>
          </div>
          <button className={styles.closeBtn} onClick={onSkip} aria-label="Skip tour">✕</button>
        </div>

        {/* ── Progress bar ── */}
        <div className={styles.progressWrap}>
          <div
            ref={progressRef}
            className={styles.progressBar}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className={styles.stepCount}>Step {step + 1} of {STEPS.length}</div>

        {/* ── Scrollable body ── */}
        <div className={styles.scrollBody}>

          {/* Content area with directional animation */}
          <div
            key={animKey}
            className={`${styles.content} ${dir === "right" ? styles.slideInRight : styles.slideInLeft}`}
          >
            {/* Phase tag */}
            {current.tag && (
              <div className={styles.tag}>{current.tag}</div>
            )}

            {/* Emoji + titles */}
            <div className={styles.emojiWrap}>
              <span className={styles.emoji}>{current.emoji}</span>
            </div>
            <h2 className={styles.title}>{current.title}</h2>
            <p className={styles.subtitle}>{current.subtitle}</p>
            <p className={styles.body}>{current.body}</p>

            {/* Animated mock component */}
            {MockComp && (
              <div className={styles.mockWrap}>
                <MockComp />
              </div>
            )}

            {/* Symbol legend table */}
            {current.symbols && (
              <div className={styles.symbolTable}>
                <div className={styles.symbolTableHeader}>Symbol Legend</div>
                {current.symbols.map((sym, i) => (
                  <div key={i} className={styles.symbolRow}>
                    <div
                      className={styles.symbolIcon}
                      style={sym.color ? { background: sym.color + "22", borderColor: sym.color + "55" } : {}}
                    >
                      {sym.icon}
                    </div>
                    <div className={styles.symbolInfo}>
                      <span className={styles.symbolLabel}>{sym.label}</span>
                      <span className={styles.symbolDesc}>{sym.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Final step — single demo launch button */}
            {current.phase === "pick" && (
              <div className={styles.singleDemoWrap}>
                <div className={styles.demoRoutePreview}>
                  <span className={styles.demoRouteIcon}>🏛️</span>
                  <div className={styles.demoRouteInfo}>
                    <span className={styles.demoRouteName}>India Gate → Qutub Minar</span>
                    <span className={styles.demoRouteSub}>~13 km · New Delhi · AI Hazard Prediction</span>
                  </div>
                </div>
                <button
                  className={`${styles.startDemoBtn} ${searchLoading ? styles.startDemoBtnLoading : ""}`}
                  onClick={() => onPickScenario(scenario)}
                  disabled={searchLoading}
                >
                  {searchLoading ? (
                    <><span className={styles.sSpinner} /> Loading Route…</>
                  ) : (
                    <>🚀 Start Demo</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer navigation ── */}
        <div className={styles.footer}>
          <button className={styles.skipBtn} onClick={onSkip} title="Skip the guide and jump straight to the demo">
            Skip → Run Demo
          </button>

          <div className={styles.stepDots}>
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                className={`${styles.dot} ${i === step ? styles.dotActive : ""} ${i < step ? styles.dotDone : ""}`}
                onClick={() => go(i)}
                aria-label={`Go to step ${i + 1}: ${s.title}`}
              />
            ))}
          </div>

          <div className={styles.navBtns}>
            {!isFirst && (
              <button className={styles.prevBtn} onClick={prev} aria-label="Previous step">
                ‹
              </button>
            )}
            {!isLast && (
              <button className={styles.nextBtn} onClick={next} aria-label="Next step">
                Next ›
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
