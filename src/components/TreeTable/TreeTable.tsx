import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Button } from "../Button";
import { Menu, MenuItem, MenuTrigger, Popover } from "../Menu";
import { Tooltip, TooltipTrigger } from "../Tooltip";
import { ChevronIcon, MoreIcon, PlusIcon } from "../icons";

import type {
  TreeTableAddAction,
  TreeTableColumn,
  TreeTableColumnAlignment,
  TreeTableKey,
  TreeTableProps,
  TreeTableRowAction,
} from "./TreeTable.types";
import {
  collectExpandableKeys,
  collectRows,
  collectVisibleRows,
  getEditorValue,
  renderColumnValue,
} from "./TreeTable.utils";

const alignmentClasses: Record<TreeTableColumnAlignment, string> = {
  start: "text-left",
  center: "text-center",
  end: "text-right",
};

const contentAlignmentClasses: Record<TreeTableColumnAlignment, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
};

const interactiveTargetSelector =
  "a,button,input,select,textarea,[role='button'],[role='menuitem']";

function acceptsEditorDraft<RowData>(
  column: TreeTableColumn<RowData>,
  value: string,
) {
  if (column.type === "integer") {
    return /^-?\d*$/.test(value);
  }

  if (
    column.type === "decimal" ||
    column.type === "percentage" ||
    column.type === "currency" ||
    column.type === "unit"
  ) {
    return /^-?(?:\d+(?:\.\d*)?|\.\d*)?$/.test(value);
  }

  return true;
}

function getEditorInputMode<RowData>(column: TreeTableColumn<RowData>) {
  if (column.type === "integer") return "numeric" as const;
  if (
    column.type === "decimal" ||
    column.type === "percentage" ||
    column.type === "currency" ||
    column.type === "unit"
  ) {
    return "decimal" as const;
  }
  return "text" as const;
}

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 animate-spin motion-reduce:animate-none"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
        className="opacity-90"
      />
    </svg>
  );
}

function ValueTooltip({
  children,
  content,
}: {
  children: ReactNode;
  content: ReactNode;
}) {
  return (
    <TooltipTrigger delay={700} closeDelay={100}>
      <Button
        excludeFromTabOrder
        className="max-w-full truncate rounded-sm text-inherit outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 dark:focus-visible:ring-blue-400"
      >
        {children}
      </Button>
      <Tooltip
        placement="top"
        className="max-w-sm rounded-md bg-slate-950 px-3 py-2 text-xs text-white shadow-lg dark:bg-slate-100 dark:text-slate-950"
      >
        {content}
      </Tooltip>
    </TooltipTrigger>
  );
}

function HeaderContent<RowData>({
  column,
  bulkControl,
}: {
  column: TreeTableColumn<RowData>;
  bulkControl?: ReactNode;
}) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-2">
      <div className="min-w-0">
        <div>{column.header}</div>
        {column.description && (
          <div className="mt-0.5 text-xs font-normal text-slate-500 dark:text-slate-400">
            {column.description}
          </div>
        )}
      </div>
      {bulkControl && <div className="shrink-0">{bulkControl}</div>}
    </div>
  );
}

