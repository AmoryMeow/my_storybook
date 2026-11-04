import { isPlottableValue } from "./Chart.scales";
import {
  addPeriods,
  createDefaultPeriodFormatter,
  getCalendarYear,
  inferDataInterval,
  listPeriods,
  parseChartDate,
  startOfPeriod,
} from "./Chart.time";
import type {
  ChartAggregate,
  ChartSeries,
  ChartTimeAxisProps,
  ChartXAxisProps,
} from "./Chart.types";

export interface ResolvedChartData {
  axis: "time" | "category";
  categories: string[];
  /** Tooltip headings: complete where axis labels are short (`March 2026` vs `Mar`). */
  titles: string[];
  /** `values[seriesIndex][categoryIndex]`. */
  values: (number | null)[][];
  /**
   * Periods only partly covered by the data, such as the current month or a
   * week cut by the start of the data. Their totals are not comparable with
   * full periods, so charts mark them.
   */
  partial: boolean[];
}

/** `values` must not be empty: `average` would divide by zero. */
export function aggregateValues(
  values: readonly number[],
  aggregate: ChartAggregate = "sum",
): number {
  if (typeof aggregate === "function") {
    return aggregate(values);
  }
  switch (aggregate) {
    case "sum":
      return values.reduce((total, value) => total + value, 0);
    case "average":
      return values.reduce((total, value) => total + value, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "first":
      return values[0];
    case "last":
      return values[values.length - 1];
  }
}

function isTimeAxis<Datum>(
  axis: ChartXAxisProps<Datum>,
): axis is ChartTimeAxisProps<Datum> {
  return typeof axis.getDate === "function";
}

export function resolveChartData<Datum>(
  data: readonly Datum[],
  series: readonly ChartSeries<Datum>[],
  axis: ChartXAxisProps<Datum>,
  locale?: string | readonly string[],
): ResolvedChartData {
  if (!isTimeAxis(axis)) {
    const categories = data.map((datum, index) => axis.getCategory(datum, index));
    return {
      axis: "category",
      categories,
      titles: categories,
      partial: categories.map(() => false),
      values: series.map((item) =>
        data.map((datum, index) => {
          const value = item.value(datum, index);
          return isPlottableValue(value) ? value : null;
        }),
      ),
    };
  }

  return resolveTimeData(data, series, axis, locale);
}

function resolveTimeData<Datum>(
  data: readonly Datum[],
  series: readonly ChartSeries<Datum>[],
  axis: ChartTimeAxisProps<Datum>,
  locale?: string | readonly string[],
): ResolvedChartData {
  const { period, weekStartsOn = 1, timeZone = "local" } = axis;
  const options = { weekStartsOn, timeZone };

  const dated = data.flatMap((datum, index) => {
    const date = parseChartDate(axis.getDate(datum, index), timeZone);
    return date ? [{ datum, index, date }] : [];
  });

  // Chronological order, so `first`/`last` aggregates follow time, not input order.
  dated.sort((a, b) => a.date.getTime() - b.date.getTime());

  const rangeStart = axis.timeRange
    ? parseChartDate(axis.timeRange.start, timeZone)
    : dated[0]?.date;
  const rangeEnd = axis.timeRange
    ? parseChartDate(axis.timeRange.end, timeZone)
    : dated[dated.length - 1]?.date;

  if (!rangeStart || !rangeEnd || rangeStart.getTime() > rangeEnd.getTime()) {
    return {
      axis: "time",
      categories: [],
      titles: [],
      values: series.map(() => []),
      partial: [],
    };
  }

  const periods = listPeriods(rangeStart, rangeEnd, period, options);
  const periodIndex = new Map(periods.map((start, index) => [start.getTime(), index]));

  // The edge periods of a time range can extend past it; data there are
  // outside the requested window and must not leak into those totals.
  const windowStart = axis.timeRange ? startOfPeriod(rangeStart, "day", options).getTime() : -Infinity;
  const windowEnd = axis.timeRange
    ? addPeriods(startOfPeriod(rangeEnd, "day", options), "day", 1, timeZone).getTime()
    : Infinity;

  const buckets = series.map(() => periods.map((): number[] => []));
  for (const { datum, index, date } of dated) {
    if (date.getTime() < windowStart || date.getTime() >= windowEnd) {
      continue;
    }
    const bucket = periodIndex.get(startOfPeriod(date, period, options).getTime());
    if (bucket === undefined) {
      continue;
    }
    series.forEach((item, seriesIndex) => {
      const value = item.value(datum, index);
      if (isPlottableValue(value)) {
        buckets[seriesIndex][bucket].push(value);
      }
    });
  }

  const partial = periods.map(() => false);
  if (axis.markPartialPeriods !== false && dated.length > 0) {
    // With a time range, coverage is the stated window; otherwise the data's
    // own extent, widened to the interval each datum represents.
    const interval = inferDataInterval(
      dated.map(({ date }) => date),
      options,
    );
    const coverStart = axis.timeRange
      ? startOfPeriod(rangeStart, "day", options)
      : startOfPeriod(rangeStart, interval, options);
    const coverEnd = axis.timeRange
      ? addPeriods(startOfPeriod(rangeEnd, "day", options), "day", 1, timeZone)
      : addPeriods(startOfPeriod(rangeEnd, interval, options), interval, 1, timeZone);
    periods.forEach((start, index) => {
      const end = addPeriods(start, period, 1, timeZone);
      partial[index] =
        start.getTime() < coverStart.getTime() || end.getTime() > coverEnd.getTime();
    });
  }

  const formatPeriod = axis.formatPeriod ?? createDefaultPeriodFormatter(locale);
  const spansMultipleYears =
    periods.length > 0 &&
    getCalendarYear(periods[0], timeZone) !==
      getCalendarYear(periods[periods.length - 1], timeZone);

  const labelFor = (start: Date, variant: "axis" | "tooltip") =>
    formatPeriod(start, {
      period,
      variant,
      end: addPeriods(start, period, 1, timeZone),
      spansMultipleYears,
      timeZone,
    });

  return {
    axis: "time",
    partial,
    categories: periods.map((start) => labelFor(start, "axis")),
    titles: periods.map((start) => labelFor(start, "tooltip")),
    values: series.map((item, seriesIndex) =>
      buckets[seriesIndex].map((values) => {
        if (values.length === 0) {
          return null;
        }
        const value = aggregateValues(values, item.aggregate);
        return Number.isFinite(value) ? value : null;
      }),
    ),
  };
}
