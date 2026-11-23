import { createOrderDraft, type OrderDraft, type PayType } from "../../domain/order";

/**
 * Upstream order payload. Names and units belong to that system.
 * Domain code never sees this type.
 */
export type PayChannel = "CARD" | "CASH";

export type OrderRecord = {
  order_id: string;
  rev: number;
  pay_channel: PayChannel;
  line_qty: number;
  /** Decimal yuan, up to 2 fraction digits. Domain stores fen. */
  unit_price_yuan: string;
  line_amount_yuan: string | null;
  province_name: string;
  city_name: string;
};

const PAY_TYPE_BY_CHANNEL: Record<PayChannel, PayType> = {
  CARD: "online",
  CASH: "offline",
};

export function orderRecordToDraft(record: OrderRecord): OrderDraft {
  const payType = payChannelToPayType(record.pay_channel);
  const amount =
    payType === "offline" || record.line_amount_yuan === null
      ? null
      : yuanToFen(record.line_amount_yuan, "line_amount_yuan");

  return createOrderDraft({
    id: requireId(record.order_id),
    version: requireRev(record.rev),
    payType,
    qty: requireQty(record.line_qty),
    unitPrice: yuanToFen(record.unit_price_yuan, "unit_price_yuan"),
    amount,
    province: requireText(record.province_name, "province_name"),
    city: requireText(record.city_name, "city_name"),
  });
}

export function orderDraftToRecord(draft: OrderDraft): OrderRecord {
  const unitPrice = requireFen(draft.unitPrice, "unitPrice");
  const amount =
    draft.payType === "offline" || draft.amount === null
      ? null
      : requireFen(draft.amount, "amount");

  return {
    order_id: draft.id,
    rev: draft.version,
    pay_channel: draft.payType === "online" ? "CARD" : "CASH",
    line_qty: draft.qty,
    unit_price_yuan: fenToYuan(unitPrice),
    line_amount_yuan: amount === null ? null : fenToYuan(amount),
    province_name: draft.province,
    city_name: draft.city,
  };
}

function payChannelToPayType(channel: PayChannel): PayType {
  const payType = PAY_TYPE_BY_CHANNEL[channel];
  if (!payType) {
    throw new Error(`ACL unknown pay_channel: ${String(channel)}`);
  }
  return payType;
}

/** "1", "1.2", and "1.20" are yuan. More than 2 fraction digits is rejected. */
export function yuanToFen(yuan: string, field: string): number {
  if (typeof yuan !== "string") {
    throw new Error(`ACL ${field} must be a yuan string`);
  }
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(yuan);
  if (!match) {
    throw new Error(`ACL ${field} must be a non-negative yuan amount with at most 2 decimals`);
  }
  const whole = Number(match[1]);
  const frac = Number((match[2] ?? "").padEnd(2, "0"));
  return whole * 100 + frac;
}

export function fenToYuan(fen: number): string {
  const whole = Math.floor(fen / 100);
  const frac = String(fen % 100).padStart(2, "0");
  return `${whole}.${frac}`;
}

function requireId(orderId: string): string {
  if (typeof orderId !== "string" || orderId.length === 0) {
    throw new Error("ACL order_id required");
  }
  return orderId;
}

function requireRev(rev: number): number {
  if (!Number.isInteger(rev) || rev < 0) {
    throw new Error("ACL rev must be a non-negative integer");
  }
  return rev;
}

function requireQty(qty: number): number {
  if (!Number.isInteger(qty) || qty < 0) {
    throw new Error("ACL line_qty must be a non-negative integer");
  }
  return qty;
}

function requireFen(fen: number, field: string): number {
  if (!Number.isInteger(fen) || fen < 0) {
    throw new Error(`ACL ${field} must be a non-negative integer fen`);
  }
  return fen;
}

function requireText(value: string, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`ACL ${field} must be a string`);
  }
  return value;
}
