// Global auth state: Firebase user + Firestore profile (role).
// Components must use `useAuth()` instead of calling onAuthStateChanged.
// See doc/architecture/auth-and-users.md
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { onSnapshot } from "firebase/firestore";
import { message } from "antd";
import { auth } from "../firebase";
import { can as canRole } from "../lib/permissions";
import { userRef, ensureProfile } from "../lib/users";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still resolving
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [bootstrapAvailable, setBootstrapAvailable] = useState(false);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u ?? null)), []);

  useEffect(() => {
    setProfile(null);
    setProfileError(null);
    setBootstrapAvailable(false);
    if (!user) {
      setProfileLoading(user === undefined);
      return undefined;
    }

    setProfileLoading(true);
    let cancelled = false;
    let ensuring = false;

    const unsub = onSnapshot(
      userRef(user.uid),
      async (snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          if (data.disabled) {
            message.error("Tu cuenta está deshabilitada. Contacta a un administrador.");
            await signOut(auth);
            return;
          }
          setBootstrapAvailable(false);
          setProfile(data);
          setProfileLoading(false);
          return;
        }
        // No profile yet: first admin bootstrap, or auto-create a pending one.
        if (ensuring) return;
        ensuring = true;
        try {
          const result = await ensureProfile(user);
          if (cancelled) return;
          if (result === "bootstrap") {
            setBootstrapAvailable(true);
            setProfileLoading(false);
          }
          // "pending": the snapshot fires again with the new doc.
        } catch (err) {
          console.error("ensureProfile failed", err);
          if (!cancelled) {
            setProfileError(err);
            setProfileLoading(false);
          }
        } finally {
          ensuring = false;
        }
      },
      (err) => {
        console.error("profile onSnapshot error", err);
        if (!cancelled) {
          setProfileError(err);
          setProfileLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [user]);

  const value = useMemo(() => {
    const role = profile?.role ?? null;
    return {
      user: user ?? null,
      profile,
      role,
      loading: user === undefined || (Boolean(user) && profileLoading),
      bootstrapAvailable,
      profileError,
      can: (permission) => canRole(role, permission),
    };
  }, [user, profile, profileLoading, bootstrapAvailable, profileError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
