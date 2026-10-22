import type { Key, ReactNode } from "react";

/** Controls the horizontal placement of content within a column. */
export type TreeTableColumnAlignment = "start" | "center" | "end";

/** Describes how a single column is labeled and rendered. */
export interface TreeTableColumn<RowData> {
  /** Stable identifier used when rendering the column. */
  key: string;

  /** Content displayed in the column header. */
  header: ReactNode;

  /** Produces the cell content for a row. */
  renderCell: (row: RowData) => ReactNode;

  /** Horizontal alignment shared by the header and body cells. */
  align?: TreeTableColumnAlignment;
}

/** Properties for a read-only table of generic row data. */
export interface TreeTableProps<RowData> {
  /** Text that identifies the table to assistive technologies. */
  caption: string;

  /** Records rendered in their provided order. */
  rows: readonly RowData[];

  /** Column definitions rendered from left to right. */
  columns: readonly TreeTableColumn<RowData>[];

  /** Returns a stable key that uniquely identifies a row. */
  getRowKey: (row: RowData) => Key;
}

const alignmentClasses: Record<TreeTableColumnAlignment, string> = {
  start: "text-left",
  center: "text-center",
  end: "text-right",
};

/** Renders generic data as a responsive, read-only HTML table. */
export function TreeTable<RowData>({
  caption,
  rows,
  columns,
  getRowKey,
}: TreeTableProps<RowData>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[40rem] border-collapse text-sm text-slate-700">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`border-b border-slate-200 px-4 py-3 font-semibold whitespace-nowrap text-slate-900 ${alignmentClasses[column.align ?? "start"]}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 whitespace-nowrap ${alignmentClasses[column.align ?? "start"]}`}
                >
                  {column.renderCell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
