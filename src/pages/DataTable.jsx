import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  message,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
} from "antd";
import { PlusOutlined, CloseCircleOutlined, FilePdfOutlined } from "@ant-design/icons";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import dayjs from "dayjs";
import { db } from "../firebase";
import TableActions from "../components/TableActions";
import { getAuth } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";

export default function DataTable() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [editReactive, setEditReactive] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPopupDelete, setShowPopupDelete] = useState(false);
  const [deleteReactive, setDeleteReactive] = useState(null);

  const [professors, setProfessors] = useState([]);
  const [locations, setLocations] = useState([]);

  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState(null);
  const [form] = Form.useForm();

  const auth = getAuth();
  const user = auth.currentUser;

  const location = useLocation();
  const navigate = useNavigate();

  // Obtener ?query= y ?location= de la URL al cargar
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const initialQuery = params.get("query") || "";
    const initialLocationId = params.get("location") || null;

    setQuery(initialQuery);
    setLocationFilter(initialLocationId);
  }, [location.search]);

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
      applyFilters(items, query, locationFilter);
    } catch (err) {
      console.error(err);
      message.error("Error al obtener los reactivos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfessors();
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchData();
  }, [professors, locations]);

  // Reaplicar filtros cuando cambian query o locationFilter
  useEffect(() => {
    applyFilters(data, query, locationFilter);
  }, [query, locationFilter, data]);

  const applyFilters = (items, textQuery, locFilter) => {
    let filtered = items;
    if (textQuery) {
      const lowerQuery = textQuery.toLowerCase();
      filtered = filtered.filter((r) => {
        const prof = professors.find((p) => p.id === r.docenteId);
        const loc = locations.find((l) => l.id === r.lugarId);
        return (
          r.nombre?.toLowerCase().includes(lowerQuery) ||          r.marca?.toLowerCase().includes(lowerQuery) ||
          r.clase?.toLowerCase().includes(lowerQuery) ||
          r.gabinete?.toLowerCase().includes(lowerQuery) ||
          r.codigo?.toLowerCase().includes(lowerQuery) ||
          r.hDes?.toLowerCase().includes(lowerQuery) ||
          (prof &&
            `${prof.firstName} ${prof.lastName}`
              .toLowerCase()
              .includes(lowerQuery)) ||
          (loc && loc.name.toLowerCase().includes(lowerQuery))
        );
      });
    }
    if (locFilter) {
      filtered = filtered.filter((r) => r.lugarId === locFilter);
    }
    setFilteredData(filtered);
  };

  const handleSearch = () => {
    applyFilters(data, query, locationFilter);
  };

  const clearLocationFilter = () => {
    setLocationFilter(null);
    const params = new URLSearchParams(location.search);
    params.delete("location");
    navigate({ search: params.toString() }, { replace: true });
  };

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
      nombre: record.nombre || "",      docenteId: record.docenteId || "",
      lugarId: record.lugarId || "",
      // nuevas columnas
      marca: record.marca || "",
      clase: record.clase || "",
      cantidadAlmacenada:
        typeof record.cantidadAlmacenada === "number"
          ? record.cantidadAlmacenada
          : Number(record.cantidadAlmacenada) || 0,
      fechaDeVencimiento: record.fechaDeVencimiento
        ? dayjs(record.fechaDeVencimiento)
        : null,
      gabinete: record.gabinete || "",
      codigo: record.codigo || "",
      hDes: record.hDes || "",
    });
    setShowPopup(true);
  };

  const handleSave = async (values) => {
    const reactiveData = {
      nombre: values.nombre || "",      docenteId: values.docenteId || "",
      lugarId: values.lugarId || "",
      // nuevas columnas
      marca: values.marca || "",
      clase: values.clase || "",
      cantidadAlmacenada:
        typeof values.cantidadAlmacenada === "number"
          ? values.cantidadAlmacenada
          : Number(values.cantidadAlmacenada) || 0,
      fechaDeVencimiento: values.fechaDeVencimiento
        ? values.fechaDeVencimiento.format("YYYY-MM-DD")
        : "",
      gabinete: values.gabinete || "",
      codigo: values.codigo || "",
      hDes: values.hDes || "",
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
    { title: "Marca", dataIndex: "marca", key: "marca" },
    { title: "Clase", dataIndex: "clase", key: "clase" },
    {
      title: "Cantidad almacenada",
      dataIndex: "cantidadAlmacenada",
      key: "cantidadAlmacenada",
      render: (val) => (val ?? "")
    },
    {
      title: "Fecha de vencimiento",
      dataIndex: "fechaDeVencimiento",
      key: "fechaDeVencimiento",
      render: (val) => (val ? dayjs(val).format("YYYY-MM-DD") : "")
    },
    {
      title: "Docente encargado",
      dataIndex: "docenteId",
      key: "docente",
      render: (id) => {
        const prof = professors.find((p) => p.id === id);
        return prof
          ? `${prof.firstName} ${prof.lastName}`
          : "Sin docente encargado";
      },
    },
    {
      title: "Lugar",
      dataIndex: "lugarId",
      key: "lugar",
      render: (id) => {
        const loc = locations.find((l) => l.id === id);
        return loc ? loc.name : "Sin especificar";
      },
    },
    { title: "Gabinete", dataIndex: "gabinete", key: "gabinete" },
    { title: "Código", dataIndex: "codigo", key: "codigo" },
    {
      title: "HdeS",
      dataIndex: "hDes",
      key: "hDes",
      render: (url) =>
        url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" title="Abrir HdeS">
            <FilePdfOutlined style={{ fontSize: 18 }} />
          </a>
        ) : null,
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
          padding: "0 30px 16px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#fff",
            padding: "8px 12px",
            borderRadius: 999,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.06)",
            width: "100%",
            maxWidth: 600,
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Buscar reactivo, ubicación o profesor..."
            style={{
              border: "none",
              outline: "none",
              flex: 1,
              fontSize: 14,
              padding: "6px 8px",
            }}
          />

          {locationFilter && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#eee",
                borderRadius: 16,
                padding: "2px 6px",
                fontSize: 13,
                marginRight: 4,
                gap: 4,
              }}
            >
              {locations.find((l) => l.id === locationFilter)?.name ||
                "Ubicación"}
              <CloseCircleOutlined
                onClick={clearLocationFilter}
                style={{ cursor: "pointer", fontSize: 12 }}
              />
            </div>
          )}

          <button onClick={handleSearch} className="search-btn">
            Buscar
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
          padding: "0 30px",
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
        dataSource={filteredData}
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
              maxWidth: 700,
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

              {/* --- NUEVAS COLUMNAS / CAMPOS --- */}
              <Form.Item label="Marca" name="marca">
                <Input placeholder="Marca del reactivo" />
              </Form.Item>

              <Form.Item label="Clase" name="clase">
                <Input placeholder="Clase" />
              </Form.Item>

              <Form.Item label="Cantidad almacenada" name="cantidadAlmacenada">
                <InputNumber min={0} style={{ width: "100%" }} placeholder="0" />
              </Form.Item>

              <Form.Item label="Fecha de vencimiento" name="fechaDeVencimiento">
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>

              <Form.Item label="Gabinete" name="gabinete">
                <Input placeholder="Gabinete" />
              </Form.Item>

              <Form.Item label="Código" name="codigo">
                <Input placeholder="Código" />
              </Form.Item>

              <Form.Item label="HdeS" name="hDes">
                <Input placeholder="Hoja de seguridad / HdeS" />
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
