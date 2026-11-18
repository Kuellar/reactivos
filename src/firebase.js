import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  connectAuthEmulator,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Local development against `npx firebase-tools emulators:start --only auth,firestore`
// Set VITE_USE_EMULATORS=true in .env.local. Never affects production builds otherwise.
const USE_EMULATORS = import.meta.env.VITE_USE_EMULATORS === "true";
const AUTH_EMULATOR_URL = "http://127.0.0.1:9099";
if (USE_EMULATORS) {
  connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

// Secondary Auth instance used ONLY to create accounts for other people.
// `createUserWithEmailAndPassword` signs in the new account on whatever Auth
// instance it is called with; using a separate, in-memory instance keeps the
// admin's own session (on `auth`) untouched. See doc/architecture/auth-and-users.md
const PROVISIONING_APP_NAME = "user-provisioning";
let provisioningAuth = null;
export const getProvisioningAuth = () => {
  if (provisioningAuth) return provisioningAuth;
  const existing = getApps().find((a) => a.name === PROVISIONING_APP_NAME);
  const secondary =
    existing ?? initializeApp(firebaseConfig, PROVISIONING_APP_NAME);
  provisioningAuth = existing
    ? getAuth(secondary)
    : initializeAuth(secondary, { persistence: inMemoryPersistence });
  if (USE_EMULATORS && !existing) {
    connectAuthEmulator(provisioningAuth, AUTH_EMULATOR_URL, { disableWarnings: true });
  }
  return provisioningAuth;
};

export default app;
