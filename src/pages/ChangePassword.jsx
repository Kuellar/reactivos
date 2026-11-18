import React, { useState } from "react";
import { Card, Form, Input, Button, Alert, message } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { changeOwnPassword, authErrorMessage } from "../lib/users";

const MIN_LENGTH = 8;

export default function ChangePassword() {
  const { profile } = useAuth();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const forced = Boolean(profile?.mustChangePassword);

  const onFinish = async ({ current, next }) => {
    setSaving(true);
    try {
      await changeOwnPassword(current, next);
      message.success("Contraseña actualizada");
      form.resetFields();
      navigate("/");
    } catch (err) {
      console.error(err);
      message.error(authErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
      <Card style={{ width: 420, maxWidth: "100%", borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>Cambiar contraseña</h3>
        {forced && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="Debes crear una contraseña nueva"
            description="Estás usando una contraseña temporal. Ingrésala como «contraseña actual» y elige una nueva para continuar."
          />
        )}
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="current"
            label={forced ? "Contraseña temporal" : "Contraseña actual"}
            rules={[{ required: true, message: "Ingresa tu contraseña actual" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="next"
            label="Contraseña nueva"
            rules={[
              { required: true, message: "Ingresa una contraseña nueva" },
              { min: MIN_LENGTH, message: `Mínimo ${MIN_LENGTH} caracteres` },
              ({ getFieldValue }) => ({
                validator: (_, v) =>
                  !v || v !== getFieldValue("current")
                    ? Promise.resolve()
                    : Promise.reject(new Error("Debe ser distinta de la actual")),
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="Repite la contraseña nueva"
            dependencies={["next"]}
            rules={[
              { required: true, message: "Repite la contraseña" },
              ({ getFieldValue }) => ({
                validator: (_, v) =>
                  !v || v === getFieldValue("next")
                    ? Promise.resolve()
                    : Promise.reject(new Error("Las contraseñas no coinciden")),
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={saving}>
            Guardar contraseña
          </Button>
        </Form>
      </Card>
    </div>
  );
}
