import {
  scaleBand,
  scaleLinear,
  scalePoint,
  type ScaleBand,
  type ScaleLinear,
  type ScalePoint,
} from "d3-scale";

import type { ChartValue } from "./Chart.types";

export type ValueDomain = readonly [number, number];

export interface ValueDomainOptions {
  includeZero?: boolean;
}

export function isPlottableValue(value: ChartValue): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * A degenerate domain (all values equal) is widened so the scale stays well
 * defined. Rounding to nice values happens later, in layout, because the tick
 * count depends on the plot height.
 */
export function computeValueDomain(
  values: readonly number[],
  { includeZero = false }: ValueDomainOptions = {},
): ValueDomain | null {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) {
    return null;
  }

  let min = Math.min(...finite);
  let max = Math.max(...finite);

  if (includeZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }

  // With `includeZero`, equal bounds can only both be zero.
  if (min === max) {
    if (min === 0) {
      return [0, 1];
    }
    const padding = Math.abs(min) * 0.1;
    return [min - padding, max + padding];
  }

  return [min, max];
}

export function getTargetTickCount(plotHeight: number, spacing = 56): number {
  // +1 because the count includes both ends of the axis.
  return Math.max(2, Math.floor(plotHeight / spacing) + 1);
}

/**
 * Not `.nice()`d: the domain must already be rounded by `computeNiceTicks` so
 * the axis ends exactly on a tick. `range` is in SVG coordinates, so a
 * vertical axis passes `[bottom, top]`.
 */
export function createValueScale(
  domain: ValueDomain,
  range: readonly [number, number],
): ScaleLinear<number, number> {
  return scaleLinear()
    .domain([domain[0], domain[1]])
    .range([range[0], range[1]]);
}

/**
 * Zero when it is in the domain; otherwise the edge closest to zero, so marks
 * never extend past the plot.
 */
export function getBaselinePosition(scale: ScaleLinear<number, number>): number {
  const [d0, d1] = scale.domain();
  const lower = Math.min(d0, d1);
  const upper = Math.max(d0, d1);
  const baseline = Math.min(Math.max(0, lower), upper);
  return scale(baseline);
}

/** Indexed rather than labelled, so categories with duplicate labels stay distinct. */
export function createBandScale(
  count: number,
  range: readonly [number, number],
  { paddingInner = 0.2, paddingOuter = 0.1 } = {},
): ScaleBand<number> {
  return scaleBand<number>()
    .domain(Array.from({ length: count }, (_, index) => index))
    .range([range[0], range[1]])
    .paddingInner(paddingInner)
    .paddingOuter(paddingOuter);
}

/**
 * A padding of `0.5` puts points at the centres of the slots a band scale
 * would use, so line and bar charts line up on the same category axis.
 */
export function createPointScale(
  count: number,
  range: readonly [number, number],
  padding = 0.5,
): ScalePoint<number> {
  return scalePoint<number>()
    .domain(Array.from({ length: count }, (_, index) => index))
    .range([range[0], range[1]])
    .padding(padding);
}

export function selectCategoryTickIndices(
  count: number,
  spacing: number,
  labelWidth: number,
): number[] {
  if (count <= 0) {
    return [];
  }

  const step =
    spacing > 0 ? Math.max(1, Math.ceil(labelWidth / spacing)) : count;

  const indices: number[] = [];
  for (let index = 0; index < count; index += step) {
    indices.push(index);
  }
  return indices;
}
