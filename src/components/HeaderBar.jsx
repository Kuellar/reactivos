import React, { useEffect, useState } from "react";
import { Layout, Button } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { onUserChanged, logout } from "../lib/auth";
import logoNegative from "../assets/logos/UdeC_blanco_horizontal_1.svg";
const { Header } = Layout;

export default function HeaderBar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onUserChanged((u) => {
      if (u) setUser({ name: u.displayName || u.email, uid: u.uid });
      else setUser(null);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <Header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "0 20px",
        height: 84,
        background: "var(--color-primary)",
      }}
    >
      <Link
        to="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          textDecoration: "none",
        }}
      >
        <img
          src={logoNegative}
          alt="logo"
          className="app-header-logo"
          style={{ height: 80 }}
        />
        <div style={{ color: "#fff", fontWeight: 600 }}>
          Registro de sustancias peligrosas
        </div>
      </Link>

      <div style={{ marginLeft: "auto" }}>
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ color: "#fff", fontWeight: 600 }}>{user.name}</div>
            <Button onClick={handleLogout} size="small">
              Cerrar sesión
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => navigate("/login")}
            type="default"
            size="small"
          >
            Iniciar sesión
          </Button>
        )}
      </div>
    </Header>
  );
}
