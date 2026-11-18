import type { InputHTMLAttributes } from "react";
import "./base.css";
import { joinClass } from "./joinClass";

export type DatePickerType = "date" | "datetime-local" | "month" | "week" | "time";

export type DatePickerProps = {
  type?: DatePickerType;
  invalid?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/** Native date-like input. Use this instead of those input types outside `components/base`. */
export function DatePicker({
  type = "date",
  invalid = false,
  className,
  ...rest
}: DatePickerProps) {
  return (
    <input
      type={type}
      className={joinClass("date-picker", invalid && "date-picker--invalid", className)}
      {...rest}
    />
  );
}
