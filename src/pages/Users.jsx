// Admin-only user management. See doc/architecture/auth-and-users.md
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  Tooltip,
  Popconfirm,
  Alert,
  Collapse,
  message,
} from "antd";
import {
  UserAddOutlined,
  CopyOutlined,
  MailOutlined,
  StopOutlined,
  CheckCircleOutlined,
  KeyOutlined,
  DeleteOutlined,
  CheckOutlined,
  PushpinFilled,
} from "@ant-design/icons";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import {
  ROLES,
  ASSIGNABLE_ROLES,
  PERMISSIONS,
  PERMISSION_LABELS,
  roleLabel,
  roleColor,
} from "../lib/permissions";
import {
  USERS,
  createUserWithTempPassword,
  buildWelcomeMessage,
  updateUser,
  setUserDisabled,
  deleteUserProfile,
  sendResetEmail,
  authErrorMessage,
} from "../lib/users";

const roleOptions = ASSIGNABLE_ROLES.map((r) => ({
  value: r,
  label: (
    <div style={{ whiteSpace: "normal", lineHeight: 1.3, padding: "2px 0" }}>
      <Tag color={roleColor(r)}>{roleLabel(r)}</Tag>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{ROLES[r].description}</div>
    </div>
  ),
}));

const formatDate = (ts) => (ts?.toDate ? ts.toDate().toLocaleDateString("es-CL") : "—");

// Speech-bubble reminder shown at the bottom of the page, admins only.
function AdminReminder() {
  return (
    <div style={{ display: "flex", marginTop: 8, marginBottom: 12 }}>
      <div
        role="note"
        style={{
          position: "relative",
          maxWidth: "100%",
          background: "#fffbe6",
          border: "1px solid #ffe58f",
          borderRadius: 16,
          padding: "10px 16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontWeight: 600,
            color: "#ad6800",
            marginBottom: 4,
          }}
        >
          <PushpinFilled /> Recordatorio
        </div>
        <div style={{ wordBreak: "break-word" }}>reactivosfarmacia@gmail.com - FarmaUdeC</div>
        {/* bubble tail */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            bottom: -7,
            left: 28,
            width: 12,
            height: 12,
            background: "#fffbe6",
            borderRight: "1px solid #ffe58f",
            borderBottom: "1px solid #ffe58f",
            transform: "rotate(45deg)",
          }}
        />
      </div>
    </div>
  );
}

function PermissionMatrix() {
  const roles = ["admin", "editor", "viewer", "pending"];
  const rows = Object.keys(PERMISSIONS).map((p) => ({ key: p, label: PERMISSION_LABELS[p] ?? p }));
  const columns = [
    { title: "Acción", dataIndex: "label", key: "label" },
    ...roles.map((r) => ({
      title: <Tag color={roleColor(r)}>{roleLabel(r)}</Tag>,
      key: r,
      align: "center",
      width: 110,
      render: (_, row) =>
        PERMISSIONS[row.key].includes(r) ? <CheckOutlined style={{ color: "#16a34a" }} /> : "",
    })),
  ];
  return (
    <>
      <p style={{ marginTop: 0, color: "#6b7280" }}>
        Cualquier visitante (sin sesión) puede ver salas, reactivos y docentes. Los roles
        controlan quién puede modificar.
      </p>
      <Table size="small" pagination={false} columns={columns} dataSource={rows} scroll={{ x: true }} />
    </>
  );
}

