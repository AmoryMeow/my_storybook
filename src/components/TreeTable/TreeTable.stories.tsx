import { useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'

import {
  TreeTable,
  type TreeTableColumn,
  type TreeTableKey,
  type TreeTableProps,
} from './index'

interface CatalogRow {
  id: string
  name: string
  kind: 'group' | 'item' | 'total'
  notes: string
  count: number
  progress: number
  budget: number
  duration: number
  href?: string
  children?: CatalogRow[]
}

const catalogRows: CatalogRow[] = [
  {
    id: 'foundations',
    name: 'Foundations',
    kind: 'group',
    notes: 'Shared visual language and core accessibility guidance.',
    count: 18,
    progress: 0.82,
    budget: 12600,
    duration: 42,
    children: [
      {
        id: 'color',
        name: 'Color system',
        kind: 'item',
        notes: 'Semantic palettes with tested contrast combinations.',
        count: 8,
        progress: 1,
        budget: 4800,
        duration: 18,
        href: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',
      },
      {
        id: 'typography',
        name: 'Typography',
        kind: 'group',
        notes: 'Type scales and readable content defaults.',
        count: 10,
        progress: 0.65,
        budget: 7800,
        duration: 24,
        children: [
          {
            id: 'body-copy',
            name: 'Body copy',
            kind: 'item',
            notes: 'Comfortable line length, spacing, and responsive sizing.',
            count: 4,
            progress: 0.75,
            budget: 3200,
            duration: 11,
          },
        ],
      },
    ],
  },
  {
    id: 'patterns',
    name: 'Interaction patterns',
    kind: 'group',
    notes: 'Reusable behavior for common application workflows.',
    count: 12,
    progress: 0.5,
    budget: 9400,
    duration: 36,
    children: [
      {
        id: 'disclosure',
        name: 'Disclosure',
        kind: 'item',
        notes: 'Progressive reveal with keyboard and screen-reader support.',
        count: 5,
        progress: 0.6,
        budget: 3900,
        duration: 14,
      },
    ],
  },
  {
    id: 'portfolio-total',
    name: 'Portfolio total',
    kind: 'total',
    notes: 'Current estimate across all planned work.',
    count: 30,
    progress: 0.69,
    budget: 22000,
    duration: 78,
  },
]

const flatRows: CatalogRow[] = [
  catalogRows[0].children![0],
  catalogRows[0].children![1],
  catalogRows[1].children![0],
]

const getRowKey = (row: CatalogRow) => row.id
const getRowLabel = (row: CatalogRow) => row.name || 'Untitled row'
const getChildren = (row: CatalogRow) => row.children

const basicColumns: TreeTableColumn<CatalogRow>[] = [
  {
    key: 'name',
    type: 'text',
    header: 'Name',
    value: (row) => row.name,
  },
  {
    key: 'notes',
    type: 'text',
    header: 'Notes',
    value: (row) => row.notes,
    cellTooltip: (row) => row.notes,
  },
  {
    key: 'count',
    type: 'integer',
    header: 'Items',
    align: 'end',
    value: (row) => row.count,
  },
  {
    key: 'kind',
    header: 'Type',
    align: 'center',
    renderCell: (row) => (
      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        {row.kind}
      </span>
    ),
  },
]

const hierarchyColumns: TreeTableColumn<CatalogRow>[] = basicColumns.slice(0, 3)

const formattedColumns: TreeTableColumn<CatalogRow>[] = [
  {
    key: 'name',
    type: 'text',
    header: 'Name',
    value: (row) => row.name,
  },
  {
    key: 'count',
    type: 'integer',
    header: 'Items',
    align: 'end',
    value: (row) => row.count,
  },
  {
    key: 'score',
    type: 'decimal',
    header: 'Score',
    align: 'end',
    value: (row) => row.progress * 10,
    numberFormat: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
  },
  {
    key: 'progress',
    type: 'percentage',
    header: 'Progress',
    align: 'end',
    value: (row) => row.progress,
    numberFormat: { maximumFractionDigits: 0 },
  },
  {
    key: 'budget',
    type: 'currency',
    header: 'Budget',
    align: 'end',
    currency: 'USD',
    value: (row) => row.budget,
    numberFormat: { maximumFractionDigits: 0 },
    isSummary: true,
  },
  {
    key: 'duration',
    type: 'unit',
    header: 'Duration',
    align: 'end',
    unit: 'hour',
    unitDisplay: 'short',
    value: (row) => row.duration,
  },
]

function updateNestedRow(
  rows: readonly CatalogRow[],
  id: string,
  update: (row: CatalogRow) => CatalogRow,
): CatalogRow[] {
  return rows.map((row) => {
    if (row.id === id) return update(row)

    return row.children
      ? { ...row, children: updateNestedRow(row.children, id, update) }
      : row
  })
}

function appendChild(
  rows: readonly CatalogRow[],
  parentId: string,
  child: CatalogRow,
): CatalogRow[] {
  return updateNestedRow(rows, parentId, (row) => ({
    ...row,
    children: [...(row.children ?? []), child],
  }))
}

function ControlledExpansionExample() {
  const [expandedKeys, setExpandedKeys] = useState<Set<TreeTableKey>>(
    () => new Set(['foundations']),
  )

  return (
    <div className="space-y-3">
      <TreeTable
        caption="Controlled hierarchy example"
        rows={catalogRows.slice(0, 2)}
        columns={hierarchyColumns}
        getRowKey={getRowKey}
        getRowLabel={getRowLabel}
        getChildren={getChildren}
        expandedKeys={expandedKeys}
        onExpandedChange={setExpandedKeys}
        bulkExpansion
        minTableWidth="48rem"
      />
      <p aria-live="polite" className="text-sm text-slate-600 dark:text-slate-300">
        Expanded: {[...expandedKeys].join(', ') || 'none'}
      </p>
    </div>
  )
}

function EditingExample() {
  const [rows, setRows] = useState<CatalogRow[]>(flatRows)
  const updateValue = (
    row: CatalogRow,
    update: Partial<Pick<CatalogRow, 'name' | 'count' | 'progress' | 'budget'>>,
  ) =>
    setRows((current) =>
      current.map((item) => (item.id === row.id ? { ...item, ...update } : item)),
    )

  const columns: TreeTableColumn<CatalogRow>[] = [
    {
      key: 'name',
      type: 'text',
      header: 'Name',
      value: (row) => row.name,
      edit: {
        onCommit: (row, value) => updateValue(row, { name: value }),
        placeholder: () => 'Enter a name',
        validate: (value) =>
          value.trim() ? undefined : 'Name is required.',
      },
    },
    {
      key: 'count',
      type: 'integer',
      header: 'Items',
      align: 'end',
      value: (row) => row.count,
      edit: {
        onCommit: (row, value) => updateValue(row, { count: Number(value) }),
        validate: (value) => {
          const number = Number(value)
          return Number.isInteger(number) && number >= 0
            ? undefined
            : 'Enter a whole number of zero or more.'
        },
      },
    },
    {
      key: 'progress',
      type: 'percentage',
      header: 'Progress',
      align: 'end',
      value: (row) => row.progress,
      numberFormat: { maximumFractionDigits: 0 },
      edit: {
        getValue: (row) => String(Math.round(row.progress * 100)),
        onCommit: (row, value) =>
          updateValue(row, { progress: Number(value) / 100 }),
        validate: (value) => {
          const number = Number(value)
          return Number.isFinite(number) && number >= 0 && number <= 100
            ? undefined
            : 'Enter a percentage from 0 to 100.'
        },
      },
    },
    {
      key: 'budget',
      type: 'currency',
      header: 'Budget',
      align: 'end',
      currency: 'USD',
      value: (row) => row.budget,
      numberFormat: { maximumFractionDigits: 0 },
      edit: {
        onCommit: (row, value) => updateValue(row, { budget: Number(value) }),
        isReadOnly: (row) => row.id === 'color',
        isDisabled: (row) => row.id === 'disclosure',
        validate: (value) =>
          Number(value) >= 0 ? undefined : 'Enter a number of zero or more.',
      },
    },
  ]

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Press Enter or double-click an editable cell. The first budget is read-only and the last is disabled.
      </p>
      <TreeTable
        caption="Inline editing and validation example"
        rows={rows}
        columns={columns}
        getRowKey={getRowKey}
        getRowLabel={getRowLabel}
        minTableWidth="48rem"
      />
    </div>
  )
}

