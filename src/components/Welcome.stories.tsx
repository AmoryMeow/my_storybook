import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
  title: 'Welcome',
  parameters: {
    layout: 'centered',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Welcome: Story = {
  render: () => (
    <main>
      <h1>My Storybook</h1>
      <p>Reusable React components, UI experiments, and accessible patterns.</p>
    </main>
  ),
}
