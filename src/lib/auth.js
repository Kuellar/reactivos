import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";

export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);
// Accounts are NOT created here: calling createUserWithEmailAndPassword on the
// main `auth` would sign the admin out. Use createUserWithTempPassword in ./users.js
export const logout = () => signOut(auth);
export const onUserChanged = (cb) => onAuthStateChanged(auth, cb);
export const loginWithGoogle = () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};
