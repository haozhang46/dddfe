import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";
import { DatePicker } from "./DatePicker";
import { Form } from "./Form";
import { Input } from "./Input";
import { Select } from "./Select";
import { Text } from "./Text";

const meta = {
  title: "Base/Form",
  component: Form,
  tags: ["autodocs"],
} satisfies Meta<typeof Form>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Fields: Story = {
  render: function OrderFields() {
    return (
      <Form
        onSubmit={function keepOnPage(event) {
          event.preventDefault();
        }}
      >
        <Text as="h1">订单字段</Text>
        <label className="form__field">
          备注
          <Input name="note" placeholder="给仓库的说明" />
        </label>
        <label className="form__field">
          发货日
          <DatePicker name="shipDate" aria-label="发货日" />
        </label>
        <label className="form__field">
          省
          <Select name="province" defaultValue="" aria-label="省">
            <option value="">请选择</option>
            <option value="zj">浙江</option>
            <option value="js">江苏</option>
          </Select>
        </label>
        <Button type="submit">保存</Button>
      </Form>
    );
  },
};
