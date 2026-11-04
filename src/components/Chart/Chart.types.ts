import type { ReactNode } from "react";

import type {
  ChartDateInput,
  ChartPeriod,
  ChartTimeZone,
  PeriodFormatter,
  WeekStart,
} from "./Chart.time";

/**
 * A value read from a datum for one series.
 *
 * `null`, `undefined` and non-finite numbers (`NaN`, `±Infinity`) are treated
 * as missing values: they are excluded from the value domain and are never
 * plotted as zero.
 */
export type ChartValue = number | null | undefined;

/**
 * How several values that fall into the same period combine into one point.
 *
 * - `sum`: totals, for flows such as revenue or transaction volume
 * - `average`: rates and ratios, such as conversion
 * - `last` / `first`: snapshots, such as an account balance at period end
 * - `min` / `max`: extremes
 * - a function receiving the period's values (never empty) for anything else
 */
export type ChartAggregate =
  | "sum"
  | "average"
  | "min"
  | "max"
  | "first"
  | "last"
  | ((values: readonly number[]) => number);

/**
 * Describes one series plotted from a shared dataset.
 *
 * Every series reads its value from the same `Datum` records, so a single
 * array of rows (for example, one row per month) can feed any number of series.
 */
export interface ChartSeries<Datum> {
  /** Stable identifier, unique within the chart. */
  key: string;

  /** Name shown in the legend, the tooltip and the generated description. */
  label: string;

  /** Reads this series' value from a datum. Return `null` or `undefined` for a missing value. */
  value: (datum: Datum, index: number) => ChartValue;

  /**
   * On a time axis, combines the values of all data in one period. Missing
   * values are ignored; a period with no values stays a gap. Defaults to `"sum"`.
   * Ignored on a category axis, where each datum is its own category.
   */
  aggregate?: ChartAggregate;

  /**
   * Any CSS color. Defaults to the next slot of the built-in categorical
   * palette, assigned by series position.
   */
  color?: string;
}

/** Extra information passed to `formatValue`. */
export interface ValueFormatContext {
  /**
   * Distance between adjacent axis ticks, present when formatting tick labels.
   * Use it to choose the precision, so that neighbouring ticks never format to
   * the same label (see `getTickSignificantDigits`).
   */
  step?: number;

  /**
   * Where the value appears. `axis` labels should be short (compact);
   * `tooltip` values can be exact. Absent for other uses, such as the
   * generated description.
   */
  target?: "axis" | "tooltip";
}

/** Formats a numeric value for display. */
export type ValueFormatter = (value: number, context?: ValueFormatContext) => string;

/**
 * Which gridlines to draw: `y` for horizontal lines at value ticks, `xy` to add
 * vertical lines at labelled categories, `none` for neither. The zero baseline
 * and the bottom axis line are always drawn.
 */
export type ChartGrid = "y" | "xy" | "none";

/**
 * A time axis: data carry dates and are grouped into calendar periods.
 *
 * Periods are continuous from the first to the last date (or across
 * `timeRange`), so a period without data shows as a gap rather than being
 * skipped. Data do not need to be sorted.
 */
export interface ChartTimeAxisProps<Datum> {
  /** Reads the date and time of a datum. Data with invalid dates are skipped. */
  getDate: (datum: Datum, index: number) => ChartDateInput;

  /** Granularity of the axis: one point or bar group per period. */
  period: ChartPeriod;

  /**
   * Formats the start of each period, for the axis (short) and for the tooltip
   * heading (complete); `context.variant` says which. Defaults to locale
   * formats chosen by `period`: on the axis `Mar 4`, `Mar`, `Q1`, with the year
   * added when the axis spans several years; in the tooltip
   * `Wed, Mar 4, 2026`, `Mar 2 – 8, 2026`, `March 2026`, `Q1 2026`.
   */
  formatPeriod?: PeriodFormatter;

  /**
   * Fixes the visible range, for example "last 12 months". Periods outside it
   * are dropped; empty periods inside it are shown as gaps. Defaults to the
   * range of the data.
   */
  timeRange?: { start: ChartDateInput; end: ChartDateInput };

  /** First day of a week for `period="week"`. Defaults to `1` (Monday). */
  weekStartsOn?: WeekStart;

  /** Zone used to assign dates to periods and to format labels. Defaults to `"local"`. */
  timeZone?: ChartTimeZone;

