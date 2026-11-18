# Firestore data model

All collections are top-level. Document IDs are Firestore auto-IDs unless noted.
Read access for inventory data is public; writes are role-gated (see
[auth-and-users.md](auth-and-users.md) and `/firestore.rules`).

## `reactives/{autoId}` — chemicals

| Field | Type | Notes |
| --- | --- | --- |
| `nombre` | string | Name. |
| `marca` | string | Brand. |
| `clase` | string | Hazard class (e.g. `"6.1"`). |
| `cantidadValor` | number \| null | Quantity value. |
| `cantidadUnidad` | `"L"`\|`"mL"`\|`"g"`\|`"Kg"`\|`""` | Quantity unit. |
| `cantidadAlmacenada` | string | Legacy free-text quantity; used only if value/unit missing. |
| `fechaDeVencimiento` | string `YYYY-MM-DD` \| `""` | Expiry date (stored as string, not Timestamp). |
| `gabinete` | string | Cabinet. |
| `codigo` | string | Internal code, e.g. `BOD-6.1-A-4`. |
| `hDes` | string (URL) | Link to the safety data sheet (Hoja de Seguridad), usually Google Drive. |
| `docenteId` | string | → `professors/{id}`; `""` if none. |
| `lugarId` | string | → `locations/{id}`; `""` if none. |

CSV import (DataTable "Agregar tabla") maps headers like
`nombre, docente, lugar, marca, clase, cantidadValor, cantidadUnidad, fechaDeVencimiento, gabinete, codigo, hDes`
(see `data_example.csv`); `docente`/`lugar` are resolved by name to IDs.

## `locations/{autoId}` — rooms (salas)

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Shown on Home cards. |
| `img` | string | Image URL; `""` → placeholder. |

## `professors/{autoId}` — staff in charge (docentes)

| Field | Type | Notes |
| --- | --- | --- |
| `firstName`, `lastName` | string | Older docs may have `name`/`surname`; the page maps fallbacks. |
| `email` | string | |
| `position` | string | `Profesor Asociado` \| `Colaborador Académico` \| `Profesor Asistente`. |
| `photo` | string | Optional URL. |

## `users/{uid}` — app user profiles (doc ID = Firebase Auth UID)

| Field | Type | Notes |
| --- | --- | --- |
| `email` | string | Copy of the Auth email. |
| `displayName` | string | |
| `role` | `"admin"`\|`"editor"`\|`"viewer"`\|`"pending"` | Drives all permissions. |
| `disabled` | boolean | `true` → rules deny everything, client signs the user out. |
| `mustChangePassword` | boolean | `true` after admin creation with a temp password. |
| `createdAt`, `updatedAt` | Timestamp | `serverTimestamp()`. |
| `createdBy` | string | UID of the admin (or the user itself for pending/bootstrap). |

Rules reject any other field (`hasOnly` whitelist) — add new fields to the whitelist in
`firestore.rules` first. Details: [auth-and-users.md](auth-and-users.md).

## `meta/bootstrap` — one-time first-admin marker

| Field | Type | Notes |
| --- | --- | --- |
| `adminUid` | string | UID that claimed the first admin role. |
| `claimedAt` | Timestamp | |

Created once, never updated or deleted (rules forbid it). Its existence disables the
"Ser administrador" bootstrap button for everyone else.
