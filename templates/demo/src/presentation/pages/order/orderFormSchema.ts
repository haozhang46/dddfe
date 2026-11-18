import { z } from "zod";
import type { PayType } from "../../../domain/order";

const payTypeValues = ["online", "offline"] as const satisfies readonly PayType[];

/** Edge schema for the order page. `Form` parses one field before `changeField`. */
export const orderFormSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().nonnegative(),
  payType: z.enum(payTypeValues),
  qty: z.number().int().min(1, "数量至少为 1"),
  unitPrice: z.number().int().nonnegative(),
  amount: z.number().int().nullable(),
  province: z.string(),
  city: z.string(),
});
