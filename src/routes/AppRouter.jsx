import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "../pages/Home";
import DataTable from "../pages/DataTable";
import Login from "../pages/Login";
import Proffesors from "../pages/Proffesors";
import Users from "../pages/Users";
import ChangePassword from "../pages/ChangePassword";
import RequireAuth from "../components/RequireAuth";
import { useAuth } from "../context/AuthContext";

export default function AppRouter() {
  const { profile } = useAuth();
  const location = useLocation();

  // Users created with a temporary password can't go anywhere else until they change it.
  if (profile?.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/table" element={<DataTable />} />
      <Route path="/login" element={<Login />} />
      <Route path="/professors" element={<Proffesors />} />
      <Route
        path="/change-password"
        element={
          <RequireAuth>
            <ChangePassword />
          </RequireAuth>
        }
      />
      <Route
        path="/users"
        element={
          <RequireAuth permission="users.manage">
            <Users />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
