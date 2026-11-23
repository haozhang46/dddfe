import type { OrderRepository } from "../../application/ports/OrderRepository";
import { createOrderDraft } from "../../domain/order";
import { orderDraftToRecord, orderRecordToDraft, type OrderRecord } from "../acl/orderAcl";
import { delay } from "../mock/delay";
import { RequestQueue } from "../queue/RequestQueue";

export function createMockOrderRepository(queue: RequestQueue): OrderRepository {
  let store: OrderRecord = orderDraftToRecord(
    createOrderDraft({
      province: "浙江",
      city: "杭州",
    }),
  );

  return {
    load(orderId, signal) {
      return queue.enqueue(
        async (qSignal) => {
          await delay(250, qSignal);
          if (store.order_id !== orderId) {
            store = orderDraftToRecord(
              createOrderDraft({ id: orderId, province: "浙江", city: "杭州" }),
            );
          }
          return orderRecordToDraft(store);
        },
        { key: `order:load:${orderId}`, signal },
      );
    },

    saveDraft(draft, expectedVersion, signal) {
      return queue.enqueue(
        async (qSignal) => {
          await delay(300, qSignal);
          const incoming = orderDraftToRecord(draft);
          if (store.rev !== expectedVersion || incoming.rev !== expectedVersion) {
            throw new Error("VERSION_CONFLICT");
          }
          store = { ...incoming, rev: expectedVersion + 1 };
          return orderRecordToDraft(store);
        },
        { key: `order:write:${draft.id}`, signal },
      );
    },
  };
}
