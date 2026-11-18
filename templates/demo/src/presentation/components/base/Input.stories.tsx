import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./Input";

const meta = {
  title: "Base/Input",
  component: Input,
  tags: ["autodocs"],
  args: {
    placeholder: "请输入",
    "aria-label": "文本",
  },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Text: Story = {};

export const Email: Story = {
  args: { type: "email", placeholder: "name@example.com", "aria-label": "邮箱" },
};

export const Password: Story = {
  args: { type: "password", defaultValue: "secret", "aria-label": "密码" },
};

export const Invalid: Story = {
  args: { invalid: true, defaultValue: "", "aria-label": "无效文本" },
};

export const Textarea: Story = {
  args: { as: "textarea", placeholder: "备注", "aria-label": "备注" },
};
