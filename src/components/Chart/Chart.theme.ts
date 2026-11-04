/**
 * Chrome uses the same slate steps as TreeTable so charts and tables read as
 * one system.
 *
 * Dark series values are separately chosen steps, not an inversion, and the
 * set was validated for color-vision-deficiency separation against the white
 * and slate-900 surfaces. Slot order is part of that validation, which is why
 * slots follow series position and are never reshuffled.
 *
 * Literal class strings, so Tailwind can find them at build time.
 */
export const chartThemeClassName = [
  "[--chart-surface:var(--color-white)] dark:[--chart-surface:var(--color-slate-900)]",
  "[--chart-text:var(--color-slate-700)] dark:[--chart-text:var(--color-slate-200)]",
  "[--chart-text-muted:var(--color-slate-500)] dark:[--chart-text-muted:var(--color-slate-400)]",
  "[--chart-grid:var(--color-slate-200)] dark:[--chart-grid:var(--color-slate-800)]",
  "[--chart-axis:var(--color-slate-400)] dark:[--chart-axis:var(--color-slate-600)]",
  "[--chart-highlight:var(--color-slate-100)] dark:[--chart-highlight:var(--color-slate-800)]",
  // Slot 1 is the TreeTable accent; slots 2–8 are interim until a shared
  // palette is extracted.
  "[--chart-series-1:var(--color-blue-600)] dark:[--chart-series-1:var(--color-blue-500)]",
  "[--chart-series-2:#eb6834] dark:[--chart-series-2:#d95926]",
  "[--chart-series-3:#1baf7a] dark:[--chart-series-3:#199e70]",
  "[--chart-series-4:#eda100] dark:[--chart-series-4:#c98500]",
  "[--chart-series-5:#e87ba4] dark:[--chart-series-5:#d55181]",
  "[--chart-series-6:#008300] dark:[--chart-series-6:#008300]",
  "[--chart-series-7:#6250d6] dark:[--chart-series-7:#9085e9]",
  "[--chart-series-8:#e34948] dark:[--chart-series-8:#e66767]",
  "[--chart-series-overflow:var(--color-slate-400)]",
].join(" ");

export const CATEGORICAL_SLOT_COUNT = 8;

/** Past the last slot, series fall back to gray rather than cycling: a repeated hue makes two series indistinguishable. */
export function resolveSeriesColor(index: number, color?: string): string {
  if (color) {
    return color;
  }
  return index < CATEGORICAL_SLOT_COUNT
    ? `var(--chart-series-${index + 1})`
    : "var(--chart-series-overflow)";
}
