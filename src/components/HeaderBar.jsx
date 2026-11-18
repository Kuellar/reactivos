import React, { useState } from "react";
import { Layout, Button, Drawer, Grid, Dropdown, Tag } from "antd";
import { MenuOutlined, DownOutlined, TeamOutlined, KeyOutlined, LogoutOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../lib/auth";
import { useAuth } from "../context/AuthContext";
import { roleLabel, roleColor } from "../lib/permissions";
import logoNegative from "../assets/logos/UdeC_blanco_horizontal_1.svg";

const { Header } = Layout;
const { useBreakpoint } = Grid;

export default function HeaderBar() {
  const { user: authUser, role, can } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const screens = useBreakpoint();

  const user = authUser ? { name: authUser.displayName || authUser.email, uid: authUser.uid } : null;
  const canManageUsers = can("users.manage");

  const handleLogout = async () => {
    setDrawerOpen(false);
    await logout();
    navigate("/login");
  };

  const userMenu = {
    items: [
      ...(canManageUsers ? [{ key: "users", icon: <TeamOutlined />, label: "Usuarios" }] : []),
      { key: "password", icon: <KeyOutlined />, label: "Cambiar contraseña" },
      { type: "divider" },
      { key: "logout", icon: <LogoutOutlined />, label: "Cerrar sesión", danger: true },
    ],
    onClick: ({ key }) => {
      if (key === "users") navigate("/users");
      else if (key === "password") navigate("/change-password");
      else if (key === "logout") handleLogout();
    },
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
                {canManageUsers && (
                  <Button onClick={() => navigate("/users")} type="text" size="small" className="login-btn" icon={<TeamOutlined />}>
                    Usuarios
                  </Button>
                )}
                <Dropdown menu={userMenu} trigger={["click"]} placement="bottomRight">
                  <Button type="text" size="small" className="login-btn">
                    <span className="user-name" title={user.name}>
                      {user.name}
                    </span>
                    {role && <Tag color={roleColor(role)} style={{ marginInlineEnd: 0 }}>{roleLabel(role)}</Tag>}
                    <DownOutlined />
                  </Button>
                </Dropdown>
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
        styles={{ body: { padding: 16 } }}
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
          {canManageUsers && (
            <Link to="/users" onClick={() => setDrawerOpen(false)} className="drawer-link">
              Usuarios
            </Link>
          )}

          {user ? (
            <>
              <div className="drawer-user-name">
                {user.name} {role && <Tag color={roleColor(role)}>{roleLabel(role)}</Tag>}
              </div>
              <Link to="/change-password" onClick={() => setDrawerOpen(false)} className="drawer-link">
                Cambiar contraseña
              </Link>
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
