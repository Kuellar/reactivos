import React, { useEffect, useState } from "react";
import { Layout, Button, Drawer, Grid } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { onUserChanged, logout } from "../lib/auth";
import logoNegative from "../assets/logos/UdeC_blanco_horizontal_1.svg";

const { Header } = Layout;
const { useBreakpoint } = Grid;

export default function HeaderBar() {
  const [user, setUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const screens = useBreakpoint();

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

  const isMobile = !screens.md;

  return (
    <>
      <Header className="app-header">
        <div className="app-header-left">
          {isMobile && (
            <Button
              className="hamburger-btn"
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú"
            />
          )}

          <Link to="/" className="app-header-logo-link">
            <img
              src={logoNegative}
              alt="logo"
              className={`app-header-logo ${isMobile ? "small" : ""}`}
              height={isMobile ? 48 : 90}
            />
            <div className="app-header-text">
              <div className="app-header-title">
                Registro de sustancias peligrosas
              </div>
              <div className="app-header-subtitle">
                Facultad de farmacia depto. bioquímica clínica e inmunología
              </div>
            </div>
          </Link>
        </div>

        <div className="app-header-right">
          {/* Desktop & tablet: show user and actions inline */}
          {!isMobile ? (
            user ? (
              <div className="user-area">
                <div className="user-name" title={user.name}>
                  {user.name}
                </div>
                <Button
                  onClick={handleLogout}
                  type="text"
                  size="small"
                  className="login-btn"
                >
                  Cerrar sesión
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => navigate("/login")}
                type="text"
                size="small"
                className="login-btn"
              >
                Iniciar sesión
              </Button>
            )
          ) : null}
        </div>
      </Header>

      <Drawer
        title="Menú"
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        bodyStyle={{ padding: 16 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link
            to="/"
            onClick={() => setDrawerOpen(false)}
            className="drawer-link"
          >
            Inicio
          </Link>
          <Link
            to="/table"
            onClick={() => setDrawerOpen(false)}
            className="drawer-link"
          >
            Reactivos
          </Link>

          {user ? (
            <>
              <div className="drawer-user-name">{user.name}</div>
              <Button block onClick={handleLogout} type="primary">
                Cerrar sesión
              </Button>
            </>
          ) : (
            <Button
              block
              onClick={() => {
                setDrawerOpen(false);
                navigate("/login");
              }}
              type="primary"
            >
              Iniciar sesión
            </Button>
          )}
        </div>
      </Drawer>
    </>
  );
}
