import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { Text } from "./base";

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "booting") {
    return <Text className="page">加载中…</Text>;
  }

  if (status === "anon") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
