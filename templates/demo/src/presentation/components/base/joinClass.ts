/** Join class names, dropping empties. Returns undefined when nothing remains. */
export function joinClass(...parts: Array<string | false | undefined>): string | undefined {
  const value = parts.filter(Boolean).join(" ");
  return value.length > 0 ? value : undefined;
}
