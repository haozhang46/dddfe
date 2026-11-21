import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { listMockUsernames } from "../../../infrastructure/auth/mockUsers";
import { useAuth } from "../../auth/AuthContext";
import { Button, Text } from "../../components/base";

type LocationState = { from?: { pathname?: string } };

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === "authed") {
    return <Navigate to="/" replace />;
  }

  const from = (location.state as LocationState | null)?.from?.pathname ?? "/orders/order-1";

  async function handleLogin(username: string) {
    setBusy(true);
    setError(null);
    try {
      await login(username);
      navigate(from, { replace: true });
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header>
        <Text as="h1">登录</Text>
        <Text className="muted">选择 mock 用户，login 后写入 sessionStorage（authJson）</Text>
      </header>

      {error && <Text className="error">{error}</Text>}

      <div className="section" style={{ gap: "0.75rem" }}>
        {listMockUsernames().map((username) => (
          <Button key={username} disabled={busy} onClick={() => void handleLogin(username)}>
            以 {username} 登录
          </Button>
        ))}
      </div>
    </div>
  );
}
