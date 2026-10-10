import { Link } from 'react-router'
import { useAuth } from '../../auth/AuthContext'

export function AdminPage() {
  const { session, logout } = useAuth()

  return (
    <div className="page">
      <header>
        <h1>Admin panel</h1>
        <p className="muted">需要权限 admin:panel · 当前用户 {session?.displayName}</p>
      </header>
      <p>
        <Link to="/orders/order-1">订单表单</Link>
        {' · '}
        <button type="button" onClick={logout}>
          退出登录
        </button>
      </p>
    </div>
  )
}
