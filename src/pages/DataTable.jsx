import React, { useEffect, useState } from "react";
import { Table, Tag, Button, message, Modal, Form, Input, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import TableActions from "../components/TableActions";
import { getAuth } from "firebase/auth";

export default function DataTable() {
  const [data, setData] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [editReactive, setEditReactive] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPopupDelete, setShowPopupDelete] = useState(false);
  const [deleteReactive, setDeleteReactive] = useState(null);

  const [professors, setProfessors] = useState([]);
  const [locations, setLocations] = useState([]);

  const [form] = Form.useForm();

  const auth = getAuth();
  const user = auth.currentUser;

  const fetchProfessors = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "professors"));
      setProfessors(querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLocations = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "locations"));
      setLocations(querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "reactives"));
      const items = querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setData(items);
    } catch (err) {
      console.error(err);
      message.error("Error al obtener los reactivos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchProfessors();
    fetchLocations();
  }, []);

  const openDelete = (reactive) => {
    setDeleteReactive(reactive);
    setShowPopupDelete(true);
  };

  const handleDelete = async () => {
    if (!deleteReactive) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, "reactives", deleteReactive.id));
      message.success("Reactivo eliminado");
      setShowPopupDelete(false);
      setDeleteReactive(null);
      fetchData();
    } catch (err) {
      console.error(err);
      message.error("Error al eliminar el reactivo");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditReactive(null);
    form.resetFields();
    setShowPopup(true);
  };

  const handleEdit = (record) => {
    setEditReactive(record);
    form.setFieldsValue({
      nombre: record.nombre || "",
      descripcion: record.descripcion || "",
      categoria: record.categoria || "",
      nivel: record.nivel || "",
      estado: record.estado || "pendiente",
      docenteId: record.docenteId || undefined,
      lugarId: record.lugarId || undefined,
    });
    setShowPopup(true);
  };

  const handleSave = async (values) => {
    const reactiveData = {
      nombre: values.nombre || "",
      descripcion: values.descripcion || "",
      categoria: values.categoria || "",
      nivel: values.nivel || "",
      estado: values.estado || "pendiente",
      docenteId: values.docenteId || "",
      lugarId: values.lugarId || "",
    };

    try {
      setLoading(true);
      if (editReactive && editReactive.id) {
        await updateDoc(doc(db, "reactives", editReactive.id), reactiveData);
        message.success("Reactivo actualizado");
      } else {
        await addDoc(collection(db, "reactives"), reactiveData);
        message.success("Reactivo creado");
      }
      setShowPopup(false);
      fetchData();
    } catch (err) {
      console.error(err);
      message.error("Error al guardar el reactivo");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: "Nombre", dataIndex: "nombre", key: "nombre" },
    { title: "Descripción", dataIndex: "descripcion", key: "descripcion" },
    {
      title: "Docente encargado",
      dataIndex: "docenteId",
      key: "docente",
      render: (id) => {
        const prof = professors.find((p) => p.id === id);
        return prof ? `${prof.firstName} ${prof.lastName}` : "";
      },
    },
    {
      title: "Lugar",
      dataIndex: "lugarId",
      key: "lugar",
      render: (id) => {
        const loc = locations.find((l) => l.id === id);
        return loc ? loc.name : "";
      },
    },
    { title: "Categoría", dataIndex: "categoria", key: "categoria" },
    { title: "Nivel", dataIndex: "nivel", key: "nivel" },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      render: (estado) => {
        const color =
          estado === "activo"
            ? "green"
            : estado === "pendiente"
            ? "gold"
            : "default";
        return <Tag color={color}>{estado || "Sin estado"}</Tag>;
      },
    },
  ];

  if (user) {
    columns.push({
      title: "Acciones",
      key: "acciones",
      width: 140,
      render: (_, record) => (
        <TableActions
          onEdit={() => handleEdit(record)}
          onDelete={() => openDelete(record)}
        />
      ),
    });
  }

  return (
    <div className="full-width-table">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h2>Reactivos</h2>
        {user && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Agregar Reactivo
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 10 }}
        rowKey={(r) => r.id}
      />

      {/* MODAL CREAR / EDITAR */}
      {showPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setShowPopup(false)}
        >
          <div
            style={{
              background: "white",
              padding: 30,
              borderRadius: 12,
              minWidth: 400,
              maxWidth: 600,
              width: "100%",
              boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: 10 }}>
              {editReactive ? "Editar Reactivo" : "Nuevo Reactivo"}
            </h2>
            <p style={{ marginBottom: 20, color: "#555" }}>
              Rellena los campos para {editReactive ? "actualizar" : "crear"} el
              reactivo.
            </p>

            <Form form={form} layout="vertical" onFinish={handleSave}>
              <Form.Item
                label="Nombre"
                name="nombre"
                rules={[
                  { required: true, message: "El nombre es obligatorio" },
                ]}
              >
                <Input placeholder="Nombre del reactivo" />
              </Form.Item>

              <Form.Item label="Descripción" name="descripcion">
                <Input.TextArea
                  placeholder="Descripción del reactivo"
                  rows={4}
                />
              </Form.Item>

              <Form.Item label="Docente encargado" name="docenteId">
                <Select placeholder="Selecciona un docente" allowClear>
                  <Select.Option value="">Sin docente encargado</Select.Option>
                  {professors.map((p) => (
                    <Select.Option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="Lugar" name="lugarId">
                <Select placeholder="Selecciona un lugar" allowClear>
                  <Select.Option value="">Sin especificar</Select.Option>
                  {locations.map((l) => (
                    <Select.Option key={l.id} value={l.id}>
                      {l.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="Categoría" name="categoria">
                <Input placeholder="Categoría" />
              </Form.Item>

              <Form.Item label="Nivel" name="nivel">
                <Input placeholder="Nivel" />
              </Form.Item>

              <Form.Item label="Estado" name="estado">
                <Select>
                  <Select.Option value="activo">Activo</Select.Option>
                  <Select.Option value="pendiente">Pendiente</Select.Option>
                </Select>
              </Form.Item>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <Button onClick={() => setShowPopup(false)}>Cancelar</Button>
                <Button type="primary" htmlType="submit">
                  {editReactive ? "Guardar" : "Crear"}
                </Button>
              </div>
            </Form>
          </div>
        </div>
      )}

      {showPopupDelete && (
        <Modal
          open={showPopupDelete}
          title="Confirmar eliminación"
          onOk={handleDelete}
          onCancel={() => {
            setShowPopupDelete(false);
            setDeleteReactive(null);
          }}
          okText="Eliminar"
          okType="danger"
          cancelText="Cancelar"
        >
          <p>
            ¿Estás seguro de que deseas eliminar el reactivo "
            {deleteReactive?.nombre}"? Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}
    </div>
  );
}
