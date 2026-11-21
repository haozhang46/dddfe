import { Link, useParams } from "react-router";
import type { FieldPath } from "../../../domain/order";
import { useAuth } from "../../auth/AuthContext";
import { Button, Form, Text } from "../../components/base";
import { Can } from "../../components/Can";
import { SectionErrorBoundary } from "../../components/SectionErrorBoundary";
import { AddressSection } from "./components/AddressSection";
import { AmountSection } from "./components/AmountSection";
import { PaySection } from "./components/PaySection";
import { QtySection } from "./components/QtySection";
import { SaveBar } from "./components/SaveBar";
import { orderFormSchema } from "./orderFormSchema";
import { useOrderPage } from "./useOrderPage";

/**
 * Component: OrderFormPage
 *   Props: route `orderId`
 *   Responsibility: compose order sections inside the base Form
 *   Scope: page
 *   Data flow: useOrderPage → Form; Zod gate inside Form → orchestrator.changeField
 *
 * Component: Form (shared)
 *   Responsibility: Formik plus one-field Zod parse
 *   Scope: global — presentation/components/base
 */
export function OrderFormPage() {
  const { orderId = "order-1" } = useParams();
  const { session, logout } = useAuth();
  const { orchestrator, vm, loading } = useOrderPage(orderId);
  if (loading || !vm) {
    return <Text className="page">加载中…</Text>;
  }
  return (
    <OrderFormPageBody
      orchestrator={orchestrator}
      vm={vm}
      orderId={orderId}
      session={session}
      logout={logout}
    />
  );
}

function OrderFormPageBody({
  orchestrator,
  vm,
  orderId,
  session,
  logout,
}: {
  orchestrator: ReturnType<typeof useOrderPage>["orchestrator"];
  vm: NonNullable<ReturnType<typeof useOrderPage>["vm"]>;
  orderId: string;
  session: ReturnType<typeof useAuth>["session"];
  logout: ReturnType<typeof useAuth>["logout"];
}) {
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
          输入先经 Zod，通过后 <code>changeField</code> → Domain <code>applyChange</code>
        </Text>
      </header>

      <Form
        values={vm.values}
        schema={orderFormSchema}
        onCommit={function commitOrderField(path, value) {
          void orchestrator.changeField(path as FieldPath, value);
        }}
        onSubmit={function saveOrderForm() {
          void orchestrator.saveNow();
        }}
      >
        {function renderOrderFields(form) {
          return (
            <>
              {vm.errors.form && <Text className="error">{vm.errors.form}</Text>}

              <SectionErrorBoundary label="支付方式">
                <PaySection
                  payType={form.values.payType}
                  onChange={function changePayType(value) {
                    form.commit("payType", value);
                  }}
                />
              </SectionErrorBoundary>

              <SectionErrorBoundary label="数量">
                <QtySection
                  qty={form.values.qty}
                  unitPrice={form.values.unitPrice}
                  error={form.error("qty")}
                  onChange={function changeQty(value) {
                    form.commit("qty", value);
                  }}
                />
              </SectionErrorBoundary>

              <SectionErrorBoundary label="金额">
                <AmountSection visible={vm.ui.amountVisible} amount={vm.values.amount} />
              </SectionErrorBoundary>

              <SectionErrorBoundary label="地址">
                <AddressSection
                  province={form.values.province}
                  city={form.values.city}
                  cityOptions={vm.ui.cityOptions}
                  onProvince={function changeProvince(value) {
                    form.commit("province", value);
                  }}
                  onCity={function changeCity(value) {
                    form.commit("city", value);
                  }}
                />
              </SectionErrorBoundary>

              <SectionErrorBoundary label="保存栏">
                <SaveBar
                  dirty={vm.ui.dirty}
                  saving={vm.ui.saving}
                  version={vm.values.version}
                  lastSavedAt={vm.ui.lastSavedAt}
                  onSave={function saveFromBar() {
                    form.submit();
                  }}
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
            </>
          );
        }}
      </Form>

      <details className="debug">
        <summary>ViewModel / Domain 快照</summary>
        <pre>{JSON.stringify(vm, null, 2)}</pre>
      </details>
    </div>
  );
}
