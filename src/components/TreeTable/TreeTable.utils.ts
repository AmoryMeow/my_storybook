import type { ReactNode } from "react";

import type {
  TreeTableColumn,
  TreeTableKey,
  TreeTableNumberColumnBase,
} from "./TreeTable.types";

export interface TreeTableRowMeta<RowData> {
  row: RowData;
  key: TreeTableKey;
  depth: number;
}

export function collectRows<RowData>(
  rows: readonly RowData[],
  getRowKey: (row: RowData) => TreeTableKey,
  getChildren?: (row: RowData) => readonly RowData[] | undefined,
  depth = 0,
): TreeTableRowMeta<RowData>[] {
  const result: TreeTableRowMeta<RowData>[] = [];

  for (const row of rows) {
    result.push({ row, key: getRowKey(row), depth });
    const children = getChildren?.(row);
    if (children) {
      result.push(
        ...collectRows(children, getRowKey, getChildren, depth + 1),
      );
    }
  }

  return result;
}

export function collectVisibleRows<RowData>(
  rows: readonly RowData[],
  getRowKey: (row: RowData) => TreeTableKey,
  getChildren: ((row: RowData) => readonly RowData[] | undefined) | undefined,
  expandedKeys: ReadonlySet<TreeTableKey>,
  depth = 0,
): TreeTableRowMeta<RowData>[] {
  const result: TreeTableRowMeta<RowData>[] = [];

  for (const row of rows) {
    const key = getRowKey(row);
    result.push({ row, key, depth });

    const children = getChildren?.(row);
    if (children && expandedKeys.has(key)) {
      result.push(
        ...collectVisibleRows(
          children,
          getRowKey,
          getChildren,
          expandedKeys,
          depth + 1,
        ),
      );
    }
  }

  return result;
}

export function collectExpandableKeys<RowData>(
  rows: readonly RowData[],
  getRowKey: (row: RowData) => TreeTableKey,
  getChildren?: (row: RowData) => readonly RowData[] | undefined,
): Set<TreeTableKey> {
  const result = new Set<TreeTableKey>();

  for (const row of rows) {
    const children = getChildren?.(row);
    if (children !== undefined) {
      result.add(getRowKey(row));
      for (const key of collectExpandableKeys(
        children,
        getRowKey,
        getChildren,
      )) {
        result.add(key);
      }
    }
  }

  return result;
}

export function getColumnRawValue<RowData>(
  column: TreeTableColumn<RowData>,
  row: RowData,
): string | number | undefined {
  if (column.type === "custom" || !("value" in column)) {
    return undefined;
  }

  return column.value(row) ?? undefined;
}

export function getEditorValue<RowData>(
  column: TreeTableColumn<RowData>,
  row: RowData,
): string {
  const configuredValue = column.edit?.getValue?.(row);
  if (configuredValue !== undefined) {
    return configuredValue;
  }

  const value = getColumnRawValue(column, row);
  return value === undefined ? "" : String(value);
}

export function renderColumnValue<RowData>(
  column: TreeTableColumn<RowData>,
  row: RowData,
  locale?: string | readonly string[],
): ReactNode {
  if (column.renderCell) {
    return column.renderCell(row);
  }

  if (column.type === "custom" || !("value" in column)) {
    return null;
  }

  const value = column.value(row);
  if (value === undefined || value === null) {
    return null;
  }

  if (column.type === "text") {
    const textValue = String(value);
    return column.formatValue
      ? column.formatValue(textValue, row)
      : textValue;
  }

  const numericColumn = column as TreeTableNumberColumnBase<RowData>;
  const numericValue = Number(value);
  if (numericColumn.formatValue) {
    return numericColumn.formatValue(numericValue, row);
  }

  const locales = Array.isArray(locale) ? [...locale] : locale;
  let defaults: Intl.NumberFormatOptions = {};

  switch (column.type) {
    case "integer":
      defaults = { maximumFractionDigits: 0 };
      break;
    case "percentage":
      defaults = { style: "percent" };
      break;
    case "currency":
      defaults = { style: "currency", currency: column.currency };
      break;
    case "unit":
      defaults = {
        style: "unit",
        unit: column.unit,
        unitDisplay: column.unitDisplay,
      };
      break;
  }

  return new Intl.NumberFormat(locales, {
    ...defaults,
    ...numericColumn.numberFormat,
  }).format(numericValue);
}
