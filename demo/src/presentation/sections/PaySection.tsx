import type { PayType } from '../../domain/order/FormDraft'

type Props = {
  payType: PayType
  onChange: (payType: PayType) => void
}

export function PaySection({ payType, onChange }: Props) {
  return (
    <fieldset className="section">
      <legend>支付方式</legend>
      <label>
        <input
          type="radio"
          name="payType"
          checked={payType === 'online'}
          onChange={() => onChange('online')}
        />
        线上（显示并计算金额）
      </label>
      <label>
        <input
          type="radio"
          name="payType"
          checked={payType === 'offline'}
          onChange={() => onChange('offline')}
        />
        线下（隐藏金额）
      </label>
    </fieldset>
  )
}
