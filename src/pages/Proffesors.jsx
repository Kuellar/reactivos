// src/pages/Professors.jsx
import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  message,
  Avatar,
  Tooltip,
  Select,
} from "antd";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase"; // asegúrate de exportar `auth` desde tu archivo firebase
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { onAuthStateChanged } from "firebase/auth";

const { Option } = Select;

export default function Professors() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [user, setUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const colRef = collection(db, "professors");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const arr = snap.docs.map((d) => {
          const docData = d.data() || {};
          // map fallback keys so older documents still work
          return {
            id: d.id,
            firstName:
              docData.firstName || docData.name?.split?.(" ")?.[0] || "",
            lastName:
              docData.lastName ||
              docData.surname ||
              docData.name?.split?.(" ")?.slice(1).join(" ") ||
              "",
            email: docData.email || "",
            position: docData.position || "Profesor Asociado",
            photo: docData.photo || "",
            // keep original raw data in case you need it
            _raw: docData,
          };
        });
        setData(arr);
        setLoading(false);
      },
      (err) => {
        console.error("professors onSnapshot error", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    // escucha cambios de auth para mostrar/ocultar columna editar
    let unsubAuth = () => {};
    if (auth) {
      unsubAuth = onAuthStateChanged(auth, (u) => {
        setUser(u);
      });
    }
    return () => {
      try {
        unsubAuth();
      } catch (e) {}
    };
  }, []);

  const openNew = () => {
    setEditing(null);
    form.resetFields();
    // establecer valores por defecto
    form.setFieldsValue({ position: "Profesor Asociado", photo: "" });
    setOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      firstName: record.firstName || "",
      lastName: record.lastName || "",
      email: record.email || "",
      position: record.position || "Profesor Asociado",
      photo: record.photo || "",
    });
    setOpen(true);
  };

  const handleCreateOrUpdate = async () => {
    try {
      const vals = await form.validateFields();
      setProcessing(true);
      const payload = {
        firstName: vals.firstName,
        lastName: vals.lastName,
        email: vals.email,
        position: vals.position,
        photo: vals.photo || "",
      };

      if (editing) {
        const ref = doc(db, "professors", editing.id);
        await updateDoc(ref, payload);
        message.success("Docente actualizado");
      } else {
        await addDoc(collection(db, "professors"), payload);
        message.success("Docente creado");
      }

      setOpen(false);
      setEditing(null);
      form.resetFields();
    } catch (err) {
      console.error(err);
      message.error(err?.message || "Error al guardar");
    } finally {
      setProcessing(false);
    }
  };

  const openDelete = (record) => {
    setDeleteTarget(record);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "professors", deleteTarget.id));
      message.success("Docente eliminado");
    } catch (err) {
      console.error(err);
      message.error(err?.message || "Error al eliminar");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDeleteCancel = () => setDeleteTarget(null);

  const columns = [
    {
      title: "Foto",
      dataIndex: "photo",
      key: "photo",
      width: 100,
      render: (v, record) => (
        <Avatar
          size={40}
          style={{ backgroundColor: "#f0f0f0", color: "#999" }}
          src={v || undefined}
          alt={`${record.firstName || ""} ${record.lastName || ""}`}
        />
      ),
    },
    { title: "Nombres", dataIndex: "firstName", key: "firstName" },
    { title: "Apellidos", dataIndex: "lastName", key: "lastName" },
    { title: "Correo electrónico", dataIndex: "email", key: "email" },
    { title: "Posición", dataIndex: "position", key: "position" },
  ];

  // solo añadimos la columna de acciones (editar/borrar) si hay usuario autenticado
  if (user) {
    columns.push({
      title: "Acciones",
      key: "actions",
      width: 140,
      render: (_, record) => (
        <Space>
          <Tooltip title="Editar">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Button
              type="button"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => openDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    });
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 20px",
        }}
      >
        <h2 style={{ margin: 0 }}>Docentes</h2>
        {user && (
          <div>
            <Button type="primary" onClick={openNew}>
              Agregar Docente
            </Button>
          </div>
        )}
      </div>

      <div style={{ padding: "0 20px 20px", flex: 1 }}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey={(r) => r.id}
          loading={loading}
          pagination={{ pageSize: 8 }}
        />
      </div>

      <Modal
        open={open}
        onOk={handleCreateOrUpdate}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        okText={editing ? "Actualizar" : "Crear"}
        cancelText="Cancelar"
        confirmLoading={processing}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="firstName"
            label="Nombres"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="lastName"
            label="Apellidos"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Correo electrónico"
            rules={[{ required: true, type: "email" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="position"
            label="Posición"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="Profesor Asociado">Profesor Asociado</Option>
              <Option value="Colaborador Académico">
                Colaborador Académico
              </Option>
              <Option value="Profesor Asistente">Profesor Asistente</Option>
            </Select>
          </Form.Item>

          <Form.Item name="photo" label="Foto (opcional)">
            <Input placeholder="URL de la foto u nombre de archivo (opcional)" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={!!deleteTarget}
        title="Confirmar eliminación"
        onOk={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        okText="Eliminar"
        okType="danger"
        cancelText="Cancelar"
      >
        <p>
          ¿Estás seguro de que deseas eliminar a{" "}
          {deleteTarget
            ? `${deleteTarget.firstName} ${deleteTarget.lastName}`
            : ""}
          ? Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
