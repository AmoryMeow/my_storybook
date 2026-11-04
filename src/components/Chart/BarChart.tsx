import { memo, useMemo, useState, type ReactNode } from "react";

import { resolveChartData, type ResolvedChartData } from "./Chart.data";
import { buildChartSummary, createDefaultValueFormatter } from "./Chart.format";
import {
  computeBarExtent,
  computeGroupedBarLayout,
  toBarPath,
} from "./Chart.geometry";
import { computePlotGeometry, type PlotGeometry } from "./Chart.layout";
import {
  computeValueDomain,
  getBaselinePosition,
  isPlottableValue,
  type ValueDomain,
} from "./Chart.scales";
import { resolveSeriesColor } from "./Chart.theme";
import type {
  ChartBaseProps,
  ChartGrid,
  ChartTooltipContext,
  ValueFormatter,
} from "./Chart.types";
import {
  ChartDataTable,
  ChartFrame,
  ChartSvg,
  PlotBackground,
  type LegendItem,
} from "./ChartPrimitives";
import { ChartTooltipLayer, type ActiveCategory } from "./ChartTooltip";

/** Options specific to `BarChart`. */
export interface BarChartOptions {
  /** Upper bound for a single bar's width in pixels. Defaults to `40`. */
  maxBarWidth?: number;

  /**
   * Gridlines to draw. Defaults to `"y"`. Vertical gridlines are not offered:
   * they would cut through grouped bars.
   */
  grid?: Exclude<ChartGrid, "xy">;
}

/**
 * `BarChart` props: shared chart props, one axis mode (`getDate` + `period`
 * for a time axis, or `getCategory`), and bar options.
 */
export type BarChartProps<Datum> = ChartBaseProps<Datum> & BarChartOptions;

interface BarPlotProps {
  series: readonly LegendItem[];
  resolved: ResolvedChartData;
  domain: ValueDomain;
  width: number;
  height: number;
  title: string;
  description: string;
  categoryAxisLabel?: string;
  valueAxisLabel?: string;
  formatValue: ValueFormatter;
  maxBarWidth: number;
  grid: Exclude<ChartGrid, "xy">;
  tooltip: boolean;
  renderTooltip?: (context: ChartTooltipContext) => ReactNode;
}

interface BarMark {
  index: number;
  value: number;
  path: string;
  isPartial: boolean;
}

interface BarMarksProps {
  marks: readonly (readonly BarMark[])[];
  series: readonly LegendItem[];
  categories: readonly string[];
}

/**
 * Plots one or more series as vertical bars over a time axis (dates grouped
 * into days, weeks, months or quarters) or a category axis. Multiple series
 * are grouped side by side within each period or category.
 *
 * Bars always grow from zero: the value axis is extended to include zero and
 * negative values grow downward from the baseline. Missing values leave an
 * empty slot; zero values draw no bar. Bars of an incomplete period are drawn
 * lighter with a dashed outline.
 */
export function BarChart<Datum>(props: BarChartProps<Datum>) {
  const {
    data,
    series,
    title,
    description,
    categoryAxisLabel,
    valueAxisLabel,
    height = 320,
    formatValue,
    locale,
    emptyContent,
    className,
    maxBarWidth = 40,
    grid = "y",
    tooltip = true,
    renderTooltip,
    isLoading = false,
    loadingLabel = "Loading chart data",
    dataTable = "hidden",
  } = props;
  const format = formatValue ?? createDefaultValueFormatter(locale);
  const resolved = resolveChartData(data, series, props, locale);
  const domain = computeValueDomain(resolved.values.flat().filter(isPlottableValue), {
    includeZero: true,
  });
  const legend: LegendItem[] = series.map((item, index) => ({
    key: item.key,
    label: item.label,
    color: resolveSeriesColor(index, item.color),
  }));

  return (
    <ChartFrame
      title={title}
      height={height}
      legend={legend}
      isEmpty={domain === null}
      isLoading={isLoading}
      loadingLabel={loadingLabel}
      emptyContent={emptyContent}
      className={className}
      table={
        domain === null ? null : (
          <ChartDataTable
            caption={title}
            categoryHeader={
              categoryAxisLabel ?? (resolved.axis === "time" ? "Period" : "Category")
            }
            titles={resolved.titles}
            partial={resolved.partial}
            series={legend}
            values={resolved.values}
            formatValue={format}
            visible={dataTable === "visible"}
          />
        )
      }
    >
      {(width) =>
        domain === null ? null : (
          <BarPlot
            series={legend}
            resolved={resolved}
            domain={domain}
            width={width}
            height={height}
            title={title}
            description={
              description ??
              buildChartSummary({
                kind: "Bar chart",
                seriesLabels: series.map((item) => item.label),
                categories: resolved.categories,
                domain,
                formatValue: format,
                partial: resolved.partial,
              })
            }
            categoryAxisLabel={categoryAxisLabel}
            valueAxisLabel={valueAxisLabel}
            formatValue={format}
            maxBarWidth={maxBarWidth}
            grid={grid}
            tooltip={tooltip}
            renderTooltip={renderTooltip}
          />
        )
      }
    </ChartFrame>
  );
}

