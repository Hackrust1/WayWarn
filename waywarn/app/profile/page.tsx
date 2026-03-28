"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav/BottomNav";
import styles from "./stub.module.css";

export default function ProfilePage() {
  const { user, signOut, isDemo } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>👤 Profile</h1>
      </div>
      <div className={styles.card}>
        <div className={styles.avatar}>
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="avatar" className={styles.avatarImg} />
          ) : (
            <span>👤</span>
          )}
        </div>
        <p className={styles.name}>{user?.displayName ?? "Demo Driver"}</p>
        <p className={styles.email}>{user?.email ?? "demo@waywarn.app"}</p>
        {isDemo && <span className="badge badge-warning">Demo Mode</span>}
      </div>
      <div className={styles.info}>
        <div className={styles.row}><span>Version</span><span>1.0.0</span></div>
        <div className={styles.row}><span>Build</span><span>Step 4 / 10</span></div>
        <div className={styles.row}><span>Map</span><span>Leaflet + OSM</span></div>
        <div className={styles.row}><span>AI Engine</span><span>TensorFlow.js</span></div>
      </div>
      <button className={`btn btn-ghost ${styles.signOut}`} onClick={handleSignOut}>
        🚪 Sign Out
      </button>
      <BottomNav />
    </div>
  );
}