function ActionsAndLinksExample() {
  const [lastAction, setLastAction] = useState('No action selected')
  const columns: TreeTableColumn<CatalogRow>[] = [
    {
      key: 'name',
      type: 'text',
      header: 'Name',
      value: (row) => row.name,
    },
    {
      key: 'notes',
      type: 'text',
      header: 'Documentation',
      value: (row) => row.notes,
      getLink: (row) =>
        row.href
          ? { href: row.href, target: '_blank', rel: 'noreferrer' }
          : undefined,
    },
    {
      key: 'progress',
      type: 'percentage',
      header: 'Progress',
      align: 'end',
      value: (row) => row.progress,
      numberFormat: { maximumFractionDigits: 0 },
      onPress: (row) => setLastAction(`Opened progress for ${row.name}`),
    },
  ]

  return (
    <div className="space-y-3">
      <TreeTable
        caption="Links and row actions example"
        rows={flatRows}
        columns={columns}
        getRowKey={getRowKey}
        getRowLabel={getRowLabel}
        getRowActions={(row) => [
          {
            key: 'inspect',
            label: 'Inspect',
            onAction: () => setLastAction(`Inspected ${row.name}`),
          },
          {
            key: 'reference',
            label: 'Open reference',
            link: {
              href: row.href ?? 'https://www.w3.org/WAI/ARIA/apg/',
              target: '_blank',
              rel: 'noreferrer',
            },
          },
          {
            key: 'archive',
            label: 'Archive',
            destructive: true,
            onAction: () => setLastAction(`Archived ${row.name}`),
          },
        ]}
        minTableWidth="48rem"
      />
      <p aria-live="polite" className="text-sm text-slate-600 dark:text-slate-300">
        {lastAction}
      </p>
    </div>
  )
}

