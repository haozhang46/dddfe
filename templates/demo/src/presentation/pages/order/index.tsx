import { Link, useParams } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { Button, Text } from "../../components/base";
import { Can } from "../../components/Can";
import { SectionErrorBoundary } from "../../components/SectionErrorBoundary";
import { AddressSection } from "./components/AddressSection";
import { AmountSection } from "./components/AmountSection";
import { PaySection } from "./components/PaySection";
import { QtySection } from "./components/QtySection";
import { SaveBar } from "./components/SaveBar";
import { useOrderPage } from "./useOrderPage";

/**
 * Component: OrderFormPage
 *   Props: route `orderId`
 *   Responsibility: compose order form sections from ViewModel
 *   Scope: page
 *   Data flow: useOrderPage → FormViewModel + orchestrator → section components
 *
 * Component: SectionErrorBoundary (shared)
 *   Responsibility: isolate one section crash
 *   Scope: global — presentation/components
 */
export function OrderFormPage() {
  const { orderId = "order-1" } = useParams();
  const { session, logout } = useAuth();
  const { orchestrator, vm, loading } = useOrderPage(orderId);

  if (loading || !vm) {
    return <Text className="page">加载中…</Text>;
  }

  return (
    <div className="page">
      <header>
        <Text as="h1">订单 Form · DDD Demo</Text>
        <Text className="muted">
          订单 <code>{orderId}</code> · {session?.displayName}（{session?.roles.join(", ")}）{" · "}
          <Link to="/admin">Admin</Link>
          {" · "}
          <Button onClick={logout}>退出</Button>
        </Text>
        <Text className="muted">
          所有 onChange → <code>changeField</code> → Domain <code>applyChange</code>
        </Text>
      </header>

      {vm.errors.form && <Text className="error">{vm.errors.form}</Text>}

      <SectionErrorBoundary label="支付方式">
        <PaySection
          payType={vm.values.payType}
          onChange={(v) => void orchestrator.changeField("payType", v)}
        />
      </SectionErrorBoundary>

      <SectionErrorBoundary label="数量">
        <QtySection
          qty={vm.values.qty}
          unitPrice={vm.values.unitPrice}
          onChange={(v) => void orchestrator.changeField("qty", v)}
        />
      </SectionErrorBoundary>

      <SectionErrorBoundary label="金额">
        <AmountSection visible={vm.ui.amountVisible} amount={vm.values.amount} />
      </SectionErrorBoundary>

      <SectionErrorBoundary label="地址">
        <AddressSection
          province={vm.values.province}
          city={vm.values.city}
          cityOptions={vm.ui.cityOptions}
          onProvince={(v) => void orchestrator.changeField("province", v)}
          onCity={(v) => void orchestrator.changeField("city", v)}
        />
      </SectionErrorBoundary>

      <SectionErrorBoundary label="保存栏">
        <SaveBar
          dirty={vm.ui.dirty}
          saving={vm.ui.saving}
          version={vm.values.version}
          lastSavedAt={vm.ui.lastSavedAt}
          onSave={() => void orchestrator.saveNow()}
          submitButton={
            <Can permission="order:submit" fallback={<Button disabled>无提交权限</Button>}>
              <Button
                onClick={function submitOrderSnapshot() {
                  alert(JSON.stringify(vm.values, null, 2));
                }}
                disabled={!vm.canSubmit}
              >
                提交
              </Button>
            </Can>
          }
        />
      </SectionErrorBoundary>

      <details className="debug">
        <summary>ViewModel / Domain 快照</summary>
        <pre>{JSON.stringify(vm, null, 2)}</pre>
      </details>
    </div>
  );
}
