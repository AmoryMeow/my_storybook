import { describe, expect, it } from "vitest";

import {
  addPeriods,
  createDefaultPeriodFormatter,
  getQuarter,
  inferDataInterval,
  listPeriods,
  MAX_PERIODS,
  parseChartDate,
  startOfPeriod,
  type ChartPeriod,
} from "./Chart.time";

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);
const UTC = { timeZone: "UTC" } as const;

describe("parseChartDate", () => {
  it("reads a date-only string as that calendar day in the given zone", () => {
    expect(parseChartDate("2026-03-01", "UTC")?.toISOString()).toBe(
      "2026-03-01T00:00:00.000Z",
    );
    const local = parseChartDate("2026-03-01", "local")!;
    expect([local.getFullYear(), local.getMonth(), local.getDate()]).toEqual([2026, 2, 1]);
    expect(local.getHours()).toBe(0);
  });

  it("accepts date-times, timestamps and Date objects", () => {
    expect(parseChartDate("2026-03-01T15:30:00Z")?.getTime()).toBe(
      Date.UTC(2026, 2, 1, 15, 30),
    );
    expect(parseChartDate(0)?.getTime()).toBe(0);
    const original = utc("2026-03-01");
    const copy = parseChartDate(original)!;
    expect(copy.getTime()).toBe(original.getTime());
    expect(copy).not.toBe(original);
  });

  it("returns null for invalid input", () => {
    expect(parseChartDate("not a date")).toBeNull();
    expect(parseChartDate(Number.NaN)).toBeNull();
  });
});

describe("startOfPeriod", () => {
  const wednesday = new Date("2026-03-04T18:45:00Z");

  it("snaps to midnight of the day", () => {
    expect(startOfPeriod(wednesday, "day", UTC).toISOString()).toBe(
      "2026-03-04T00:00:00.000Z",
    );
  });

  it("snaps to the configured first day of the week", () => {
    expect(iso(startOfPeriod(wednesday, "week", UTC))).toBe("2026-03-02");
    expect(iso(startOfPeriod(wednesday, "week", { ...UTC, weekStartsOn: 0 }))).toBe(
      "2026-03-01",
    );
    // A week can start in the previous month or year.
    expect(iso(startOfPeriod(utc("2026-01-01"), "week", UTC))).toBe("2025-12-29");
  });

  it("snaps to the first day of the month and quarter", () => {
    expect(iso(startOfPeriod(wednesday, "month", UTC))).toBe("2026-03-01");
    expect(iso(startOfPeriod(wednesday, "quarter", UTC))).toBe("2026-01-01");
    expect(iso(startOfPeriod(utc("2026-12-31"), "quarter", UTC))).toBe("2026-10-01");
  });

  it("buckets by the calendar of the chosen time zone", () => {
    // 23:30 UTC on Mar 31 is still March in UTC.
    const lateUtc = new Date("2026-03-31T23:30:00Z");
    expect(iso(startOfPeriod(lateUtc, "month", UTC))).toBe("2026-03-01");
  });

  it("keeps local midnight across daylight-saving changes", () => {
    for (let month = 0; month < 12; month += 1) {
      const start = startOfPeriod(new Date(2026, month, 15, 12), "month");
      expect(start.getHours()).toBe(0);
      expect(start.getDate()).toBe(1);
    }
  });
});

describe("addPeriods", () => {
  it("moves by whole calendar periods", () => {
    expect(iso(addPeriods(utc("2026-01-31"), "day", 1, "UTC"))).toBe("2026-02-01");
    expect(iso(addPeriods(utc("2026-03-02"), "week", -1, "UTC"))).toBe("2026-02-23");
    expect(iso(addPeriods(utc("2026-11-01"), "month", 3, "UTC"))).toBe("2027-02-01");
    expect(iso(addPeriods(utc("2026-10-01"), "quarter", 1, "UTC"))).toBe("2027-01-01");
  });

  it("keeps local midnight when stepping through a whole year of days", () => {
    let day = new Date(2026, 0, 1);
    for (let index = 0; index < 365; index += 1) {
      day = addPeriods(day, "day", 1);
      expect(day.getHours()).toBe(0);
    }
    expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([2027, 0, 1]);
  });
});