export default function Users() {
  const { user: me, can } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null); // { email, displayName, text }
  const [form] = Form.useForm();
  const textRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, USERS),
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("users onSnapshot error", err);
        message.error(authErrorMessage(err));
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const sorted = useMemo(() => {
    const order = { pending: 0, admin: 1, editor: 2, viewer: 3 };
    return [...users].sort(
      (a, b) =>
        (order[a.role] ?? 9) - (order[b.role] ?? 9) ||
        (a.displayName || a.email || "").localeCompare(b.displayName || b.email || "", "es")
    );
  }, [users]);

  const handleCreate = async () => {
    const vals = await form.validateFields();
    setCreating(true);
    try {
      const res = await createUserWithTempPassword(
        { email: vals.email, displayName: vals.displayName.trim(), role: vals.role },
        me.uid
      );
      setCreateOpen(false);
      form.resetFields();
      setCreated({
        email: res.email,
        displayName: vals.displayName.trim(),
        text: buildWelcomeMessage({
          displayName: vals.displayName.trim(),
          email: res.email,
          tempPassword: res.tempPassword,
        }),
      });
    } catch (err) {
      console.error(err);
      message.error(authErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(created.text);
      message.success("Mensaje copiado");
    } catch {
      textRef.current?.resizableTextArea?.textArea?.select();
      message.info("Selecciona el texto y cópialo manualmente (Ctrl+C)");
    }
  };

  const mailtoHref = created
    ? `mailto:${encodeURIComponent(created.email)}?subject=${encodeURIComponent(
        "Tu cuenta en Registro de sustancias peligrosas"
      )}&body=${encodeURIComponent(created.text)}`
    : undefined;

  const run = async (fn, okMsg) => {
    try {
      await fn();
      if (okMsg) message.success(okMsg);
    } catch (err) {
      console.error(err);
      message.error(authErrorMessage(err));
    }
  };

  const columns = [
    {
      title: "Nombre",
      key: "name",
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {r.displayName || "—"} {r.id === me?.uid && <Tag>Tú</Tag>}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{r.email}</div>
        </div>
      ),
    },
    {
      title: "Rol",
      dataIndex: "role",
      key: "role",
      width: 190,
      render: (role, r) =>
        r.id === me?.uid ? (
          <Tag color={roleColor(role)}>{roleLabel(role)}</Tag>
        ) : (
          <Select
            size="small"
            style={{ width: 160 }}
            value={role}
            onChange={(v) => run(() => updateUser(r.id, { role: v }), `Rol actualizado a ${roleLabel(v)}`)}
            options={[
              ...(ASSIGNABLE_ROLES.includes(role) ? [] : [{ value: role, label: roleLabel(role), disabled: true }]),
              ...ASSIGNABLE_ROLES.map((x) => ({ value: x, label: roleLabel(x) })),
            ]}
          />
        ),
    },
    {
      title: "Estado",
      key: "status",
      width: 200,
      render: (_, r) => (
        <Space size={4} wrap>
          {r.disabled ? <Tag color="red">Deshabilitado</Tag> : <Tag color="green">Activo</Tag>}
          {r.mustChangePassword && <Tag color="orange">Contraseña temporal</Tag>}
        </Space>
      ),
    },
    { title: "Creado", key: "createdAt", width: 110, render: (_, r) => formatDate(r.createdAt) },
    {
      title: "Acciones",
      key: "actions",
      width: 150,
      render: (_, r) => {
        const self = r.id === me?.uid;
        return (
          <Space>
            <Tooltip title="Enviar correo para restablecer contraseña">
              <Popconfirm
                title={`¿Enviar correo de restablecimiento a ${r.email}?`}
                okText="Enviar"
                cancelText="Cancelar"
                onConfirm={() => run(() => sendResetEmail(r.email), "Correo enviado")}
              >
                <Button size="small" icon={<KeyOutlined />} />
              </Popconfirm>
            </Tooltip>
            {!self && (
              <Tooltip title={r.disabled ? "Habilitar" : "Deshabilitar"}>
                <Button
                  size="small"
                  icon={r.disabled ? <CheckCircleOutlined /> : <StopOutlined />}
                  onClick={() =>
                    run(
                      () => setUserDisabled(r.id, !r.disabled),
                      r.disabled ? "Usuario habilitado" : "Usuario deshabilitado"
                    )
                  }
                />
              </Tooltip>
            )}
            {!self && (
              <Tooltip title="Eliminar perfil (quita todos los permisos)">
                <Popconfirm
                  title="¿Eliminar el perfil de este usuario?"
                  description="Perderá todos sus permisos. Si vuelve a iniciar sesión aparecerá como «Pendiente»."
                  okText="Eliminar"
                  okButtonProps={{ danger: true }}
                  cancelText="Cancelar"
                  onConfirm={() => run(() => deleteUserProfile(r.id), "Perfil eliminado")}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="full-width-table" style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0 }}>Usuarios</h2>
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => setCreateOpen(true)}>
          Crear usuario
        </Button>
      </div>

      <Collapse items={[{ key: "roles", label: "Roles y permisos", children: <PermissionMatrix /> }]} />

      <Table
        columns={columns}
        dataSource={sorted}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 800 }}
      />

      {can("users.manage") && <AdminReminder />}

      <Modal
        title="Crear usuario"
        open={createOpen}
        onOk={handleCreate}
        okText="Crear"
        cancelText="Cancelar"
        confirmLoading={creating}
        onCancel={() => {
          setCreateOpen(false);
          form.resetFields();
        }}
      >
        <p style={{ color: "#6b7280", marginTop: 0 }}>
          Se generará una contraseña temporal. El usuario deberá cambiarla al iniciar sesión.
        </p>
        <Form form={form} layout="vertical" initialValues={{ role: "editor" }} requiredMark={false}>
          <Form.Item name="displayName" label="Nombre" rules={[{ required: true, whitespace: true, message: "Ingresa el nombre" }]}>
            <Input placeholder="Ej: María Pérez" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Correo electrónico"
            rules={[{ required: true, type: "email", message: "Ingresa un correo válido" }]}
          >
            <Input placeholder="usuario@udec.cl" autoComplete="off" />
          </Form.Item>
          <Form.Item name="role" label="Rol" rules={[{ required: true }]}>
            <Select options={roleOptions} labelRender={({ value }) => roleLabel(value)} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Usuario creado"
        open={Boolean(created)}
        onCancel={() => setCreated(null)}
        maskClosable={false}
        footer={[
          <Button key="mail" icon={<MailOutlined />} href={mailtoHref}>
            Abrir en correo
          </Button>,
          <Button key="copy" icon={<CopyOutlined />} onClick={copyMessage}>
            Copiar mensaje
          </Button>,
          <Button key="ok" type="primary" onClick={() => setCreated(null)}>
            Listo
          </Button>,
        ]}
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="La contraseña temporal solo se muestra ahora"
          description="Envía este mensaje al usuario antes de cerrar. Si se pierde, usa «Enviar correo de restablecimiento»."
        />
        <Input.TextArea ref={textRef} value={created?.text} readOnly autoSize={{ minRows: 8 }} />
      </Modal>
    </div>
  );
}