  /**
   * Marks periods the data only partly cover, such as the current month or a
   * week cut off by the first date: lines turn dashed into them, bars are
   * drawn lighter, and the tooltip, table and description say so. Their totals
   * are not comparable with full periods. Defaults to `true`.
   *
   * Coverage is the `timeRange` when given; otherwise the data's extent,
   * where each date is taken to stand for the interval it aligns to (a date
   * on the 1st of every month counts as the whole month).
   */
  markPartialPeriods?: boolean;

  // `never` makes the two axis modes mutually exclusive at compile time.
  getCategory?: never;
}

/** A category axis: each datum is one category, in the provided order. */
export interface ChartCategoryAxisProps<Datum> {
  /** Returns the axis label for a datum, for example a region name. */
  getCategory: (datum: Datum, index: number) => string;

  getDate?: never;
  period?: never;
  formatPeriod?: never;
  timeRange?: never;
  weekStartsOn?: never;
  timeZone?: never;
  markPartialPeriods?: never;
}

/** How a chart builds its horizontal axis: from dates grouped into periods, or from categories. */
export type ChartXAxisProps<Datum> =
  | ChartTimeAxisProps<Datum>
  | ChartCategoryAxisProps<Datum>;

/** One series' entry in a tooltip. */
export interface ChartTooltipItem {
  key: string;
  label: string;
  color: string;
  /** `null` when the series has no value in this period or category. */
  value: number | null;
  /** `value` passed through `formatValue` for the tooltip; `null` when missing. */
  formattedValue: string | null;
  /** Value in the preceding period or category, for comparisons; `null` when there is none. */
  previousValue: number | null;
}

/** Everything a custom tooltip can show for the active period or category. */
export interface ChartTooltipContext {
  /** Index of the period or category on the axis. */
  index: number;
  /** Complete heading, such as `March 2026`. */
  title: string;
  /** Heading of the preceding period or category, or `null` for the first one. */
  previousTitle: string | null;
  /** Whether the data only partly cover this period. */
  isPartial: boolean;
  items: ChartTooltipItem[];
}

/** Props shared by every Cartesian chart in the collection, apart from the axis mode. */
export interface ChartCommonProps<Datum> {
  /** Records to plot. */
  data: readonly Datum[];

  /** Series to plot. Each one reads its values from `data`. */
  series: readonly ChartSeries<Datum>[];

  /** Accessible chart name, exposed through the SVG `<title>`. */
  title: string;

  /**
   * Accessible long description, exposed through the SVG `<desc>`.
   * When omitted, a summary of the series, categories and value range is generated.
   */
  description?: string;

  /** Title of the category (horizontal) axis, for example `"Month"`. */
  categoryAxisLabel?: string;

  /** Title of the value (vertical) axis, for example `"Revenue"`. */
  valueAxisLabel?: string;

  /** Total chart height in pixels, excluding the legend. Width follows the container. Defaults to `320`. */
  height?: number;

  /**
   * Formats values on the axis, in tooltips and in the generated description.
   * `context.target` says where the value appears; axis ticks also receive the
   * tick step. Defaults to compact axis labels with just enough precision to
   * tell adjacent ticks apart, and exact values in tooltips.
   */
  formatValue?: ValueFormatter;

  /** Locale used by the default value and period formatters. */
  locale?: string | readonly string[];

  /**
   * Shows a tooltip with every series' value for the period or category under
   * the pointer, or the one reached with the arrow keys. Defaults to `true`.
   */
  tooltip?: boolean;

  /**
   * Replaces the tooltip content (the container, its placement and its bounds
   * stay the same). Screen readers still hear the default reading of the
   * values, since custom markup cannot be announced reliably.
   */
  renderTooltip?: (context: ChartTooltipContext) => ReactNode;

  /**
   * Shows a loading state: a placeholder when there is no data yet, or an
   * overlay over the current chart while it refreshes. Defaults to `false`.
   */
  isLoading?: boolean;

  /** Text shown and announced while loading. Defaults to `"Loading chart data"`. */
  loadingLabel?: string;

  /**
   * The chart's data as a table, the accessible alternative to the plot.
   * `hidden` keeps it for screen readers only; `visible` shows it below the
   * chart (for example behind a "Show as table" toggle). Defaults to `"hidden"`.
   */
  dataTable?: "hidden" | "visible";

  /** Content shown instead of the plot when there is nothing to draw. */
  emptyContent?: ReactNode;

  /** Additional classes applied to the outer `<figure>`. */
  className?: string;
}

/** Props shared by every Cartesian chart in the collection. */
export type ChartBaseProps<Datum> = ChartCommonProps<Datum> & ChartXAxisProps<Datum>;
