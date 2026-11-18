import type { FormHTMLAttributes, ReactNode } from "react";
import "./base.css";
import { joinClass } from "./joinClass";

export type FormProps = {
  children?: ReactNode;
} & Omit<FormHTMLAttributes<HTMLFormElement>, "children">;

/** Native form. Use this instead of `<form>` outside `components/base`. */
export function Form({ className, children, ...rest }: FormProps) {
  return (
    <form className={joinClass("form", className)} {...rest}>
      {children}
    </form>
  );
}
