import { scaleLinear } from "d3-scale";
import { describe, expect, it } from "vitest";

import {
  computeBarExtent,
  computeGroupedBarLayout,
  computeMonotoneTangents,
  splitLineSegments,
  toAreaPath,
  toBarPath,
  toLinePath,
} from "./Chart.geometry";

describe("splitLineSegments", () => {
  it("keeps a complete series as a single segment", () => {
    expect(
      splitLineSegments([
        { x: 0, y: 10 },
        { x: 1, y: 20 },
      ]),
    ).toEqual([
      [
        { x: 0, y: 10 },
        { x: 1, y: 20 },
      ],
    ]);
  });

  it("breaks the line at missing values", () => {
    const segments = splitLineSegments([
      { x: 0, y: 10 },
      { x: 1, y: 20 },
      { x: 2, y: null },
      { x: 3, y: 30 },
      { x: 4, y: Number.NaN },
      { x: 5, y: 40 },
      { x: 6, y: 50 },
    ]);
    expect(segments).toEqual([
      [
        { x: 0, y: 10 },
        { x: 1, y: 20 },
      ],
      [{ x: 3, y: 30 }],
      [
        { x: 5, y: 40 },
        { x: 6, y: 50 },
      ],
    ]);
  });

  it("ignores leading, trailing and consecutive gaps", () => {
    expect(
      splitLineSegments([
        { x: 0, y: null },
        { x: 1, y: 5 },
        { x: 2, y: null },
        { x: 3, y: null },
        { x: 4, y: 6 },
        { x: 5, y: null },
      ]),
    ).toEqual([[{ x: 1, y: 5 }], [{ x: 4, y: 6 }]]);
  });

  it("treats zero as a real value", () => {
    expect(splitLineSegments([{ x: 0, y: 0 }])).toEqual([[{ x: 0, y: 0 }]]);
  });

  it("returns no segments when every value is missing", () => {
    expect(splitLineSegments([{ x: 0, y: null }])).toEqual([]);
  });
});

describe("toLinePath", () => {
  it("joins points with straight line commands", () => {
    expect(
      toLinePath([
        { x: 0, y: 10 },
        { x: 5, y: 20 },
        { x: 10, y: 15 },
      ]),
    ).toBe("M0,10L5,20L10,15");
  });

  it("returns a bare move command for a single point", () => {
    expect(toLinePath([{ x: 3, y: 4 }])).toBe("M3,4");
    expect(toLinePath([{ x: 3, y: 4 }], "monotone")).toBe("M3,4");
  });

  it("returns an empty path for no points", () => {
    expect(toLinePath([])).toBe("");
  });

  it("draws cubic segments for a monotone curve", () => {
    const path = toLinePath(
      [
        { x: 0, y: 0 },
        { x: 3, y: 3 },
        { x: 6, y: 6 },
      ],
      "monotone",
    );
    // Collinear points: tangents equal the slope, so control points lie on the line.
    expect(path).toBe("M0,0C1,1 2,2 3,3C4,4 5,5 6,6");
  });

  it("falls back to a straight segment for two points", () => {
    expect(
      toLinePath(
        [
          { x: 0, y: 0 },
          { x: 3, y: 3 },
        ],
        "monotone",
      ),
    ).toBe("M0,0L3,3");
  });
});

describe("computeMonotoneTangents", () => {
  it("flattens the tangent at a local extremum", () => {
    const tangents = computeMonotoneTangents([
      { x: 0, y: 10 },
      { x: 1, y: 0 },
      { x: 2, y: 10 },
    ]);
    expect(tangents[1]).toBe(0);
  });

  it("never lets a curve overshoot its neighbouring points", () => {
    // A sharp rise followed by a plateau: a natural spline would overshoot.
    const points = [
      { x: 0, y: 100 },
      { x: 10, y: 90 },
      { x: 20, y: 10 },
      { x: 30, y: 9 },
      { x: 40, y: 8 },
    ];
    const tangents = computeMonotoneTangents(points);

    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const third = (end.x - start.x) / 3;
      const c1 = start.y + tangents[index] * third;
      const c2 = end.y - tangents[index + 1] * third;
      const low = Math.min(start.y, end.y);
      const high = Math.max(start.y, end.y);
      // Control points inside the segment's value range keep the curve inside it.
      expect(c1).toBeGreaterThanOrEqual(low - 1e-9);
      expect(c1).toBeLessThanOrEqual(high + 1e-9);
      expect(c2).toBeGreaterThanOrEqual(low - 1e-9);
      expect(c2).toBeLessThanOrEqual(high + 1e-9);
    }
  });

  it("returns zero tangents for fewer than two points", () => {
    expect(computeMonotoneTangents([{ x: 0, y: 1 }])).toEqual([0]);
  });
});

