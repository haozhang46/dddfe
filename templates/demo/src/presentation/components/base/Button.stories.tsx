import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";

const meta = {
  title: "Base/Button",
  component: Button,
  tags: ["autodocs"],
  args: {
    children: "保存",
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Ghost: Story = {
  args: { variant: "ghost", children: "取消" },
};

export const Danger: Story = {
  args: { variant: "danger", children: "删除" },
};

export const Disabled: Story = {
  args: { disabled: true, children: "无提交权限" },
};
