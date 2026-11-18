import React, { useState } from "react";
import { Alert, Button, message } from "antd";
import { useAuth } from "../context/AuthContext";
import { claimBootstrapAdmin, authErrorMessage } from "../lib/users";

// Account-state notices shown above every page: first-admin bootstrap,
// pending role, or a profile that could not be loaded.
export default function AccountBanner() {
  const { user, role, bootstrapAvailable, profileError, loading } = useAuth();
  const [claiming, setClaiming] = useState(false);

  if (!user || loading) return null;

  if (bootstrapAvailable) {
    const claim = async () => {
      setClaiming(true);
      try {
        await claimBootstrapAdmin(user);
        message.success("Ahora eres administrador");
      } catch (err) {
        console.error(err);
        message.error(authErrorMessage(err));
      } finally {
        setClaiming(false);
      }
    };
    return (
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 12 }}
        message="Aún no hay ningún administrador configurado"
        description="El primer usuario que lo reclame se convierte en administrador y podrá crear y gestionar al resto desde la sección Usuarios. Esto solo se puede hacer una vez."
        action={
          <Button type="primary" loading={claiming} onClick={claim}>
            Ser administrador
          </Button>
        }
      />
    );
  }

  if (profileError) {
    return (
      <Alert
        type="error"
        showIcon
        style={{ marginBottom: 12 }}
        message="No se pudo cargar tu perfil de usuario"
        description={authErrorMessage(profileError)}
      />
    );
  }

  if (role === "pending") {
    return (
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="Tu cuenta está pendiente de aprobación"
        description="Un administrador debe asignarte un rol antes de que puedas modificar datos."
      />
    );
  }

  return null;
}
