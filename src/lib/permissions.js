// Single source of truth for roles and what each role may do in the UI.
// Server-side enforcement lives in /firestore.rules — keep both in sync.
// See doc/architecture/auth-and-users.md

export const ROLES = {
  admin: {
    label: "Administrador",
    color: "red",
    description:
      "Todo lo del editor + gestionar usuarios y roles + borrado masivo de reactivos.",
  },
  editor: {
    label: "Editor",
    color: "blue",
    description:
      "Crear, editar y eliminar reactivos, salas y docentes. Importar y exportar CSV.",
  },
  viewer: {
    label: "Lector",
    color: "green",
    description:
      "Solo lectura (igual que un visitante) + descargar el inventario como CSV.",
  },
  pending: {
    label: "Pendiente",
    color: "default",
    description:
      "Cuenta sin rol asignado. No puede modificar nada hasta que un administrador le asigne un rol.",
  },
};

// Roles an admin can pick when creating / editing a user.
export const ASSIGNABLE_ROLES = ["admin", "editor", "viewer"];

export const PERMISSIONS = {
  "locations.write": ["admin", "editor"],
  "professors.write": ["admin", "editor"],
  "reactives.write": ["admin", "editor"],
  "reactives.import": ["admin", "editor"],
  "reactives.export": ["admin", "editor", "viewer"],
  "reactives.deleteAll": ["admin"],
  "users.manage": ["admin"],
};

export const PERMISSION_LABELS = {
  "locations.write": "Crear / editar / eliminar salas",
  "professors.write": "Crear / editar / eliminar docentes",
  "reactives.write": "Crear / editar / eliminar reactivos",
  "reactives.import": "Importar reactivos desde CSV",
  "reactives.export": "Descargar inventario como CSV",
  "reactives.deleteAll": "Borrar TODOS los reactivos",
  "users.manage": "Crear usuarios y asignar roles",
};

export const can = (role, permission) =>
  Boolean(role) && (PERMISSIONS[permission] ?? []).includes(role);

export const roleLabel = (role) => ROLES[role]?.label ?? role ?? "—";
export const roleColor = (role) => ROLES[role]?.color ?? "default";
