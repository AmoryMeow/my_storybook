import { describe, expect, it } from "vitest";

import {
  describeCategory,
  findNearestIndex,
  getKeyboardIndex,
  getTooltipMaxWidth,
  placeTooltip,
} from "./Chart.interaction";

const bounds = { width: 600, height: 300 };
const tooltip = { width: 160, height: 80 };

function expectInside(
  placement: { left: number; top: number },
  size = tooltip,
  area = bounds,
) {
  expect(placement.left).toBeGreaterThanOrEqual(0);
  expect(placement.top).toBeGreaterThanOrEqual(0);
  expect(placement.left + size.width).toBeLessThanOrEqual(area.width);
  expect(placement.top + size.height).toBeLessThanOrEqual(area.height);
}

describe("placeTooltip", () => {
  it("places the tooltip to the right of the anchor, vertically centred", () => {
    const placement = placeTooltip({ anchor: { x: 100, y: 150 }, tooltip, bounds });
    expect(placement).toEqual({ left: 112, top: 110, side: "right" });
  });

  it("flips to the left near the right edge", () => {
    const placement = placeTooltip({ anchor: { x: 550, y: 150 }, tooltip, bounds });
    expect(placement.side).toBe("left");
    expect(placement.left).toBe(550 - 12 - 160);
    expectInside(placement);
  });

  it("clamps vertically near the top and bottom edges", () => {
    const top = placeTooltip({ anchor: { x: 100, y: 5 }, tooltip, bounds });
    const bottom = placeTooltip({ anchor: { x: 100, y: 298 }, tooltip, bounds });
    expect(top.top).toBe(4);
    expect(bottom.top).toBe(300 - 4 - 80);
    expectInside(top);
    expectInside(bottom);
  });

  it("shifts inward when neither side fits", () => {
    const narrow = { width: 200, height: 300 };
    const placement = placeTooltip({ anchor: { x: 100, y: 150 }, tooltip, bounds: narrow });
    expectInside(placement, tooltip, narrow);
  });

  it("stays inside the bounds for anchors anywhere in the chart", () => {
    for (let x = 0; x <= bounds.width; x += 25) {
      for (let y = 0; y <= bounds.height; y += 25) {
        expectInside(placeTooltip({ anchor: { x, y }, tooltip, bounds }));
      }
    }
  });
});

describe("getTooltipMaxWidth", () => {
  it("caps the width to the bounds minus padding", () => {
    expect(getTooltipMaxWidth(600)).toBe(288);
    expect(getTooltipMaxWidth(200)).toBe(192);
    expect(getTooltipMaxWidth(4)).toBe(0);
  });
});

describe("findNearestIndex", () => {
  const centres = [10, 30, 50, 70];

  it("finds the nearest centre", () => {
    expect(findNearestIndex(centres, 0)).toBe(0);
    expect(findNearestIndex(centres, 29)).toBe(1);
    expect(findNearestIndex(centres, 41)).toBe(2);
    expect(findNearestIndex(centres, 500)).toBe(3);
  });

  it("prefers the earlier centre on a tie", () => {
    expect(findNearestIndex(centres, 20)).toBe(0);
  });

  it("returns -1 without categories", () => {
    expect(findNearestIndex([], 10)).toBe(-1);
  });
});

describe("getKeyboardIndex", () => {
  it("moves between categories and stops at the ends", () => {
    expect(getKeyboardIndex("ArrowRight", null, 5)).toBe(0);
    expect(getKeyboardIndex("ArrowRight", 2, 5)).toBe(3);
    expect(getKeyboardIndex("ArrowRight", 4, 5)).toBe(4);
    expect(getKeyboardIndex("ArrowLeft", null, 5)).toBe(4);
    expect(getKeyboardIndex("ArrowLeft", 0, 5)).toBe(0);
    expect(getKeyboardIndex("Home", 3, 5)).toBe(0);
    expect(getKeyboardIndex("End", 0, 5)).toBe(4);
  });

  it("clears on Escape and ignores other keys", () => {
    expect(getKeyboardIndex("Escape", 2, 5)).toBeNull();
    expect(getKeyboardIndex("a", 2, 5)).toBeUndefined();
    expect(getKeyboardIndex("ArrowRight", null, 0)).toBeUndefined();
  });
});

describe("describeCategory", () => {
  it("reads the period and every series value", () => {
    expect(
      describeCategory("March 2026", [
        { label: "Revenue", value: "$204,300" },
        { label: "Costs", value: null },
      ]),
    ).toBe("March 2026. Revenue: $204,300. Costs: no data.");
  });
});
