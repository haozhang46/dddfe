import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { z } from "zod";
import { Button } from "./Button";
import { Form } from "./Form";
import { Input } from "./Input";
import { Select } from "./Select";
import { Text } from "./Text";

const demoSchema = z.object({
  note: z.string().min(1, "备注不能为空"),
  province: z.enum(["", "zj", "js"]),
});

const meta = {
  title: "Base/Form",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Fields: Story = {
  render: function OrderFields() {
    const [values, setValues] = useState({ note: "", province: "" as "" | "zj" | "js" });
    return (
      <Form
        values={values}
        schema={demoSchema}
        onCommit={function commitDemoField(path, value) {
          setValues(function updateValues(prev) {
            return { ...prev, [path]: value };
          });
        }}
        onSubmit={function saveDemoForm() {
          // Story only — no persistence.
        }}
      >
        {function renderDemoFields(form) {
          return (
            <>
              <Text as="h1">订单字段</Text>
              <label className="form__field">
                备注
                <Input
                  name="note"
                  value={form.values.note}
                  placeholder="给仓库的说明"
                  onChange={function changeNote(event) {
                    form.commit("note", event.target.value);
                  }}
                />
                {form.error("note") ? <Text className="error">{form.error("note")}</Text> : null}
              </label>
              <label className="form__field">
                省
                <Select
                  name="province"
                  value={form.values.province}
                  aria-label="省"
                  onChange={function changeProvince(event) {
                    form.commit("province", event.target.value);
                  }}
                >
                  <option value="">请选择</option>
                  <option value="zj">浙江</option>
                  <option value="js">江苏</option>
                </Select>
              </label>
              <Button type="submit">保存</Button>
            </>
          );
        }}
      </Form>
    );
  },
};
