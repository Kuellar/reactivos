# Architecture overview

Fast orientation for humans and AI agents. Read this first, then the topic doc you need.

| Doc | Read it when… |
| --- | --- |
| [auth-and-users.md](auth-and-users.md) | Anything touching login, accounts, roles, permissions, `users` collection, `firestore.rules`, or UI that is shown/hidden per user. |
| [data-model.md](data-model.md) | Reading/writing Firestore collections (`reactives`, `locations`, `professors`, `users`, `meta`). |

## What the app is

"Registro de sustancias peligrosas": inventory of hazardous chemicals (reactivos) for
Facultad de Farmacia, UdeC. Public visitors can browse/search; signed-in users with the
right role can create/edit/delete. UI text is **Spanish**; code and docs are English.

## Stack

- React 19 + Vite 7, plain JavaScript (no TypeScript), antd 5 UI, `@ant-design/icons`.
- Firebase JS SDK 12: **Auth** (email/password) + **Firestore**. No Cloud Functions,
  no backend of any kind — the app is a static site.
- Routing: `react-router-dom` 7 with **`HashRouter`** (URLs look like `…/#/table`)
  because it is hosted on GitHub Pages (`npm run deploy` → `gh-pages` branch).
- Firebase config comes from `VITE_FIREBASE_*` vars in `.env.local` (git-ignored).

## Source map

```
src/
  main.jsx               ConfigProvider(theme) > HashRouter > AuthProvider > App
  App.jsx                Layout: HeaderBar + AccountBanner + AppRouter
  firebase.js            initializeApp, `auth`, `db`, getProvisioningAuth(), emulator switch
  theme.js               antd theme tokens (UdeC colors)
  context/AuthContext.jsx  useAuth(): user, profile, role, can(), loading, bootstrap state
  lib/
    permissions.js       ROLES + PERMISSIONS matrix + can()  (UI side of authorization)
    users.js             create users w/ temp password, profile CRUD, password change, bootstrap
    auth.js              thin wrappers: loginWithEmail, logout, onUserChanged
    firestore.js         UNUSED legacy helpers (pages call Firestore directly)
  routes/AppRouter.jsx   routes + forced redirect to /change-password
  components/
    HeaderBar.jsx        top bar, user menu (role tag, Usuarios, Cambiar contraseña, logout)
    AccountBanner.jsx    bootstrap-admin / pending / profile-error notices
    RequireAuth.jsx      route guard (signed in, optional `permission`)
    ButtonCard.jsx       room card used on Home (cover image w/ fallback, name, meta line)
    TableActions.jsx
  pages/
    Home.jsx             landing: search box + grid of locations (salas) with a reactive
                         count per sala (getCountFromServer) + add/edit modal with image URL
  assets/images/lab-placeholder.svg        default sala image (low-poly biochemistry lab)
  assets/images/bodega-placeholder.svg     default image for salas named "Bodega…" (storeroom)
  assets/images/cytometer-placeholder.svg  default image for sala "243" (flow cytometer)
    DataTable.jsx        reactivos table: filter, CRUD, CSV import/export, delete-all (~1600 lines)
    Proffesors.jsx       docentes CRUD (file name typo is historical; route is /professors)
    Users.jsx            admin: create users, assign roles, disable, reset email
    ChangePassword.jsx   self-service / forced password change
    Login.jsx            email+password login, forgot-password email
firestore.rules          server-side authorization (source of truth for security)
firebase.json            rules path + emulator ports (auth 9099, firestore 8080)
tests/rules/             Firestore rules test suite (own package.json)
```

## Routes

| Path | Page | Access |
| --- | --- | --- |
| `/` | Home | public (edit controls need `locations.write`) |
| `/table?query=…&location=<id>&borrarTodo=si` | DataTable | public (edit controls by permission) |
| `/professors` | Proffesors | public (edit controls need `professors.write`) |
| `/login` | Login | public |
| `/change-password` | ChangePassword | signed in |
| `/users` | Users | `users.manage` (admin) |

## Conventions

- Pages read data with `onSnapshot` / `getDocs` directly from `db`; there is no data layer.
- Authorization in UI: always `const { can } = useAuth(); can("reactives.write")`.
  Never gate edit UI on "is signed in" — signed-in users can be `pending` or `viewer`.
- Never call `onAuthStateChanged` in components; use `useAuth()`.
- Styling is mostly inline styles + `src/styles/*.css`; antd components for forms/tables.

## Local development

```bash
npm install
npm run dev                      # uses the real Firebase project from .env.local
```

Against emulators (no production data touched): add `VITE_USE_EMULATORS=true` to
`.env.local`, then in another terminal `npx firebase-tools emulators:start --only auth,firestore --project demo-reactivo`.

Rules tests: `cd tests/rules && npm install && npm test` (needs Java).

## Deploy

**Automatic (CI):** every push to `master` runs `.github/workflows/deploy.yml`
(docs/tests-only changes are skipped; it can also be run by hand from the Actions tab):

1. `build`: `npm ci` + `npm run build`. The Firebase config comes from repository secrets
   `VITE_FIREBASE_*`, because `.env.local` is not in git. The job fails early if any are missing.
2. `github-pages`: force-pushes `dist/` to the `gh-pages` branch, which GitHub Pages serves
   (https://kuellar.github.io/reactivos). Only the latest deploy is kept on that branch.
3. `sftp`: uploads `dist/` with `lftp mirror` to `SFTP_HOST:SFTP_REMOTE_DIR` using
   `SFTP_USER`/`SFTP_PASSWORD`. Optional: `SFTP_PORT`, and `SFTP_KNOWN_HOSTS` to pin the
   server key. Remote files that are no longer in `dist/` are not deleted.

Jobs 2 and 3 run in parallel and independently: if one fails, the other still deploys.
The build works under any sub-path and needs no server rewrite rules, because Vite uses
`base: "./"` and the app uses `HashRouter`.

**Manual fallback:** `npm run deploy` builds locally and pushes to `gh-pages` (Pages only).

**Manual server upload:** `npm run upload` (`tools/upload-sftp.sh`) builds and uploads
`dist/` over SFTP from your own computer, using the OpenSSH `sftp` client. On the first run
it asks for the server, user and folder and saves them in `sftp.config.local` (git-ignored
by `*.local`). It asks for the password on every run and never stores it. Use
`npm run upload -- --skip-build` to upload the existing `dist/`. This exists because the
server refuses connections from GitHub's runners, so the CI `sftp` job cannot reach it
(the CI log shows "Cannot connect to the server on port 22").

**Security rules are never deployed by CI.** After editing `firestore.rules`, publish them:
Firebase console → Firestore → Rules (paste), or
`npx firebase-tools deploy --only firestore:rules --project <project-id>`.
