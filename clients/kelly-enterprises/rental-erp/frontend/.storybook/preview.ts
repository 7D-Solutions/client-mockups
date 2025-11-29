import type { Preview } from "@storybook/react";
import '../src/index.css';
import '../src/styles/main.css';
import '../src/styles/tokens.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;