function RowActionsMenu({
  rowLabel,
  actions,
  isFocused,
  buttonRef,
  onFocus,
  onKeyDown,
}: {
  rowLabel: string;
  actions: readonly TreeTableRowAction[];
  isFocused: boolean;
  buttonRef: (node: HTMLButtonElement | null) => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <MenuTrigger>
      <Button
        ref={buttonRef}
        excludeFromTabOrder={!isFocused}
        aria-label={`Actions for ${rowLabel}`}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 outline-none hover:bg-slate-200 hover:text-slate-900 data-[pressed]:bg-slate-300 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100 dark:data-[pressed]:bg-slate-600 dark:focus-visible:ring-blue-400"
      >
        <MoreIcon />
      </Button>
      <Popover
        placement="bottom end"
        className="min-w-44 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"
      >
        <Menu aria-label={`Actions for ${rowLabel}`} items={actions}>
          {(action) => (
            <MenuItem
              id={action.key}
              textValue={action.label}
              href={action.link?.href}
              target={action.link?.target}
              rel={action.link?.rel}
              isDisabled={action.disabled}
              onAction={() => action.onAction?.()}
              className={({ isFocused, isDisabled }) =>
                `flex cursor-default items-center gap-2 rounded-md px-3 py-2 text-sm outline-none ${
                  action.destructive
                    ? "text-red-700 dark:text-red-400"
                    : "text-slate-700 dark:text-slate-200"
                } ${isFocused ? "bg-slate-100 dark:bg-slate-700" : ""} ${
                  isDisabled ? "opacity-50" : ""
                }`
              }
            >
              {action.icon}
              {action.label}
            </MenuItem>
          )}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

interface EditableCellContentProps<RowData> {
  row: RowData;
  rowLabel: string;
  column: TreeTableColumn<RowData>;
  displayValue: ReactNode;
  tooltip: ReactNode;
  link: ReturnType<NonNullable<TreeTableColumn<RowData>["getLink"]>>;
  isTreeColumn: boolean;
  depth: number;
  isExpanded: boolean;
  hasChildItems: boolean;
  onToggle: () => void;
  autoEdit: boolean;
  onAutoEditHandled: () => void;
}

function TreeTableCellContent<RowData>({
  row,
  rowLabel,
  column,
  displayValue,
  tooltip,
  link,
  isTreeColumn,
  depth,
  isExpanded,
  hasChildItems,
  onToggle,
  autoEdit,
  onAutoEditHandled,
}: EditableCellContentProps<RowData>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const ignoreNextBlurRef = useRef(false);
  const edit = column.edit;
  const editable = Boolean(edit && (edit.isEditable?.(row) ?? true));
  const readOnly = Boolean(editable && edit?.isReadOnly?.(row));
  const disabled = Boolean(editable && edit?.isDisabled?.(row));
  const align = column.align ?? "start";

  const restoreCellFocus = () => {
    const cell = inputRef.current?.closest("td");
    requestAnimationFrame(() => cell?.focus());
  };

  const startEditing = () => {
    if (!edit || !editable || readOnly || disabled) {
      return;
    }
    setDraft(getEditorValue(column, row));
    setError(undefined);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    ignoreNextBlurRef.current = true;
    setDraft(getEditorValue(column, row));
    setError(undefined);
    setIsEditing(false);
    restoreCellFocus();
  };

  const commitEditing = () => {
    if (!edit) {
      return;
    }

    const message = edit.validate?.(draft, row);
    if (message) {
      setError(message);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }

    ignoreNextBlurRef.current = true;
    edit.onCommit(row, draft);
    setError(undefined);
    setIsEditing(false);
    restoreCellFocus();
  };

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (autoEdit) {
      startEditing();
      onAutoEditHandled();
    }
    // Auto-edit is intentionally consumed once for a newly inserted row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEdit]);

  const renderedValue = link ? (
    <a
      tabIndex={-1}
      href={link.href}
      target={link.target}
      rel={link.rel}
      download={link.download}
      onClick={link.onClick}
      className="block max-w-full truncate rounded-sm text-blue-700 underline decoration-blue-300 underline-offset-2 outline-none hover:decoration-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-blue-300 dark:decoration-blue-700 dark:hover:decoration-blue-300 dark:focus-visible:ring-blue-400"
    >
      {displayValue}
    </a>
  ) : tooltip && !editable && !column.onPress ? (
    <ValueTooltip content={tooltip}>{displayValue}</ValueTooltip>
  ) : editable && !readOnly && !disabled ? (
    <Button
      excludeFromTabOrder
      onPress={startEditing}
      className={`flex h-full w-full min-w-0 items-center rounded-sm text-inherit outline-none hover:underline focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400 ${contentAlignmentClasses[align]}`}
    >
      <span className="truncate">{displayValue}</span>
    </Button>
  ) : column.onPress && !link ? (
    <Button
      excludeFromTabOrder
      onPress={() => column.onPress?.(row)}
      className="max-w-full truncate rounded-sm text-inherit outline-none hover:underline focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400"
    >
      {displayValue}
    </Button>
  ) : (
    displayValue
  );

  return (
    <div
      className={`flex min-h-12 min-w-0 items-center gap-2 px-4 py-2 ${contentAlignmentClasses[align]}`}
      onDoubleClick={(event) => {
        if (!(event.target as Element).closest(interactiveTargetSelector)) {
          startEditing();
        }
      }}
      style={
        isTreeColumn
          ? {
              paddingInlineStart: `${1 + depth * 1.25}rem`,
            }
          : undefined
      }
    >
      {isTreeColumn && (
        <span className="flex size-7 shrink-0 items-center justify-center">
          {hasChildItems && (
            <Button
              excludeFromTabOrder
              onPress={onToggle}
              aria-label={`${isExpanded ? "Collapse" : "Expand"} ${rowLabel}`}
              className="inline-flex size-7 items-center justify-center rounded-md text-slate-500 outline-none hover:bg-slate-200 data-[pressed]:bg-slate-300 focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:data-[pressed]:bg-slate-600 dark:focus-visible:ring-blue-400"
            >
              <ChevronIcon expanded={isExpanded} />
            </Button>
          )}
        </span>
      )}

      <div
        className={`relative min-w-0 flex-1 self-stretch ${alignmentClasses[align]} ${
          column.onPress && !editable && !link
            ? "cursor-pointer hover:underline"
            : ""
        }`}
        title={tooltip && typeof tooltip === "string" ? tooltip : undefined}
      >
        {isEditing && edit ? (
          <>
            <input
              ref={inputRef}
              value={draft}
              inputMode={getEditorInputMode(column)}
              aria-label={
                edit.ariaLabel?.(row) ??
                `Edit ${column.headerText ?? (typeof column.header === "string" ? column.header : column.key)} for ${rowLabel}`
              }
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              placeholder={edit.placeholder?.(row)}
              disabled={disabled}
              readOnly={readOnly}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (!acceptsEditorDraft(column, nextValue)) return;

                setDraft(nextValue);
                if (error) {
                  setError(edit.validate?.(nextValue, row));
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  cancelEditing();
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  event.stopPropagation();
                  commitEditing();
                }
              }}
              onBlur={() => {
                if (ignoreNextBlurRef.current) {
                  ignoreNextBlurRef.current = false;
                  return;
                }
                if (edit.commitOnBlur === false) {
                  cancelEditing();
                } else {
                  commitEditing();
                }
              }}
                    className={`absolute inset-0 box-border h-full w-full min-w-0 border-0 bg-transparent p-0 text-inherit outline-none disabled:cursor-not-allowed disabled:opacity-60 ${alignmentClasses[align]} ${
                error
                  ? "shadow-[inset_0_-2px_0_0_var(--color-red-500)]"
                  : "focus:shadow-[inset_0_-2px_0_0_var(--color-blue-600)] dark:focus:shadow-[inset_0_-2px_0_0_var(--color-blue-400)]"
              }`}
            />
            {error && (
              <span id={errorId} role="alert" className="sr-only">
                {error}
              </span>
            )}
          </>
              ) : (
                <span
                  className={`flex h-full w-full min-w-0 items-center truncate ${contentAlignmentClasses[align]}`}
                >
                  {renderedValue}
                </span>
        )}
      </div>
    </div>
  );
}

