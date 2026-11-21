import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./base.css";
import { joinClass } from "./joinClass";

export type ButtonVariant = "primary" | "ghost" | "danger";

export type ButtonProps = {
  variant?: ButtonVariant;
  children?: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

/** Native button. Use this instead of `<button>` outside `components/base`. */
export function Button({
  variant = "primary",
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={joinClass("button", variant !== "primary" && `button--${variant}`, className)}
      {...rest}
    >
      {children}
    </button>
  );
}
