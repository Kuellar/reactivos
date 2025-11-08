import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

export const createLocation = async (payload) => {
  const ref = doc(db, "locations", payload.id);
  await setDoc(ref, payload);
  return payload;
};

export const getLocations = async () => {
  const snap = await getDocs(collection(db, "locations"));
  return snap.docs.map((d) => d.data());
};

export const updateLocation = async (id, data) => {
  const ref = doc(db, "locations", id);
  await updateDoc(ref, data);
};

export const deleteLocation = async (id) => {
  await deleteDoc(doc(db, "locations", id));
};

export const createProfessor = async (payload) => {
  const ref = doc(db, "professors", payload.id);
  await setDoc(ref, payload);
  return payload;
};

export const getProfessors = async () => {
  const snap = await getDocs(collection(db, "professors"));
  return snap.docs.map((d) => d.data());
};

export const updateProfessor = async (id, data) => {
  const ref = doc(db, "professors", id);
  await updateDoc(ref, data);
};

export const deleteProfessor = async (id) => {
  await deleteDoc(doc(db, "professors", id));
};

export const createReactive = async (payload) => {
  const ref = doc(db, "reactives", payload.id);
  await setDoc(ref, payload);
  return payload;
};

export const getReactives = async (filter = {}) => {
  if (filter.locationId) {
    const q = query(
      collection(db, "reactives"),
      where("locationId", "==", filter.locationId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  }
  const snap = await getDocs(collection(db, "reactives"));
  return snap.docs.map((d) => d.data());
};

export const updateReactive = async (id, data) => {
  const ref = doc(db, "reactives", id);
  await updateDoc(ref, data);
};

export const deleteReactive = async (id) => {
  await deleteDoc(doc(db, "reactives", id));
};
