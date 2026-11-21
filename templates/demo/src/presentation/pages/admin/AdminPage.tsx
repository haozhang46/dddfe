import { Link } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { Button, Text } from "../../components/base";

export function AdminPage() {
  const { session, logout } = useAuth();

  return (
    <div className="page">
      <header>
        <Text as="h1">Admin panel</Text>
        <Text className="muted">需要权限 admin:panel · 当前用户 {session?.displayName}</Text>
      </header>
      <Text>
        <Link to="/orders/order-1">订单表单</Link>
        {" · "}
        <Button onClick={logout}>退出登录</Button>
      </Text>
    </div>
  );
}
