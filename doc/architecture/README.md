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
    ButtonCard.jsx, TableActions.jsx
  pages/
    Home.jsx             grid of locations (salas) + search box
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

1. App: `npm run deploy` (runs `predeploy` = `npm run build`, then `gh-pages -d dist` pushes `dist/` to the `gh-pages` branch).
2. Security rules are **not** deployed with the app. After editing `firestore.rules`,
   publish them: Firebase console → Firestore → Rules (paste), or
   `npx firebase-tools deploy --only firestore:rules --project <project-id>`.
