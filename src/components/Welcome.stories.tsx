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
    <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        My Storybook
      </h1>
      <p className="mt-3 text-slate-600">
        Reusable React components, UI experiments, and accessible patterns.
      </p>
    </section>
  ),
}
