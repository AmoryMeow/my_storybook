import { describe, expect, it } from "vitest";

import {
  computeNiceTicks,
  countDecimals,
  getTickSignificantDigits,
} from "./Chart.ticks";

/** Formats ticks the way the default chart formatter does. */
function formatTicks(locale: string, ticks: number[], step: number) {
  return ticks.map((value) =>
    new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumSignificantDigits: getTickSignificantDigits(value, step),
    }).format(value),
  );
}

describe("computeNiceTicks", () => {
  it("covers the data with round, evenly spaced ticks", () => {
    const result = computeNiceTicks(176_500, 289_500, 5)!;
    expect(result.ticks).toEqual([175_000, 200_000, 225_000, 250_000, 275_000, 300_000]);
    expect(result.step).toBe(25_000);
    expect(result.min).toBe(175_000);
    expect(result.max).toBe(300_000);
  });

  it("always contains the data range", () => {
    const ranges: [number, number][] = [
      [0, 1010],
      [0, 289_500],
      [-36_800, 42_000],
      [2.2, 4.2],
      [0.0012, 0.0049],
      [1_002_000, 1_048_000],
      [-0.5, -0.1],
    ];
    for (const [min, max] of ranges) {
      for (let target = 2; target <= 10; target += 1) {
        const result = computeNiceTicks(min, max, target)!;
        expect(result.min).toBeLessThanOrEqual(min);
        expect(result.max).toBeGreaterThanOrEqual(max);
      }
    }
  });

  it("keeps the tick count within two of the target", () => {
    for (let target = 3; target <= 10; target += 1) {
      const count = computeNiceTicks(0, 624_000, target)!.ticks.length;
      expect(count).toBeGreaterThanOrEqual(target - 2);
      expect(count).toBeLessThanOrEqual(target + 2);
    }
  });

  it("respects an explicit tick count range", () => {
    const count = computeNiceTicks(0, 100, 5, { minCount: 3, maxCount: 3 })!.ticks.length;
    expect(count).toBe(3);
  });

  it("avoids large empty space on short axes", () => {
    // d3's 1/2/5 steps produced [0, 400K] here; 2.5 and 1×10ⁿ give a tighter fit.
    const result = computeNiceTicks(0, 289_500, 3)!;
    expect(result.max).toBe(300_000);
  });

  it("includes zero when the range crosses it", () => {
    expect(computeNiceTicks(-36_800, 42_000, 5)!.ticks).toContain(0);
  });

  it("produces exact decimal ticks without floating-point noise", () => {
    const result = computeNiceTicks(0.0012, 0.0049, 5)!;
    expect(result.ticks).toEqual([0.001, 0.002, 0.003, 0.004, 0.005]);
  });

  it("never returns negative zero", () => {
    const result = computeNiceTicks(-1, 1, 5)!;
    expect(result.ticks.some((tick) => Object.is(tick, -0))).toBe(false);
  });

  it("returns null for empty or invalid ranges", () => {
    expect(computeNiceTicks(5, 5, 5)).toBeNull();
    expect(computeNiceTicks(10, 0, 5)).toBeNull();
    expect(computeNiceTicks(0, Number.NaN, 5)).toBeNull();
  });
});

describe("getTickSignificantDigits", () => {
  it("shows exactly the digits the step requires", () => {
    expect(getTickSignificantDigits(1_050_000, 10_000)).toBe(3);
    expect(getTickSignificantDigits(1_200, 200)).toBe(2);
    expect(getTickSignificantDigits(300_000, 50_000)).toBe(2);
    expect(getTickSignificantDigits(0.0015, 0.0005)).toBe(2);
    expect(getTickSignificantDigits(-25_000, 25_000)).toBe(2);
  });

  it("uses one digit for zero and invalid input", () => {
    expect(getTickSignificantDigits(0, 10)).toBe(1);
    expect(getTickSignificantDigits(5, 0)).toBe(1);
  });

  it("keeps adjacent tick labels distinct in a narrow band", () => {
    const { ticks, step } = computeNiceTicks(1_002_000, 1_048_000, 5)!;
    const labels = formatTicks("en-US", ticks, step);
    expect(labels).toEqual(["1M", "1.01M", "1.02M", "1.03M", "1.04M", "1.05M"]);
  });

  it("keeps labels distinct for small values", () => {
    const { ticks, step } = computeNiceTicks(0.0012, 0.0049, 5)!;
    expect(new Set(formatTicks("en-US", ticks, step)).size).toBe(ticks.length);
  });

  it("works with locales that group magnitudes differently", () => {
    const { ticks, step } = computeNiceTicks(0, 1_048_000, 5)!;
    const labels = formatTicks("ja-JP", ticks, step);
    expect(new Set(labels).size).toBe(ticks.length);
  });
});

describe("countDecimals", () => {
  it("counts the decimal places needed to show a number exactly", () => {
    expect(countDecimals(25_000)).toBe(0);
    expect(countDecimals(2.5)).toBe(1);
    expect(countDecimals(0.0005)).toBe(4);
    expect(countDecimals(0.1 + 0.2)).toBe(1);
  });
});
