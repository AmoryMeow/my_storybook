import { describe, expect, it } from "vitest";

import { buildChartSummary, createDefaultValueFormatter } from "./Chart.format";
import {
  computeCartesianLayout,
  computePlotGeometry,
  estimateTextWidth,
  fitLabel,
  planCategoryLabels,
} from "./Chart.layout";
import { resolveSeriesColor } from "./Chart.theme";

const format = (value: number) => String(value);

describe("computeCartesianLayout", () => {
  it("reserves margins and sizes the left margin to the widest tick label", () => {
    const layout = computeCartesianLayout({
      width: 600,
      height: 300,
      domain: [0, 1000],
      formatValue: format,
    });

    expect(layout).not.toBeNull();
    const { plot, valueTicks, valueScale } = layout!;
    // Widest label is "1000": 4 chars * 12px * 0.6 = 28.8 → 29, plus the 9px tick and gap.
    expect(plot.left).toBe(38);
    expect(plot.top).toBe(12);
    expect(plot.bottom).toBe(268);
    expect(plot.right).toBe(584);
    expect(plot.width).toBe(546);
    expect(valueScale(0)).toBe(plot.bottom);
    expect(valueScale(1000)).toBe(plot.top);
    expect(valueTicks[0]).toEqual({ value: 0, y: 268, label: "0" });
  });

  it("reserves extra room for axis titles", () => {
    const base = computeCartesianLayout({
      width: 600,
      height: 300,
      domain: [0, 1000],
      formatValue: format,
    })!;
    const titled = computeCartesianLayout({
      width: 600,
      height: 300,
      domain: [0, 1000],
      formatValue: format,
      hasValueAxisTitle: true,
      hasCategoryAxisTitle: true,
    })!;

    expect(titled.plot.left).toBe(base.plot.left + 24);
    expect(titled.plot.bottom).toBe(base.plot.bottom - 24);
  });

  it("returns null when the container is too small", () => {
    expect(
      computeCartesianLayout({ width: 0, height: 300, domain: [0, 1], formatValue: format }),
    ).toBeNull();
    expect(
      computeCartesianLayout({ width: 300, height: 40, domain: [0, 1], formatValue: format }),
    ).toBeNull();
    expect(
      computeCartesianLayout({ width: 30, height: 300, domain: [0, 1], formatValue: format }),
    ).toBeNull();
  });
});

describe("estimateTextWidth", () => {
  it("scales with length and font size", () => {
    expect(estimateTextWidth("abcd", 10)).toBe(24);
    expect(estimateTextWidth("")).toBe(0);
  });
});

describe("resolveSeriesColor", () => {
  it("assigns palette slots by position", () => {
    expect(resolveSeriesColor(0)).toBe("var(--chart-series-1)");
    expect(resolveSeriesColor(7)).toBe("var(--chart-series-8)");
  });

  it("falls back to a neutral color instead of cycling hues", () => {
    expect(resolveSeriesColor(8)).toBe("var(--chart-series-overflow)");
  });

  it("prefers an explicit color", () => {
    expect(resolveSeriesColor(0, "#123456")).toBe("#123456");
  });
});

