"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { UserProfile } from "@/types";

// --- Demo user for when Firebase is not configured ---
const DEMO_USER: UserProfile = {
  uid: "demo-user-001",
  displayName: "Demo Driver",
  email: "demo@waywarn.app",
  photoURL: null,
};

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isDemo: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isDemo: false,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isDemo = !isFirebaseConfigured;

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      // Demo mode — do NOT auto-login; let the user interact with the login page.
      // They must click "Continue in Demo Mode" to proceed.
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth) {
      setUser(DEMO_USER);
      return;
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const u = result.user;
      setUser({
        uid: u.uid,
        displayName: u.displayName,
        email: u.email,
        photoURL: u.photoURL,
      });
    } catch (err) {
      console.error("Google sign-in failed:", err);
      throw err;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!isFirebaseConfigured || !auth) {
      setUser({ ...DEMO_USER, email });
      return;
    }
    const result = await signInWithEmailAndPassword(auth, email, password);
    const u = result.user;
    setUser({
      uid: u.uid,
      displayName: u.displayName,
      email: u.email,
      photoURL: u.photoURL,
    });
  };

  const signUpWithEmail = async (name: string, email: string, password: string) => {
    if (!isFirebaseConfigured || !auth) {
      setUser({ ...DEMO_USER, displayName: name, email });
      return;
    }
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    const u = result.user;
    setUser({
      uid: u.uid,
      displayName: name,
      email: u.email,
      photoURL: u.photoURL,
    });
  };

  const signOut = async () => {
    if (!isFirebaseConfigured || !auth) {
      setUser(null);
      return;
    }
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDemo, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
