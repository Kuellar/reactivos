# Auth, users & permissions

**Read this before changing anything that affects users**: login, account creation,
roles, permission checks, the `users` / `meta` collections, `firestore.rules`, or UI that
appears only for some users.

## TL;DR

- Identity = **Firebase Auth** (email/password). Authorization = **Firestore profile doc**
  `users/{uid}` with a `role`. Being signed in grants **nothing** by itself.
- Admins create accounts **from the web app** (`/users`) — no Firebase console needed.
  A random temporary password is generated and shown once in a copyable message; the new
  user is forced to change it on first login.
- There is **no backend**. Account creation runs in the admin's browser through a
  *secondary* Firebase app instance so the admin is not signed out.
- Two places define permissions and **must stay in sync**:
  - `src/lib/permissions.js` — what the UI shows (UX only, not security).
  - `firestore.rules` — what the server allows (the real security).

## Roles

| Role | Label (UI) | Can do |
| --- | --- | --- |
| `admin` | Administrador | Everything editor can + manage users/roles + "BORRAR TODO" reactivos. |
| `editor` | Editor | Create/edit/delete reactivos, salas, docentes; CSV import/export. |
| `viewer` | Lector | Read (same as public) + download CSV. |
| `pending` | Pendiente | Nothing beyond public read. Auto-assigned to accounts with no profile. |
| *(no session)* | — | Public read of `reactives`, `locations`, `professors`. |

### Permission matrix (`src/lib/permissions.js` → `PERMISSIONS`)

| Permission key | admin | editor | viewer | pending | Enforced in rules? |
| --- | :-: | :-: | :-: | :-: | --- |
| `locations.write` | ✓ | ✓ | | | yes (`isEditor()`) |
| `professors.write` | ✓ | ✓ | | | yes (`isEditor()`) |
| `reactives.write` | ✓ | ✓ | | | yes (`isEditor()`) |
| `reactives.import` | ✓ | ✓ | | | yes (it is just writes) |
| `reactives.export` | ✓ | ✓ | ✓ | | no — data is public anyway; UI-only |
| `reactives.deleteAll` | ✓ | | | | partially — editors can delete docs one by one, so UI-only |
| `users.manage` | ✓ | | | | yes (`isAdmin()` on `users/*`) |

Use in components: `const { can } = useAuth(); if (can("reactives.write")) …`.

## Data

`users/{uid}` (doc ID = Auth UID):
`email, displayName, role, disabled, mustChangePassword, createdAt, createdBy, updatedAt`.
Rules whitelist exactly these keys (`profileKeysOnly()`); adding a field = update rules.

`meta/bootstrap`: `{ adminUid, claimedAt }` — exists once the first admin was claimed.

## Files

| File | Responsibility |
| --- | --- |
| `src/firebase.js` | `auth`, `db`, `getProvisioningAuth()` (secondary app `"user-provisioning"`, in-memory persistence), emulator switch `VITE_USE_EMULATORS`. |
| `src/context/AuthContext.jsx` | `AuthProvider` + `useAuth()`. Subscribes to Auth state and to `users/{uid}`; auto-creates pending profile; signs out disabled users; exposes `bootstrapAvailable`. |
| `src/lib/users.js` | All account/profile operations (see flows). Also Spanish error messages (`authErrorMessage`). |
| `src/lib/permissions.js` | `ROLES`, `ASSIGNABLE_ROLES`, `PERMISSIONS`, `PERMISSION_LABELS`, `can()`. |
| `src/routes/AppRouter.jsx` | Redirects every route to `/change-password` while `profile.mustChangePassword`. Wraps `/users` in `RequireAuth permission="users.manage"`. |
| `src/components/RequireAuth.jsx` | Route guard: spinner while loading → `/login` if anonymous → 403 if missing permission. |
| `src/components/AccountBanner.jsx` | Shows "Ser administrador" (bootstrap), "pendiente de aprobación", or profile-load errors. |
| `src/pages/Users.jsx` | Admin UI: table, inline role change, disable/enable, reset email, delete profile, create-user modal + welcome-message modal, permission matrix. |
| `src/pages/ChangePassword.jsx` | Re-authenticates with current/temporary password, sets new one, clears `mustChangePassword`. |
| `src/pages/Login.jsx` | Login + "¿Olvidaste tu contraseña?" (`sendPasswordResetEmail`). No self sign-up. |
| `firestore.rules` | Server enforcement (see below). |
| `tests/rules/rules.test.mjs` | 48 emulator tests covering every rule branch. |

## Flows

### 1. Admin creates a user (`createUserWithTempPassword` in `lib/users.js`)

1. Admin fills name, email, role in `/users` → "Crear usuario".
2. `generateTempPassword()` → 12 chars, `crypto.getRandomValues`, no ambiguous chars.
3. `createUserWithEmailAndPassword(getProvisioningAuth(), email, temp)` — runs on the
   **secondary** Auth instance, which becomes signed in as the new user. The admin's main
   `auth` session is untouched.