function AddingRowsExample() {
  const [rows, setRows] = useState<CatalogRow[]>(catalogRows.slice(0, 2))
  const nextId = useRef(1)

  const createRow = (kind: 'group' | 'item'): CatalogRow => ({
    id: `new-${nextId.current++}`,
    name: '',
    kind,
    notes: kind === 'group' ? 'New group' : 'New item',
    count: 0,
    progress: 0,
    budget: 0,
    duration: 0,
    ...(kind === 'group' ? { children: [] } : {}),
  })

  const columns: TreeTableColumn<CatalogRow>[] = [
    {
      key: 'name',
      type: 'text',
      header: 'Name',
      value: (row) => row.name,
      edit: {
        onCommit: (row, value) =>
          setRows((current) =>
            updateNestedRow(current, row.id, (item) => ({ ...item, name: value })),
          ),
        placeholder: () => 'Enter a name',
        validate: (value) =>
          value.trim() ? undefined : 'Name is required.',
      },
    },
    ...hierarchyColumns.slice(1),
  ]

  return (
    <TreeTable
      caption="Adding nested rows and groups example"
      rows={rows}
      columns={columns}
      getRowKey={getRowKey}
      getRowLabel={getRowLabel}
      getChildren={getChildren}
      defaultExpandedKeys={['foundations', 'typography', 'patterns']}
      bulkExpansion
      getAddActions={(parent) => {
        if (!parent) {
          return [
            {
              key: 'root-group',
              kind: 'group',
              label: 'Add group',
              onAction: () =>
                setRows((current) => [...current, createRow('group')]),
            },
          ]
        }

        if (parent.kind !== 'group') return undefined
        return [
          {
            key: 'child-row',
            kind: 'row',
            label: 'Add item',
            onAction: () =>
              setRows((current) =>
                appendChild(current, parent.id, createRow('item')),
              ),
          },
          {
            key: 'child-group',
            kind: 'group',
            label: 'Add subgroup',
            onAction: () =>
              setRows((current) =>
                appendChild(current, parent.id, createRow('group')),
              ),
          },
        ]
      }}
      minTableWidth="48rem"
    />
  )
}

