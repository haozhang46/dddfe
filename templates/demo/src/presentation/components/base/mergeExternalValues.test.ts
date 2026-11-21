import { describe, expect, it } from "vitest";
import { z } from "zod";
import { mergeExternalValues } from "./mergeExternalValues";

const schema = z.object({
  qty: z.number().int().min(1, "min 1"),
  version: z.number().int(),
});

describe("mergeExternalValues", () => {
  it("keeps an invalid local field when that key did not change outside", () => {
    const merged = mergeExternalValues(
      schema,
      { qty: 0, version: 1 },
      { qty: 3, version: 1 },
      { qty: 3, version: 2 },
    );
    expect(merged).toEqual({ qty: 0, version: 2 });
  });

  it("takes an external change over the invalid local value", () => {
    const merged = mergeExternalValues(
      schema,
      { qty: 0, version: 1 },
      { qty: 3, version: 1 },
      { qty: 4, version: 2 },
    );
    expect(merged).toEqual({ qty: 4, version: 2 });
  });

  it("uses the next external object when the local field already matches", () => {
    const merged = mergeExternalValues(
      schema,
      { qty: 4, version: 1 },
      { qty: 3, version: 1 },
      { qty: 4, version: 2 },
    );
    expect(merged).toEqual({ qty: 4, version: 2 });
  });
});
