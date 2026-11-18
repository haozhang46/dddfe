import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select } from "./Select";

const meta = {
  title: "Base/Select",
  component: Select,
  tags: ["autodocs"],
  args: {
    "aria-label": "省",
    defaultValue: "",
  },
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Province: Story = {
  render: function ProvinceSelect(args) {
    return (
      <Select {...args}>
        <option value="">请选择</option>
        <option value="zj">浙江</option>
        <option value="js">江苏</option>
      </Select>
    );
  },
};

export const Invalid: Story = {
  args: { invalid: true },
  render: function InvalidSelect(args) {
    return (
      <Select {...args}>
        <option value="">请选择</option>
        <option value="hz">杭州</option>
      </Select>
    );
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  render: function DisabledSelect(args) {
    return (
      <Select {...args}>
        <option value="">请选择</option>
      </Select>
    );
  },
};
