import type { ReactNode, SelectHTMLAttributes } from "react";
import "./base.css";
import { joinClass } from "./joinClass";

export type SelectProps = {
  invalid?: boolean;
  children?: ReactNode;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "children">;

/** Native select. Use this instead of `<select>` outside `components/base`. */
export function Select({ invalid = false, className, children, ...rest }: SelectProps) {
  return (
    <select className={joinClass("select", invalid && "select--invalid", className)} {...rest}>
      {children}
    </select>
  );
}
