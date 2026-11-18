// Firestore security-rules tests. Run: cd tests/rules && npm install && npm test
// (needs Java for the emulator). See doc/architecture/auth-and-users.md
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, addDoc, writeBatch, serverTimestamp } from "firebase/firestore";

const env = await initializeTestEnvironment({
  projectId: "demo-reactivo",
  firestore: { rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8085 },
});
const db = (uid, email) => (uid ? env.authenticatedContext(uid, { email: email ?? `${uid}@x.cl` }) : env.unauthenticatedContext()).firestore();
const profile = (uid, role, extra = {}) => ({ email: `${uid}@x.cl`, displayName: uid, role, disabled: false, mustChangePassword: false, createdAt: serverTimestamp(), createdBy: uid, updatedAt: serverTimestamp(), ...extra });
const reactive = { nombre: "Acetona" };
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log("  ok  ", name); } catch (e) { fail++; console.log("  FAIL", name, "-", e.message.split("\n")[0]); } };

await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), "reactives/r1"), reactive);
  await setDoc(doc(ctx.firestore(), "locations/l1"), { name: "Sala 1" });
});

console.log("Public / no profile");
await t("anon reads reactives", () => assertSucceeds(getDocs(collection(db(), "reactives"))));
await t("anon reads locations", () => assertSucceeds(getDoc(doc(db(), "locations/l1"))));
await t("anon cannot write reactive", () => assertFails(addDoc(collection(db(), "reactives"), reactive)));
await t("signed-in w/o profile cannot write reactive", () => assertFails(addDoc(collection(db("nobody"), "reactives"), reactive)));
await t("signed-in can read meta/bootstrap (missing)", () => assertSucceeds(getDoc(doc(db("nobody"), "meta/bootstrap"))));
await t("anon cannot read meta/bootstrap", () => assertFails(getDoc(doc(db(), "meta/bootstrap"))));

console.log("Bootstrap");
await t("users doc alone (no meta) fails", () => assertFails(setDoc(doc(db("A"), "users/A"), profile("A", "admin"))));
await t("meta alone (no users doc) fails", () => assertFails(setDoc(doc(db("A"), "meta/bootstrap"), { adminUid: "A" })));
await t("cannot bootstrap someone else", () => { const d = db("A"); const b = writeBatch(d); b.set(doc(d, "users/Z"), profile("Z", "admin")); b.set(doc(d, "meta/bootstrap"), { adminUid: "Z" }); return assertFails(b.commit()); });
await t("A claims bootstrap admin (batch)", () => { const d = db("A"); const b = writeBatch(d); b.set(doc(d, "users/A"), profile("A", "admin")); b.set(doc(d, "meta/bootstrap"), { adminUid: "A", claimedAt: serverTimestamp() }); return assertSucceeds(b.commit()); });
await t("B cannot claim bootstrap afterwards", () => { const d = db("B"); const b = writeBatch(d); b.set(doc(d, "users/B"), profile("B", "admin")); b.set(doc(d, "meta/bootstrap"), { adminUid: "B" }); return assertFails(b.commit()); });
await t("nobody can modify meta/bootstrap", () => assertFails(setDoc(doc(db("A"), "meta/bootstrap"), { adminUid: "B" })));

console.log("Pending self-registration");
await t("B cannot self-create as editor", () => assertFails(setDoc(doc(db("B"), "users/B"), profile("B", "editor"))));
await t("B cannot self-create with other email", () => assertFails(setDoc(doc(db("B"), "users/B"), profile("B", "pending", { email: "x@y.cl" }))));
await t("B cannot create pending profile for C", () => assertFails(setDoc(doc(db("B"), "users/C"), profile("C", "pending"))));
await t("B self-creates pending", () => assertSucceeds(setDoc(doc(db("B"), "users/B"), profile("B", "pending"))));
await t("pending B cannot write reactive", () => assertFails(addDoc(collection(db("B"), "reactives"), reactive)));
await t("pending B cannot promote self", () => assertFails(updateDoc(doc(db("B"), "users/B"), { role: "admin" })));
await t("pending B cannot read users list", () => assertFails(getDocs(collection(db("B"), "users"))));
await t("B reads own profile", () => assertSucceeds(getDoc(doc(db("B"), "users/B"))));
await t("B cannot read A profile", () => assertFails(getDoc(doc(db("B"), "users/A"))));

