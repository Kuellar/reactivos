import React, { useEffect, useState } from "react";
import { Table, Tag, Button, message, Modal } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase"; // asegúrate de tener exportado tu instancia de Firestore
import TableActions from "../components/TableActions";

export default function DataTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

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
  }, []);

  const handleDelete = async (record) => {
    Modal.confirm({
      title: "¿Eliminar reactivo?",
      content: `Se eliminará "${record.nombre}". Esta acción no se puede deshacer.`,
      okText: "Eliminar",
      cancelText: "Cancelar",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteDoc(doc(db, "reactives", record.id));
          message.success("Reactivo eliminado");
          fetchData();
        } catch (err) {
          console.error(err);
          message.error("Error al eliminar el reactivo");
        }
      },
    });
  };

  const handleEdit = (record) => {
    message.info(`Editar: ${record.nombre}`);
    // Aquí puedes abrir un modal con un formulario para editar
  };

  const handleAdd = () => {
    message.info("Agregar nuevo reactivo");
    // Aquí puedes abrir un modal para crear uno nuevo
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 120 },
    { title: "Nombre", dataIndex: "nombre", key: "nombre" },
    { title: "Descripción", dataIndex: "descripcion", key: "descripcion" },
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
    {
      title: "Acciones",
      key: "acciones",
      width: 140,
      render: (_, record) => (
        <TableActions
          onEdit={() => handleEdit(record)}
          onDelete={() => handleDelete(record)}
        />
      ),
    },
  ];

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
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Agregar Reactivo
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 10 }}
        rowKey={(r) => r.id}
      />
    </div>
  );
}
