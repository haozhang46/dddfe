import { describe, expect, it } from "vitest";
import { RequestQueue } from "../queue/RequestQueue";
import { createMockOrderRepository } from "./MockOrderRepository";

describe("MockOrderRepository", () => {
  it("returns a domain draft, not the upstream record", async () => {
    const repo = createMockOrderRepository(new RequestQueue());
    const draft = await repo.load("order-1");
    expect(draft.payType).toBe("online");
    expect(draft.unitPrice).toBe(100);
    expect(draft.province).toBe("浙江");
    expect(draft).not.toHaveProperty("pay_channel");
  });

  it("persists through the record and bumps rev", async () => {
    const repo = createMockOrderRepository(new RequestQueue());
    const loaded = await repo.load("order-9");
    const saved = await repo.saveDraft(
      { ...loaded, qty: 3, amount: loaded.unitPrice * 3 },
      loaded.version,
    );
    expect(saved.id).toBe("order-9");
    expect(saved.qty).toBe(3);
    expect(saved.version).toBe(loaded.version + 1);

    const again = await repo.load("order-9");
    expect(again.version).toBe(saved.version);
    expect(again.qty).toBe(3);
  });
});