describe("toAreaPath", () => {
  it("closes the line down to the baseline", () => {
    expect(
      toAreaPath(
        [
          { x: 0, y: 10 },
          { x: 5, y: 20 },
        ],
        50,
      ),
    ).toBe("M0,10L5,20L5,50L0,50Z");
  });

  it("returns an empty path for a single point", () => {
    expect(toAreaPath([{ x: 0, y: 10 }], 50)).toBe("");
  });
});

describe("computeBarExtent", () => {
  const scale = scaleLinear().domain([-50, 100]).range([150, 0]);
  // Zero sits at y = 100.

  function expectExtent(
    actual: ReturnType<typeof computeBarExtent>,
    expected: ReturnType<typeof computeBarExtent>,
  ) {
    expect(actual.y).toBeCloseTo(expected.y, 9);
    expect(actual.height).toBeCloseTo(expected.height, 9);
    expect(actual.direction).toBe(expected.direction);
  }

  it("grows positive bars upward from zero", () => {
    expectExtent(computeBarExtent(60, scale), { y: 40, height: 60, direction: "up" });
  });

  it("grows negative bars downward from zero", () => {
    expectExtent(computeBarExtent(-30, scale), { y: 100, height: 30, direction: "down" });
  });

  it("gives a zero value no height at the baseline", () => {
    expectExtent(computeBarExtent(0, scale), { y: 100, height: 0, direction: "up" });
  });

  it("starts positive and negative bars at the same baseline", () => {
    const positive = computeBarExtent(60, scale);
    const negative = computeBarExtent(-30, scale);
    expect(positive.y + positive.height).toBeCloseTo(negative.y, 9);
  });

  it("anchors to the domain edge when zero is out of range", () => {
    const positive = scaleLinear().domain([20, 120]).range([100, 0]);
    expectExtent(computeBarExtent(70, positive), { y: 50, height: 50, direction: "up" });
  });
});

describe("computeGroupedBarLayout", () => {
  it("centres a single capped bar in its band", () => {
    expect(computeGroupedBarLayout({ bandWidth: 100, seriesCount: 1 })).toEqual({
      barWidth: 40,
      offsets: [30],
    });
  });

  it("places grouped bars side by side with a gap and centres the group", () => {
    const layout = computeGroupedBarLayout({ bandWidth: 200, seriesCount: 3, gap: 2 });
    expect(layout.barWidth).toBe(40);
    // Group width: 3 * 40 + 2 * 2 = 124, centred in 200 → starts at 38.
    expect(layout.offsets).toEqual([38, 80, 122]);
  });

  it("shrinks bars to fit a narrow band", () => {
    const layout = computeGroupedBarLayout({ bandWidth: 32, seriesCount: 3, gap: 1 });
    expect(layout.barWidth).toBe(10);
    expect(layout.offsets).toEqual([0, 11, 22]);
  });

  it("respects a custom maximum width", () => {
    expect(
      computeGroupedBarLayout({ bandWidth: 100, seriesCount: 2, maxBarWidth: 10, gap: 0 }),
    ).toEqual({ barWidth: 10, offsets: [40, 50] });
  });

  it("returns an empty layout without series or space", () => {
    expect(computeGroupedBarLayout({ bandWidth: 100, seriesCount: 0 })).toEqual({
      barWidth: 0,
      offsets: [],
    });
    expect(computeGroupedBarLayout({ bandWidth: 0, seriesCount: 2 })).toEqual({
      barWidth: 0,
      offsets: [],
    });
  });
});

describe("toBarPath", () => {
  it("rounds the top corners of an upward bar", () => {
    expect(toBarPath({ x: 0, y: 0, width: 20, height: 50 }, "up")).toBe(
      "M0,50L0,4Q0,0 4,0L16,0Q20,0 20,4L20,50Z",
    );
  });

  it("rounds the bottom corners of a downward bar", () => {
    expect(toBarPath({ x: 0, y: 0, width: 20, height: 50 }, "down")).toBe(
      "M0,0L20,0L20,46Q20,50 16,50L4,50Q0,50 0,46Z",
    );
  });

  it("limits the radius for short and narrow bars", () => {
    expect(toBarPath({ x: 0, y: 0, width: 4, height: 1 }, "up")).toBe(
      "M0,1L0,1Q0,0 1,0L3,0Q4,0 4,1L4,1Z",
    );
  });

  it("returns an empty path for bars without area", () => {
    expect(toBarPath({ x: 0, y: 10, width: 20, height: 0 }, "up")).toBe("");
    expect(toBarPath({ x: 0, y: 10, width: 0, height: 20 }, "up")).toBe("");
  });
});
