type Props = {
  qty: number;
  unitPrice: number;
  error?: string;
  onChange: (qty: number) => void;
};

export function QtySection({ qty, unitPrice, error, onChange }: Props) {
  return (
    <fieldset className="section">
      <legend>数量 / 单价</legend>
      <label>
        数量
        <input
          type="number"
          min={1}
          value={Number.isFinite(qty) ? qty : ""}
          onChange={function changeQtyInput(event) {
            onChange(event.target.value === "" ? Number.NaN : Number(event.target.value));
          }}
        />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <p className="muted">单价（分）：{unitPrice}（只读）</p>
    </fieldset>
  );
}
