import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "./Text";

const meta = {
  title: "Base/Text",
  component: Text,
  tags: ["autodocs"],
  args: {
    children: "订单 Form · DDD Demo",
  },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Paragraph: Story = {
  args: { as: "p" },
};

export const Heading: Story = {
  args: { as: "h1", children: "登录" },
};

export const Muted: Story = {
  args: { tone: "muted", children: "选择 mock 用户，login 后写入 sessionStorage" },
};

export const Error: Story = {
  args: { tone: "error", children: "数量必须大于 0" },
};

export const Inline: Story = {
  args: { as: "span", children: "version: 3 · dirty" },
};