const meta = {
  title: 'Components/TreeTable',
  parameters: { layout: 'padded' },
} satisfies Meta<TreeTableProps<CatalogRow>>

export default meta
type Story = StoryObj<TreeTableProps<CatalogRow>>

export const Basic: Story = {
  args: {
    caption: 'Basic read-only table example',
    rows: flatRows,
    columns: basicColumns,
    getRowKey,
    getRowLabel,
    minTableWidth: '44rem',
  },
  render: (args) => <TreeTable {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const nameHeader = canvas.getByRole('columnheader', { name: 'Name' })
    const firstRow = canvas.getByText('Color system').closest('tr')

    expect(firstRow).not.toBeNull()
    nameHeader.focus()
    await userEvent.keyboard('{ArrowDown}')

    await expect(within(firstRow!).getAllByRole('gridcell')[0]).toHaveFocus()
  },
}

export const Hierarchy: Story = {
  args: {
    caption: 'Nested hierarchy example',
    rows: catalogRows.slice(0, 2),
    columns: hierarchyColumns,
    getRowKey,
    getRowLabel,
    getChildren,
    defaultExpandedKeys: ['foundations', 'typography', 'patterns'],
    bulkExpansion: true,
    minTableWidth: '48rem',
  },
  render: (args) => <TreeTable {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const groupCell = canvas.getByRole('rowheader', { name: /Foundations/ })
    const groupRow = groupCell.closest('tr')

    expect(groupRow).not.toBeNull()
    await expect(groupRow!).toHaveAttribute('aria-level', '1')
    await expect(groupRow!).toHaveAttribute('aria-expanded', 'true')
    await expect(canvas.getByText('Color system')).toBeInTheDocument()

    groupCell.focus()
    await userEvent.keyboard(' ')

    await expect(groupRow!).toHaveAttribute('aria-expanded', 'false')
    await expect(canvas.queryByText('Color system')).not.toBeInTheDocument()
    await expect(groupCell).toHaveFocus()
  },
}

export const ControlledExpansion: Story = {
  args: {
    caption: 'Controlled hierarchy example',
    rows: [],
    columns: [],
    getRowKey,
  },
  render: () => <ControlledExpansionExample />,
}

export const ValueFormattingAndTotals: Story = {
  args: {
    caption: 'Formatted values and totals example',
    rows: catalogRows,
    columns: formattedColumns,
    getRowKey,
    getRowLabel,
    locale: 'en-US',
    isTotalRow: (row) => row.kind === 'total',
    stickyTotalRows: true,
    minTableWidth: '64rem',
  },
  render: (args) => <TreeTable {...args} />,
}

export const InlineEditing: Story = {
  args: {
    caption: 'Inline editing and validation example',
    rows: [],
    columns: [],
    getRowKey,
  },
  render: () => <EditingExample />,
}

export const ActionsAndLinks: Story = {
  args: {
    caption: 'Links and row actions example',
    rows: [],
    columns: [],
    getRowKey,
  },
  render: () => <ActionsAndLinksExample />,
}

export const AddingRowsAndGroups: Story = {
  args: {
    caption: 'Adding nested rows and groups example',
    rows: [],
    columns: [],
    getRowKey,
  },
  render: () => <AddingRowsExample />,
}

export const Loading: Story = {
  args: {
    caption: 'Loading table example',
    rows: flatRows,
    columns: basicColumns,
    getRowKey,
    getRowLabel,
    isLoading: true,
    loadingLabel: 'Loading component data',
    minTableWidth: '44rem',
  },
  render: (args) => <TreeTable {...args} />,
}

export const Empty: Story = {
  args: {
    caption: 'Empty table example',
    rows: [],
    columns: basicColumns,
    getRowKey,
    emptyContent: 'Nothing has been added yet.',
    minTableWidth: '44rem',
  },
  render: (args) => <TreeTable {...args} />,
}
