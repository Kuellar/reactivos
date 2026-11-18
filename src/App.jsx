import React from "react";
import { Layout } from "antd";
import HeaderBar from "./components/HeaderBar";
import AccountBanner from "./components/AccountBanner";
import AppRouter from "./routes/AppRouter";
const { Content } = Layout;
export default function App() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <HeaderBar />
      <Content style={{ padding: 16, height: "calc(100vh - 94px)" }}>
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
          <AccountBanner />
          <div style={{ flex: 1, minHeight: 0 }}>
            <AppRouter />
          </div>
        </div>
      </Content>
    </Layout>
  );
}
