/**
 * All arithmetic goes through calendar fields (year, month, day) rather than
 * millisecond offsets, so daylight-saving transitions never shift a date into
 * the wrong period.
 */

/** Granularity of a time axis. */
export type ChartPeriod = "day" | "week" | "month" | "quarter";

/** A point in time: a `Date`, a timestamp in milliseconds, or an ISO 8601 string. */
export type ChartDateInput = Date | number | string;

/**
 * Time zone in which dates are bucketed into periods and formatted.
 * `local` uses the viewer's zone; `UTC` keeps results identical everywhere.
 */
export type ChartTimeZone = "local" | "UTC";

/** Day a week starts on: 0 is Sunday, 1 is Monday (ISO 8601), 6 is Saturday. */
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface PeriodOptions {
  weekStartsOn?: WeekStart;
  timeZone?: ChartTimeZone;
}

interface CalendarFields {
  year: number;
  month: number;
  day: number;
  weekday: number;
}

/** Information passed to a custom period label formatter. */
export interface PeriodFormatContext {
  /** Granularity of the axis. */
  period: ChartPeriod;
  /**
   * Where the label appears: `axis` labels should be short; `tooltip` labels
   * can be complete (full month name, week range, year).
   */
  variant: "axis" | "tooltip";
  /** Start of the following period (exclusive end of this one). */
  end: Date;
  /** Whether the axis covers more than one calendar year, so labels may need the year. */
  spansMultipleYears: boolean;
  /** Time zone used for bucketing. Format in the same zone to match. */
  timeZone: ChartTimeZone;
}

/** Formats the start of a period as an axis label or a tooltip heading (see `context.variant`). */
export type PeriodFormatter = (start: Date, context: PeriodFormatContext) => string;

/** Upper bound on generated periods, so a bad range cannot hang the page. */
export const MAX_PERIODS = 10_000;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function getFields(date: Date, timeZone: ChartTimeZone): CalendarFields {
  return timeZone === "UTC"
    ? {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth(),
        day: date.getUTCDate(),
        weekday: date.getUTCDay(),
      }
    : {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
        weekday: date.getDay(),
      };
}

/** Callers rely on `Date` rolling overflowing fields over (day 32 → next month). */
function makeDate(
  year: number,
  month: number,
  day: number,
  timeZone: ChartTimeZone,
): Date {
  return timeZone === "UTC"
    ? new Date(Date.UTC(year, month, day))
    : new Date(year, month, day);
}

/**
 * A date-only string such as `"2026-03-01"` is parsed by hand: the built-in
 * parser reads it as UTC midnight, which is still the previous day west of
 * Greenwich.
 */
export function parseChartDate(
  input: ChartDateInput,
  timeZone: ChartTimeZone = "local",
): Date | null {
  let date: Date;
  if (input instanceof Date) {
    date = new Date(input.getTime());
  } else if (typeof input === "number") {
    date = new Date(input);
  } else {
    const match = DATE_ONLY.exec(input);
    date = match
      ? makeDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]), timeZone)
      : new Date(input);
  }
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfPeriod(
  date: Date,
  period: ChartPeriod,
  { weekStartsOn = 1, timeZone = "local" }: PeriodOptions = {},
): Date {
  const { year, month, day, weekday } = getFields(date, timeZone);

  switch (period) {
    case "day":
      return makeDate(year, month, day, timeZone);
    case "week":
      return makeDate(year, month, day - ((weekday - weekStartsOn + 7) % 7), timeZone);
    case "month":
      return makeDate(year, month, 1, timeZone);
    case "quarter":
      return makeDate(year, month - (month % 3), 1, timeZone);
  }
}

export function addPeriods(
  start: Date,
  period: ChartPeriod,
  amount: number,
  timeZone: ChartTimeZone = "local",
): Date {
  const { year, month, day } = getFields(start, timeZone);

  switch (period) {
    case "day":
      return makeDate(year, month, day + amount, timeZone);
    case "week":
      return makeDate(year, month, day + amount * 7, timeZone);
    case "month":
      return makeDate(year, month + amount, 1, timeZone);
    case "quarter":
      return makeDate(year, month + amount * 3, 1, timeZone);
  }
}

export function listPeriods(
  first: Date,
  last: Date,
  period: ChartPeriod,
  options: PeriodOptions = {},
): Date[] {
  const timeZone = options.timeZone ?? "local";
  const end = startOfPeriod(last, period, options).getTime();
  const periods: Date[] = [];

  for (
    let current = startOfPeriod(first, period, options);
    current.getTime() <= end && periods.length < MAX_PERIODS;
    current = addPeriods(current, period, 1, timeZone)
  ) {
    periods.push(current);
  }

  return periods;
}

const COARSEST_FIRST: readonly ChartPeriod[] = ["quarter", "month", "week", "day"];

/**
 * The interval each datum represents, inferred from how the dates align: if
 * every date is the start of a month, the data are monthly and `2026-12-01`
 * stands for all of December. Without this, monthly data would make every
 * last month look incomplete.
 */
export function inferDataInterval(
  dates: readonly Date[],
  options: PeriodOptions = {},
): ChartPeriod {
  return (
    COARSEST_FIRST.find((period) =>
      dates.every(
        (date) => startOfPeriod(date, period, options).getTime() === date.getTime(),
      ),
    ) ?? "day"
  );
}

export function getCalendarYear(date: Date, timeZone: ChartTimeZone = "local"): number {
  return getFields(date, timeZone).year;
}

export function getQuarter(date: Date, timeZone: ChartTimeZone = "local"): number {
  return Math.floor(getFields(date, timeZone).month / 3) + 1;
}

/** `Intl` has no quarter field, so the `Q` prefix is not localised; localised quarters need a custom formatter. */
export function createDefaultPeriodFormatter(
  locale?: string | readonly string[],
): PeriodFormatter {
  const locales = locale as string | string[] | undefined;
  const cache = new Map<string, Intl.DateTimeFormat>();

  const getFormatter = (options: Intl.DateTimeFormatOptions) => {
    const key = JSON.stringify(options);
    let formatter = cache.get(key);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat(locales, options);
      cache.set(key, formatter);
    }
    return formatter;
  };

  return (start, { period, variant, end, spansMultipleYears, timeZone }) => {
    const zone = timeZone === "UTC" ? { timeZone: "UTC" } : {};

    if (variant === "tooltip") {
      switch (period) {
        case "day":
          return getFormatter({
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
            ...zone,
          }).format(start);
        case "week":
          // `end` is exclusive; the range shows the week's last day.
          return getFormatter({ month: "short", day: "numeric", year: "numeric", ...zone })
            .formatRange(start, addPeriods(end, "day", -1, timeZone));
        case "month":
          return getFormatter({ month: "long", year: "numeric", ...zone }).format(start);
        case "quarter":
          return `Q${getQuarter(start, timeZone)} ${getFields(start, timeZone).year}`;
      }
    }

    const year = spansMultipleYears ? { year: "numeric" as const } : {};

    switch (period) {
      case "day":
      case "week":
        return getFormatter({ month: "short", day: "numeric", ...year, ...zone }).format(start);
      case "month":
        return getFormatter({ month: "short", ...year, ...zone }).format(start);
      case "quarter": {
        const label = `Q${getQuarter(start, timeZone)}`;
        return spansMultipleYears
          ? `${label} ${getFields(start, timeZone).year}`
          : label;
      }
    }
  };
}
