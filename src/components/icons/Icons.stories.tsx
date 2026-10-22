import type { Meta, StoryObj } from "@storybook/react-vite";

import { ChevronIcon, MoreIcon, PlusIcon } from "./index";

const meta = {
  title: "Components/Icons",
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Chevrons: Story = {
  render: () => (
    <div className="flex items-center gap-6 text-slate-700 dark:text-slate-200">
      <div className="flex items-center gap-2">
        <ChevronIcon className="size-6" />
        Collapsed
      </div>
      <div className="flex items-center gap-2">
        <ChevronIcon expanded className="size-6" />
        Expanded
      </div>
    </div>
  ),
};

export const MoreActions: Story = {
  render: () => <MoreIcon className="size-8 text-slate-700 dark:text-slate-200" />,
};

export const AddActions: Story = {
  render: () => (
    <div className="flex items-center gap-6 text-slate-700 dark:text-slate-200">
      <div className="flex items-center gap-2">
        <PlusIcon className="size-6" />
        Row
      </div>
      <div className="flex items-center gap-2">
        <PlusIcon group className="size-6" />
        Group
      </div>
    </div>
  ),
};
