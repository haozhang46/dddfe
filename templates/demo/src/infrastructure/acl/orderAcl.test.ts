import { describe, expect, it } from "vitest";
import { createOrderDraft } from "../../domain/order";
import {
  fenToYuan,
  orderDraftToRecord,
  orderRecordToDraft,
  yuanToFen,
  type OrderRecord,
} from "./orderAcl";

const cardRecord: OrderRecord = {
  order_id: "order-9",
  rev: 3,
  pay_channel: "CARD",
  line_qty: 2,
  unit_price_yuan: "1.50",
  line_amount_yuan: "3.00",
  province_name: "浙江",
  city_name: "杭州",
};

describe("orderAcl", () => {
  it("translates a card ticket into an online draft in fen", () => {
    const draft = orderRecordToDraft(cardRecord);
    expect(draft).toMatchObject({
      id: "order-9",
      version: 3,
      payType: "online",
      qty: 2,
      unitPrice: 150,
      amount: 300,
      province: "浙江",
      city: "杭州",
    });
  });

  it("drops a till total on cash tickets", () => {
    const draft = orderRecordToDraft({
      ...cardRecord,
      pay_channel: "CASH",
      line_amount_yuan: "9.00",
    });
    expect(draft.payType).toBe("offline");
    expect(draft.amount).toBeNull();
  });

  it("rejects an unknown pay channel and a 3-decimal yuan string", () => {
    expect(() => orderRecordToDraft({ ...cardRecord, pay_channel: "WIRE" as "CARD" })).toThrow(
      /pay_channel/,
    );
    expect(() => yuanToFen("1.234", "unit_price_yuan")).toThrow(/unit_price_yuan/);
  });

  it("round-trips fen without changing the draft", () => {
    const draft = createOrderDraft({
      id: "order-9",
      version: 3,
      payType: "online",
      qty: 2,
      unitPrice: 150,
      amount: 300,
      province: "浙江",
      city: "杭州",
    });
    expect(orderRecordToDraft(orderDraftToRecord(draft))).toEqual(draft);
    expect(fenToYuan(1)).toBe("0.01");
  });

  it("writes cash drafts with a null line amount", () => {
    const record = orderDraftToRecord(
      createOrderDraft({ payType: "offline", amount: null, unitPrice: 100, qty: 4 }),
    );
    expect(record.pay_channel).toBe("CASH");
    expect(record.line_amount_yuan).toBeNull();
    expect(record.unit_price_yuan).toBe("1.00");
  });
});
