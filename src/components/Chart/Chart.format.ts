import type { ValueDomain } from "./Chart.scales";
import { getTickSignificantDigits } from "./Chart.ticks";
import type { ValueFormatter } from "./Chart.types";

export interface ChartSummaryOptions {
  kind: string;
  seriesLabels: readonly string[];
  categories: readonly string[];
  /** The data range, not the rounded axis range: the description reports real values. */
  domain: ValueDomain | null;
  formatValue: ValueFormatter;
  partial?: readonly boolean[];
}

/** Tick precision follows the step, so adjacent ticks such as `1.01M` and `1.02M` never collapse into one label. */
export function createDefaultValueFormatter(
  locale?: string | readonly string[],
): ValueFormatter {
  const locales = locale as string | string[] | undefined;
  const general = new Intl.NumberFormat(locales, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const exact = new Intl.NumberFormat(locales, { maximumFractionDigits: 2 });
  const bySignificantDigits = new Map<number, Intl.NumberFormat>();

  return (value, context) => {
    if (context?.target === "tooltip") {
      return exact.format(value);
    }
    if (context?.step === undefined) {
      return general.format(value);
    }
    const digits = getTickSignificantDigits(value, context.step);
    let formatter = bySignificantDigits.get(digits);
    if (!formatter) {
      formatter = new Intl.NumberFormat(locales, {
        notation: "compact",
        maximumSignificantDigits: digits,
      });
      bySignificantDigits.set(digits, formatter);
    }
    return formatter.format(value);
  };
}

export function buildChartSummary({
  kind,
  seriesLabels,
  categories,
  domain,
  formatValue,
  partial = [],
}: ChartSummaryOptions): string {
  if (domain === null || categories.length === 0) {
    return `${kind} with no data.`;
  }

  const seriesText =
    seriesLabels.length === 1
      ? `one series, ${seriesLabels[0]}`
      : `${seriesLabels.length} series: ${seriesLabels.join(", ")}`;
  const first = categories[0];
  const last = categories[categories.length - 1];
  const categoryText =
    categories.length === 1
      ? `1 category, ${first}`
      : `${categories.length} categories from ${first} to ${last}`;

  const partialLabels = categories.filter((_, index) => partial[index]);
  const partialText =
    partialLabels.length === 0
      ? ""
      : ` Incomplete ${partialLabels.length === 1 ? "period" : "periods"}: ${partialLabels.join(", ")}.`;

  return `${kind} with ${seriesText}, across ${categoryText}. Values range from ${formatValue(domain[0])} to ${formatValue(domain[1])}.${partialText}`;
}
