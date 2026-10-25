import { describe, expect, it } from "vitest";

import type { TreeTableColumn } from "./TreeTable.types";
import {
  collectExpandableKeys,
  collectRows,
  collectVisibleRows,
  getEditorValue,
  renderColumnValue,
} from "./TreeTable.utils";

interface TestRow {
  id: string;
  label: string;
  amount?: number;
  children?: TestRow[];
}

const rows: TestRow[] = [
  {
    id: "group",
    label: "Group",
    children: [
      { id: "child", label: "Child" },
      {
        id: "nested-group",
        label: "Nested group",
        children: [{ id: "nested-child", label: "Nested child" }],
      },
    ],
  },
  { id: "standalone", label: "Standalone" },
];

const getRowKey = (row: TestRow) => row.id;
const getChildren = (row: TestRow) => row.children;

describe("tree traversal", () => {
  it("collects every row in depth-first order with its depth", () => {
    const result = collectRows(rows, getRowKey, getChildren);

    expect(result.map(({ key, depth }) => ({ key, depth }))).toEqual([
      { key: "group", depth: 0 },
      { key: "child", depth: 1 },
      { key: "nested-group", depth: 1 },
      { key: "nested-child", depth: 2 },
      { key: "standalone", depth: 0 },
    ]);
  });

  it("includes children only when all of their ancestors are expanded", () => {
    const result = collectVisibleRows(
      rows,
      getRowKey,
      getChildren,
      new Set(["group"]),
    );

    expect(result.map(({ key }) => key)).toEqual([
      "group",
      "child",
      "nested-group",
      "standalone",
    ]);
  });

  it("collects the keys of rows that provide children", () => {
    expect([...collectExpandableKeys(rows, getRowKey, getChildren)]).toEqual([
      "group",
      "nested-group",
    ]);
  });
});

describe("column values", () => {
  const amountRow: TestRow = {
    id: "amount",
    label: "Amount",
    amount: 1234.5,
  };

  it("uses an explicit editor value when one is configured", () => {
    const column: TreeTableColumn<TestRow> = {
      key: "label",
      header: "Label",
      type: "text",
      value: (row) => row.label,
      edit: {
        getValue: (row) => row.label.toUpperCase(),
        onCommit: () => undefined,
      },
    };

    expect(getEditorValue(column, amountRow)).toBe("AMOUNT");
  });

  it("formats numeric values with the requested locale and column type", () => {
    const column: TreeTableColumn<TestRow> = {
      key: "amount",
      header: "Amount",
      type: "currency",
      currency: "USD",
      value: (row) => row.amount,
    };

    expect(renderColumnValue(column, amountRow, "en-US")).toBe("$1,234.50");
  });

  it("prefers a custom formatter over the built-in number formatter", () => {
    const column: TreeTableColumn<TestRow> = {
      key: "amount",
      header: "Amount",
      type: "decimal",
      value: (row) => row.amount,
      formatValue: (value) => `Value: ${value}`,
    };

    expect(renderColumnValue(column, amountRow, "en-US")).toBe(
      "Value: 1234.5",
    );
  });
});
