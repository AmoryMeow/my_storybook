import { memo, useId, useMemo, useState, type ReactNode } from "react";

import { paletteVar } from "../../palette";
import { resolveChartData, type ResolvedChartData } from "./Chart.data";
import { buildChartSummary, createDefaultValueFormatter } from "./Chart.format";
import {
  splitLineSegments,
  toAreaPath,
  toLinePath,
  type ChartPoint,
  type LineCurve,
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

/** Options specific to `LineChart`. */
export interface LineChartOptions {
  /** Draws a marker on every data point. Isolated points are always marked. Defaults to `true`. */
  showMarkers?: boolean;

  /**
   * Extends the value axis to zero. Off by default, because a line encodes
   * change rather than magnitude and a forced zero can flatten it.
   */
  includeZero?: boolean;

  /**
   * Fills the space between each line and the value baseline with a soft
   * gradient wash in the series color. Defaults to `false`.
   */
  area?: boolean;

  /**
   * Interpolation between points. `monotone` draws a smooth curve that never
   * overshoots the data (no invented peaks or dips between points).
   * Defaults to `"linear"`.
   */
  curve?: LineCurve;

  /** Gridlines to draw. Defaults to `"y"`. */
  grid?: ChartGrid;
}

/**
 * `LineChart` props: shared chart props, one axis mode (`getDate` + `period`
 * for a time axis, or `getCategory`), and line options.
 */
export type LineChartProps<Datum> = ChartBaseProps<Datum> & LineChartOptions;

interface LinePlotProps {
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
  showMarkers: boolean;
  area: boolean;
  curve: LineCurve;
  grid: ChartGrid;
  tooltip: boolean;
  renderTooltip?: (context: ChartTooltipContext) => ReactNode;
}

interface MarkerPoint extends ChartPoint {
  isPartial: boolean;
  isIsolated: boolean;
}

interface SeriesMarks {
  lines: string[];
  /** Segments into an incomplete period. */
  dashed: string[];
  areas: string[];
  markers: MarkerPoint[];
}

interface LineMarksProps {
  geometry: PlotGeometry;
  marks: readonly SeriesMarks[];
  series: readonly LegendItem[];
  area: boolean;
  showMarkers: boolean;
  gradientIdPrefix: string;
}

/**
 * Plots one or more series as lines over a time axis (dates grouped into
 * days, weeks, months or quarters) or a category axis.
 *
 * Missing values break the line into separate segments instead of being
 * interpolated or treated as zero. An incomplete first or last period is
 * joined with a dashed segment.
 */
export function LineChart<Datum>(props: LineChartProps<Datum>) {
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
    showMarkers = true,
    includeZero = false,
    area = false,
    curve = "linear",
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
    includeZero,
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
          <LinePlot
            series={legend}
            resolved={resolved}
            domain={domain}
            width={width}
            height={height}
            title={title}
            description={
              description ??
              buildChartSummary({
                kind: "Line chart",
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
            showMarkers={showMarkers}
            area={area}
            curve={curve}
            grid={grid}
            tooltip={tooltip}
            renderTooltip={renderTooltip}
          />
        )
      }
    </ChartFrame>
  );
}

/**
 * Only the first and last periods can be incomplete, so a partial point is
 * always at the end of a run: the run is drawn solid without it and a dashed
 * segment joins it to its neighbour.
 */
function buildLineMarks(
  geometry: PlotGeometry,
  values: readonly (readonly (number | null)[])[],
  partial: readonly boolean[],
  curve: LineCurve,
): SeriesMarks[] {
  const { centres, valueScale } = geometry;
  const baselineY = getBaselinePosition(valueScale);
  const partialX = new Set(centres.filter((_, index) => partial[index]));

  return values.map((seriesValues) => {
    const marks: SeriesMarks = { lines: [], dashed: [], areas: [], markers: [] };
    const segments = splitLineSegments(
      seriesValues.map((value, index) => ({
        x: centres[index],
        y: value === null ? null : valueScale(value),
      })),
    );

    for (const segment of segments) {
      const last = segment.length - 1;
      const startsPartial = segment.length > 1 && partialX.has(segment[0].x);
      const endsPartial = segment.length > 1 && partialX.has(segment[last].x);
      const core = segment.slice(startsPartial ? 1 : 0, endsPartial ? last : last + 1);

      if (core.length > 1) {
        marks.lines.push(toLinePath(core, curve));
        marks.areas.push(toAreaPath(core, baselineY, curve));
      }
      if (startsPartial) {
        marks.dashed.push(toLinePath(segment.slice(0, 2)));
      }
      if (endsPartial) {
        marks.dashed.push(toLinePath(segment.slice(last - 1)));
      }
      for (const point of segment) {
        marks.markers.push({
          ...point,
          isPartial: partialX.has(point.x),
          isIsolated: segment.length === 1,
        });
      }
    }

    return marks;
  });
}

function LinePlot({
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
  showMarkers,
  area,
  curve,
  grid,
  tooltip,
  renderTooltip,
}: LinePlotProps) {
  const gradientIdPrefix = useId();
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
        scale: "point",
      }),
    [width, height, domain, formatValue, categoryAxisLabel, valueAxisLabel, categories, axis],
  );
  const marks = useMemo(
    () => (geometry ? buildLineMarks(geometry, values, partial, curve) : null),
    [geometry, values, partial, curve],
  );
  if (!geometry || !marks) {
    return null;
  }

  const { plot, centres, valueScale } = geometry;
  // An index can outlive its category when data change (e.g. a period switch).
  const activeIndex = active && active.index < categories.length ? active.index : null;
  const getAnchorY = (index: number) => {
    const ys = values.flatMap((seriesValues) =>
      seriesValues[index] === null ? [] : [valueScale(seriesValues[index])],
    );
    return ys.length > 0 ? Math.min(...ys) : plot.top + plot.height / 2;
  };

  return (
    <>
      <ChartSvg width={width} height={height} title={title} description={description}>
        <PlotBackground
          geometry={geometry}
          categories={categories}
          grid={grid}
          height={height}
          categoryAxisLabel={categoryAxisLabel}
          valueAxisLabel={valueAxisLabel}
        />
        {activeIndex === null ? null : (
          <line
            data-chart-part="crosshair"
            x1={centres[activeIndex]}
            x2={centres[activeIndex]}
            y1={plot.top}
            y2={plot.bottom}
            stroke={paletteVar("chart-axis")}
            strokeWidth={1}
            shapeRendering="crispEdges"
          />
        )}
        <LineMarks
          geometry={geometry}
          marks={marks}
          series={series}
          area={area}
          showMarkers={showMarkers}
          gradientIdPrefix={gradientIdPrefix}
        />
        {activeIndex === null
          ? null
          : series.map(({ key, color }, seriesIndex) => {
              const value = values[seriesIndex][activeIndex];
              return value === null ? null : (
                <circle
                  key={key}
                  data-chart-part="active-marker"
                  cx={centres[activeIndex]}
                  cy={valueScale(value)}
                  r={5}
                  fill={color}
                  stroke={paletteVar("surface")}
                  strokeWidth={2}
                />
              );
            })}
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

const LineMarks = memo(function LineMarks({
  geometry,
  marks,
  series,
  area,
  showMarkers,
  gradientIdPrefix,
}: LineMarksProps) {
  const { plot, valueScale } = geometry;
  const baselineY = getBaselinePosition(valueScale);
  const getGradientId = (seriesIndex: number) => `${gradientIdPrefix}-area-${seriesIndex}`;

  return (
    <>
      {area ? (
        <>
          <defs>
            {series.map(({ key, color }, seriesIndex) => (
              <linearGradient
                key={key}
                id={getGradientId(seriesIndex)}
                gradientUnits="userSpaceOnUse"
                x1={0}
                x2={0}
                y1={plot.top}
                y2={baselineY}
              >
                <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {marks.map((seriesMarks, seriesIndex) => (
            <g key={series[seriesIndex].key} data-area-series={series[seriesIndex].key}>
              {seriesMarks.areas.map((path, index) => (
                <path
                  key={index}
                  data-chart-part="area"
                  d={path}
                  fill={`url(#${getGradientId(seriesIndex)})`}
                />
              ))}
            </g>
          ))}
        </>
      ) : null}
      {marks.map((seriesMarks, seriesIndex) => {
        const { key, color } = series[seriesIndex];
        return (
          <g key={key} data-series={key}>
            {seriesMarks.lines.map((path, index) => (
              <path
                key={index}
                data-chart-part="line"
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {seriesMarks.dashed.map((path, index) => (
              <path
                key={`dashed-${index}`}
                data-chart-part="partial-line"
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeDasharray="4 4"
                strokeLinecap="round"
              />
            ))}
            {/* An incomplete period keeps its marker so the dashed end has a visible point. */}
            {seriesMarks.markers
              .filter((marker) => showMarkers || marker.isIsolated || marker.isPartial)
              .map((marker) => (
                <circle
                  key={marker.x}
                  data-chart-part="marker"
                  data-partial={marker.isPartial || undefined}
                  cx={marker.x}
                  cy={marker.y}
                  r={4}
                  fill={paletteVar("surface")}
                  stroke={color}
                  strokeWidth={2}
                />
              ))}
          </g>
        );
      })}
    </>
  );
});
