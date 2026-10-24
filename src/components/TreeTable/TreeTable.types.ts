import type { MouseEvent, ReactNode } from "react";

/** A serializable identifier accepted by React Aria collections. */
export type TreeTableKey = string | number;

/** Controls the horizontal placement of content within a column. */
export type TreeTableColumnAlignment = "start" | "center" | "end";

/** Describes a link rendered inside a table cell or action menu. */
export interface TreeTableLink {
  /** Destination URL. */
  href: string;

  /** Browsing context in which the destination should open. */
  target?: string;

  /** Relationship between the current page and the destination. */
  rel?: string;

  /** Enables downloading the linked resource. */
  download?: boolean | string;

  /** Receives the native link activation event. */
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

/** Configures inline editing for a column. */
export interface TreeTableEditConfig<RowData> {
  /** Supplies the plain text placed in the editor. */
  getValue?: (row: RowData) => string;

  /** Receives a validated value when editing is committed. */
  onCommit: (row: RowData, value: string) => void;

  /** Determines whether a specific row supports editing in this column. */
  isEditable?: (row: RowData) => boolean;

  /** Marks an otherwise editable cell as read-only. */
  isReadOnly?: (row: RowData) => boolean;

  /** Temporarily prevents interaction with the editor. */
  isDisabled?: (row: RowData) => boolean;

  /** Returns placeholder text for an empty editor. */
  placeholder?: (row: RowData) => string | undefined;

  /** Returns an error message, or `undefined` when the value is valid. */
  validate?: (value: string, row: RowData) => string | undefined;

  /** Commits a valid value when focus leaves the editor. Defaults to `true`. */
  commitOnBlur?: boolean;

  /** Provides a specific accessible name for the editor. */
  ariaLabel?: (row: RowData) => string;
}

/** Properties shared by every column type. */
export interface TreeTableColumnBase<RowData> {
  /** Stable identifier for the column. */
  key: string;

  /** Content displayed in the column header. */
  header: ReactNode;

  /** Plain text used when the custom header cannot label itself. */
  headerText?: string;

  /** Secondary information displayed below the header. */
  description?: ReactNode;

  /** Produces optional tooltip content for each cell. */
  cellTooltip?: (row: RowData) => ReactNode;

  /** Horizontal alignment shared by the header and body cells. */
  align?: TreeTableColumnAlignment;

  /** Applies visual emphasis to the complete column. */
  isSummary?: boolean;

  /** Overrides the standard renderer for this column. */
  renderCell?: (row: RowData) => ReactNode;

  /** Enables inline editing for eligible rows. */
  edit?: TreeTableEditConfig<RowData>;

  /** Handles activation of a non-editable, non-link cell. */
  onPress?: (row: RowData) => void;

  /** Returns link properties for a row, or `undefined` for plain content. */
  getLink?: (row: RowData) => TreeTableLink | undefined;
}

/** A column whose content is fully supplied by a render function. */
export interface TreeTableCustomColumn<RowData>
  extends TreeTableColumnBase<RowData> {
  type?: "custom";
  renderCell: (row: RowData) => ReactNode;
}

/** A column backed by a textual value. */
export interface TreeTableTextColumn<RowData>
  extends TreeTableColumnBase<RowData> {
  type: "text";
  value: (row: RowData) => string | null | undefined;
  formatValue?: (value: string, row: RowData) => ReactNode;
}

/** Options shared by locale-aware numeric columns. */
export interface TreeTableNumberColumnBase<RowData>
  extends TreeTableColumnBase<RowData> {
  value: (row: RowData) => number | null | undefined;
  numberFormat?: Intl.NumberFormatOptions;
  formatValue?: (value: number, row: RowData) => ReactNode;
}

/** A whole-number column. */
export interface TreeTableIntegerColumn<RowData>
  extends TreeTableNumberColumnBase<RowData> {
  type: "integer";
}

/** A general decimal-number column. */
export interface TreeTableDecimalColumn<RowData>
  extends TreeTableNumberColumnBase<RowData> {
  type: "decimal";
}

/** A percentage column whose values use the `Intl.NumberFormat` percent scale. */
export interface TreeTablePercentageColumn<RowData>
  extends TreeTableNumberColumnBase<RowData> {
  type: "percentage";
}

/** A monetary column formatted with an ISO 4217 currency code. */
export interface TreeTableCurrencyColumn<RowData>
  extends TreeTableNumberColumnBase<RowData> {
  type: "currency";
  currency: string;
}

/** A numeric column formatted with an `Intl.NumberFormat` unit identifier. */
export interface TreeTableUnitColumn<RowData>
  extends TreeTableNumberColumnBase<RowData> {
  type: "unit";
  unit: string;
  unitDisplay?: "long" | "short" | "narrow";
}

/** Defines a column in a `TreeTable`. */
export type TreeTableColumn<RowData> =
  | TreeTableCustomColumn<RowData>
  | TreeTableTextColumn<RowData>
  | TreeTableIntegerColumn<RowData>
  | TreeTableDecimalColumn<RowData>
  | TreeTablePercentageColumn<RowData>
  | TreeTableCurrencyColumn<RowData>
  | TreeTableUnitColumn<RowData>;

/** Describes one item in a row's action menu. */
export interface TreeTableRowAction {
  /** Stable identifier for the action. */
  key: string;

