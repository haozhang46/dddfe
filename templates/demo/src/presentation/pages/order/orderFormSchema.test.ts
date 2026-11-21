import { describe, expect, it } from "vitest";
import { formErrors, parseFormField } from "../../components/base/parseFormField";
import { createOrderDraft } from "../../../domain/order";
import { orderFormSchema } from "./orderFormSchema";

describe("orderFormSchema", () => {
  it("accepts a positive integer quantity", () => {
    expect(parseFormField(orderFormSchema, "qty", 3)).toEqual({ ok: true, value: 3 });
  });

  it("rejects a quantity below 1", () => {
    const parsed = parseFormField(orderFormSchema, "qty", 0);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.message).toMatch(/至少为 1/);
  });

  it("rejects a fractional quantity", () => {
    expect(parseFormField(orderFormSchema, "qty", 1.5).ok).toBe(false);
  });

  it("accepts the pay types the domain allows", () => {
    expect(parseFormField(orderFormSchema, "payType", "offline")).toEqual({
      ok: true,
      value: "offline",
    });
  });

  it("accepts a domain draft", () => {
    expect(formErrors(orderFormSchema, createOrderDraft())).toEqual({});
  });

  it("reports the first schema failure for qty", () => {
    expect(formErrors(orderFormSchema, createOrderDraft({ qty: 0 })).qty).toMatch(/至少为 1/);
  });
});
