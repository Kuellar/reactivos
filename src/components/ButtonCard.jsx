import React from "react";
import { Button } from "antd";
import { EditOutlined } from "@ant-design/icons";

export default function ButtonCard({ title, img, onClick, onEdit }) {
  return (
    <div
      className="home-card"
      onClick={onClick}
      role="button"
      style={{ position: "relative" }}
    >
      <img src={img} alt={title} />
      <div style={{ fontWeight: 600 }}>{title}</div>
      {onEdit && (
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          style={{
            position: "absolute",
            right: 8,
            bottom: 8,
            background: "rgba(255,255,255,0.9)",
            borderRadius: 8,
            padding: "4px 6px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
          }}
        />
      )}
    </div>
  );
}