function buildBarMarks(
  geometry: PlotGeometry,
  values: readonly (readonly (number | null)[])[],
  partial: readonly boolean[],
  maxBarWidth: number,
): BarMark[][] {
  const { centres, bandwidth, valueScale } = geometry;
  const { barWidth, offsets } = computeGroupedBarLayout({
    bandWidth: bandwidth,
    seriesCount: values.length,
    maxBarWidth,
  });

  return values.map((seriesValues, seriesIndex) =>
    seriesValues.flatMap((value, index) => {
      if (value === null) {
        return [];
      }
      const extent = computeBarExtent(value, valueScale);
      const path = toBarPath(
        {
          x: centres[index] - bandwidth / 2 + offsets[seriesIndex],
          y: extent.y,
          width: barWidth,
          height: extent.height,
        },
        extent.direction,
      );
      return path ? [{ index, value, path, isPartial: partial[index] ?? false }] : [];
    }),
  );
}

function BarPlot({
  series,
  resolved,
  domain,
  width,
  height,
  title,
  description,
  categoryAxisLabel,
  valueAxisLabel,
  formatValue,
  maxBarWidth,
  grid,
  tooltip,
  renderTooltip,
}: BarPlotProps) {
  const [active, setActive] = useState<ActiveCategory | null>(null);
  const { axis, categories, titles, values, partial } = resolved;

  // Hovering re-renders this component on every pointer move; everything
  // derived from the data is memoised so that only the highlight changes.
  const geometry = useMemo(
    () =>
      computePlotGeometry({
        width,
        height,
        domain,
        formatValue,
        hasCategoryAxisTitle: Boolean(categoryAxisLabel),
        hasValueAxisTitle: Boolean(valueAxisLabel),
        categories,
        axis,
        scale: "band",
      }),
    [width, height, domain, formatValue, categoryAxisLabel, valueAxisLabel, categories, axis],
  );
  const marks = useMemo(
    () => (geometry ? buildBarMarks(geometry, values, partial, maxBarWidth) : null),
    [geometry, values, partial, maxBarWidth],
  );
  if (!geometry || !marks) {
    return null;
  }

  const { plot, centres, step, valueScale } = geometry;
  // An index can outlive its category when data change (e.g. a period switch).
  const activeIndex = active && active.index < categories.length ? active.index : null;
  const getAnchorY = (index: number) => {
    const tops = values.flatMap((seriesValues) =>
      seriesValues[index] === null ? [] : [computeBarExtent(seriesValues[index], valueScale).y],
    );
    return tops.length > 0 ? Math.min(...tops) : getBaselinePosition(valueScale);
  };

  return (
    <>
      <ChartSvg width={width} height={height} title={title} description={description}>
        {activeIndex === null ? null : (
          <rect
            data-chart-part="highlight"
            x={centres[activeIndex] - step / 2}
            y={plot.top}
            width={step}
            height={plot.height}
            fill="var(--chart-highlight)"
          />
        )}
        <PlotBackground
          geometry={geometry}
          categories={categories}
          grid={grid}
          height={height}
          categoryAxisLabel={categoryAxisLabel}
          valueAxisLabel={valueAxisLabel}
        />
        <BarMarks marks={marks} series={series} categories={categories} />
      </ChartSvg>
      {tooltip ? (
        <ChartTooltipLayer
          plot={plot}
          width={width}
          height={height}
          chartTitle={title}
          centres={centres}
          titles={titles}
          partial={partial}
          series={series}
          values={values}
          formatValue={formatValue}
          renderTooltip={renderTooltip}
          active={active}
          onActiveChange={setActive}
          getAnchorY={getAnchorY}
        />
      ) : null}
    </>
  );
}

const BarMarks = memo(function BarMarks({ marks, series, categories }: BarMarksProps) {
  return (
    <>
      {marks.map((seriesMarks, seriesIndex) => {
        const { key, color } = series[seriesIndex];
        return (
          <g key={key} data-series={key} fill={color}>
            {seriesMarks.map((mark) => (
              <path
                key={mark.index}
                data-chart-part="bar"
                data-category={categories[mark.index]}
                data-value={mark.value}
                data-partial={mark.isPartial || undefined}
                d={mark.path}
                // Lighter fill plus a dashed outline: distinguishable without relying on color.
                fillOpacity={mark.isPartial ? 0.35 : undefined}
                stroke={mark.isPartial ? color : undefined}
                strokeDasharray={mark.isPartial ? "3 2" : undefined}
                strokeWidth={mark.isPartial ? 1 : undefined}
              />
            ))}
          </g>
        );
      })}
    </>
  );
});
