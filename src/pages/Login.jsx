import React, { useState } from "react";
import { Card, Input, Button, message } from "antd";
import { loginWithEmail, loginWithGoogle } from "../lib/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const navigate = useNavigate();

  const handleEmailLogin = async () => {
    try {
      await loginWithEmail(email, pw);
      message.success("Logged in");
      navigate("/");
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleGoogle = async () => {
    try {
      await loginWithGoogle();
      message.success("Logged in with Google");
      navigate("/");
    } catch (e) {
      message.error(e.message);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
      }}
    >
      <Card style={{ width: 420, borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>Iniciar sesión</h3>
        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <Input
          placeholder="Contraseña"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          type="password"
          style={{ marginBottom: 16 }}
        />
        <Button type="primary" block onClick={handleEmailLogin}>
          Iniciar sesión
        </Button>
      </Card>
    </div>
  );
}
