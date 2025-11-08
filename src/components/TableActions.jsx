import React from "react";
import { Space, Tooltip } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

export default function TableActions({ onEdit, onDelete }) {
  return (
    <Space size="middle">
      <Tooltip title="Editar">
        <EditOutlined
          style={{ color: "#1677ff", cursor: "pointer" }}
          onClick={onEdit}
        />
      </Tooltip>
      <Tooltip title="Eliminar">
        <DeleteOutlined
          style={{ color: "red", cursor: "pointer" }}
          onClick={onDelete}
        />
      </Tooltip>
    </Space>
  );
}
