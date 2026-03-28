"use client";

import styles from "./loading.module.css";

export default function Loading() {
  return (
    <div className={styles.container}>
      <div className={styles.logo}>
        <span className={styles.shield}>🛡️</span>
        <div className={styles.ring} />
      </div>
      <h2 className={styles.title}>WayWarn</h2>
      <p className={styles.subtitle}>Loading...</p>
      <div className={styles.dots}>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