4. `updateProfile(newUser, { displayName })`.
5. Admin (main `db`) writes `users/{newUid}` with `role`, `mustChangePassword: true`.
6. If step 4/5 fails → `newUser.delete()` (rollback, so the email is reusable).
7. `signOut(provisioningAuth)` always.
8. UI shows `buildWelcomeMessage()` text (login URL `…/#/login`, email, temp password)
   with **Copiar mensaje** and **Abrir en correo** (`mailto:`). The password is never
   stored anywhere and cannot be shown again.

### 2. First login with a temporary password

`Login` → `AuthContext` loads profile → `mustChangePassword === true` → `AppRouter`
redirects to `/change-password` → `changeOwnPassword(temp, new)` does
`reauthenticateWithCredential` + `updatePassword` + sets `mustChangePassword: false`
(rules allow a user to change only `mustChangePassword`→false, `displayName`, `updatedAt`
on their own doc).

### 3. Account without profile (legacy console accounts, self sign-ups via API)

`AuthContext` sees no `users/{uid}` → `ensureProfile(user)`:
- `meta/bootstrap` missing → returns `"bootstrap"` → banner offers **Ser administrador**.
- otherwise creates `users/{uid}` with `role: "pending"` → appears in `/users` for an admin
  to assign a role. (Rules only let a user self-create as `pending`, with own email.)

### 4. First admin bootstrap (`claimBootstrapAdmin`)

Atomic batch: `users/{me}` with `role: "admin"` + `meta/bootstrap { adminUid: me }`.
Rules accept it only if `meta/bootstrap` does not exist yet and both docs are written in
the same batch (`getAfter`). Works exactly once per project. After deploying the rules,
the owner should sign in and claim it immediately. Optional hardening: pin the owner's
email in the bootstrap rule (comment in `firestore.rules`).

### 5. Admin maintenance (`/users`)

- **Change role**: inline select → `updateUser(uid, { role })`.
- **Disable/enable**: `setUserDisabled` → rules deny all writes; `AuthContext` signs the
  user out on next snapshot with a message.
- **Reset password**: `sendPasswordResetEmail` (Firebase sends the email). An admin can
  NOT set another user's password from the client.
- **Delete profile**: removes `users/{uid}` → user has no permissions; if they sign in
  again they come back as `pending`. The Auth account itself remains (see limitations).
- An admin cannot change their own role, disable or delete themselves (UI hides it, rules
  deny it) → the project cannot lose its last admin by accident.

## Rules summary (`firestore.rules`)

- `reactives`, `locations`, `professors`: `read: true`; writes: `isEditor()` (admin|editor,
  active profile).
- `users/{uid}`: read self or admin; admin create/update/delete (valid role, whitelisted
  keys, not own role/disabled, not self-delete); self-create `pending`; self-update
  limited keys; bootstrap create/update.
- `meta/bootstrap`: read signed-in; create once tied to the bootstrap batch; never updated.
- `isActive()` = signed in + profile exists + `disabled != true`. Each check costs one
  Firestore document read (`get`/`exists`) — normal for role-based rules.

## Change checklist

| If you… | Also do |
| --- | --- |
| Add a role | `ROLES` (+ `ASSIGNABLE_ROLES`) in `permissions.js`; `validRole()` and relevant `hasRole([...])` lists in `firestore.rules`; tables in this doc; tests. |
| Add a permission | `PERMISSIONS` + `PERMISSION_LABELS`; gate UI with `can()`; if it protects data, add a rule; matrix in this doc. |
| Add a field to `users/{uid}` | `profileKeysOnly()` whitelist in rules; writers in `lib/users.js`; `data-model.md`. |
| Add a new collection | Explicit `match` block in rules (default is deny); decide public read vs role read. |
| Add edit UI anywhere | Gate with `can("…")`, never with `user != null`. |
| Touch rules | `cd tests/rules && npm test`; then **publish rules** (console or `firebase deploy --only firestore:rules`) — they are not deployed with the static site. |

## Known limitations / upgrade path

Because there is no backend (Firebase Spark plan, static hosting):

- Firebase Auth "sign up" must stay enabled (the provisioning flow uses it), so anyone
  holding the public API key could create an Auth account via the REST API. That account
  gets **no permissions** (`pending` at most) — security relies on `firestore.rules`.
- Admins cannot delete Auth accounts, set another user's password, or revoke sessions.
  Deleting/disabling the profile removes all permissions, which is sufficient for this app.
- `mustChangePassword` is enforced by the UI; a user could technically keep the temp
  password by calling the API directly (harmless: it is their own account).

If the project moves to the Blaze plan, replace `createUserWithTempPassword` and the admin
actions with callable Cloud Functions using the Admin SDK (`auth.createUser`,
`auth.updateUser({ disabled })`, `auth.deleteUser`, custom claims for the role) and then
disable public sign-up in Firebase Auth settings.

## Testing

- Rules: `cd tests/rules && npm install && npm test` — Firestore emulator, 48 cases.
  The emulator log prints `evaluation error at …` for denied role checks; that is how it
  reports a `false` function result, not a bug. Trust the pass/fail counts.
- Manual end-to-end: set `VITE_USE_EMULATORS=true` in `.env.local`, run
  `npx firebase-tools emulators:start --only auth,firestore --project demo-reactivo` and
  `npm run dev`; create an account in the emulator, claim admin, create users.