describe("chart formatting", () => {
  it("formats values compactly", () => {
    const formatValue = createDefaultValueFormatter("en-US");
    expect(formatValue(1250)).toBe("1.3K");
    expect(formatValue(-2_000_000)).toBe("-2M");
  });

  it("summarises series, categories and value range", () => {
    expect(
      buildChartSummary({
        kind: "Line chart",
        seriesLabels: ["Revenue", "Costs"],
        categories: ["Jan", "Feb", "Mar"],
        domain: [10, 90],
        formatValue: format,
      }),
    ).toBe(
      "Line chart with 2 series: Revenue, Costs, across 3 categories from Jan to Mar. Values range from 10 to 90.",
    );
  });

  it("describes a single series and an empty chart", () => {
    expect(
      buildChartSummary({
        kind: "Bar chart",
        seriesLabels: ["Revenue"],
        categories: ["Q1"],
        domain: [0, 5],
        formatValue: format,
      }),
    ).toBe("Bar chart with one series, Revenue, across 1 category, Q1. Values range from 0 to 5.");
    expect(
      buildChartSummary({
        kind: "Bar chart",
        seriesLabels: [],
        categories: [],
        domain: null,
        formatValue: format,
      }),
    ).toBe("Bar chart with no data.");
  });

  it("names incomplete periods", () => {
    expect(
      buildChartSummary({
        kind: "Bar chart",
        seriesLabels: ["Orders"],
        categories: ["Jun 30", "Jul 7", "Jul 14"],
        domain: [0, 5],
        formatValue: format,
        partial: [true, false, true],
      }),
    ).toContain("Incomplete periods: Jun 30, Jul 14.");
  });
});

/** 6px per character keeps the expectations readable. */
const measure = (text: string) => text.length * 6;

describe("fitLabel", () => {
  it("keeps a label that fits", () => {
    expect(fitLabel("Payments", 60, 2, measure)).toEqual(["Payments"]);
  });

  it("wraps at word boundaries", () => {
    expect(fitLabel("Corporate Banking", 60, 2, measure)).toEqual(["Corporate", "Banking"]);
  });

  it("truncates the last line with an ellipsis", () => {
    expect(fitLabel("Small Business Lending", 60, 2, measure)).toEqual([
      "Small",
      "Business…",
    ]);
    expect(fitLabel("Infrastructure", 36, 1, measure)).toEqual(["Infra…"]);
  });

  it("always shows at least one letter", () => {
    expect(fitLabel("Treasury", 4, 1, measure)).toEqual(["T…"]);
  });
});

describe("planCategoryLabels", () => {
  const names = ["Payments", "Corporate Banking", "Treasury"];

  it("labels every category, wrapping long names", () => {
    const plan = planCategoryLabels(names, 70, "category", measure);
    expect(plan.indices).toEqual([0, 1, 2]);
    expect(plan.lines[1]).toEqual(["Corporate", "Banking"]);
    expect(plan.lineCount).toBe(2);
  });

  it("thins category labels only when a slot cannot fit a letter", () => {
    const many = Array.from({ length: 20 }, (_, index) => `Product ${index}`);
    const plan = planCategoryLabels(many, 20, "category", measure);
    expect(plan.indices.length).toBeLessThan(20);
    expect(plan.lineCount).toBe(1);
  });

  it("thins time labels without truncating them", () => {
    const days = Array.from({ length: 30 }, (_, index) => `Mar ${index + 1}`);
    const plan = planCategoryLabels(days, 20, "time", measure);
    expect(plan.indices.length).toBeLessThan(30);
    expect(plan.lines.every(([line]) => !line.endsWith("…"))).toBe(true);
  });
});

describe("computePlotGeometry", () => {
  const base = {
    width: 400,
    height: 300,
    domain: [0, 100] as const,
    formatValue: format,
    axis: "category" as const,
  };

  it("reserves a second label line when category names wrap", () => {
    const short = computePlotGeometry({ ...base, categories: ["A", "B", "C"], scale: "band" })!;
    const long = computePlotGeometry({
      ...base,
      categories: ["Corporate Banking Services", "Small Business Lending Desk", "C"],
      scale: "band",
    })!;
    expect(long.labels.lineCount).toBe(2);
    expect(long.plot.bottom).toBe(short.plot.bottom - 14);
  });

  it("places band centres in the middle of each slot and points evenly", () => {
    const bands = computePlotGeometry({ ...base, categories: ["A", "B"], scale: "band" })!;
    expect(bands.centres[1] - bands.centres[0]).toBeCloseTo(bands.step);
    expect(bands.bandwidth).toBeGreaterThan(0);
    const points = computePlotGeometry({ ...base, categories: ["A", "B"], scale: "point" })!;
    expect(points.bandwidth).toBe(0);
  });
});
