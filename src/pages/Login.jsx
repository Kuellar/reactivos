import React, { useState } from "react";
import { Card, Input, Button, message } from "antd";
import { loginWithEmail } from "../lib/auth";
import { sendResetEmail, authErrorMessage } from "../lib/users";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailLogin = async () => {
    setLoading(true);
    try {
      await loginWithEmail(email.trim(), pw);
      message.success("Sesión iniciada");
      // If the profile has mustChangePassword, AppRouter redirects to /change-password.
      navigate("/");
    } catch (e) {
      message.error(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email.trim()) {
      message.info("Escribe tu correo arriba y vuelve a presionar «¿Olvidaste tu contraseña?»");
      return;
    }
    try {
      await sendResetEmail(email.trim());
      message.success("Si el correo está registrado, recibirás un enlace para restablecer la contraseña.");
    } catch (e) {
      message.error(authErrorMessage(e));
    }
  };

  const onEnter = (e) => {
    if (e.key === "Enter") handleEmailLogin();
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
      <Card style={{ width: 420, maxWidth: "100%", borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>Iniciar sesión</h3>
        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={onEnter}
          autoComplete="username"
          style={{ marginBottom: 12 }}
        />
        <Input.Password
          placeholder="Contraseña"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={onEnter}
          autoComplete="current-password"
          style={{ marginBottom: 16 }}
        />
        <Button type="primary" block onClick={handleEmailLogin} loading={loading}>
          Iniciar sesión
        </Button>
        <Button type="link" block onClick={handleForgot} style={{ marginTop: 8 }}>
          ¿Olvidaste tu contraseña?
        </Button>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#6b7280", textAlign: "center" }}>
          Las cuentas las crea un administrador desde la sección Usuarios.
        </p>
      </Card>
    </div>
  );
}
