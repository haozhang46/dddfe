type Props = {
  qty: number
  unitPrice: number
  onChange: (qty: number) => void
}

export function QtySection({ qty, unitPrice, onChange }: Props) {
  return (
    <fieldset className="section">
      <legend>数量 / 单价</legend>
      <label>
        数量
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </label>
      <p className="muted">单价（分）：{unitPrice}（只读）</p>
    </fieldset>
  )
}
