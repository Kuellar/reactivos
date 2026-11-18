# AGENTS.md

Instructions for AI coding agents working in this repo.

## Start here

Architecture docs live in [`doc/architecture/`](doc/architecture/README.md). Read the
overview first. It covers the stack, source map, routes, conventions and deploy steps.

## Anything that affects users → read the auth doc first

If your change touches **any** of these, read
[`doc/architecture/auth-and-users.md`](doc/architecture/auth-and-users.md) **before
editing** and follow its change checklist:

- login, logout, password change/reset, account creation
- roles or permissions (`src/lib/permissions.js`, `can(...)`, `useAuth()`)
- the `users` or `meta` Firestore collections, `src/lib/users.js`, `src/context/AuthContext.jsx`
- `firestore.rules`
- any UI that is shown, hidden or disabled depending on who is signed in
- a new Firestore collection (rules deny by default)

Non-negotiables:

1. UI permissions (`src/lib/permissions.js`) and server rules (`firestore.rules`) must
   stay in sync. The rules are the real security. The UI check is only UX.
2. Gate edit UI with `can("<permission>")`, never with "user is signed in".
3. Never call `createUserWithEmailAndPassword` on the main `auth`, because it signs the
   admin out. Use `createUserWithTempPassword` from `src/lib/users.js`.
4. After changing rules, run `cd tests/rules && npm install && npm test`, and remind the
   user to **publish** the rules. They are not deployed with the static site.
5. Update `doc/architecture/*.md` in the same change when behavior described there changes.

## Project facts

- React 19 + Vite + antd 5, plain JS, Firebase Auth + Firestore, no backend.
- `HashRouter` (GitHub Pages). User-facing text is in Spanish.
- Data model: [`doc/architecture/data-model.md`](doc/architecture/data-model.md).
- Commands: `npm run dev`, `npm run build`. ESLint: `npx eslint src`.
- Deploy: pushing to `master` triggers `.github/workflows/deploy.yml`, which publishes to
  GitHub Pages and to an SFTP server. Don't commit secrets; CI reads them from repository secrets.
