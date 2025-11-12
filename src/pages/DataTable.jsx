import React, { useEffect, useState, useMemo } from "react";
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
  Collapse,
  Grid,
  Space,
} from "antd";
import {
  PlusOutlined,
  CloseCircleOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import dayjs from "dayjs";
import { db } from "../firebase";
import TableActions from "../components/TableActions";
import { getAuth } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";

const { Panel } = Collapse;
const MD = 768;
const M = 1200;

export default function DataTable() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [editReactive, setEditReactive] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPopupDelete, setShowPopupDelete] = useState(false);
  const [deleteReactive, setDeleteReactive] = useState(null);

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchCsvText, setBatchCsvText] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);

  const [professors, setProfessors] = useState([]);
  const [locations, setLocations] = useState([]);

  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState(null);
  const [form] = Form.useForm();

  const auth = getAuth();
  const user = auth.currentUser;

  const location = useLocation();
  const navigate = useNavigate();

  const [expandedRowKeys, setExpandedRowKeys] = useState([]);

  const screens = Grid.useBreakpoint();
  const isCompact = !screens?.md;

  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );
  const isSmall = width < MD;
  const isM = width >= MD && width < M;
  const expansionAllowed = width < M;

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const normStr = (s) => (s ?? "").toString().trim().toLowerCase();
  const stripDiacritics = (s) =>
    (s ?? "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const normalizeForSearch = (s) => stripDiacritics(normStr(s));

  const naturalCompare = (a, b) =>
    stripDiacritics(a)
      .toString()
      .localeCompare(stripDiacritics(b).toString(), undefined, {
        numeric: true,
        sensitivity: "base",
      });

  const getProfessorName = (id) => {
    const p = professors.find((x) => x.id === id);
    return p ? `${p.firstName} ${p.lastName}` : "";
  };
  const getLocationName = (id) => {
    const l = locations.find((x) => x.id === id);
    return l ? l.name : "";
  };

  const ALLOWED_UNITS = ["L", "mL", "g", "Kg"];

  const parseQuantity = (raw) => {
    if (!raw) return { valor: null, unidad: "" };
    const txt = String(raw).trim();
    const replaced = txt.replace(",", ".");
    const match = replaced.match(/^(-?\d+(\.\d+)?)\s*([a-zA-Z]+)?$/);
    if (!match) return { valor: null, unidad: "" };
    const valor = Number(match[1]);
    let unidad = (match[3] || "").toLowerCase();

    if (unidad === "l") unidad = "L";
    else if (unidad === "ml") unidad = "mL";
    else if (unidad === "kg") unidad = "Kg";
    else if (unidad === "g") unidad = "g";
    else unidad = "";

    return {
      valor: isNaN(valor) ? null : valor,
      unidad: ALLOWED_UNITS.includes(unidad) ? unidad : "",
    };
  };

  const formatQuantity = (record) => {
    if (record?.cantidadValor != null && record?.cantidadUnidad) {
      const v = Math.round(record.cantidadValor * 1000000) / 1000000; // avoid floating garbage
      return `${v} ${record.cantidadUnidad}`;
    }
    if (
      record?.cantidadAlmacenada != null &&
      record?.cantidadAlmacenada !== ""
    ) {
      return String(record.cantidadAlmacenada);
    }
    return "";
  };

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

  useEffect(() => {
    applyFilters(data, query, locationFilter);
  }, [query, locationFilter, data]);

  const applyFilters = (items, textQuery, locFilter) => {
    let filtered = items;
    if (textQuery) {
      const normalizedQuery = normalizeForSearch(textQuery);
      filtered = filtered.filter((r) => {
        const profName = getProfessorName(r.docenteId);
        const locName = getLocationName(r.lugarId);

        const fields = [
          r.nombre,
          r.marca,
          r.clase,
          r.gabinete,
          r.codigo,
          r.hDes,
          profName,
          locName,
          formatQuantity(r),
        ];

        return fields.some((f) =>
          normalizeForSearch(f).includes(normalizedQuery)
        );
      });
    }
    if (locFilter) {
      filtered = filtered.filter((r) => r.lugarId === locFilter);
    }
    setFilteredData(filtered);
  };

  const normalize = (s = "") => String(s).trim();

  const toNumber = (v) => {
    if (v === undefined || v === null || v === "") return 0;
    const n = Number(String(v).replace(/,/g, "."));
    return isNaN(n) ? 0 : n;
  };

  const findProfessorId = (value) => {
    if (!value) return "";
    const byId = professors.find((p) => p.id === value);
    if (byId) return byId.id;
    const v = value.toLowerCase();
    const byName = professors.find(
      (p) => `${p.firstName} ${p.lastName}`.toLowerCase() === v
    );
    return byName ? byName.id : "";
  };

  const findLocationId = (value) => {
    if (!value) return "";
    const byId = locations.find((l) => l.id === value);
    if (byId) return byId.id;
    const v = value.toLowerCase();
    const byName = locations.find((l) => l.name.toLowerCase() === v);
    return byName ? byName.id : "";
  };

  const parseCsvFlexible = (text, customDelim) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (!lines.length) return [];

    const sample = lines[0];
    const delim =
      customDelim ||
      (sample.includes(";") && !sample.includes(",") ? ";" : ",");

    const parseLine = (line) => {
      const cells = [];
      let cur = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const ch = line[i];

        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === delim && !inQuotes) {
          cells.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }

      cells.push(cur);
      return cells;
    };

    const unquote = (s) => {
      if (s == null) return "";
      let v = s.trim();
      if (v.startsWith('"') && v.endsWith('"')) {
        v = v.slice(1, -1);
      }
      return v.replace(/""/g, '"');
    };

    const headers = parseLine(lines[0]).map((h) =>
      normalize(unquote(h)).toLowerCase()
    );

    return lines.slice(1).map((line) => {
      const cells = parseLine(line);
      const row = {};
      headers.forEach((h, idx) => {
        const raw = cells[idx];
        row[h] = raw !== undefined ? unquote(raw) : "";
      });
      return row;
    });
  };

  const handleOpenBatch = () => {
    setBatchCsvText("");
    setShowBatchModal(true);
  };

  const handleBatchFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || "");
      setBatchCsvText(content);
    };
    reader.readAsText(file);
  };

  const handleImportBatch = async () => {
    if (!batchCsvText.trim()) {
      console.error("Carga un CSV o pega su contenido");
      return;
    }
    try {
      setBatchLoading(true);
      const rows = parseCsvFlexible(batchCsvText);
      if (!rows.length) {
        console.error("El CSV no tiene filas");
        return;
      }

      const mapValue = (row, keys) => {
        for (const k of keys) {
          const v = row[k];
          if (v !== undefined) return normalize(v);
        }
        return "";
      };

      const batch = writeBatch(db);
      let count = 0;
      rows.forEach((r) => {
        const nombre = mapValue(r, ["nombre"]);
        if (!nombre) return;

        const docenteRaw = mapValue(r, [
          "docente",
          "docenteid",
          "docente_id",
          "profesor",
          "profesorid",
        ]);
        const lugarRaw = mapValue(r, [
          "lugar",
          "lugarid",
          "lugar_id",
          "ubicacion",
          "ubicación",
        ]);

        let cantidadValor = null;
        let cantidadUnidad = "";

        const cantidadValorRaw = mapValue(r, [
          "cantidadvalor",
          "cantidad_valor",
        ]);
        const cantidadUnidadRaw = mapValue(r, [
          "cantidadunidad",
          "cantidad_unidad",
        ]);
        const cantidadAlmacenadaRaw = mapValue(r, [
          "cantidadalmacenada",
          "cantidad",
          "stock",
        ]);

        if (cantidadValorRaw || cantidadUnidadRaw) {
          const tmp = parseQuantity(
            `${cantidadValorRaw}${
              cantidadUnidadRaw ? " " + cantidadUnidadRaw : ""
            }`
          );
          cantidadValor = tmp.valor;
          cantidadUnidad = tmp.unidad;
        } else if (cantidadAlmacenadaRaw) {
          const tmp = parseQuantity(cantidadAlmacenadaRaw);
          cantidadValor = tmp.valor;
          cantidadUnidad = tmp.unidad;
        }

        const data = {
          nombre,
          docenteId: findProfessorId(docenteRaw),
          lugarId: findLocationId(lugarRaw),
          marca: mapValue(r, ["marca"]),
          clase: mapValue(r, ["clase", "categoria", "categoría"]),
          cantidadValor: cantidadValor,
          cantidadUnidad: cantidadUnidad,
          cantidadAlmacenada: cantidadAlmacenadaRaw || "",
          fechaDeVencimiento: (() => {
            const fv = mapValue(r, [
              "fechadevencimiento",
              "vencimiento",
              "fecha_vencimiento",
            ]);
            if (!fv) return "";
            const d = dayjs(fv);
            return d.isValid() ? d.format("YYYY-MM-DD") : fv;
          })(),
          gabinete: mapValue(r, ["gabinete"]),
          codigo: mapValue(r, ["codigo", "código"]),
          hDes: mapValue(r, [
            "hdes",
            "hds",
            "hojadeseguridad",
            "linkhdes",
            "urlhdes",
          ]),
        };

        const ref = doc(collection(db, "reactives"));
        batch.set(ref, data);
        count += 1;
      });

      if (!count) {
        console.error("No se encontraron filas válidas para importar");
        return;
      }

      await batch.commit();
      console.error(`Importación completada: ${count} reactivos`);
      setShowBatchModal(false);
      fetchData();
    } catch (e) {
      console.error(e);
      console.error("Error durante la importación");
    } finally {
      setBatchLoading(false);
    }
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
      if (expandedRowKeys.includes(deleteReactive.id)) {
        setExpandedRowKeys([]);
      }
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
    let initialValor = null;
    let initialUnidad = "";

    if (record.cantidadValor != null) {
      initialValor = record.cantidadValor;
      initialUnidad = record.cantidadUnidad || "";
    } else if (record.cantidadAlmacenada) {
      const parsed = parseQuantity(record.cantidadAlmacenada);
      initialValor = parsed.valor;
      initialUnidad = parsed.unidad;
    } else if (record.cantidadAlmacenada === 0) {
      initialValor = 0;
      initialUnidad = "";
    }

    form.setFieldsValue({
      nombre: record.nombre || "",
      docenteId: record.docenteId || "",
      lugarId: record.lugarId || "",
      marca: record.marca || "",
      clase: record.clase || "",
      cantidadValor: initialValor != null ? initialValor : undefined,
      cantidadUnidad: initialUnidad || undefined,
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
    const cantidadValorRaw = values.cantidadValor;
    const cantidadValor =
      typeof cantidadValorRaw === "number"
        ? cantidadValorRaw
        : cantidadValorRaw != null && cantidadValorRaw !== ""
        ? Number(String(cantidadValorRaw).replace(",", "."))
        : null;

    const cantidadUnidad = values.cantidadUnidad || "";

    const reactiveData = {
      nombre: values.nombre || "",
      docenteId: values.docenteId || "",
      lugarId: values.lugarId || "",
      marca: values.marca || "",
      clase: values.clase || "",
      cantidadValor: cantidadValor,
      cantidadUnidad: cantidadUnidad,
      cantidadAlmacenada: "",
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

  const baseColumns = useMemo(
    () => [
      {
        title: "Nombre",
        dataIndex: "nombre",
        key: "nombre",
        sorter: (a, b) => naturalCompare(a.nombre, b.nombre),
      },
      {
        title: "Marca",
        dataIndex: "marca",
        key: "marca",
        sorter: (a, b) => naturalCompare(a.marca, b.marca),
      },
      {
        title: "Clase",
        dataIndex: "clase",
        key: "clase",
        sorter: (a, b) => naturalCompare(a.clase, b.clase),
      },
      {
        title: "Cantidad almacenada",
        key: "cantidad",
        dataIndex: "cantidadAlmacenada",
        render: (_, record) => formatQuantity(record),
      },
      {
        title: "Fecha de vencimiento",
        dataIndex: "fechaDeVencimiento",
        key: "fechaDeVencimiento",
        render: (val) => (val ? dayjs(val).format("YYYY-MM-DD") : ""),
        sorter: (a, b) =>
          (a.fechaDeVencimiento
            ? dayjs(a.fechaDeVencimiento).valueOf()
            : Number.NEGATIVE_INFINITY) -
          (b.fechaDeVencimiento
            ? dayjs(b.fechaDeVencimiento).valueOf()
            : Number.NEGATIVE_INFINITY),
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
        sorter: (a, b) =>
          naturalCompare(
            getProfessorName(a.docenteId),
            getProfessorName(b.docenteId)
          ),
      },
      {
        title: "Lugar",
        dataIndex: "lugarId",
        key: "lugar",
        render: (id) => {
          const loc = locations.find((l) => l.id === id);
          return loc ? loc.name : "Sin especificar";
        },
        sorter: (a, b) =>
          naturalCompare(
            getLocationName(a.lugarId),
            getLocationName(b.lugarId)
          ),
      },
      {
        title: "Gabinete",
        dataIndex: "gabinete",
        key: "gabinete",
        sorter: (a, b) => naturalCompare(a.gabinete, b.gabinete),
      },
      {
        title: "Código",
        dataIndex: "codigo",
        key: "codigo",
        sorter: (a, b) => naturalCompare(a.codigo, b.codigo),
      },
      {
        title: "HdeS",
        dataIndex: "hDes",
        key: "hDes",
        render: (url) =>
          url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir HdeS"
              onClick={(e) => e.stopPropagation()}
            >
              <FilePdfOutlined style={{ fontSize: 18 }} />
            </a>
          ) : null,
      },
    ],
    [professors, locations]
  );

  const columns = useMemo(() => {
    if (isSmall) {
      const compact = baseColumns.filter((c) =>
        ["nombre", "lugarId", "gabinete"].includes(c.dataIndex)
      );
      if (user) {
        compact.push({
          title: "Acciones",
          key: "acciones",
          width: 120,
          render: (_, record) => (
            <div
              className="table-row-actions"
              onClick={(e) => e.stopPropagation()}
            >
              <TableActions
                onEdit={() => handleEdit(record)}
                onDelete={() => openDelete(record)}
              />
            </div>
          ),
        });
      }
      return compact;
    } else if (isM) {
      const mcols = baseColumns.filter((c) =>
        [
          "nombre",
          "marca",
          "cantidadAlmacenada",
          "lugarId",
          "gabinete",
        ].includes(c.dataIndex)
      );
      if (user) {
        mcols.push({
          title: "Acciones",
          key: "acciones",
          width: 120,
          render: (_, record) => (
            <div
              className="table-row-actions"
              onClick={(e) => e.stopPropagation()}
            >
              <TableActions
                onEdit={() => handleEdit(record)}
                onDelete={() => openDelete(record)}
              />
            </div>
          ),
        });
      }
      return mcols;
    } else {
      const full = [...baseColumns];
      if (user) {
        full.push({
          title: "Acciones",
          key: "acciones",
          width: 140,
          render: (_, record) => (
            <div
              className="table-row-actions"
              onClick={(e) => e.stopPropagation()}
            >
              <TableActions
                onEdit={() => handleEdit(record)}
                onDelete={() => openDelete(record)}
              />
            </div>
          ),
        });
      }
      return full;
    }
  }, [isSmall, isM, baseColumns, user]);

  const onRow = (record) => ({
    onClick: (event) => {
      if (!expansionAllowed) return;
      const ignore = !!(
        event.target.closest("button") ||
        event.target.closest("a") ||
        event.target.closest(".table-row-actions")
      );
      if (ignore) return;
      setExpandedRowKeys((prev) => (prev[0] === record.id ? [] : [record.id]));
    },
  });

  const expandedRowRender = (record) => {
    return (
      <Collapse
        activeKey={expandedRowKeys[0] === record.id ? record.id : null}
        bordered={false}
      >
        <Panel header={null} key={record.id}>
          <div style={{ display: "grid", gap: 8 }}>
            <div>
              <strong>Nombre:</strong> {record.nombre}
            </div>
            <div>
              <strong>Lugar:</strong>{" "}
              {getLocationName(record.lugarId) || "Sin especificar"}
            </div>
            <div>
              <strong>Gabinete:</strong> {record.gabinete || ""}
            </div>
            <div>
              <strong>Código:</strong> {record.codigo || ""}
            </div>
            <div>
              <strong>Docente encargado:</strong>{" "}
              {getProfessorName(record.docenteId) || "Sin docente"}
            </div>
            <div>
              <strong>Marca:</strong> {record.marca || ""}
            </div>
            <div>
              <strong>Clase:</strong> {record.clase || ""}
            </div>
            <div>
              <strong>Cantidad almacenada:</strong> {formatQuantity(record)}
            </div>
            <div>
              <strong>Fecha de vencimiento:</strong>{" "}
              {record.fechaDeVencimiento
                ? dayjs(record.fechaDeVencimiento).format("YYYY-MM-DD")
                : ""}
            </div>
            <div>
              <strong>HdeS:</strong>{" "}
              {record.hDes ? (
                <a
                  href={record.hDes}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  Abrir HdeS <FilePdfOutlined />
                </a>
              ) : (
                "—"
              )}
            </div>

            {user && (
              <Space style={{ marginTop: 8 }}>
                <Button
                  onClick={() => {
                    setExpandedRowKeys([]);
                    handleEdit(record);
                  }}
                >
                  Editar
                </Button>
                <Button
                  danger
                  onClick={() => {
                    setExpandedRowKeys([]);
                    openDelete(record);
                  }}
                >
                  Eliminar
                </Button>
              </Space>
            )}
          </div>
        </Panel>
      </Collapse>
    );
  };

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
            marginTop: "5px",
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
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Agregar Reactivo
            </Button>
            <Button onClick={handleOpenBatch}>Agregar tabla</Button>
          </div>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={filteredData}
        loading={loading}
        pagination={{ pageSize: 10 }}
        rowKey={(r) => r.id}
        showSorterTooltip
        onRow={onRow}
        expandable={
          expansionAllowed
            ? {
                expandedRowRender,
                expandedRowKeys,
                onExpand: (expanded, record) => {
                  setExpandedRowKeys(expanded ? [record.id] : []);
                },
                expandIcon: () => null,
              }
            : undefined
        }
        rowClassName={() => (expansionAllowed ? "clickable-row" : "")}
      />

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
              width: "100%",
              maxWidth: 700,
              maxHeight: "90vh",
              overflowY: "auto",
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

              <Form.Item label="Marca" name="marca">
                <Input placeholder="Marca del reactivo" />
              </Form.Item>

              <Form.Item label="Clase" name="clase">
                <Input placeholder="Clase" />
              </Form.Item>

              <Form.Item label="Cantidad almacenada">
                <div style={{ display: "flex", gap: 8 }}>
                  <Form.Item
                    name="cantidadValor"
                    noStyle
                    rules={[
                      () => ({
                        validator(_, value) {
                          if (
                            value === null ||
                            value === undefined ||
                            value === ""
                          ) {
                            return Promise.resolve();
                          }
                          const n = Number(String(value).replace(",", "."));
                          if (!isNaN(n) && n >= 0) return Promise.resolve();
                          return Promise.reject(
                            new Error("Ingresa un valor numérico válido")
                          );
                        },
                      }),
                    ]}
                  >
                    <InputNumber
                      min={0}
                      style={{ width: "100%" }}
                      placeholder="Valor"
                    />
                  </Form.Item>
                  <Form.Item name="cantidadUnidad" noStyle>
                    <Select
                      placeholder="Unidad"
                      style={{ width: 140 }}
                      allowClear
                      options={ALLOWED_UNITS.map((u) => ({
                        value: u,
                        label: u,
                      }))}
                    />
                  </Form.Item>
                </div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                  Unidades permitidas: {ALLOWED_UNITS.join(", ")}
                </div>
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

      {showBatchModal && (
        <Modal
          open={showBatchModal}
          title="Importar reactivos desde CSV (separado por ;)"
          onCancel={() => setShowBatchModal(false)}
          onOk={handleImportBatch}
          okText={batchLoading ? "Importando..." : "Importar"}
          okButtonProps={{ loading: batchLoading }}
          cancelText="Cancelar"
          width="min(90vw, 900px)"
          bodyStyle={{ maxHeight: "70vh", overflowY: "auto" }}
          destroyOnClose={true}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="file"
                accept=".csv"
                onChange={handleBatchFile}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #e6e6e6",
                  background: "#fff",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <p style={{ margin: 0, color: "#666" }}>
              Pega el contenido o carga un archivo .csv con cabeceras como:
              <br />
              <code
                style={{
                  display: "block",
                  marginTop: 8,
                  padding: "8px",
                  background: "#f7f7f7",
                  borderRadius: 6,
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                nombre,docente,lugar,marca,clase,cantidadAlmacenada,fechaDeVencimiento,gabinete,codigo,hDes
              </code>
            </p>

            <Input.TextArea
              rows={8}
              value={batchCsvText}
              onChange={(e) => setBatchCsvText(e.target.value)}
              placeholder={
                "Ejemplos:\n" +
                "nombre,docente,lugar,marca,clase,cantidadValor,cantidadUnidad,fechaDeVencimiento,gabinete,codigo,hDes\n" +
                '"Ácido acético","",204,"Merck","3",1.25,"L","2029-07-31","B","205-3-A-13","https://ejemplo.com/hds.pdf"\n\n'
              }
              style={{
                width: "100%",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
          </div>
        </Modal>
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
