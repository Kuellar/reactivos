import React from "react";
import { Button } from "antd";
import { CloseOutlined } from "@ant-design/icons";

// Top-right "X" for the hand-built modal overlays, styled like antd Modal's.
// The parent box must have `position: relative`.
export default function ModalCloseButton({ onClick }) {
  return (
    <Button
      type="text"
      size="small"
      aria-label="Cerrar"
      icon={<CloseOutlined />}
      onClick={onClick}
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        color: "rgba(0, 0, 0, 0.45)",
      }}
    />
  );
}
