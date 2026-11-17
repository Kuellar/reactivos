import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import App from "./App";
import { antdTheme } from "./theme";
import "antd/dist/reset.css";
import "./styles/index.css";
import "./styles/HeaderBar.css";

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ConfigProvider theme={antdTheme}>
      <HashRouter>
        <App />
      </HashRouter>
    </ConfigProvider>
  </React.StrictMode>
);
