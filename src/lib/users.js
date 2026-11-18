// User provisioning & profile helpers. Every function that touches the
// `users` collection or Firebase Auth accounts lives here.
// See doc/architecture/auth-and-users.md before changing anything.
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, getProvisioningAuth } from "../firebase";

export const USERS = "users";
const BOOTSTRAP_DOC = ["meta", "bootstrap"];

export const userRef = (uid) => doc(db, USERS, uid);

// ---------------------------------------------------------------------------
// Temporary passwords
// ---------------------------------------------------------------------------
// No ambiguous characters (0/O, 1/l/I) so it can be dictated or typed by hand.
const PW_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
export const generateTempPassword = (length = 12) => {
  const out = [];
  const max = 256 - (256 % PW_ALPHABET.length); // avoid modulo bias
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const b of bytes) {
      if (b < max && out.length < length)
        out.push(PW_ALPHABET[b % PW_ALPHABET.length]);
    }
  }
  return out.join("");
};

export const appLoginUrl = () =>
  `${window.location.origin}${window.location.pathname}#/login`;

export const buildWelcomeMessage = ({ displayName, email, tempPassword }) =>
  [
    `Hola ${displayName || ""},`.replace(" ,", ","),
    "",
    "Se creó tu cuenta en el Registro de sustancias peligrosas (Facultad de Farmacia, depto. Bioquímica Clínica e Inmunología).",
    "",
    `Ingresa en: ${appLoginUrl()}`,
    `Usuario: ${email}`,
    `Contraseña temporal: ${tempPassword}`,
    "",
    "Al iniciar sesión por primera vez se te pedirá crear una contraseña nueva.",
  ].join("\n");

// ---------------------------------------------------------------------------
// Admin actions
// ---------------------------------------------------------------------------

/**
 * Creates a Firebase Auth account + `users/{uid}` profile without signing the
 * admin out. Returns the temp password so the UI can show it ONCE.
 */
export const createUserWithTempPassword = async (
  { email, displayName, role },
  createdByUid
) => {
  const tempPassword = generateTempPassword();
  const provAuth = getProvisioningAuth();
  const cred = await createUserWithEmailAndPassword(
    provAuth,
    email.trim(),
    tempPassword
  );

  try {
    if (displayName) await updateProfile(cred.user, { displayName });
    // Written by the ADMIN (main `db` / `auth`), so rules see an admin.
    await setDoc(userRef(cred.user.uid), {
      email: cred.user.email,
      displayName: displayName || "",
      role,
      disabled: false,
      mustChangePassword: true,
      createdAt: serverTimestamp(),
      createdBy: createdByUid,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    // Roll back the orphan Auth account (provisioning auth is signed in as it).
    await cred.user.delete().catch(() => {});
    throw err;
  } finally {
    await signOut(provAuth).catch(() => {});
  }

  return { uid: cred.user.uid, email: cred.user.email, tempPassword };
};

export const updateUser = (uid, data) =>
  updateDoc(userRef(uid), { ...data, updatedAt: serverTimestamp() });

export const setUserDisabled = (uid, disabled) => updateUser(uid, { disabled });

// Removes the profile (=> no permissions). The Auth account itself can only be
// deleted from the Firebase console or a backend with the Admin SDK.
export const deleteUserProfile = (uid) => deleteDoc(userRef(uid));

export const sendResetEmail = (email) => sendPasswordResetEmail(auth, email);

// ---------------------------------------------------------------------------
// Self-service
// ---------------------------------------------------------------------------

export const changeOwnPassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No hay sesión activa");
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
  const ref = userRef(user.uid);
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data().mustChangePassword) {
    await updateDoc(ref, {
      mustChangePassword: false,
      updatedAt: serverTimestamp(),
    });
  }
};

// Called when a signed-in user has no profile doc (legacy accounts created in
// the Firebase console, or self sign-ups through the API).
// Returns "bootstrap" if nobody has claimed the first admin yet, otherwise
// creates a `pending` profile and returns "pending".
export const ensureProfile = async (user) => {
  const boot = await getDoc(doc(db, ...BOOTSTRAP_DOC));
  if (!boot.exists()) return "bootstrap";
  await setDoc(userRef(user.uid), {
    email: user.email,
    displayName: user.displayName || "",
    role: "pending",
    disabled: false,
    mustChangePassword: false,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
    updatedAt: serverTimestamp(),
  });
  return "pending";
};

// One-time: the first user to call this becomes admin. Rules allow it only
// while `meta/bootstrap` does not exist, and both docs are written atomically.
export const claimBootstrapAdmin = async (user) => {
  const batch = writeBatch(db);
  batch.set(userRef(user.uid), {
    email: user.email,
    displayName: user.displayName || "",
    role: "admin",
    disabled: false,
    mustChangePassword: false,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, ...BOOTSTRAP_DOC), {
    adminUid: user.uid,
    claimedAt: serverTimestamp(),
  });
  await batch.commit();
};

// Spanish messages for the Firebase errors users will actually hit.
export const authErrorMessage = (err) => {
  const map = {
    "auth/email-already-in-use":
      "Ese correo ya tiene una cuenta. Si es un usuario antiguo, pídele que inicie sesión una vez: aparecerá aquí como «Pendiente» y podrás asignarle un rol.",
    "auth/invalid-email": "El correo no es válido.",
    "auth/weak-password": "La contraseña es demasiado débil (mínimo 6 caracteres).",
    "auth/wrong-password": "La contraseña actual no es correcta.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "No existe una cuenta con ese correo.",
    "auth/too-many-requests":
      "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    "auth/operation-not-allowed":
      "El inicio de sesión con correo/contraseña no está habilitado en Firebase.",
    "permission-denied":
      "Permiso denegado por las reglas de Firestore. ¿Están publicadas las reglas de firestore.rules?",
  };
  return map[err?.code] ?? err?.message ?? "Error desconocido";
};
