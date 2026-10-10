import { Link } from 'react-router'
import { useAuth } from '../../auth/AuthContext'

export function ForbiddenPage() {
  const { session, logout } = useAuth()

  return (
    <div className="page">
      <header>
        <h1>无权限</h1>
        <p className="muted">
          {session
            ? `${session.displayName} 没有访问该页面的权限`
            : '需要登录后访问'}
        </p>
      </header>
      <p>
        <Link to="/orders/order-1">返回订单</Link>
        {' · '}
        <button type="button" onClick={logout}>
          退出登录
        </button>
      </p>
    </div>
  )
}