  /** Visible and accessible action label. */
  label: string;

  /** Optional icon displayed before the label. */
  icon?: ReactNode;

  /** Prevents activation while keeping the item discoverable. */
  disabled?: boolean;

  /** Applies destructive-action styling. */
  destructive?: boolean;

  /** Runs when the action is selected. */
  onAction?: () => void;

  /** Turns the menu item into a link. */
  link?: TreeTableLink;
}

/** Describes an add-row affordance displayed at a hierarchy level. */
export interface TreeTableAddAction {
  /** Stable identifier within its action row. */
  key: string;

  /** Distinguishes leaf creation from group creation for presentation. */
  kind: "row" | "group";

  /** Visible and accessible button label. */
  label: string;

  /** Prevents the action from being activated. */
  disabled?: boolean;

  /** Runs when the add action is selected. */
  onAction: () => void;
}

/** Labels for the optional bulk expansion control. */
export interface TreeTableBulkExpansionLabels {
  expand?: string;
  collapse?: string;
}

/** Properties for a generic, accessible tree table. */
export interface TreeTableProps<RowData> {
  /** Text that identifies the table to assistive technologies. */
  caption: string;

  /** Root records rendered in their provided order. */
  rows: readonly RowData[];

  /** Column definitions rendered from left to right. */
  columns: readonly TreeTableColumn<RowData>[];

  /** Returns a stable key that uniquely identifies a row. */
  getRowKey: (row: RowData) => TreeTableKey;

  /** Returns child records, or `undefined` when a row is not a group. */
  getChildren?: (row: RowData) => readonly RowData[] | undefined;

  /** Identifies the column that displays hierarchy controls. Defaults to the first column. */
  treeColumnKey?: string;

  /** Returns a concise row label for disclosure controls and action menus. */
  getRowLabel?: (row: RowData) => string;

  /** Controlled set of expanded row keys. */
  expandedKeys?: Iterable<TreeTableKey>;

  /** Initial expanded keys used when expansion is uncontrolled. */
  defaultExpandedKeys?: Iterable<TreeTableKey>;

  /** Receives a new expansion set after the user expands or collapses rows. */
  onExpandedChange?: (keys: Set<TreeTableKey>) => void;

  /** Displays an expand-all/collapse-all control. */
  bulkExpansion?: boolean | TreeTableBulkExpansionLabels;

  /** Locale or locale preference list used by numeric columns. */
  locale?: string | readonly string[];

  /** Returns menu actions for a row. */
  getRowActions?: (row: RowData) => readonly TreeTableRowAction[] | undefined;

  /** Accessible heading for the actions column. */
  actionsLabel?: string;

  /** Returns add actions for a group, or for the root when called with `undefined`. */
  getAddActions?: (
    parent: RowData | undefined,
  ) => readonly TreeTableAddAction[] | undefined;

  /** Marks rows that should receive total-row emphasis. */
  isTotalRow?: (row: RowData) => boolean;

  /** Keeps total rows stacked at the bottom edge while scrolling. */
  stickyTotalRows?: boolean;

  /** Keeps the column header visible while scrolling. Defaults to `true`. */
  stickyHeader?: boolean;

  /** Pixel offset applied to the sticky header. */
  stickyHeaderOffset?: number;

  /** Keeps the hierarchy column visible on medium and larger screens. Defaults to `true`. */
  stickyFirstColumn?: boolean;

  /** Pixel offset applied to the sticky hierarchy column. */
  stickyFirstColumnOffset?: number;

  /** Minimum width of the table before horizontal scrolling begins. */
  minTableWidth?: number | string;

  /** Indicates that data is currently being loaded or refreshed. */
  isLoading?: boolean;

  /** Accessible text announced while loading. */
  loadingLabel?: string;

  /** Content displayed when there are no rows. */
  emptyContent?: ReactNode;

  /** Additional classes applied to the outer container. */
  className?: string;
}
