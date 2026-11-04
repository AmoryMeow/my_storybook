import { CHART_SERIES_TOKENS, paletteVar } from "../../palette";

export const CATEGORICAL_SLOT_COUNT = CHART_SERIES_TOKENS.length;

/** Past the last slot, series fall back to gray rather than cycling: a repeated hue makes two series indistinguishable. */
export function resolveSeriesColor(index: number, color?: string): string {
  if (color) {
    return color;
  }
  return index < CATEGORICAL_SLOT_COUNT
    ? paletteVar(CHART_SERIES_TOKENS[index])
    : paletteVar("chart-series-overflow");
}
