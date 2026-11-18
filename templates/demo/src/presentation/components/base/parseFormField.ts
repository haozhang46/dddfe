import type { z } from "zod";

export type FieldParse = { ok: true; value: unknown } | { ok: false; message: string };

/** Parse one top-level field of a Zod object. Unknown paths do not commit. */
export function parseFormField(schema: z.ZodObject, path: string, value: unknown): FieldParse {
  const field = schema.shape[path];
  if (field == null) return { ok: false, message: "unknown field" };
  const parsed = field.safeParse(value);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "invalid" };
  }
  return { ok: true, value: parsed.data };
}

/** First issue per top-level key. Empty object means `values` match `schema`. */
export function formErrors(schema: z.ZodType, values: unknown): Record<string, string> {
  const parsed = schema.safeParse(values);
  if (parsed.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && errors[key] == null) errors[key] = issue.message;
  }
  return errors;
}
