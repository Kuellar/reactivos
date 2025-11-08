import React, { useEffect, useState } from "react";
import ButtonCard from "../components/ButtonCard";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import imgPlaceholder from "../assets/images/image-placeholder.png";
import { getAuth } from "firebase/auth";

export default function Home() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [editLocation, setEditLocation] = useState(null);
  const [query, setQuery] = useState("");
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "locations"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLocations(data);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    try {
      if (!newLocationName.trim()) return;

      if (editLocation) {
        const ref = doc(db, "locations", editLocation.id);
        await updateDoc(ref, {
          name: newLocationName,
          img: editLocation.img || "",
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
    }
  };

  const handleSearch = () => {
    const q = (query || "").trim();
    if (!q) return;
    navigate(`/table?query=${encodeURIComponent(q)}`);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 30px",
          gap: 12,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}
        >
          <h2 style={{ margin: 0, minWidth: 160 }}></h2>

          <div style={{ flex: 1 }}>
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
              <button
                onClick={handleSearch}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  backgroundColor: "var(--color-secondary)",
                  color: "#111",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Buscar
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user && (
            <>
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
                Ver profesores
              </button>
            </>
          )}
        </div>
      </div>

      <div className="home-grid" style={{ padding: "0 30px 30px" }}>
        {locations.map((loc) => (
          <div key={loc.id} style={{ position: "relative" }}>
            <ButtonCard
              title={loc.name ?? "Sin título"}
              img={loc.img || imgPlaceholder}
              onClick={() => navigate(`/table?location=${loc.id}`)}
            />
            {user && (
              <button
                onClick={() => {
                  setEditLocation(loc);
                  setNewLocationName(loc.name ?? "");
                  setShowPopup(true);
                }}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  background: "rgba(255,255,255,0.8)",
                  borderRadius: "50%",
                  border: "none",
                  cursor: "pointer",
                  padding: 6,
                }}
                title="Editar"
              >
                ✏️
              </button>
            )}
          </div>
        ))}
      </div>

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
    </div>
  );
}
