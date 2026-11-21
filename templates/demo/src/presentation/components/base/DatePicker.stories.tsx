import type { Meta, StoryObj } from "@storybook/react-vite";
import { DatePicker } from "./DatePicker";

const meta = {
  title: "Base/DatePicker",
  component: DatePicker,
  tags: ["autodocs"],
  args: {
    "aria-label": "日期",
  },
} satisfies Meta<typeof DatePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DateOnly: Story = {};

export const DateTime: Story = {
  args: { type: "datetime-local", "aria-label": "日期时间" },
};

export const Month: Story = {
  args: { type: "month", "aria-label": "月份" },
};

export const Time: Story = {
  args: { type: "time", "aria-label": "时间" },
};

export const Invalid: Story = {
  args: { invalid: true },
};
