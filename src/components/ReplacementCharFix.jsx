import React, { useMemo, useState } from "react";
import { Alert, Button, Modal, message } from "antd";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

// Repairs reactivos whose text contains "�" (U+FFFD). Those come from older CSV
// imports that read a Windows-1252 file as UTF-8; the original character is lost.
// Most were prime marks (2′,7′-…), so every "�" is replaced with "′".
// Renders nothing when no reactivo is affected. The parent must gate it with
// can("reactives.write").

const BAD = "\uFFFD";
const PRIME = "\u2032";
const BATCH_LIMIT = 450; // Firestore allows 500 writes per batch

const findChanges = (items) =>
  items
    .map((item) => {
      const fields = Object.entries(item).filter(
        ([key, value]) =>
          key !== "id" && typeof value === "string" && value.includes(BAD)
      );
      return fields.length
        ? {
            id: item.id,
            fields: fields.map(([key, before]) => ({
              key,
              before,
              after: before.replaceAll(BAD, PRIME),
            })),
          }
        : null;
    })
    .filter(Boolean);

export default function ReplacementCharFix({ items, onFixed }) {
  const changes = useMemo(() => findChanges(items), [items]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!changes.length) return null;

  const apply = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < changes.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        changes.slice(i, i + BATCH_LIMIT).forEach(({ id, fields }) => {
          batch.update(
            doc(db, "reactives", id),
            Object.fromEntries(fields.map((f) => [f.key, f.after]))
          );
        });
        await batch.commit();
      }
      message.success(
        `${changes.length} reactivo${changes.length === 1 ? "" : "s"} corregido${changes.length === 1 ? "" : "s"}`
      );
      setOpen(false);
      onFixed?.();
    } catch (err) {
      console.error("Error corrigiendo caracteres:", err);
      message.error("No se pudieron guardar las correcciones");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Alert
        type="warning"
        showIcon
        style={{ margin: "0 30px 16px" }}
        message={`${changes.length} reactivo${changes.length === 1 ? " tiene" : "s tienen"} caracteres dañados (${BAD}) por una importación antigua.`}
        action={
          <Button size="small" onClick={() => setOpen(true)}>
            Revisar y corregir
          </Button>
        }
      />
      <Modal
        open={open}
        title={`Reemplazar "${BAD}" por "${PRIME}"`}
        onOk={apply}
        onCancel={() => setOpen(false)}
        okText={`Corregir ${changes.length}`}
        cancelText="Cancelar"
        confirmLoading={saving}
        maskClosable={false}
        width="min(90vw, 720px)"
      >
        <p style={{ marginTop: 0, color: "#6b7280" }}>
          Se guardarán estos cambios:
        </p>
        <div style={{ maxHeight: "55vh", overflowY: "auto", display: "grid", gap: 8 }}>
          {changes.flatMap(({ id, fields }) =>
            fields.map((f) => (
              <div
                key={`${id}-${f.key}`}
                style={{
                  padding: "8px 12px",
                  background: "#f7f8fa",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                {f.key !== "nombre" && (
                  <div style={{ color: "#6b7280", fontSize: 11 }}>{f.key}</div>
                )}
                <div style={{ color: "#9ca3af", textDecoration: "line-through" }}>
                  {f.before}
                </div>
                <div style={{ fontWeight: 600 }}>{f.after}</div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </>
  );
}
