import type { Decorator, Preview } from '@storybook/react-vite'
import '../src/index.css'

type Theme = 'system' | 'light' | 'dark'

/** "System" removes the override, so palette.css falls back to the OS setting. */
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme as Theme
  const root = document.documentElement
  if (theme === 'light' || theme === 'dark') {
    root.dataset.theme = theme
  } else {
    delete root.dataset.theme
  }
  return <Story />
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Color theme of the components',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'system', title: 'System', icon: 'browser' },
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'system' },
  decorators: [withTheme],
}

export default preview
