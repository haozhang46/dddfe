import type { z } from "zod";
import { parseFormField } from "./parseFormField";

/**
 * Copy `nextExternal` over the form, but keep a local value when it still fails
 * the schema and that key did not change outside the form.
 *
 * An autosave of the previous draft must not wipe the invalid keystroke.
 * A real external change of that key replaces it.
 */
export function mergeExternalValues<T extends object>(
  schema: z.ZodObject,
  local: T,
  previousExternal: T,
  nextExternal: T,
): T {
  const next = { ...nextExternal };
  const keys = Object.keys(nextExternal) as (keyof T & string)[];
  for (const key of keys) {
    if (Object.is(local[key], nextExternal[key])) continue;
    const unchanged = Object.is(previousExternal[key], nextExternal[key]);
    if (unchanged && !parseFormField(schema, key, local[key]).ok) {
      next[key] = local[key];
    }
  }
  return next;
}
