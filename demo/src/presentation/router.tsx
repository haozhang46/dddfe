import { Navigate, Route, Routes } from 'react-router'
import { RequireAuth } from './components/RequireAuth'
import { RequirePermission } from './components/RequirePermission'
import { AdminPage } from './pages/admin/AdminPage'
import { ForbiddenPage } from './pages/forbidden/ForbiddenPage'
import { LoginPage } from './pages/login/LoginPage'
import { OrderFormPage } from './pages/order'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route element={<RequirePermission permission="order:view" />}>
          <Route path="/" element={<Navigate to="/orders/order-1" replace />} />
          <Route path="/orders/:orderId" element={<OrderFormPage />} />
        </Route>
        <Route element={<RequirePermission permission="admin:panel" />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
