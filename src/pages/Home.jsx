import React, { useEffect, useMemo, useState } from "react";
import ButtonCard from "../components/ButtonCard";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  query as fsQuery,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../firebase";
import labPlaceholder from "../assets/images/lab-placeholder.svg";
import bodegaPlaceholder from "../assets/images/bodega-placeholder.svg";
import cytometerPlaceholder from "../assets/images/cytometer-placeholder.svg";
import { useAuth } from "../context/AuthContext";
import { Button, Empty, Form, Input, Modal, message, Skeleton, Tooltip } from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import "../styles/Home.css";

const isHttpUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

// Checks (debounced) whether `url` actually loads as an image.
// Returns "empty" | "invalid" | "loading" | "ok" | "error".
function useImageStatus(url) {
  const [status, setStatus] = useState("empty");

  useEffect(() => {
    const value = url.trim();
    if (!value) {
      setStatus("empty");
      return;
    }
    if (!isHttpUrl(value)) {
      setStatus("invalid");
      return;
    }
    setStatus("loading");
    let active = true;
    const timer = setTimeout(() => {
      const img = new Image();
      img.onload = () => active && setStatus("ok");
      img.onerror = () => active && setStatus("error");
      img.src = value;
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [url]);

  return status;
}

const IMAGE_HELP = {
  empty: "Opcional. Si la dejas vacía se usa la ilustración por defecto.",
  invalid: "Ingresa una URL que empiece con http:// o https://",
  loading: "Comprobando imagen…",
  ok: "Imagen cargada correctamente.",
  error:
    "No se pudo cargar una imagen desde esa URL; se mostrará la ilustración por defecto. Usa un enlace directo a la imagen (.jpg, .png, …).",
};

const IMAGE_STATUS = {
  invalid: "error",
  loading: "validating",
  ok: "success",
  error: "warning",
};

const normalizeName = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

// Default image when a sala has no (working) image URL, chosen by name
// (case/accents ignored). Anything not listed gets the biochemistry lab.
const ROOM_PLACEHOLDERS = [
  { match: /^bodega\b/, src: bodegaPlaceholder },
  { match: /^243\b/, src: cytometerPlaceholder }, // sala con citómetro de flujo
];
const placeholderFor = (name) => {
  const n = normalizeName(name);
  return ROOM_PLACEHOLDERS.find((r) => r.match.test(n))?.src ?? labPlaceholder;
};

const byName = (a, b) =>
  (a.name ?? "").localeCompare(b.name ?? "", "es", {
    numeric: true,
    sensitivity: "base",
  });

const reactivosLabel = (n) => `${n} reactivo${n === 1 ? "" : "s"}`;

export default function Home() {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const canEditLocations = can("locations.write");

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({});
  const [query, setQuery] = useState("");

  // add / edit modal
  const [showPopup, setShowPopup] = useState(false);
  const [editLocation, setEditLocation] = useState(null);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationImg, setNewLocationImg] = useState("");
  const [saving, setSaving] = useState(false);
  const imgStatus = useImageStatus(newLocationImg);

  // delete modal
  const [deleteLocation, setDeleteLocation] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "locations"),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLocations(data);
        setLoading(false);
      },
      (err) => {
        console.error("onSnapshot error locations:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const sortedLocations = useMemo(() => [...locations].sort(byName), [locations]);

  // Reactive count per room (aggregate queries: cheap, no documents downloaded).
  const locationIds = useMemo(
    () => locations.map((l) => l.id).sort().join(","),
    [locations]
  );
  useEffect(() => {
    if (!locationIds) return;
    let cancelled = false;
    Promise.all(
      locationIds.split(",").map(async (id) => {
        try {
          const snap = await getCountFromServer(
            fsQuery(collection(db, "reactives"), where("lugarId", "==", id))
          );
          return [id, snap.data().count];
        } catch (err) {
          console.warn("No se pudo contar reactivos de la sala", id, err);
          return [id, null];
        }
      })
    ).then((entries) => {
      if (!cancelled) setCounts(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [locationIds]);

  const openCreate = () => {
    setEditLocation(null);
    setNewLocationName("");
    setNewLocationImg("");
    setShowPopup(true);
  };

  const openEdit = (loc) => {
    setEditLocation(loc);
    setNewLocationName(loc.name ?? "");
    setNewLocationImg(loc.img ?? "");
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    setEditLocation(null);
  };

  const handleSave = async () => {
    const name = newLocationName.trim();
    const img = newLocationImg.trim();
    if (!name) {
      message.warning("Ingresa un nombre para la sala");
      return;
    }
    if (img && !isHttpUrl(img)) {
      message.error("La URL de la imagen debe empezar con http:// o https://");
      return;
    }

    setSaving(true);
    try {
      if (editLocation) {
        await updateDoc(doc(db, "locations", editLocation.id), { name, img });
        message.success("Sala actualizada");
      } else {
        await addDoc(collection(db, "locations"), { name, img });
        message.success("Sala creada");
      }
      closePopup();
    } catch (error) {
      console.error("Error saving location:", error);
      message.error("Error al guardar la sala");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteLocation) return;
    try {
      await deleteDoc(doc(db, "locations", deleteLocation.id));
      message.success(`Sala "${deleteLocation.name}" eliminada`);
    } catch (err) {
      console.error(err);
      message.error("Error al eliminar la sala");
    } finally {
      setDeleteLocation(null);
    }
  };

  const handleSearch = () => {
    const q = (query || "").trim();
    navigate(`/table?query=${encodeURIComponent(q)}`);
  };

  const previewSrc =
    imgStatus === "ok" ? newLocationImg.trim() : placeholderFor(newLocationName);

  return (
    <div className="home">
      <section className="home-hero">
        <h1>Inventario de reactivos</h1>
        <p>Busca un reactivo o entra a una sala para ver lo que tiene guardado.</p>
        <div className="home-search">
          <SearchOutlined />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Buscar reactivo, ubicación o profesor..."
            aria-label="Buscar reactivo"
          />
          <button onClick={handleSearch} className="search-btn">
            Buscar
          </button>
        </div>
      </section>

      <div className="home-section-head">
        <h2 className="home-section-title">
          Salas
          {!loading && (
            <span className="home-section-count">{locations.length}</span>
          )}
        </h2>
        <div className="home-section-actions">
          <Button
            type="link"
            size="small"
            onClick={() => navigate("/table")}
            style={{ paddingInline: 4, color: "var(--color-primary)", fontWeight: 500 }}
          >
            Ver todos los reactivos <ArrowRightOutlined />
          </Button>
          {user && (
            <Button icon={<TeamOutlined />} onClick={() => navigate("/professors")}>
              Ver docentes
            </Button>
          )}
          {canEditLocations && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Agregar sala
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="room-grid">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="room-skeleton">
              <Skeleton.Image active />
              <div style={{ padding: "12px 14px" }}>
                <Skeleton active title={{ width: "55%" }} paragraph={{ rows: 1, width: "30%" }} />
              </div>
            </div>
          ))}
        </div>
      ) : sortedLocations.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Aún no hay salas registradas"
          style={{ padding: "32px 0" }}
        />
      ) : (
        <div className="room-grid">
          {sortedLocations.map((loc, idx) => (
            <div
              key={loc.id}
              className="room-item"
              style={{ animationDelay: `${Math.min(idx, 12) * 40}ms` }}
            >
              <ButtonCard
                title={loc.name || "Sin título"}
                meta={
                  typeof counts[loc.id] === "number"
                    ? reactivosLabel(counts[loc.id])
                    : ""
                }
                img={loc.img}
                fallback={placeholderFor(loc.name)}
                onClick={() => navigate(`/table?location=${loc.id}`)}
              />
              {canEditLocations && (
                <div className="room-actions">
                  <Tooltip title="Editar">
                    <button
                      type="button"
                      className="room-action"
                      aria-label={`Editar ${loc.name ?? "sala"}`}
                      onClick={() => openEdit(loc)}
                    >
                      <EditOutlined />
                    </button>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <button
                      type="button"
                      className="room-action danger"
                      aria-label={`Eliminar ${loc.name ?? "sala"}`}
                      onClick={() => setDeleteLocation(loc)}
                    >
                      <DeleteOutlined />
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(deleteLocation)}
        title="Confirmar eliminación"
        onOk={handleDelete}
        onCancel={() => setDeleteLocation(null)}
        maskClosable={false}
        okText="Eliminar"
        okType="danger"
        cancelText="Cancelar"
      >
        <p>
          ¿Estás seguro de que deseas eliminar la sala "{deleteLocation?.name}"?
          Esta acción no se puede deshacer.
        </p>
      </Modal>

      {showPopup && (
        <Modal
          open
          title={editLocation ? "Editar sala" : "Nueva sala"}
          onOk={handleSave}
          onCancel={closePopup}
          okText={editLocation ? "Guardar" : "Crear"}
          cancelText="Cancelar"
          confirmLoading={saving}
          okButtonProps={{ disabled: imgStatus === "invalid" }}
          maskClosable={false}
          width={460}
        >
          <div className="room-preview">
            <img src={previewSrc} alt="" />
            {imgStatus !== "ok" && (
              <span className="room-preview__tag">Ilustración por defecto</span>
            )}
          </div>
          <Form layout="vertical" requiredMark={false} component="div">
            <Form.Item label="Nombre" required style={{ marginBottom: 12 }}>
              <Input
                autoFocus
                placeholder="Ej: Laboratorio 2"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                onPressEnter={handleSave}
              />
            </Form.Item>
            <Form.Item
              label="URL de imagen"
              hasFeedback={imgStatus !== "empty"}
              validateStatus={IMAGE_STATUS[imgStatus]}
              extra={IMAGE_HELP[imgStatus]}
              style={{ marginBottom: 0 }}
            >
              <Input
                placeholder="https://…/foto-sala.jpg"
                value={newLocationImg}
                onChange={(e) => setNewLocationImg(e.target.value)}
                onPressEnter={handleSave}
                allowClear
              />
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
}
