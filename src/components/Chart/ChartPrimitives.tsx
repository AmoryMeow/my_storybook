import { memo, useId, type ReactNode } from "react";

import { Spinner } from "../Spinner";
import {
  AXIS_FONT_SIZE,
  AXIS_LINE_HEIGHT,
  AXIS_TITLE_SIZE,
  TICK_SIZE,
  VALUE_LABEL_GAP,
  type CategoryLabelPlan,
  type PlotArea,
  type PlotGeometry,
  type ValueTick,
} from "./Chart.layout";
import { chartThemeClassName } from "./Chart.theme";
import type { ChartGrid, ValueFormatter } from "./Chart.types";
import { useElementWidth } from "./useElementWidth";

export interface LegendItem {
  key: string;
  label: string;
  color: string;
}

export interface ChartFrameProps {
  title: string;
  height: number;
  legend: readonly LegendItem[];
  isEmpty: boolean;
  isLoading: boolean;
  loadingLabel: string;
  emptyContent?: ReactNode;
  className?: string;
  table?: ReactNode;
  children: (width: number) => ReactNode;
}

export interface ChartSvgProps {
  width: number;
  height: number;
  title: string;
  description: string;
  children: ReactNode;
}

export interface ValueAxisProps {
  plot: PlotArea;
  ticks: readonly ValueTick[];
  showGrid: boolean;
}

export interface CategoryAxisProps {
  plot: PlotArea;
  labels: readonly string[];
  plan: CategoryLabelPlan;
  centres: readonly number[];
}

export interface CategoryGridProps {
  plot: PlotArea;
  indices: readonly number[];
  centres: readonly number[];
}

export interface ChartLegendProps {
  items: readonly LegendItem[];
}

export interface AxisTitlesProps {
  plot: PlotArea;
  height: number;
  categoryTitle?: string;
  valueTitle?: string;
}

export interface ChartDataTableProps {
  caption: string;
  categoryHeader: string;
  titles: readonly string[];
  partial: readonly boolean[];
  series: readonly LegendItem[];
  values: readonly (readonly (number | null)[])[];
  formatValue: ValueFormatter;
  visible: boolean;
}

export interface PlotBackgroundProps {
  geometry: PlotGeometry;
  categories: readonly string[];
  grid: ChartGrid;
  height: number;
  categoryAxisLabel?: string;
  valueAxisLabel?: string;
}

export function ChartFrame({
  title,
  height,
  legend,
  isEmpty,
  isLoading,
  loadingLabel,
  emptyContent = "No data to display",
  className,
  table,
  children,
}: ChartFrameProps) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const isRefreshing = isLoading && !isEmpty;

  return (
    <figure
      aria-label={title}
      aria-busy={isLoading || undefined}
      className={`${chartThemeClassName} m-0 flex min-w-0 flex-col gap-3 bg-(--chart-surface) text-(--chart-text) ${className ?? ""}`}
    >
      <div
        ref={containerRef}
        className="w-full min-w-0"
        // Inline so tooltip positioning never depends on stylesheet loading.
        style={{ position: "relative", height }}
      >
        {isEmpty ? (
          <div
            role={isLoading ? "status" : undefined}
            aria-live={isLoading ? "polite" : undefined}
            data-chart-part={isLoading ? "loading" : "empty"}
            className="flex h-full items-center justify-center gap-2 rounded-lg border border-dashed border-(--chart-axis) px-4 text-center text-sm text-(--chart-text-muted)"
          >
            {isLoading ? (
              <>
                <Spinner />
                {loadingLabel}
              </>
            ) : (
              emptyContent
            )}
          </div>
        ) : width > 0 ? (
          // Stale data stays visible while refreshing, but must not be explored as if current.
          <div inert={isRefreshing || undefined} className="h-full">
            {children(width)}
          </div>
        ) : null}
        {isRefreshing ? (
          <div
            role="status"
            aria-live="polite"
            data-chart-part="loading-overlay"
            className="flex items-center justify-center gap-2 rounded-lg bg-white/75 text-sm font-medium text-slate-700 backdrop-blur-[1px] dark:bg-slate-950/70 dark:text-slate-200"
            style={{ position: "absolute", inset: 0, zIndex: 20 }}
          >
            <Spinner />
            {loadingLabel}
          </div>
        ) : null}
      </div>
      {/* A single series needs no legend: the chart title already names it. */}
      {!isEmpty && legend.length > 1 ? <ChartLegend items={legend} /> : null}
      {table}
    </figure>
  );
}

