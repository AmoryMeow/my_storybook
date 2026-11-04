import type { ScaleLinear } from "d3-scale";

import {
  createBandScale,
  createPointScale,
  createValueScale,
  getTargetTickCount,
  selectCategoryTickIndices,
  type ValueDomain,
} from "./Chart.scales";
import { computeNiceTicks, type NiceTicks } from "./Chart.ticks";
import type { ValueFormatter } from "./Chart.types";

export interface CategoryLabelPlan {
  indices: number[];
  /** Label lines for each entry of `indices`. */
  lines: string[][];
  lineCount: number;
}

export interface PlotArea {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

export interface ValueTick {
  value: number;
  y: number;
  label: string;
}

export interface CartesianLayout {
  plot: PlotArea;
  valueScale: ScaleLinear<number, number>;
  valueTicks: ValueTick[];
}

export interface CartesianLayoutOptions {
  width: number;
  height: number;
  domain: ValueDomain;
  formatValue: ValueFormatter;
  hasValueAxisTitle?: boolean;
  hasCategoryAxisTitle?: boolean;
  categoryLabelLines?: number;
}

export interface PlotGeometryOptions extends Omit<CartesianLayoutOptions, "categoryLabelLines"> {
  categories: readonly string[];
  axis: "time" | "category";
  /** `band` for bars (slots with a width), `point` for lines. */
  scale: "band" | "point";
}

export interface PlotGeometry extends CartesianLayout {
  /** Centre x of every category, ascending, in container coordinates. */
  centres: number[];
  step: number;
  /** Slot width for bars; `0` for points. */
  bandwidth: number;
  labels: CategoryLabelPlan;
}

export const AXIS_FONT_SIZE = 12;

/** Fallback for environments without a DOM, where text cannot be measured. */
export function estimateTextWidth(text: string, fontSize = AXIS_FONT_SIZE): number {
  return text.length * fontSize * 0.6;
}

let measureContext: CanvasRenderingContext2D | null | undefined;
let measureFontFamily = "sans-serif";
const measuredWidths = new Map<string, number>();

/** Extra room for tabular figures, which canvas measurement does not apply. */
const MEASURE_PADDING = 2;

/** Margins are sized from real text widths; an estimate clipped wide glyphs such as `$` and `K`. */
export function measureTextWidth(text: string, fontSize = AXIS_FONT_SIZE): number {
  if (measureContext === undefined) {
    measureContext =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
    if (measureContext) {
      measureFontFamily =
        getComputedStyle(document.documentElement).fontFamily || measureFontFamily;
    }
  }
  if (!measureContext) {
    return estimateTextWidth(text, fontSize);
  }

  const key = `${fontSize}|${text}`;
  let width = measuredWidths.get(key);
  if (width === undefined) {
    measureContext.font = `${fontSize}px ${measureFontFamily}`;
    width = measureContext.measureText(text).width + MEASURE_PADDING;
    measuredWidths.set(key, width);
  }
  return width;
}

export const AXIS_LINE_HEIGHT = 14;
/** Below this, not even one letter and an ellipsis fit, so category labels are thinned instead. */
const MIN_CATEGORY_LABEL_WIDTH = 28;
const CATEGORY_LABEL_GAP = 8;
const ELLIPSIS = "…";

/** The same indices also place vertical gridlines, so lines always meet a label. */
export function selectCategoryLabelIndices(
  labels: readonly string[],
  spacing: number,
): number[] {
  const labelWidth =
    Math.max(0, ...labels.map((label) => measureTextWidth(label))) + 12;
  return selectCategoryTickIndices(labels.length, spacing, labelWidth);
}

function truncate(text: string, maxWidth: number, measure: (text: string) => number): string {
  if (measure(text) <= maxWidth) {
    return text;
  }
  for (let length = text.length - 1; length > 1; length -= 1) {
    const candidate = text.slice(0, length).trimEnd() + ELLIPSIS;
    if (measure(candidate) <= maxWidth) {
      return candidate;
    }
  }
  return text.slice(0, 1) + ELLIPSIS;
}

export function fitLabel(
  text: string,
  maxWidth: number,
  maxLines: number,
  measure: (text: string) => number = measureTextWidth,
): string[] {
  let remaining = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];

  while (remaining.length > 0 && lines.length < maxLines) {
    if (lines.length === maxLines - 1) {
      lines.push(truncate(remaining.join(" "), maxWidth, measure));
      break;
    }
    let count = 1;
    while (
      count < remaining.length &&
      measure(remaining.slice(0, count + 1).join(" ")) <= maxWidth
    ) {
      count += 1;
    }
    lines.push(truncate(remaining.slice(0, count).join(" "), maxWidth, measure));
    remaining = remaining.slice(count);
  }

  return lines;
}

/**
 * Dates are ordered, so a time axis can skip labels without hiding anything.
 * Category names cannot be inferred from their neighbours, so every category
 * keeps a label, wrapped to two lines and then truncated; thinning is the
 * last resort when a slot cannot fit even one letter.
 */
