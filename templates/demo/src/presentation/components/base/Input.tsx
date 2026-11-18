import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import "./base.css";
import { joinClass } from "./joinClass";

/** Text-like input types. `number` and `radio` stay native and are not this widget. */
export type InputType = "text" | "email" | "password" | "search" | "tel" | "url";

type FieldOwn = {
  invalid?: boolean;
};

export type InputAsInput = FieldOwn & {
  as?: "input";
  type?: InputType;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export type InputAsTextarea = FieldOwn & {
  as: "textarea";
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export type InputProps = InputAsInput | InputAsTextarea;

function fieldClass(invalid: boolean | undefined, className: string | undefined) {
  return joinClass("input", Boolean(invalid) && "input--invalid", className);
}

/** Single-line text field or textarea. */
export function Input(props: InputProps) {
  if (props.as === "textarea") {
    const { as, invalid, className, ...rest } = props;
    void as;
    return <textarea className={fieldClass(invalid, className)} {...rest} />;
  }

  const { as, invalid, className, type = "text", ...rest } = props;
  void as;
  return <input type={type} className={fieldClass(invalid, className)} {...rest} />;
}
