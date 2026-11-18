import { Text } from "../../../components/base";

type Props = {
  visible: boolean;
  amount: number | null;
};

export function AmountSection({ visible, amount }: Props) {
  if (!visible) {
    return (
      <fieldset className="section muted">
        <legend>金额</legend>
        <Text>已隐藏（offline）。Domain 中 amount = null</Text>
      </fieldset>
    );
  }
  return (
    <fieldset className="section">
      <legend>金额（派生，只读）</legend>
      <Text className="amount">{amount ?? 0} 分</Text>
      <Text className="muted">来源：qty × unitPrice（Domain applyDerived）</Text>
    </fieldset>
  );
}