function AddActionButton({
  action,
  depth,
  stickyOffset,
  isFocused,
  buttonRef,
  onFocus,
  onKeyDown,
}: {
  action: TreeTableAddAction;
  depth: number;
  stickyOffset?: number;
  isFocused: boolean;
  buttonRef: (node: HTMLButtonElement | null) => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div
      className={`flex w-fit flex-wrap items-center gap-2 py-2 pe-4 ${
        stickyOffset === undefined ? "" : "md:sticky md:z-20"
      }`}
      style={{
        paddingInlineStart: `${1 + depth * 1.25}rem`,
        ...(stickyOffset === undefined
          ? undefined
          : { insetInlineStart: stickyOffset }),
      }}
    >
      <Button
        ref={buttonRef}
        excludeFromTabOrder={!isFocused}
        isDisabled={action.disabled}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onPress={action.onAction}
        className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-normal text-slate-500 outline-none hover:bg-slate-100 hover:text-slate-800 data-[pressed]:bg-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:data-[pressed]:bg-slate-700 dark:focus-visible:ring-blue-400"
      >
        <PlusIcon group={action.kind === "group"} className="size-5" />
        {action.label}
      </Button>
    </div>
  );
}

/** Renders hierarchical or flat data as an accessible, interactive tree table. */
export function TreeTable<RowData>({
  caption,
  rows,
  columns,
  getRowKey,
  getChildren,
  treeColumnKey,
  getRowLabel,
  expandedKeys,
  defaultExpandedKeys,
  onExpandedChange,
  bulkExpansion,
  locale,
  getRowActions,
  actionsLabel = "Row actions",
  getAddActions,
  isTotalRow,
  stickyTotalRows = false,
  stickyHeader = true,
  stickyHeaderOffset = 0,
  stickyFirstColumn = true,
  stickyFirstColumnOffset = 0,
  minTableWidth = "40rem",
  isLoading = false,
  loadingLabel = "Loading table data",
  emptyContent = "No rows to display.",
  className,
}: TreeTableProps<RowData>) {
  const instanceId = useId();
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<
    Set<TreeTableKey>
  >(() => new Set(defaultExpandedKeys));
  const activeExpandedKeys = useMemo(
    () =>
      expandedKeys === undefined ? internalExpandedKeys : new Set(expandedKeys),
    [expandedKeys, internalExpandedKeys],
  );
  const hierarchyColumnKey = treeColumnKey ?? columns[0]?.key;
  const hierarchyColumnIndex = Math.max(
    0,
    columns.findIndex((column) => column.key === hierarchyColumnKey),
  );
  const hasHierarchy = Boolean(getChildren && hierarchyColumnKey);
  const hasActionsColumn = Boolean(getRowActions);
  const totalColumnCount = columns.length + (hasActionsColumn ? 1 : 0);
  const allRows = useMemo(
    () => collectRows(rows, getRowKey, getChildren),
    [rows, getRowKey, getChildren],
  );
  const visibleRows = useMemo(
    () => collectVisibleRows(rows, getRowKey, getChildren, activeExpandedKeys),
    [rows, getRowKey, getChildren, activeExpandedKeys],
  );
  const expandableKeys = useMemo(
    () => collectExpandableKeys(rows, getRowKey, getChildren),
    [rows, getRowKey, getChildren],
  );
  const allExpanded =
    expandableKeys.size > 0 &&
    [...expandableKeys].every((key) => activeExpandedKeys.has(key));

  const updateExpandedKeys = (keys: Set<TreeTableKey>) => {
    if (expandedKeys === undefined) {
      setInternalExpandedKeys(new Set(keys));
    }
    onExpandedChange?.(new Set(keys));
  };

  const visibleTotalOffsets = useMemo(() => {
    const totals = isTotalRow
      ? visibleRows.filter(({ row }) => isTotalRow(row))
      : [];
    return new Map(
      totals.map(({ key }, index) => [key, (totals.length - index - 1) * 48]),
    );
  }, [isTotalRow, visibleRows]);

  const [autoEditCell, setAutoEditCell] = useState<{
    rowKey: TreeTableKey;
    columnKey: string;
  }>();
  const previousKeysRef = useRef<Set<TreeTableKey>>(
    new Set(allRows.map(({ key }) => key)),
  );

  useEffect(() => {
    const currentKeys = new Set(allRows.map(({ key }) => key));
    const newRow = visibleRows.find(
      ({ key }) => !previousKeysRef.current.has(key),
    );
    previousKeysRef.current = currentKeys;

    if (!newRow) {
      return;
    }

    const editableColumn = columns.find((column) => {
      const edit = column.edit;
      return Boolean(
        edit &&
        (edit.isEditable?.(newRow.row) ?? true) &&
        !edit.isReadOnly?.(newRow.row) &&
        !edit.isDisabled?.(newRow.row),
      );
    });

    if (editableColumn) {
      setAutoEditCell({
        rowKey: newRow.key,
        columnKey: editableColumn.key,
      });
    }
  }, [allRows, columns, visibleRows]);

  const getLabel = (row: RowData) =>
    getRowLabel?.(row) ?? String(getRowKey(row));

  const getAddFocusKey = (
    parentKey: TreeTableKey | "root",
    actionKey: string,
  ) =>
    `${instanceId}:add:${typeof parentKey}:${String(parentKey)}:${actionKey}`;

  const focusRowKeys = useMemo(() => {
    const result: (TreeTableKey | null)[] = [null];

    const visit = (items: readonly RowData[]) => {
      for (const item of items) {
        const key = getRowKey(item);
        result.push(key);

        if (!activeExpandedKeys.has(key)) continue;
        const children = getChildren?.(item);
        if (children) visit(children);
        for (const action of getAddActions?.(item) ?? []) {
          if (action.disabled) continue;
          result.push(
            `${instanceId}:add:${typeof key}:${String(key)}:${action.key}`,
          );
        }
      }
    };

    visit(rows);
    for (const action of getAddActions?.(undefined) ?? []) {
      if (action.disabled) continue;
      result.push(`${instanceId}:add:string:root:${action.key}`);
    }
    return result;
  }, [
    activeExpandedKeys,
    getAddActions,
    getChildren,
    getRowKey,
    instanceId,
    rows,
  ]);

  const [activeCell, setActiveCell] = useState<{
    rowKey: TreeTableKey | null;
    columnIndex: number;
  }>({ rowKey: null, columnIndex: 0 });
  const activeCellRef = useRef(activeCell);
  const verticalNavigationColumnRef = useRef(0);
  const cellRefs = useRef(new Map<string, HTMLElement>());
  const gridHasFocus = useRef(false);
  const parentKeys = useMemo(() => {
    const result = new Map<TreeTableKey, TreeTableKey>();
    const visit = (items: readonly RowData[], parent?: TreeTableKey) => {
      for (const item of items) {
        const key = getRowKey(item);
        if (parent !== undefined) result.set(key, parent);
        const children = getChildren?.(item);
        if (children) visit(children, key);
      }
    };
    visit(rows);
    return result;
  }, [rows, getRowKey, getChildren]);

  const getCellRefKey = (
    rowKey: TreeTableKey | null,
    columnIndex: number,
  ) =>
    rowKey === null
      ? `header:${columnIndex}`
      : `row:${typeof rowKey}:${String(rowKey)}:${columnIndex}`;

  const setActiveFocus = (
    rowKey: TreeTableKey | null,
    columnIndex: number,
  ) => {
    const next = { rowKey, columnIndex };
    activeCellRef.current = next;
    setActiveCell(next);
  };

  const focusCell = (rowKey: TreeTableKey | null, columnIndex: number) => {
    const boundedColumn = Math.max(
      0,
      Math.min(totalColumnCount - 1, columnIndex),
    );
    const previous = activeCellRef.current;
    const previousElement = cellRefs.current.get(
      getCellRefKey(previous.rowKey, previous.columnIndex),
    );
    let nextColumn = boundedColumn;
    let nextElement = cellRefs.current.get(
      getCellRefKey(rowKey, boundedColumn),
    );

    if (!nextElement) {
      nextColumn = 0;
      nextElement = cellRefs.current.get(getCellRefKey(rowKey, nextColumn));
    }

    previousElement?.setAttribute("tabindex", "-1");
    if (!nextElement) return;

    nextElement.tabIndex = 0;
    setActiveFocus(rowKey, nextColumn);
    nextElement.focus();
  };

  useEffect(() => {
    if (visibleRows.length === 0) return;
    if (activeCell.rowKey === null) return;
    if (!focusRowKeys.includes(activeCell.rowKey)) {
      let fallback = parentKeys.get(activeCell.rowKey);
      while (
        fallback !== undefined &&
        !visibleRows.some(({ key }) => key === fallback)
      ) {
        fallback = parentKeys.get(fallback);
      }
      // The focused row may disappear after a controlled data or expansion update.
      const fallbackKey = fallback ?? visibleRows[0].key;
      // oxlint-disable-next-line react/set-state-in-effect
      setActiveFocus(fallbackKey, activeCell.columnIndex);
      if (gridHasFocus.current) {
        requestAnimationFrame(() =>
          cellRefs.current
            .get(getCellRefKey(fallbackKey, activeCell.columnIndex))
            ?.focus(),
        );
      }
    }
  }, [activeCell, focusRowKeys, parentKeys, visibleRows]);

  const handleCellKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    rowKey: TreeTableKey,
    columnIndex: number,
    hasChildren: boolean,
  ) => {
    if (event.target !== event.currentTarget) return;
    const focusRowIndex = focusRowKeys.findIndex((key) => key === rowKey);
    const isAddActionRow =
      typeof rowKey === "string" && rowKey.startsWith(`${instanceId}:add:`);
    let nextRowKey: TreeTableKey | null = rowKey;
    let nextColumn = columnIndex;

    switch (event.key) {
      case "ArrowUp":
        if (!isAddActionRow) {
          verticalNavigationColumnRef.current = columnIndex;
        }
        nextColumn = verticalNavigationColumnRef.current;
        nextRowKey = focusRowKeys[Math.max(0, focusRowIndex - 1)];
        break;
      case "ArrowDown":
        if (!isAddActionRow) {
          verticalNavigationColumnRef.current = columnIndex;
        }
        nextColumn = verticalNavigationColumnRef.current;
        nextRowKey =
          focusRowKeys[Math.min(focusRowKeys.length - 1, focusRowIndex + 1)];
        break;
      case "ArrowLeft":
        if (
          columnIndex === hierarchyColumnIndex &&
          hasChildren &&
          activeExpandedKeys.has(rowKey)
        ) {
          event.preventDefault();
          const keys = new Set(activeExpandedKeys);
          keys.delete(rowKey);
          updateExpandedKeys(keys);
          return;
        }
        if (columnIndex === hierarchyColumnIndex && parentKeys.has(rowKey)) {
          event.preventDefault();
          focusCell(parentKeys.get(rowKey)!, hierarchyColumnIndex);
          return;
        }
        nextColumn = Math.max(0, columnIndex - 1);
        break;
      case "ArrowRight":
        if (
          columnIndex === hierarchyColumnIndex &&
          hasChildren &&
          !activeExpandedKeys.has(rowKey)
        ) {
          event.preventDefault();
          updateExpandedKeys(new Set([...activeExpandedKeys, rowKey]));
          return;
        }
        nextColumn = Math.min(totalColumnCount - 1, columnIndex + 1);
        break;
      case "Home":
        if (event.ctrlKey) {
          event.preventDefault();
          focusCell(null, 0);
          return;
        }
        nextColumn = 0;
        break;
      case "End":
        if (event.ctrlKey) {
          nextRowKey = focusRowKeys[focusRowKeys.length - 1];
        }
        nextColumn = totalColumnCount - 1;
        break;
      case " ":
        if (columnIndex === hierarchyColumnIndex && hasChildren) {
          event.preventDefault();
          const keys = new Set(activeExpandedKeys);
          if (keys.has(rowKey)) keys.delete(rowKey);
          else keys.add(rowKey);
          updateExpandedKeys(keys);
        }
        return;
      default:
        return;
    }

    event.preventDefault();
    focusCell(nextRowKey, nextColumn);
  };

  const handleHeaderKeyDown = (
    event: KeyboardEvent<HTMLTableCellElement>,
    columnIndex: number,
  ) => {
    if (event.target !== event.currentTarget) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.currentTarget.focus();
      }
      return;
    }

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        focusCell(null, Math.max(0, columnIndex - 1));
        break;
      case "ArrowRight":
        event.preventDefault();
        focusCell(null, Math.min(totalColumnCount - 1, columnIndex + 1));
        break;
      case "ArrowDown":
        if (focusRowKeys.length > 1) {
          event.preventDefault();
          const firstBodyRow = focusRowKeys[1];
          verticalNavigationColumnRef.current = columnIndex;
          focusCell(firstBodyRow, columnIndex);
        }
        break;
      case "Home":
        event.preventDefault();
        focusCell(null, 0);
        break;
      case "End":
        event.preventDefault();
        if (event.ctrlKey && focusRowKeys.length > 1) {
          const lastRow = focusRowKeys[focusRowKeys.length - 1];
          verticalNavigationColumnRef.current = totalColumnCount - 1;
          focusCell(lastRow, totalColumnCount - 1);
        } else {
          focusCell(null, totalColumnCount - 1);
        }
        break;
      case "Enter":
      case " ":
        if (bulkExpansion && columnIndex === hierarchyColumnIndex) {
          event.preventDefault();
          updateExpandedKeys(allExpanded ? new Set() : expandableKeys);
        }
        break;
    }
  };

  const renderAddActionRows = (
    actions: readonly TreeTableAddAction[],
    parentKey: TreeTableKey | "root",
    depth: number,
  ) =>
    actions.map((action) => {
      const focusKey = getAddFocusKey(parentKey, action.key);
      return (
        <tr key={focusKey} role="row" className="group">
          <td
            role="gridcell"
            colSpan={totalColumnCount}
            className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
          >
            <AddActionButton
              action={action}
              depth={depth}
              stickyOffset={
                stickyFirstColumn ? stickyFirstColumnOffset : undefined
              }
              isFocused={
                activeCell.rowKey === focusKey && activeCell.columnIndex === 0
              }
              buttonRef={(node) => {
                const refKey = getCellRefKey(focusKey, 0);
                if (node) cellRefs.current.set(refKey, node);
                else cellRefs.current.delete(refKey);
              }}
              onFocus={() => setActiveFocus(focusKey, 0)}
              onKeyDown={(event) =>
                handleCellKeyDown(event, focusKey, 0, false)
              }
            />
          </td>
        </tr>
      );
    });

  const renderRow = (row: RowData, depth = 0): ReactNode[] => {
    const rowKey = getRowKey(row);
    const children = getChildren?.(row);
    const rowActions = getRowActions?.(row) ?? [];
    const addActions = getAddActions?.(row) ?? [];
    const total = isTotalRow?.(row) ?? false;
    const rowLabel = getLabel(row);
    const stickyTotalOffset =
      stickyTotalRows && total ? visibleTotalOffsets.get(rowKey) : undefined;

    const hasChildItems = children !== undefined || addActions.length > 0;
    const expanded = activeExpandedKeys.has(rowKey);
    const currentRow = (
      <tr
        key={rowKey}
        role="row"
        aria-level={hasHierarchy ? depth + 1 : undefined}
        aria-expanded={hasHierarchy && hasChildItems ? expanded : undefined}
        className="group h-12 outline-none hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        {columns.map((column, columnIndex) => {
          const displayValue = renderColumnValue(column, row, locale);
          const tooltip = column.cellTooltip?.(row);
          const isTreeColumn =
            hasHierarchy && column.key === hierarchyColumnKey;
          const edit = column.edit;
          const editable = Boolean(edit && (edit.isEditable?.(row) ?? true));
          const readOnly = Boolean(editable && edit?.isReadOnly?.(row));
          const disabled = Boolean(editable && edit?.isDisabled?.(row));
          const link = editable ? undefined : column.getLink?.(row);
          const stickyClasses = [
            isTreeColumn && stickyFirstColumn ? "md:sticky" : "",
            stickyTotalOffset !== undefined ? "sticky" : "",
          ].join(" ");
          const zIndexClass =
            isTreeColumn && stickyFirstColumn && stickyTotalOffset !== undefined
              ? "z-30"
              : isTreeColumn && stickyFirstColumn
                ? "z-20"
                : stickyTotalOffset !== undefined
                  ? "z-10"
                  : "z-0";
          const backgroundClass =
            column.isSummary || total
              ? "bg-indigo-50 dark:bg-indigo-950/40"
              : "bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-800";

          return (
            <td
              key={column.key}
              ref={(node) => {
                const refKey = getCellRefKey(rowKey, columnIndex);
                if (node) cellRefs.current.set(refKey, node);
                else cellRefs.current.delete(refKey);
              }}
              role={hasHierarchy && isTreeColumn ? "rowheader" : "gridcell"}
              tabIndex={
                activeCell.rowKey === rowKey &&
                activeCell.columnIndex === columnIndex
                  ? 0
                  : -1
              }
              aria-readonly={edit && (!editable || readOnly) ? true : undefined}
              aria-disabled={disabled || undefined}
              data-editable={
                editable && !readOnly && !disabled ? "true" : undefined
              }
              onFocus={(event) => {
                if (event.target === event.currentTarget) {
                  verticalNavigationColumnRef.current = columnIndex;
                  setActiveFocus(rowKey, columnIndex);
                }
              }}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    event.currentTarget.focus();
                  }
                  return;
                }

                if (
                  event.key === "Enter" &&
                  editable &&
                  !readOnly &&
                  !disabled
                ) {
                  event.preventDefault();
                  setAutoEditCell({ rowKey, columnKey: column.key });
                  return;
                }

                if (event.key === "Enter" && link) {
                  event.preventDefault();
                  event.currentTarget.querySelector("a")?.focus();
                  return;
                }

                if (event.key === "Enter" && column.onPress) {
                  event.preventDefault();
                  column.onPress(row);
                  return;
                }

                handleCellKeyDown(
                  event,
                  rowKey,
                  columnIndex,
                  hasChildItems,
                );
              }}
              style={{
                ...(isTreeColumn && stickyFirstColumn
                  ? { insetInlineStart: stickyFirstColumnOffset }
                  : undefined),
                ...(stickyTotalOffset !== undefined
                  ? { bottom: stickyTotalOffset }
                  : undefined),
              }}
              className={`relative box-border min-w-24 border-b border-slate-200 p-0 align-middle text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:border-slate-700 dark:text-slate-200 dark:focus-visible:ring-blue-400 ${
                total ? "h-12 font-semibold" : ""
              } ${backgroundClass} ${stickyClasses} ${zIndexClass}`}
            >
              <TreeTableCellContent
                row={row}
                rowLabel={rowLabel}
                column={column}
                displayValue={displayValue}
                tooltip={tooltip}
                link={link}
                isTreeColumn={isTreeColumn}
                depth={depth}
                isExpanded={expanded}
                hasChildItems={hasChildItems}
                onToggle={() => {
                  const keys = new Set(activeExpandedKeys);
                  if (keys.has(rowKey)) keys.delete(rowKey);
                  else keys.add(rowKey);
                  updateExpandedKeys(keys);
                }}
                autoEdit={
                  autoEditCell?.rowKey === rowKey &&
                  autoEditCell.columnKey === column.key
                }
                onAutoEditHandled={() => setAutoEditCell(undefined)}
              />
            </td>
          );
        })}

        {hasActionsColumn && (
          <td
            ref={(node) => {
              if (rowActions.length > 0) return;
              const refKey = getCellRefKey(rowKey, columns.length);
              if (node) cellRefs.current.set(refKey, node);
              else cellRefs.current.delete(refKey);
            }}
            role="gridcell"
            tabIndex={
              rowActions.length === 0 &&
              activeCell.rowKey === rowKey &&
              activeCell.columnIndex === columns.length
                ? 0
                : -1
            }
            onFocus={(event) => {
              if (
                rowActions.length === 0 &&
                event.target === event.currentTarget
              ) {
                verticalNavigationColumnRef.current = columns.length;
                setActiveFocus(rowKey, columns.length);
              }
            }}
            onKeyDown={(event) => {
              if (rowActions.length > 0) return;
              if (event.target !== event.currentTarget) {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.currentTarget.focus();
                }
                return;
              }

              handleCellKeyDown(
                event,
                rowKey,
                columns.length,
                hasChildItems,
              );
            }}
            className={`border-b border-slate-200 bg-white px-3 py-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 group-hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:focus-visible:ring-blue-400 dark:group-hover:bg-slate-800 ${
              stickyTotalOffset !== undefined ? "sticky z-10" : ""
            }`}
            style={
              stickyTotalOffset !== undefined
                ? { bottom: stickyTotalOffset }
                : undefined
            }
          >
            <RowActionsMenu
              rowLabel={rowLabel}
              actions={rowActions}
              isFocused={
                activeCell.rowKey === rowKey &&
                activeCell.columnIndex === columns.length
              }
              buttonRef={(node) => {
                if (rowActions.length === 0) return;
                const refKey = getCellRefKey(rowKey, columns.length);
                if (node) cellRefs.current.set(refKey, node);
                else cellRefs.current.delete(refKey);
              }}
              onFocus={() => {
                verticalNavigationColumnRef.current = columns.length;
                setActiveFocus(rowKey, columns.length);
              }}
              onKeyDown={(event) =>
                handleCellKeyDown(
                  event,
                  rowKey,
                  columns.length,
                  hasChildItems,
                )
              }
            />
          </td>
        )}
      </tr>
    );

    const result: ReactNode[] = [currentRow];
    if (expanded) {
      for (const child of children ?? [])
        result.push(...renderRow(child, depth + 1));
      if (addActions.length > 0) {
        result.push(...renderAddActionRows(addActions, rowKey, depth + 1));
      }
    }
    return result;
  };

  const rootAddActions = getAddActions?.(undefined) ?? [];
  const bulkLabels = typeof bulkExpansion === "object" ? bulkExpansion : {};
  return (
    <div
      className={`w-full ${className ?? ""}`}
      onFocusCapture={() => {
        gridHasFocus.current = true;
      }}
      onBlurCapture={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          gridHasFocus.current = false;
        }
      }}
    >
      <div className="relative w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <table
          role={hasHierarchy ? "treegrid" : "grid"}
          aria-label={caption}
          aria-busy={isLoading || undefined}
          inert={isLoading && rows.length > 0 ? true : undefined}
          className="w-full border-separate border-spacing-0 text-sm text-slate-700 dark:text-slate-200 [&_tbody>tr:last-child>td:first-child]:rounded-es-lg [&_tbody>tr:last-child>td:last-child]:rounded-ee-lg"
          style={{ minWidth: minTableWidth }}
        >
          <thead>
            <tr role="row">
              {columns.map((column, columnIndex) => {
                const isTreeColumn = column.key === hierarchyColumnKey;
                const sticky =
                  stickyHeader || (isTreeColumn && stickyFirstColumn);
                const style: CSSProperties = {
                  ...(stickyHeader ? { top: stickyHeaderOffset } : undefined),
                  ...(isTreeColumn && stickyFirstColumn
                    ? { insetInlineStart: stickyFirstColumnOffset }
                    : undefined),
                };
                return (
                  <th
                    key={column.key}
                    ref={(node) => {
                      const refKey = getCellRefKey(null, columnIndex);
                      if (node) cellRefs.current.set(refKey, node);
                      else cellRefs.current.delete(refKey);
                    }}
                    role="columnheader"
                    scope="col"
                    tabIndex={
                      activeCell.rowKey === null &&
                      activeCell.columnIndex === columnIndex
                        ? 0
                        : -1
                    }
                    onFocus={(event) => {
                      if (event.target === event.currentTarget) {
                        setActiveFocus(null, columnIndex);
                      }
                    }}
                    onKeyDown={(event) =>
                      handleHeaderKeyDown(event, columnIndex)
                    }
                    style={style}
                    className={`border-b border-slate-200 px-4 py-3 font-semibold whitespace-nowrap text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:border-slate-700 dark:text-slate-100 dark:focus-visible:ring-blue-400 ${
                      columnIndex === 0 ? "rounded-ss-lg" : ""
                    } ${
                      !hasActionsColumn && columnIndex === columns.length - 1
                        ? "rounded-se-lg"
                        : ""
                    } ${alignmentClasses[column.align ?? "start"]} ${
                      column.isSummary
                        ? "bg-indigo-100 dark:bg-indigo-950"
                        : "bg-slate-50 dark:bg-slate-800"
                    } ${sticky ? "sticky" : ""} ${
                      isTreeColumn && stickyFirstColumn ? "z-50" : "z-40"
                    }`}
                  >
                    <HeaderContent
                      column={column}
                      bulkControl={
                        bulkExpansion && isTreeColumn ? (
                          <Button
                            excludeFromTabOrder
                            isDisabled={expandableKeys.size === 0}
                            aria-label={
                              allExpanded
                                ? (bulkLabels.collapse ?? "Collapse all")
                                : (bulkLabels.expand ?? "Expand all")
                            }
                            onPress={() =>
                              updateExpandedKeys(
                                allExpanded ? new Set() : expandableKeys,
                              )
                            }
                            className="inline-flex size-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 shadow-sm outline-none hover:bg-slate-100 data-[pressed]:bg-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:data-[pressed]:bg-slate-600 dark:focus-visible:ring-blue-400"
                          >
                            <ChevronIcon expanded={allExpanded} />
                          </Button>
                        ) : undefined
                      }
                    />
                  </th>
                );
              })}
              {hasActionsColumn && (
                <th
                  ref={(node) => {
                    const refKey = getCellRefKey(null, columns.length);
                    if (node) cellRefs.current.set(refKey, node);
                    else cellRefs.current.delete(refKey);
                  }}
                  role="columnheader"
                  scope="col"
                  tabIndex={
                    activeCell.rowKey === null &&
                    activeCell.columnIndex === columns.length
                      ? 0
                      : -1
                  }
                  onFocus={(event) => {
                    if (event.target === event.currentTarget) {
                      setActiveFocus(null, columns.length);
                    }
                  }}
                  onKeyDown={(event) =>
                    handleHeaderKeyDown(event, columns.length)
                  }
                  style={stickyHeader ? { top: stickyHeaderOffset } : undefined}
                  className={`w-14 rounded-se-lg border-b border-slate-200 bg-slate-50 px-3 py-3 text-center font-semibold text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus-visible:ring-blue-400 ${
                    stickyHeader ? "sticky z-40" : ""
                  }`}
                >
                  <span className="sr-only">{actionsLabel}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.flatMap((row) => renderRow(row))}
            {rootAddActions.length > 0 &&
              renderAddActionRows(rootAddActions, "root", 0)}
            {rows.length === 0 && rootAddActions.length === 0 && (
              <tr>
                <td colSpan={totalColumnCount}>
                  <div
                    role={isLoading ? "status" : undefined}
                    aria-live={isLoading ? "polite" : undefined}
                    className="flex min-h-28 items-center justify-center gap-2 px-6 py-8 text-sm text-slate-500 dark:text-slate-400"
                  >
                    {isLoading && <Spinner />}
                    {isLoading ? loadingLabel : emptyContent}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {isLoading && rows.length > 0 && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-[60] flex items-center justify-center gap-2 bg-white/75 text-sm font-medium text-slate-700 backdrop-blur-[1px] dark:bg-slate-950/70 dark:text-slate-200"
          >
            <Spinner />
            {loadingLabel}
          </div>
        )}
      </div>
    </div>
  );
}
