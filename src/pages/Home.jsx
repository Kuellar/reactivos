import React, { useEffect, useState } from "react";
import ButtonCard from "../components/ButtonCard";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import imgPlaceholder from "../assets/images/image-placeholder.png";
import { onAuthStateChanged } from "firebase/auth";
import { Modal, message, Skeleton, Space, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

export default function Home() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [editLocation, setEditLocation] = useState(null);
  const [query, setQuery] = useState("");
  const [user, setUser] = useState(null);
  const [deleteLocation, setDeleteLocation] = useState(null);
  const [showPopupDelete, setShowPopupDelete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubSnapshot = null;
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (unsubSnapshot) return;

      try {
        unsubSnapshot = onSnapshot(
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
      } catch (err) {
        console.error("Error starting onSnapshot:", err);
        setLoading(false);
      }
    });

    return () => {
      if (unsubSnapshot) unsubSnapshot();
      unsubAuth();
    };
  }, []);

  const handleSave = async () => {
    try {
      if (!newLocationName.trim()) return;

      if (editLocation) {
        const ref = doc(db, "locations", editLocation.id);
        await updateDoc(ref, {
          name: newLocationName,
          img: editLocation.img ?? "",
        });
      } else {
        await addDoc(collection(db, "locations"), {
          name: newLocationName,
          img: "",
        });
      }

      setShowPopup(false);
      setNewLocationName("");
      setEditLocation(null);
    } catch (error) {
      console.error("Error saving location:", error);
      message.error("Error al guardar la sala");
    }
  };

  const openDelete = (loc) => {
    setDeleteLocation(loc); // guardamos la ubicación a borrar
    setShowPopupDelete(true); // mostramos el popup
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
      setShowPopupDelete(false);
    }
  };

  const handleSearch = () => {
    const q = (query || "").trim();
    navigate(`/table?query=${encodeURIComponent(q)}`);
  };

  const skeletons = Array.from({ length: 3 }).map((_, idx) => (
    <div
      key={idx}
      style={{
        opacity: 0,
        animation: `fadeDown 0.6s forwards`,
        animationDelay: `${idx * 0.2}s`,
        position: "relative",
      }}
    >
      <div className="home-card">
        <Skeleton.Image
          active
          style={{
            maxWidth: "200px",
            width: "180px",
            height: "120px",
            objectFit: "contain",
          }}
        />
        <div style={{ padding: 12 }}>
          <Skeleton.Input
            active
            size="small"
            style={{ width: "60%", height: 16, borderRadius: 4 }}
          />
        </div>
      </div>
    </div>
  ));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {user && (
        <div
          style={{
            padding: "16px 30px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => {
              setEditLocation(null);
              setNewLocationName("");
              setShowPopup(true);
            }}
          >
            Agregar sala
          </button>

          <button
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              backgroundColor: "var(--color-secondary)",
              color: "#111",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            onClick={() => navigate(`/professors`)}
          >
            Ver docentes
          </button>
        </div>
      )}
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
          <button onClick={handleSearch} className="search-btn">
            Buscar
          </button>
        </div>
      </div>
      <div
        className="home-grid"
        style={{
          padding: "0 30px 30px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 20,
        }}
      >
        {loading
          ? skeletons
          : locations.map((loc) => (
              <div key={loc.id} style={{ position: "relative" }}>
                <ButtonCard
                  title={loc.name ?? "Sin título"}
                  img={loc.img || imgPlaceholder}
                  onClick={() => navigate(`/table?location=${loc.id}`)}
                />
                {user && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      display: "flex",
                      gap: 6,
                    }}
                  >
                    <Tooltip title="Editar">
                      <button
                        onClick={() => {
                          setEditLocation(loc);
                          setNewLocationName(loc.name ?? "");
                          setShowPopup(true);
                        }}
                        style={{
                          background: "rgba(245, 245, 245, 0.9)",
                          borderRadius: "50%",
                          border: "none",
                          cursor: "pointer",
                          padding: 6,
                        }}
                      >
                        <EditOutlined />
                      </button>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <button
                        onClick={() => openDelete(loc)}
                        style={{
                          background: "rgba(245, 245, 245, 0.9)",
                          borderRadius: "50%",
                          border: "none",
                          cursor: "pointer",
                          padding: 6,
                        }}
                      >
                        <DeleteOutlined style={{ color: "red" }} />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            ))}
      </div>
      {showPopupDelete && (
        <Modal
          open={showPopupDelete}
          title="Confirmar eliminación"
          onOk={handleDelete}
          onCancel={() => {
            setShowPopupDelete(false);
            setDeleteLocation(null);
          }}
          okText="Eliminar"
          okType="danger"
          cancelText="Cancelar"
        >
          <p>
            ¿Estás seguro de que deseas eliminar la sala "{deleteLocation?.name}
            "? Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}
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
          }}
          onClick={() => setShowPopup(false)}
        >
          <div
            style={{
              background: "white",
              padding: 20,
              borderRadius: 8,
              minWidth: 300,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{editLocation ? "Editar sala" : "Nueva sala"}</h3>
            <input
              type="text"
              placeholder="Nombre"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              style={{
                width: "100%",
                marginBottom: 12,
                padding: 8,
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                style={{
                  marginRight: 8,
                  padding: "6px 12px",
                  background: "#ccc",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
                onClick={() => {
                  setShowPopup(false);
                  setEditLocation(null);
                }}
              >
                Cancelar
              </button>
              <button
                style={{
                  padding: "6px 12px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
                onClick={handleSave}
              >
                {editLocation ? "Guardar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeDown {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
