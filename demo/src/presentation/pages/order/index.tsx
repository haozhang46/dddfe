import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../../auth/AuthContext'
import { Can } from '../../components/Can'
import { buildViewModel } from './buildViewModel'
import { createDeps } from './createDeps'
import { createOrchestrator } from './orchestrator'
import { AddressSection } from './components/AddressSection'
import { AmountSection } from './components/AmountSection'
import { PaySection } from './components/PaySection'
import { QtySection } from './components/QtySection'
import { SaveBar } from './components/SaveBar'

export function OrderFormPage() {
  const { orderId = 'order-1' } = useParams()
  const { session, logout } = useAuth()

  const deps = useMemo(() => createDeps(), [])
  const orchestrator = useMemo(
    () => createOrchestrator(deps, orderId),
    [deps, orderId],
  )

  const state = useSyncExternalStore(
    orchestrator.subscribe,
    orchestrator.getState,
    orchestrator.getState,
  )

  useEffect(() => {
    void orchestrator.hydrate()
  }, [orchestrator])

  const vm = useMemo(() => {
    if (!state.draft) return null
    return buildViewModel({
      draft: state.draft,
      phase: state.phase,
      cityOptions: state.cityOptions,
      dirty: state.dirty,
      lastSavedAt: state.lastSavedAt,
      error: state.error,
    })
  }, [state])

  if (state.phase === 'loading' || !vm) {
    return <p className="page">加载中…</p>
  }

  return (
    <div className="page">
      <header>
        <h1>订单 Form · DDD Demo</h1>
        <p className="muted">
          订单 <code>{orderId}</code> · {session?.displayName}（{session?.roles.join(', ')}）
          {' · '}
          <Link to="/admin">Admin</Link>
          {' · '}
          <button type="button" onClick={logout}>
            退出
          </button>
        </p>
        <p className="muted">
          所有 onChange → <code>changeField</code> → Domain <code>applyChange</code>
        </p>
      </header>

      {vm.errors.form && <p className="error">{vm.errors.form}</p>}

      <PaySection
        payType={vm.values.payType}
        onChange={(v) => void orchestrator.changeField('payType', v)}
      />
      <QtySection
        qty={vm.values.qty}
        unitPrice={vm.values.unitPrice}
        onChange={(v) => void orchestrator.changeField('qty', v)}
      />
      <AmountSection visible={vm.ui.amountVisible} amount={vm.values.amount} />
      <AddressSection
        province={vm.values.province}
        city={vm.values.city}
        cityOptions={vm.ui.cityOptions}
        onProvince={(v) => void orchestrator.changeField('province', v)}
        onCity={(v) => void orchestrator.changeField('city', v)}
      />

      <SaveBar
        dirty={vm.ui.dirty}
        saving={vm.ui.saving}
        version={vm.values.version}
        lastSavedAt={vm.ui.lastSavedAt}
        onSave={() => void orchestrator.saveNow()}
        submitButton={
          <Can
            permission="order:submit"
            fallback={
              <button type="button" disabled>
                无提交权限
              </button>
            }
          >
            <button
              type="button"
              onClick={() => {
                alert(JSON.stringify(vm.values, null, 2))
              }}
              disabled={!vm.canSubmit}
            >
              提交
            </button>
          </Can>
        }
      />

      <details className="debug">
        <summary>ViewModel / Domain 快照</summary>
        <pre>{JSON.stringify(vm, null, 2)}</pre>
      </details>
    </div>
  )
}
