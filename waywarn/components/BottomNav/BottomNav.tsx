"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNav.module.css";

const tabs = [
  { href: "/map",     icon: "🗺️",  label: "Map"     },
  { href: "/routes",  icon: "🛣️",  label: "Routes"  },
  { href: "/report",  icon: "📷",  label: "Report"  },
  { href: "/alerts",  icon: "🔔",  label: "Alerts"  },
  { href: "/profile", icon: "👤",  label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${active ? styles.active : ""}`}
          >
            <span className={styles.icon}>{tab.icon}</span>
            <span className={styles.label}>{tab.label}</span>
            {active && <span className={styles.indicator} />}
          </Link>
        );
      })}
    </nav>
  );
}