console.log("Admin");
await t("admin lists users", () => assertSucceeds(getDocs(collection(db("A"), "users"))));
await t("admin creates editor C", () => assertSucceeds(setDoc(doc(db("A"), "users/C"), profile("C", "editor", { mustChangePassword: true, createdBy: "A" }))));
await t("admin creates viewer V", () => assertSucceeds(setDoc(doc(db("A"), "users/V"), profile("V", "viewer", { createdBy: "A" }))));
await t("admin cannot create invalid role", () => assertFails(setDoc(doc(db("A"), "users/Q"), profile("Q", "superadmin"))));
await t("admin cannot add unknown fields", () => assertFails(setDoc(doc(db("A"), "users/Q"), profile("Q", "viewer", { foo: 1 }))));
await t("admin promotes pending B to viewer", () => assertSucceeds(updateDoc(doc(db("A"), "users/B"), { role: "viewer", updatedAt: serverTimestamp() })));
await t("admin cannot change own role", () => assertFails(updateDoc(doc(db("A"), "users/A"), { role: "editor" })));
await t("admin cannot disable self", () => assertFails(updateDoc(doc(db("A"), "users/A"), { disabled: true })));
await t("admin cannot delete self", () => assertFails(deleteDoc(doc(db("A"), "users/A"))));
await t("admin can rename self", () => assertSucceeds(updateDoc(doc(db("A"), "users/A"), { displayName: "Admin" })));
await t("admin writes reactive", () => assertSucceeds(addDoc(collection(db("A"), "reactives"), reactive)));

console.log("Editor / viewer");
await t("editor C writes reactive", () => assertSucceeds(addDoc(collection(db("C"), "reactives"), reactive)));
await t("editor C updates reactive", () => assertSucceeds(updateDoc(doc(db("C"), "reactives/r1"), { nombre: "X" })));
await t("editor C writes location", () => assertSucceeds(setDoc(doc(db("C"), "locations/l2"), { name: "Sala 2" })));
await t("editor C writes professor", () => assertSucceeds(addDoc(collection(db("C"), "professors"), { firstName: "Ana" })));
await t("editor C cannot list users", () => assertFails(getDocs(collection(db("C"), "users"))));
await t("editor C cannot create users", () => assertFails(setDoc(doc(db("C"), "users/D"), profile("D", "editor"))));
await t("editor C cannot promote self", () => assertFails(updateDoc(doc(db("C"), "users/C"), { role: "admin" })));
await t("temp-password user cannot edit own profile before clearing flag", () => assertFails(updateDoc(doc(db("C"), "users/C"), { displayName: "C2" })));
await t("editor C clears mustChangePassword", () => assertSucceeds(updateDoc(doc(db("C"), "users/C"), { mustChangePassword: false, updatedAt: serverTimestamp() })));
await t("cannot sneak a role change into the password-clear write", () => assertFails(updateDoc(doc(db("C"), "users/C"), { mustChangePassword: false, role: "admin" })));
await t("viewer V cannot write reactive", () => assertFails(addDoc(collection(db("V"), "reactives"), reactive)));

console.log("Disable / delete");
await t("admin disables C", () => assertSucceeds(updateDoc(doc(db("A"), "users/C"), { disabled: true })));
await t("disabled C cannot write reactive", () => assertFails(addDoc(collection(db("C"), "reactives"), reactive)));
await t("admin deletes V profile", () => assertSucceeds(deleteDoc(doc(db("A"), "users/V"))));
await t("V without profile cannot write", () => assertFails(addDoc(collection(db("V"), "reactives"), reactive)));
await t("V can re-register only as pending", () => assertSucceeds(setDoc(doc(db("V"), "users/V"), profile("V", "pending"))));

await env.cleanup();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
