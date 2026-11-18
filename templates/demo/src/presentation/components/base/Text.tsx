import type { HTMLAttributes, ReactNode } from "react";
import "./base.css";
import { joinClass } from "./joinClass";

export type TextTag = "p" | "span" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
export type TextTone = "default" | "muted" | "error";

const TONE_CLASS = {
  muted: "text--muted",
  error: "text--error",
} as const;

export type TextProps = {
  as?: TextTag;
  tone?: TextTone;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "children">;

/** Paragraph, span, or heading. Use this instead of those tags outside `components/base`. */
export function Text({ as = "p", tone = "default", className, children, ...rest }: TextProps) {
  const Tag = as;
  return (
    <Tag className={joinClass(tone !== "default" && TONE_CLASS[tone], className)} {...rest}>
      {children}
    </Tag>
  );
}
