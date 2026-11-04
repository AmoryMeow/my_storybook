import { describe, expect, it } from "vitest";

import {
  computeValueDomain,
  createBandScale,
  createPointScale,
  createValueScale,
  getBaselinePosition,
  getTargetTickCount,
  isPlottableValue,
  selectCategoryTickIndices,
} from "./Chart.scales";

describe("isPlottableValue", () => {
  it("accepts finite numbers including zero and negatives", () => {
    expect(isPlottableValue(0)).toBe(true);
    expect(isPlottableValue(-12.5)).toBe(true);
  });

  it("rejects missing and non-finite values", () => {
    expect(isPlottableValue(null)).toBe(false);
    expect(isPlottableValue(undefined)).toBe(false);
    expect(isPlottableValue(Number.NaN)).toBe(false);
    expect(isPlottableValue(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("computeValueDomain", () => {
  it("returns null when there are no values", () => {
    expect(computeValueDomain([])).toBeNull();
    expect(computeValueDomain([Number.NaN])).toBeNull();
  });

  it("uses the data extent when zero is not required", () => {
    expect(computeValueDomain([40, 12, 33])).toEqual([12, 40]);
  });

  it("extends a positive extent down to zero when requested", () => {
    expect(computeValueDomain([40, 12], { includeZero: true })).toEqual([0, 40]);
  });

  it("extends a negative extent up to zero when requested", () => {
    expect(computeValueDomain([-40, -12], { includeZero: true })).toEqual([-40, 0]);
  });

  it("keeps a mixed-sign extent as is", () => {
    expect(computeValueDomain([-5, 0, 8], { includeZero: true })).toEqual([-5, 8]);
  });

  it("widens a degenerate domain of equal non-zero values", () => {
    expect(computeValueDomain([50, 50])).toEqual([45, 55]);
    expect(computeValueDomain([-50])).toEqual([-55, -45]);
  });

  it("anchors a single value to zero when zero is required", () => {
    expect(computeValueDomain([50], { includeZero: true })).toEqual([0, 50]);
    expect(computeValueDomain([-50], { includeZero: true })).toEqual([-50, 0]);
  });

  it("widens an all-zero domain to [0, 1]", () => {
    expect(computeValueDomain([0, 0], { includeZero: true })).toEqual([0, 1]);
  });
});

describe("createValueScale", () => {
  it("maps the domain onto an inverted SVG range without rounding it", () => {
    const scale = createValueScale([3, 97], [200, 0]);
    expect(scale.domain()).toEqual([3, 97]);
    expect(scale(3)).toBe(200);
    expect(scale(97)).toBe(0);
    expect(scale(50)).toBe(100);
  });
});

describe("getTargetTickCount", () => {
  it("aims for one gridline every 56 pixels, counting both ends", () => {
    expect(getTargetTickCount(256)).toBe(5);
    expect(getTargetTickCount(500)).toBe(9);
  });

  it("never asks for fewer than two ticks", () => {
    expect(getTargetTickCount(30)).toBe(2);
  });
});

describe("getBaselinePosition", () => {
  it("returns the position of zero when it is in the domain", () => {
    expect(getBaselinePosition(createValueScale([-50, 50], [100, 0]))).toBe(50);
  });

  it("clamps to the lower edge for an all-positive domain", () => {
    expect(getBaselinePosition(createValueScale([20, 60], [100, 0]))).toBe(100);
  });

  it("clamps to the upper edge for an all-negative domain", () => {
    expect(getBaselinePosition(createValueScale([-60, -20], [100, 0]))).toBe(0);
  });
});

describe("category scales", () => {
  it("creates evenly spaced bands over datum indices", () => {
    const scale = createBandScale(4, [0, 400], { paddingInner: 0, paddingOuter: 0 });
    expect(scale(0)).toBe(0);
    expect(scale(3)).toBe(300);
    expect(scale.bandwidth()).toBe(100);
  });

  it("places points at band centres with the default padding", () => {
    const points = createPointScale(4, [0, 400]);
    expect(points(0)).toBe(50);
    expect(points(3)).toBe(350);
  });

  it("centres a single point", () => {
    expect(createPointScale(1, [0, 400])(0)).toBe(200);
  });
});

describe("selectCategoryTickIndices", () => {
  it("returns every index when labels fit", () => {
    expect(selectCategoryTickIndices(4, 100, 40)).toEqual([0, 1, 2, 3]);
  });

  it("skips labels when they would overlap", () => {
    expect(selectCategoryTickIndices(12, 20, 50)).toEqual([0, 3, 6, 9]);
  });

  it("handles empty input and zero spacing", () => {
    expect(selectCategoryTickIndices(0, 10, 10)).toEqual([]);
    expect(selectCategoryTickIndices(5, 0, 10)).toEqual([0]);
  });
});
