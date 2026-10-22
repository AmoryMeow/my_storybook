import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
  title: 'Project/Storybook setup',
  parameters: {
    layout: 'centered',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {
  render: () => (
    <div>
      <h1>Storybook is ready</h1>
      <p>Add reusable components under src/components.</p>
    </div>
  ),
}
