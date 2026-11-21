import type { Preview } from "@storybook/react-vite";
import "../src/App.css";
import "../src/index.css";
import "../src/presentation/components/base/base.css";

const preview = {
  decorators: [
    function withPage(Story) {
      return (
        <div className="page">
          <Story />
        </div>
      );
    },
  ],
  parameters: {
    layout: "fullscreen",
    options: {
      storySort: {
        order: ["Base", ["Text", "Button", "Input", "Select", "DatePicker", "Form"]],
      },
    },
  },
} satisfies Preview;

export default preview;
