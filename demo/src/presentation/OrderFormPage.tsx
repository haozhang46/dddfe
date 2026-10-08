import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { buildViewModel } from './buildViewModel'
import { createDeps } from './createDeps'
import { createOrchestrator } from './orchestrator'
import { AddressSection } from './sections/AddressSection'
import { AmountSection } from './sections/AmountSection'
import { PaySection } from './sections/PaySection'
import { QtySection } from './sections/QtySection'
import { SaveBar } from './sections/SaveBar'

const deps = createDeps()
const orchestrator = createOrchestrator(deps)

export function OrderFormPage() {
  const state = useSyncExternalStore(
    orchestrator.subscribe,
    orchestrator.getState,
    orchestrator.getState,
  )

  useEffect(() => {
    void orchestrator.hydrate()
  }, [])

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
        canSubmit={vm.canSubmit}
        onSave={() => void orchestrator.saveNow()}
        onSubmit={() => {
          alert(JSON.stringify(vm.values, null, 2))
        }}
      />

      <details className="debug">
        <summary>ViewModel / Domain 快照</summary>
        <pre>{JSON.stringify(vm, null, 2)}</pre>
      </details>
    </div>
  )
}
