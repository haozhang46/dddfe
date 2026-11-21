import { useFormik } from "formik";
import { useEffect, useRef, type ReactNode } from "react";
import type { z } from "zod";
import "./base.css";
import { joinClass } from "./joinClass";
import { mergeExternalValues } from "./mergeExternalValues";
import { formErrors, parseFormField } from "./parseFormField";

/**
 * Component: Form
 *   Props: external values, a Zod object schema, onCommit, onSubmit, render-prop children
 *   Responsibility: bind Formik to those values and gate each field through Zod
 *   Scope: global — the only `<form>` and the only `formik` import
 *   Data flow: input → parseFormField → onCommit; Domain stays outside this file
 *
 * Invalid input stays in Formik and is not committed. A later external snapshot
 * updates the other fields and leaves that invalid key in place until the
 * outside value for that key actually changes.
 */
export type FormApi<TValues> = {
  values: TValues;
  commit: (path: keyof TValues & string, value: unknown) => void;
  error: (path: keyof TValues & string) => string | undefined;
  submit: () => void;
};

type Props<S extends z.ZodObject> = {
  values: z.infer<S>;
  schema: S;
  onCommit: (path: keyof z.infer<S> & string, value: unknown) => void;
  onSubmit: () => void;
  className?: string;
  children: (form: FormApi<z.infer<S>>) => ReactNode;
};

export function Form<S extends z.ZodObject>({
  values,
  schema,
  onCommit,
  onSubmit,
  className,
  children,
}: Props<S>) {
  const formik = useFormik<z.infer<S>>({
    initialValues: values,
    validate: function validateBaseForm(next) {
      return formErrors(schema, next);
    },
    onSubmit: function submitBaseForm() {
      onSubmit();
    },
  });
  const local = formik.values;
  const setValues = formik.setValues;
  const previousExternal = useRef(values);

  useEffect(
    function syncExternalValues() {
      const prev = previousExternal.current;
      previousExternal.current = values;
      if (prev === values) return;
      const next = mergeExternalValues(schema, local, prev, values);
      void setValues(next);
    },
    [schema, values, local, setValues],
  );

  function commit(path: keyof z.infer<S> & string, value: unknown) {
    void formik.setFieldValue(path, value);
    void formik.setFieldTouched(path, true, false);
    const parsed = parseFormField(schema, path, value);
    if (!parsed.ok) return;
    onCommit(path, parsed.value);
  }

  function error(path: keyof z.infer<S> & string): string | undefined {
    if (!formik.touched[path]) return undefined;
    const message = formik.errors[path];
    return typeof message === "string" ? message : undefined;
  }

  function submit() {
    void formik.submitForm();
  }

  return (
    <form
      className={joinClass("form", className)}
      onSubmit={function submitBaseFormEvent(event) {
        event.preventDefault();
        submit();
      }}
    >
      {children({ values: formik.values, commit, error, submit })}
    </form>
  );
}
