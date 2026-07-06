"use client";

import {
  DashboardOutlined,
  SettingOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Card, Col, Layout, Menu, Row, Statistic, Typography } from "antd";

const { Sider, Content, Header } = Layout;

const menuItems = [
  { key: "dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
  { key: "users", icon: <TeamOutlined />, label: "Người dùng" },
  { key: "settings", icon: <SettingOutlined />, label: "Cài đặt" },
];

export default function AdminDashboard() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider breakpoint="lg" collapsedWidth={0}>
        <div
          style={{
            color: "#fff",
            padding: 16,
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          Vitasoft Admin
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={["dashboard"]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header style={{ background: "#fff", paddingInline: 24 }}>
          <Typography.Title level={4} style={{ margin: 0, lineHeight: "64px" }}>
            Dashboard
          </Typography.Title>
        </Header>
        <Content style={{ padding: 24 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic title="Sản phẩm đang chạy" value={1} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic title="Người dùng" value={0} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic title="API requests (24h)" value={0} />
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
    </Layout>
  );
}
