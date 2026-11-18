import { describe, expect, it } from "vitest";
import { z } from "zod";
import { formErrors, parseFormField } from "./parseFormField";

const schema = z.object({
  qty: z.number().int().min(1, "min 1"),
  label: z.string().min(1, "required"),
});

describe("parseFormField", () => {
  it("returns the parsed value when the field matches", () => {
    expect(parseFormField(schema, "qty", 2)).toEqual({ ok: true, value: 2 });
  });

  it("returns the first issue when the field does not match", () => {
    const parsed = parseFormField(schema, "qty", 0);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.message).toBe("min 1");
  });

  it("rejects a path the schema does not define", () => {
    expect(parseFormField(schema, "missing", 1)).toEqual({
      ok: false,
      message: "unknown field",
    });
  });
});

describe("formErrors", () => {
  it("returns no errors for a matching object", () => {
    expect(formErrors(schema, { qty: 1, label: "a" })).toEqual({});
  });

  it("keeps the first message for each key", () => {
    expect(formErrors(schema, { qty: 0, label: "" })).toEqual({
      qty: "min 1",
      label: "required",
    });
  });
});
