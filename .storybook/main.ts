import type { StorybookConfig } from '@storybook/react-vite'
import remarkGfm from 'remark-gfm'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    {
      name: '@storybook/addon-docs',
      // MDX handles only core Markdown; tables in the docs pages need GFM.
      options: { mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } } },
    },
    '@storybook/addon-vitest',
  ],
  framework: '@storybook/react-vite',
  typescript: {
    // The default react-docgen cannot follow props composed from imported
    // types, which leaves the chart props tables empty.
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      // The root tsconfig only references the app and node projects, so the
      // plugin would see no files at all.
      tsconfigPath: './tsconfig.app.json',
    },
  },
}

export default config
