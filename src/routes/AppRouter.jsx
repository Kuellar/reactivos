import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import DataTable from "../pages/DataTable";
import Login from "../pages/Login";
import Proffesors from "../pages/Proffesors";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/table" element={<DataTable />} />
      <Route path="/login" element={<Login />} />
      <Route path="/professors" element={<Proffesors />} />
    </Routes>
  );
}
