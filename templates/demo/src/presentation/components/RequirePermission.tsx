import { Navigate, Outlet } from "react-router";
import { canAccessRoute, type Permission } from "../../domain/user";
import { useAuth } from "../auth/AuthContext";
import { Text } from "./base";

export function RequirePermission({ permission }: { permission: Permission | Permission[] }) {
  const { session, status } = useAuth();

  if (status === "booting") {
    return <Text className="page">加载中…</Text>;
  }

  if (!session || !canAccessRoute(session, permission)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
