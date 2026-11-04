import type { ScaleLinear } from "d3-scale";

import { getBaselinePosition } from "./Chart.scales";

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartMaybePoint {
  x: number;
  y: number | null;
}

export type LineCurve = "linear" | "monotone";

export interface BarExtent {
  y: number;
  height: number;
  direction: "up" | "down";
}

export interface GroupedBarLayoutOptions {
  bandWidth: number;
  seriesCount: number;
  maxBarWidth?: number;
  gap?: number;
}

export interface GroupedBarLayout {
  barWidth: number;
  /** Relative to the start of the band. */
  offsets: number[];
}

export interface BarRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Missing values split the line, so a gap in the data stays visible instead of being bridged or drawn as zero. */
export function splitLineSegments(
  points: readonly ChartMaybePoint[],
): ChartPoint[][] {
  const segments: ChartPoint[][] = [];
  let current: ChartPoint[] = [];

  for (const point of points) {
    if (point.y === null || !Number.isFinite(point.y)) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
      continue;
    }
    current.push({ x: point.x, y: point.y });
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments;
}

/**
 * Tangents for monotone cubic interpolation (Steffen, 1990). Flat at local
 * extrema and bounded by the neighbouring secants, so the curve never
 * overshoots: between two points it stays within their values and never
 * invents a peak or dip.
 */
export function computeMonotoneTangents(points: readonly ChartPoint[]): number[] {
  const count = points.length;
  if (count < 2) {
    return points.map(() => 0);
  }

  const widths: number[] = [];
  const secants: number[] = [];
  for (let index = 0; index < count - 1; index += 1) {
    const width = points[index + 1].x - points[index].x;
    widths.push(width);
    secants.push(width === 0 ? 0 : (points[index + 1].y - points[index].y) / width);
  }

  const tangents = [secants[0]];
  for (let index = 1; index < count - 1; index += 1) {
    const before = secants[index - 1];
    const after = secants[index];
    const weighted =
      (before * widths[index] + after * widths[index - 1]) /
      (widths[index - 1] + widths[index]);
    tangents.push(
      (Math.sign(before) + Math.sign(after)) *
        Math.min(Math.abs(before), Math.abs(after), 0.5 * Math.abs(weighted)),
    );
  }
  tangents.push(secants[count - 2]);

  return tangents;
}

function toCurveCommands(points: readonly ChartPoint[], curve: LineCurve): string {
  if (curve === "linear" || points.length < 3) {
    return points.slice(1).map((point) => `L${point.x},${point.y}`).join("");
  }

  const tangents = computeMonotoneTangents(points);
  let commands = "";
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const third = (end.x - start.x) / 3;
    commands +=
      `C${start.x + third},${start.y + tangents[index] * third} ` +
      `${end.x - third},${end.y - tangents[index + 1] * third} ` +
      `${end.x},${end.y}`;
  }
  return commands;
}

export function toLinePath(
  points: readonly ChartPoint[],
  curve: LineCurve = "linear",
): string {
  if (points.length === 0) {
    return "";
  }
  return `M${points[0].x},${points[0].y}${toCurveCommands(points, curve)}`;
}

export function toAreaPath(
  points: readonly ChartPoint[],
  baselineY: number,
  curve: LineCurve = "linear",
): string {
  if (points.length < 2) {
    return "";
  }
  const first = points[0];
  const last = points[points.length - 1];
  return `${toLinePath(points, curve)}L${last.x},${baselineY}L${first.x},${baselineY}Z`;
}

export function computeBarExtent(
  value: number,
  scale: ScaleLinear<number, number>,
): BarExtent {
  const baseline = getBaselinePosition(scale);
  const end = scale(value);

  return {
    y: Math.min(baseline, end),
    height: Math.abs(baseline - end),
    direction: value < 0 ? "down" : "up",
  };
}

/**
 * Bars are capped and the group is centred, so leftover band space becomes
 * air around the group instead of fattening the bars.
 */
export function computeGroupedBarLayout({
  bandWidth,
  seriesCount,
  maxBarWidth = 40,
  gap = 2,
}: GroupedBarLayoutOptions): GroupedBarLayout {
  if (seriesCount <= 0 || bandWidth <= 0) {
    return { barWidth: 0, offsets: [] };
  }

  const effectiveGap = seriesCount > 1 ? gap : 0;
  const available = bandWidth - effectiveGap * (seriesCount - 1);
  const barWidth = Math.max(0, Math.min(maxBarWidth, available / seriesCount));
  const groupWidth = barWidth * seriesCount + effectiveGap * (seriesCount - 1);
  const start = (bandWidth - groupWidth) / 2;

  return {
    barWidth,
    offsets: Array.from(
      { length: seriesCount },
      (_, index) => start + index * (barWidth + effectiveGap),
    ),
  };
}

/** Rounded at the data end, square at the baseline, so every bar visibly grows from zero. */
export function toBarPath(
  { x, y, width, height }: BarRect,
  direction: "up" | "down",
  radius = 4,
): string {
  if (width <= 0 || height <= 0) {
    return "";
  }

  const r = Math.min(radius, width / 2, height);
  const right = x + width;
  const bottom = y + height;

  if (direction === "up") {
    return [
      `M${x},${bottom}`,
      `L${x},${y + r}`,
      `Q${x},${y} ${x + r},${y}`,
      `L${right - r},${y}`,
      `Q${right},${y} ${right},${y + r}`,
      `L${right},${bottom}`,
      "Z",
    ].join("");
  }

  return [
    `M${x},${y}`,
    `L${right},${y}`,
    `L${right},${bottom - r}`,
    `Q${right},${bottom} ${right - r},${bottom}`,
    `L${x + r},${bottom}`,
    `Q${x},${bottom} ${x},${bottom - r}`,
    "Z",
  ].join("");
}
