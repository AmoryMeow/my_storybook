import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  TreeTable,
  type TreeTableColumn,
  type TreeTableProps,
} from './index'

interface ExampleRow {
  id: string
  name: string
  category: string
  status: 'Draft' | 'Published'
  score: number
}

const rows: ExampleRow[] = [
  {
    id: 'alpha',
    name: 'Alpha pattern',
    category: 'Navigation',
    status: 'Published',
    score: 92,
  },
  {
    id: 'bravo',
    name: 'Bravo pattern',
    category: 'Data display',
    status: 'Draft',
    score: 78,
  },
  {
    id: 'charlie',
    name: 'Charlie pattern',
    category: 'Feedback',
    status: 'Published',
    score: 85,
  },
]

const columns: TreeTableColumn<ExampleRow>[] = [
  {
    key: 'name',
    header: 'Name',
    renderCell: (row) => <span className="font-medium text-slate-900">{row.name}</span>,
  },
  {
    key: 'category',
    header: 'Category',
    renderCell: (row) => row.category,
  },
  {
    key: 'status',
    header: 'Status',
    renderCell: (row) => (
      <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
        {row.status}
      </span>
    ),
  },
  {
    key: 'score',
    header: 'Score',
    align: 'end',
    renderCell: (row) => row.score,
  },
]

const meta = {
  title: 'Components/TreeTable',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<TreeTableProps<ExampleRow>>

export default meta
type Story = StoryObj<TreeTableProps<ExampleRow>>

export const Default: Story = {
  args: {
    caption: 'Example component records',
    rows,
    columns,
    getRowKey: (row) => row.id,
  },
  render: (args) => <TreeTable {...args} />,
}