export function planCategoryLabels(
  labels: readonly string[],
  spacing: number,
  axis: "time" | "category",
  measure: (text: string) => number = measureTextWidth,
): CategoryLabelPlan {
  if (axis === "category" && spacing >= MIN_CATEGORY_LABEL_WIDTH) {
    const lines = labels.map((label) =>
      fitLabel(label, spacing - CATEGORY_LABEL_GAP, 2, measure),
    );
    return {
      indices: labels.map((_, index) => index),
      lines,
      lineCount: Math.max(1, ...lines.map((label) => label.length)),
    };
  }

  const indices = selectCategoryLabelIndices(labels, spacing);
  const stride = indices.length > 1 ? indices[1] - indices[0] : labels.length;
  return {
    indices,
    lines: indices.map((index) =>
      axis === "time"
        ? [labels[index]]
        : fitLabel(labels[index], spacing * stride - CATEGORY_LABEL_GAP, 1, measure),
    ),
    lineCount: 1,
  };
}

const MARGIN_TOP = 12;
const MARGIN_RIGHT = 16;
const MARGIN_BOTTOM = 32;
/** Length of the tick marks on both axes. */
export const TICK_SIZE = 5;
/** Distance from the value axis line to the end of its labels: the tick plus breathing room. */
export const VALUE_LABEL_GAP = TICK_SIZE + 4;
/** Space taken by an axis title, including its gap to the tick labels. */
export const AXIS_TITLE_SIZE = 24;

/**
 * The value ticks depend only on height, so they are computed first and the
 * left margin is then sized to the widest tick label.
 */
export function computeCartesianLayout({
  width,
  height,
  domain,
  formatValue,
  hasValueAxisTitle = false,
  hasCategoryAxisTitle = false,
  categoryLabelLines = 1,
}: CartesianLayoutOptions): CartesianLayout | null {
  const marginBottom =
    MARGIN_BOTTOM +
    (categoryLabelLines - 1) * AXIS_LINE_HEIGHT +
    (hasCategoryAxisTitle ? AXIS_TITLE_SIZE : 0);
  const plotHeight = height - MARGIN_TOP - marginBottom;
  if (width <= 0 || plotHeight <= 0) {
    return null;
  }

  const nice = resolveNiceTicks(domain, getTargetTickCount(plotHeight));
  const bottom = MARGIN_TOP + plotHeight;
  const valueScale = createValueScale([nice.min, nice.max], [bottom, MARGIN_TOP]);
  const valueTicks = nice.ticks.map((value) => ({
    value,
    y: valueScale(value),
    label: formatValue(value, { step: nice.step, target: "axis" }),
  }));
  warnOnDuplicateLabels(valueTicks);

  const labelWidth = Math.max(
    0,
    ...valueTicks.map((tick) => measureTextWidth(tick.label)),
  );
  const left =
    Math.ceil(labelWidth) + VALUE_LABEL_GAP + (hasValueAxisTitle ? AXIS_TITLE_SIZE : 0);
  const plotWidth = width - left - MARGIN_RIGHT;
  if (plotWidth <= 0) {
    return null;
  }

  return {
    plot: {
      left,
      top: MARGIN_TOP,
      width: plotWidth,
      height: plotHeight,
      right: left + plotWidth,
      bottom,
    },
    valueScale,
    valueTicks,
  };
}

/**
 * `computeNiceTicks` fails only for an empty range, which `computeValueDomain`
 * already rules out; the fallback keeps layout total anyway.
 */
function resolveNiceTicks(domain: ValueDomain, targetCount: number): NiceTicks {
  return (
    computeNiceTicks(domain[0], domain[1], targetCount) ?? {
      min: domain[0],
      max: domain[1],
      step: domain[1] - domain[0],
      ticks: [domain[0], domain[1]],
    }
  );
}

/**
 * A custom `formatValue` that ignores the tick step can round adjacent ticks to
 * the same text, which makes the axis misleading.
 */
function warnOnDuplicateLabels(ticks: readonly ValueTick[]) {
  if (!import.meta.env?.DEV) {
    return;
  }
  const labels = ticks.map((tick) => tick.label);
  if (new Set(labels).size !== labels.length) {
    console.warn(
      `[Chart] Value-axis labels repeat (${labels.join(", ")}). ` +
        "Use the `step` passed to `formatValue` to choose the precision.",
    );
  }
}

/**
 * Wrapped category labels need a taller bottom margin, which shrinks the plot
 * and can change the value ticks and so the left margin and the slot width.
 * The layout is therefore computed once with single-line labels and, if they
 * wrap, again with room for the extra line.
 */
export function computePlotGeometry({
  categories,
  axis,
  scale,
  ...layoutOptions
}: PlotGeometryOptions): PlotGeometry | null {
  const attempt = (categoryLabelLines: number): PlotGeometry | null => {
    const layout = computeCartesianLayout({ ...layoutOptions, categoryLabelLines });
    if (!layout) {
      return null;
    }
    const range = [layout.plot.left, layout.plot.right] as const;
    const count = categories.length;

    if (scale === "band") {
      const band = createBandScale(count, range);
      const bandwidth = band.bandwidth();
      return {
        ...layout,
        centres: categories.map((_, index) => (band(index) ?? range[0]) + bandwidth / 2),
        step: band.step(),
        bandwidth,
        labels: planCategoryLabels(categories, band.step(), axis),
      };
    }

    const points = createPointScale(count, range);
    const step = count > 1 ? points.step() : layout.plot.width;
    return {
      ...layout,
      centres: categories.map((_, index) => points(index) ?? range[0]),
      step,
      bandwidth: 0,
      labels: planCategoryLabels(categories, step, axis),
    };
  };

  const single = attempt(1);
  if (!single || single.labels.lineCount <= 1) {
    return single;
  }
  return attempt(single.labels.lineCount) ?? single;
}
