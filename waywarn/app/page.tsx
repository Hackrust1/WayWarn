"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// Root page — redirects to /map if logged in, /login if not
export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace("/map");
    } else {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Show nothing while redirecting
  return null;
}