describe("listPeriods", () => {
  it("lists every period between two dates without gaps", () => {
    const months = listPeriods(utc("2026-01-15"), utc("2026-04-02"), "month", UTC);
    expect(months.map(iso)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01"]);
  });

  it("counts periods of each granularity across one year", () => {
    const counts: Record<ChartPeriod, number> = { day: 365, week: 53, month: 12, quarter: 4 };
    for (const [period, count] of Object.entries(counts) as [ChartPeriod, number][]) {
      expect(listPeriods(utc("2026-01-01"), utc("2026-12-31"), period, UTC)).toHaveLength(count);
    }
  });

  it("returns a single period when both dates fall into it", () => {
    expect(listPeriods(utc("2026-03-02"), utc("2026-03-08"), "week", UTC)).toHaveLength(1);
  });

  it("caps very long ranges", () => {
    expect(listPeriods(utc("1900-01-01"), utc("2100-01-01"), "day", UTC)).toHaveLength(
      MAX_PERIODS,
    );
  });
});

describe("createDefaultPeriodFormatter", () => {
  const format = createDefaultPeriodFormatter("en-US");
  const context = (
    period: ChartPeriod,
    spansMultipleYears = false,
    variant: "axis" | "tooltip" = "axis",
    end = utc("2026-01-01"),
  ) => ({
    period,
    variant,
    end,
    spansMultipleYears,
    timeZone: "UTC" as const,
  });

  it("chooses a label format by period", () => {
    expect(format(utc("2026-03-04"), context("day"))).toBe("Mar 4");
    expect(format(utc("2026-03-02"), context("week"))).toBe("Mar 2");
    expect(format(utc("2026-03-01"), context("month"))).toBe("Mar");
    expect(format(utc("2026-04-01"), context("quarter"))).toBe("Q2");
  });

  it("adds the year when the axis spans several years", () => {
    expect(format(utc("2026-03-04"), context("day", true))).toBe("Mar 4, 2026");
    expect(format(utc("2026-03-01"), context("month", true))).toBe("Mar 2026");
    expect(format(utc("2026-10-01"), context("quarter", true))).toBe("Q4 2026");
  });

  it("gives tooltips complete labels", () => {
    expect(format(utc("2026-03-04"), context("day", false, "tooltip"))).toBe("Wed, Mar 4, 2026");
    expect(
      format(utc("2026-03-02"), context("week", false, "tooltip", utc("2026-03-09"))),
    ).toMatch(/^Mar 2\s*–\s*8, 2026$/);
    expect(
      format(utc("2026-03-30"), context("week", false, "tooltip", utc("2026-04-06"))),
    ).toMatch(/^Mar 30\s*–\s*Apr 5, 2026$/);
    expect(format(utc("2026-03-01"), context("month", false, "tooltip"))).toBe("March 2026");
    expect(format(utc("2026-04-01"), context("quarter", false, "tooltip"))).toBe("Q2 2026");
  });

  it("follows the locale for month names", () => {
    const russian = createDefaultPeriodFormatter("ru-RU");
    expect(russian(utc("2026-03-01"), context("month"))).toMatch(/^мар/);
  });
});

describe("getQuarter", () => {
  it("returns the 1-based quarter", () => {
    expect(getQuarter(utc("2026-01-01"), "UTC")).toBe(1);
    expect(getQuarter(utc("2026-06-30"), "UTC")).toBe(2);
    expect(getQuarter(utc("2026-12-31"), "UTC")).toBe(4);
  });
});

describe("inferDataInterval", () => {
  it("takes the coarsest period every date aligns to", () => {
    expect(inferDataInterval([utc("2026-01-01"), utc("2026-04-01")], UTC)).toBe("quarter");
    expect(inferDataInterval([utc("2026-01-01"), utc("2026-02-01")], UTC)).toBe("month");
    expect(inferDataInterval([utc("2026-03-02"), utc("2026-03-09")], UTC)).toBe("week");
    expect(inferDataInterval([utc("2026-03-02"), utc("2026-03-03")], UTC)).toBe("day");
  });

  it("falls back to days for timestamps within a day", () => {
    expect(inferDataInterval([new Date("2026-03-02T15:30:00Z")], UTC)).toBe("day");
  });
});
