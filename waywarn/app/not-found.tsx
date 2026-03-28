import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <div className={styles.container}>
      <span className={styles.icon}>🗺️</span>
      <h1 className={styles.code}>404</h1>
      <p className={styles.message}>This road doesn't exist.</p>
      <Link href="/" className="btn btn-primary">
        Back to Map
      </Link>
    </div>
  );
}
