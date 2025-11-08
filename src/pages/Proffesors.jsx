// src/pages/Professors.jsx
import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Popconfirm,
  message,
  Avatar,
  Tooltip,
} from "antd";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";

export default function Professors() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    const colRef = collection(db, "professors");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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

  const openNew = () => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      email: record.email,
      photo: record.photo || "",
    });
    setOpen(true);
  };

  const handleCreateOrUpdate = async () => {
    try {
      const vals = await form.validateFields();
      setProcessing(true);
      if (editing) {
        const ref = doc(db, "professors", editing.id);
        await updateDoc(ref, {
          name: vals.name,
          email: vals.email,
          photo: vals.photo || "",
        });
        message.success("Profesor actualizado");
      } else {
        await addDoc(collection(db, "professors"), {
          name: vals.name,
          email: vals.email,
          photo: vals.photo || "",
        });
        message.success("Profesor creado");
      }
      setOpen(false);
      setEditing(null);
    } catch (err) {
      console.error(err);
      message.error(err?.message || "Error al guardar");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "professors", id));
      message.success("Profesor eliminado");
    } catch (err) {
      console.error(err);
      message.error(err?.message || "Error al eliminar");
    }
  };

  const columns = [
    {
      title: "Foto",
      dataIndex: "photo",
      key: "photo",
      width: 80,
      render: (v, record) => (
        <Avatar
          size={40}
          style={{ backgroundColor: "#f0f0f0", color: "#999" }}
          src={v || undefined}
          alt={record.name}
        />
      ),
    },
    { title: "Nombre", dataIndex: "name", key: "name" },
    { title: "Mail", dataIndex: "email", key: "email" },
    {
      title: "Acciones",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Editar">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Eliminar profesor?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="Eliminar">
              <Button danger icon={<DeleteOutlined />} size="small" />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

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
        <h2 style={{ margin: 0 }}>Profesores</h2>
        <div>
          <Button type="primary" onClick={openNew}>
            Agregar profesor
          </Button>
        </div>
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
        }}
        okText={editing ? "Actualizar" : "Crear"}
        cancelText="Cancelar"
        confirmLoading={processing}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Mail"
            rules={[{ required: true, type: "email" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="photo" label="Foto (opcional)">
            <Input placeholder="nombre_de_archivo_o_url (opcional)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
