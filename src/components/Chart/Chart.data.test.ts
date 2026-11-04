import { describe, expect, it } from "vitest";

import { aggregateValues, resolveChartData } from "./Chart.data";
import type { PeriodFormatter } from "./Chart.time";
import type { ChartSeries } from "./Chart.types";

interface Transaction {
  at: string;
  amount: number | null;
  balance?: number;
}

const transactions: Transaction[] = [
  // Deliberately unsorted.
  { at: "2026-03-10T09:00:00Z", amount: 40, balance: 1040 },
  { at: "2026-01-05T09:00:00Z", amount: 100, balance: 1100 },
  { at: "2026-01-20T09:00:00Z", amount: -30, balance: 1070 },
  { at: "2026-03-02T09:00:00Z", amount: null, balance: 1000 },
];

const amount: ChartSeries<Transaction> = {
  key: "amount",
  label: "Amount",
  value: (row) => row.amount,
};

const balance: ChartSeries<Transaction> = {
  key: "balance",
  label: "Balance",
  value: (row) => row.balance,
  aggregate: "last",
};

const monthly = {
  getDate: (row: Transaction) => row.at,
  period: "month" as const,
  timeZone: "UTC" as const,
};

describe("aggregateValues", () => {
  const values = [3, 1, 2];

  it("supports the built-in aggregates", () => {
    expect(aggregateValues(values)).toBe(6);
    expect(aggregateValues(values, "sum")).toBe(6);
    expect(aggregateValues(values, "average")).toBe(2);
    expect(aggregateValues(values, "min")).toBe(1);
    expect(aggregateValues(values, "max")).toBe(3);
    expect(aggregateValues(values, "first")).toBe(3);
    expect(aggregateValues(values, "last")).toBe(2);
  });

  it("accepts a custom function", () => {
    expect(aggregateValues(values, (items) => items.length)).toBe(3);
  });
});

describe("resolveChartData on a time axis", () => {
  it("groups data into continuous periods and aggregates per series", () => {
    const result = resolveChartData(transactions, [amount, balance], monthly, "en-US");

    expect(result.categories).toEqual(["Jan", "Feb", "Mar"]);
    expect(result.titles).toEqual(["January 2026", "February 2026", "March 2026"]);
    // January sums 100 and -30; February has no data; March ignores the missing amount.
    expect(result.values[0]).toEqual([70, null, 40]);
    // `last` follows time order, not input order.
    expect(result.values[1]).toEqual([1070, null, 1040]);
  });

  it("uses a custom period formatter with context", () => {
    const formatPeriod: PeriodFormatter = (start, { end, period }) =>
      `${period}:${start.toISOString().slice(0, 7)}→${end.toISOString().slice(0, 7)}`;
    const result = resolveChartData(transactions, [amount], { ...monthly, formatPeriod });
    expect(result.categories[0]).toBe("month:2026-01→2026-02");
  });

  it("restricts and pads the axis to a fixed time range", () => {
    const result = resolveChartData(transactions, [amount], {
      ...monthly,
      timeRange: { start: "2026-02-01", end: "2026-05-31" },
    }, "en-US");

    expect(result.categories).toEqual(["Feb", "Mar", "Apr", "May"]);
    expect(result.values[0]).toEqual([null, 40, null, null]);
  });

  it("adds the year to labels when periods span several years", () => {
    const result = resolveChartData(
      [
        { at: "2025-12-15", amount: 1 },
        { at: "2026-01-15", amount: 2 },
      ],
      [amount],
      monthly,
      "en-US",
    );
    expect(result.categories).toEqual(["Dec 2025", "Jan 2026"]);
  });

  it("skips data with invalid dates", () => {
    const result = resolveChartData(
      [
        { at: "garbage", amount: 999 },
        { at: "2026-01-15", amount: 5 },
      ],
      [amount],
      monthly,
    );
    expect(result.values[0]).toEqual([5]);
  });

  it("returns no categories when no date is valid", () => {
    expect(resolveChartData([], [amount], monthly)).toEqual({
      axis: "time",
      categories: [],
      titles: [],
      values: [[]],
      partial: [],
    });
  });

  it("treats a non-finite custom aggregate as missing", () => {
    const result = resolveChartData(
      [{ at: "2026-01-15", amount: 5 }],
      [{ ...amount, aggregate: () => Number.NaN }],
      monthly,
    );
    expect(result.values[0]).toEqual([null]);
  });
});

describe("resolveChartData on a category axis", () => {
  it("keeps one category per datum in input order and does not aggregate", () => {
    const result = resolveChartData(
      [
        { region: "EMEA", revenue: 10 },
        { region: "APAC", revenue: null },
        { region: "EMEA", revenue: 7 },
      ],
      [{ key: "revenue", label: "Revenue", value: (row) => row.revenue }],
      { getCategory: (row) => row.region },
    );

    expect(result.categories).toEqual(["EMEA", "APAC", "EMEA"]);
    expect(result.titles).toEqual(result.categories);
    expect(result.values).toEqual([[10, null, 7]]);
  });
});

describe("partial periods", () => {
  const daily = (from: string, days: number) =>
    Array.from({ length: days }, (_, day) => ({
      at: new Date(Date.parse(`${from}T00:00:00Z`) + day * 86_400_000).toISOString().slice(0, 10),
      amount: 1,
    }));
  const resolve = (
    rows: Transaction[],
    period: "day" | "week" | "month" | "quarter",
    extra: object = {},
  ) =>
    resolveChartData(rows, [amount], {
      getDate: (row: Transaction) => row.at,
      period,
      timeZone: "UTC" as const,
      ...extra,
    });

  it("marks weeks cut by the first and last date", () => {
    // Tuesday 2025-07-01 to Tuesday 2026-06-30.
    const { partial } = resolve(daily("2025-07-01", 365), "week");
    expect(partial[0]).toBe(true);
    expect(partial[partial.length - 1]).toBe(true);
    expect(partial.slice(1, -1).every((flag) => !flag)).toBe(true);
  });

  it("does not mark periods fully covered by daily data", () => {
    const { partial } = resolve(daily("2026-01-01", 59), "month");
    expect(partial).toEqual([false, false]);
  });

  it("treats a date on the 1st of each month as the whole month", () => {
    const rows = ["2026-10-01", "2026-11-01", "2026-12-01"].map((at) => ({ at, amount: 1 }));
    expect(resolve(rows, "month").partial).toEqual([false, false, false]);
    expect(resolve(rows, "quarter").partial).toEqual([false]);
    expect(resolve(rows.slice(0, 2), "quarter").partial).toEqual([true]);
  });

  it("uses the time range as coverage when given", () => {
    const { partial } = resolve(daily("2026-01-01", 10), "month", {
      timeRange: { start: "2026-01-01", end: "2026-02-14" },
    });
    expect(partial).toEqual([false, true]);
  });

  it("excludes data past the time range from the edge period", () => {
    // 59 days from Jan 1, but the window stops on Feb 14.
    const { values, partial } = resolve(daily("2026-01-01", 59), "month", {
      timeRange: { start: "2026-01-01", end: "2026-02-14" },
    });
    expect(values[0]).toEqual([31, 14]);
    expect(partial).toEqual([false, true]);
  });

  it("can be turned off", () => {
    const { partial } = resolve(daily("2025-07-01", 365), "week", { markPartialPeriods: false });
    expect(partial.some(Boolean)).toBe(false);
  });

  it("never marks categories", () => {
    const result = resolveChartData(transactions, [amount], { getCategory: (row) => row.at });
    expect(result.partial.some(Boolean)).toBe(false);
  });
});
