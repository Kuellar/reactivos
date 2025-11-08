import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";

export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);
export const signupWithEmail = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export const onUserChanged = (cb) => onAuthStateChanged(auth, cb);
export const loginWithGoogle = () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};
