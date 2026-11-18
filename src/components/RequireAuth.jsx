import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Result, Spin, Button } from "antd";
import { useAuth } from "../context/AuthContext";

// Route guard. <RequireAuth> = signed in; <RequireAuth permission="users.manage"> = role check.
export default function RequireAuth({ permission, children }) {
  const { user, loading, can } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (permission && !can(permission)) {
    return (
      <Result
        status="403"
        title="Sin permisos"
        subTitle="Tu rol no tiene acceso a esta sección."
        extra={
          <Button type="primary" href="#/">
            Volver al inicio
          </Button>
        }
      />
    );
  }
  return children;
}
