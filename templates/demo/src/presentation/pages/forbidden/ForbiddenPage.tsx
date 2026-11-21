import { Link } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { Button, Text } from "../../components/base";

export function ForbiddenPage() {
  const { session, logout } = useAuth();

  return (
    <div className="page">
      <header>
        <Text as="h1">无权限</Text>
        <Text className="muted">
          {session ? `${session.displayName} 没有访问该页面的权限` : "需要登录后访问"}
        </Text>
      </header>
      <Text>
        <Link to="/orders/order-1">返回订单</Link>
        {" · "}
        <Button onClick={logout}>退出登录</Button>
      </Text>
    </div>
  );
}