export function ChartSvg({ width, height, title, description, children }: ChartSvgProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-desc`;

  return (
    <svg
      role="img"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block overflow-visible"
    >
      <title id={titleId}>{title}</title>
      <desc id={descriptionId}>{description}</desc>
      {children}
    </svg>
  );
}

export function ValueAxis({ plot, ticks, showGrid }: ValueAxisProps) {
  return (
    <g data-chart-part="value-axis">
      <line
        data-chart-part="value-axis-line"
        x1={plot.left}
        x2={plot.left}
        y1={plot.top}
        y2={plot.bottom}
        stroke="var(--chart-axis)"
        strokeWidth={1}
        shapeRendering="crispEdges"
      />
      {ticks.map((tick) => (
        <g key={tick.value}>
          {/* Zero is the baseline bars grow from, so it is drawn even without a
              grid and in the stronger axis color. The bottom edge is skipped:
              the category axis line already sits there. */}
          {tick.value === 0 || (showGrid && tick.y !== plot.bottom) ? (
            <line
              data-chart-part={tick.value === 0 ? "baseline" : "grid-y"}
              x1={plot.left}
              x2={plot.right}
              y1={tick.y}
              y2={tick.y}
              stroke={tick.value === 0 ? "var(--chart-axis)" : "var(--chart-grid)"}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          ) : null}
          <line
            data-chart-part="value-tick"
            x1={plot.left - TICK_SIZE}
            x2={plot.left}
            y1={tick.y}
            y2={tick.y}
            stroke="var(--chart-axis)"
            strokeWidth={1}
            shapeRendering="crispEdges"
          />
          <text
            x={plot.left - VALUE_LABEL_GAP}
            y={tick.y}
            dy="0.32em"
            textAnchor="end"
            fontSize={AXIS_FONT_SIZE}
            fill="var(--chart-text-muted)"
            className="tabular-nums"
          >
            {tick.label}
          </text>
        </g>
      ))}
    </g>
  );
}

export function CategoryAxis({ plot, labels, plan, centres }: CategoryAxisProps) {
  return (
    <g data-chart-part="category-axis">
      <line
        x1={plot.left}
        x2={plot.right}
        y1={plot.bottom}
        y2={plot.bottom}
        stroke="var(--chart-axis)"
        strokeWidth={1}
        shapeRendering="crispEdges"
      />
      {/* Ticks follow the labels, so a thinned axis has no unlabelled ticks. */}
      {plan.indices.map((index, position) => {
        const lines = plan.lines[position];
        const isShortened = lines.join(" ") !== labels[index];
        return (
          <g key={index}>
            <line
              data-chart-part="category-tick"
              x1={centres[index]}
              x2={centres[index]}
              y1={plot.bottom}
              y2={plot.bottom + TICK_SIZE}
              stroke="var(--chart-axis)"
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
            <text
              y={plot.bottom + 20}
              textAnchor="middle"
              fontSize={AXIS_FONT_SIZE}
              fill="var(--chart-text-muted)"
            >
              {/* A shortened label keeps its full name on hover. */}
              {isShortened ? <title>{labels[index]}</title> : null}
              {lines.map((line, lineIndex) => (
                <tspan
                  key={lineIndex}
                  x={centres[index]}
                  dy={lineIndex === 0 ? 0 : AXIS_LINE_HEIGHT}
                >
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function CategoryGrid({ plot, indices, centres }: CategoryGridProps) {
  return (
    <g data-chart-part="category-grid">
      {indices.map((index) => (
        <line
          key={index}
          data-chart-part="grid-x"
          x1={centres[index]}
          x2={centres[index]}
          y1={plot.top}
          y2={plot.bottom}
          stroke="var(--chart-grid)"
          strokeWidth={1}
          shapeRendering="crispEdges"
        />
      ))}
    </g>
  );
}

/** Labels stay in the text color: light hues such as yellow are illegible as text, so only the key is colored. */
export function ChartLegend({ items }: ChartLegendProps) {
  return (
    <ul
      className="m-0 flex list-none flex-wrap justify-center gap-x-5 gap-y-1 p-0 text-sm"
      aria-label="Legend"
    >
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function AxisTitles({ plot, height, categoryTitle, valueTitle }: AxisTitlesProps) {
  return (
    <g data-chart-part="axis-titles" fontSize={AXIS_FONT_SIZE} fill="var(--chart-text-muted)">
      {categoryTitle ? (
        <text x={plot.left + plot.width / 2} y={height - 6} textAnchor="middle">
          {categoryTitle}
        </text>
      ) : null}
      {valueTitle ? (
        <text
          transform={`translate(${AXIS_TITLE_SIZE / 2}, ${plot.top + plot.height / 2}) rotate(-90)`}
          dy="0.32em"
          textAnchor="middle"
        >
          {valueTitle}
        </text>
      ) : null}
    </g>
  );
}

/**
 * The accessible alternative to the plot: comparing values across periods by
 * moving a keyboard tooltip one step at a time is slow, a table is not.
 */
export function ChartDataTable({
  caption,
  categoryHeader,
  titles,
  partial,
  series,
  values,
  formatValue,
  visible,
}: ChartDataTableProps) {
  const table = (
    <table
      data-chart-part="data-table"
      className="w-full border-separate border-spacing-0 text-sm text-slate-700 dark:text-slate-200"
    >
      <caption className={visible ? "sr-only" : undefined}>{caption}</caption>
      <thead>
        <tr>
          <th
            scope="col"
            className="sticky top-0 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold dark:border-slate-700 dark:bg-slate-800"
          >
            {categoryHeader}
          </th>
          {series.map((item) => (
            <th
              key={item.key}
              scope="col"
              className="sticky top-0 border-b border-slate-200 bg-slate-50 px-3 py-2 text-right font-semibold dark:border-slate-700 dark:bg-slate-800"
            >
              {item.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {titles.map((title, index) => (
          <tr key={index}>
            <th
              scope="row"
              className="border-b border-slate-100 px-3 py-1.5 text-left font-normal dark:border-slate-800"
            >
              {title}
              {partial[index] ? (
                <span className="text-slate-500 dark:text-slate-400"> (incomplete)</span>
              ) : null}
            </th>
            {series.map((item, seriesIndex) => {
              const value = values[seriesIndex][index];
              return (
                <td
                  key={item.key}
                  className="border-b border-slate-100 px-3 py-1.5 text-right tabular-nums dark:border-slate-800"
                >
                  {value === null ? (
                    <span className="text-slate-400 dark:text-slate-500">No data</span>
                  ) : (
                    formatValue(value, { target: "tooltip" })
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (!visible) {
    return <div className="sr-only">{table}</div>;
  }
  return (
    // Focusable so keyboard users can scroll a long table.
    <div
      tabIndex={0}
      role="region"
      aria-label={`${caption}, data table`}
      className="max-h-80 overflow-auto rounded-lg border border-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-700 dark:focus-visible:ring-blue-400"
    >
      {table}
    </div>
  );
}

/** Memoised: it depends only on the data and size, never on hover. */
export const PlotBackground = memo(function PlotBackground({
  geometry,
  categories,
  grid,
  height,
  categoryAxisLabel,
  valueAxisLabel,
}: PlotBackgroundProps) {
  const { plot, valueTicks, centres, labels } = geometry;
  return (
    <>
      {grid === "xy" ? (
        <CategoryGrid plot={plot} indices={labels.indices} centres={centres} />
      ) : null}
      <ValueAxis plot={plot} ticks={valueTicks} showGrid={grid !== "none"} />
      <CategoryAxis plot={plot} labels={categories} plan={labels} centres={centres} />
      <AxisTitles
        plot={plot}
        height={height}
        categoryTitle={categoryAxisLabel}
        valueTitle={valueAxisLabel}
      />
    </>
  );
});
