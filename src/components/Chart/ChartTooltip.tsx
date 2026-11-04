import {
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import {
  describeCategory,
  findNearestIndex,
  getKeyboardIndex,
  getTooltipMaxWidth,
  placeTooltip,
  type Size,
} from "./Chart.interaction";
import type { PlotArea } from "./Chart.layout";
import type {
  ChartTooltipContext,
  ChartTooltipItem,
  ValueFormatter,
} from "./Chart.types";

/** Only keyboard moves are announced; announcing every mouse move would flood screen readers. */
export type ActiveSource = "pointer" | "keyboard";

export interface ActiveCategory {
  index: number;
  source: ActiveSource;
}

export interface ChartInteractionLayerProps {
  plot: PlotArea;
  /** Ascending, in container coordinates. */
  centres: readonly number[];
  active: ActiveCategory | null;
  onActiveChange: (active: ActiveCategory | null) => void;
  label: string;
  announcement: string;
}

export interface ChartTooltipProps {
  /** In container coordinates. */
  anchor: { x: number; y: number };
  bounds: Size;
  children: ReactNode;
}

export interface ChartTooltipLayerProps {
  plot: PlotArea;
  /** Container size: the tooltip's bounds. */
  width: number;
  height: number;
  chartTitle: string;
  centres: readonly number[];
  titles: readonly string[];
  partial: readonly boolean[];
  series: readonly { key: string; label: string; color: string }[];
  /** `values[seriesIndex][categoryIndex]`. */
  values: readonly (readonly (number | null)[])[];
  formatValue: ValueFormatter;
  renderTooltip?: (context: ChartTooltipContext) => ReactNode;
  active: ActiveCategory | null;
  onActiveChange: (active: ActiveCategory | null) => void;
  getAnchorY: (index: number) => number;
}

/**
 * A separate focusable layer, because the SVG is a single `img` to assistive
 * technology and cannot hold interactive children. Values reach screen
 * readers through the live region instead.
 */
export function ChartInteractionLayer({
  plot,
  centres,
  active,
  onActiveChange,
  label,
  announcement,
}: ChartInteractionLayerProps) {
  const updateFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    // The layer starts at the plot's left edge; centres are in container coordinates.
    const index = findNearestIndex(centres, event.clientX - rect.left + plot.left);
    if (index >= 0 && (active?.index !== index || active.source !== "pointer")) {
      onActiveChange({ index, source: "pointer" });
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = getKeyboardIndex(event.key, active?.index ?? null, centres.length);
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    onActiveChange(next === null ? null : { index: next, source: "keyboard" });
  };

  return (
    <>
      <div
        data-chart-part="interaction-layer"
        role="group"
        aria-roledescription="interactive chart"
        aria-label={`${label}. Use the arrow keys to read values for each period.`}
        tabIndex={0}
        className="touch-pan-y rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400"
        style={{
          position: "absolute",
          left: plot.left,
          top: plot.top,
          width: plot.width,
          height: plot.height,
        }}
        onPointerMove={updateFromPointer}
        onPointerDown={updateFromPointer}
        onPointerLeave={(event) => {
          // A finger lifting off also "leaves"; keep the tooltip until the
          // layer loses focus (a tap elsewhere) so it can actually be read.
          if (active?.source === "pointer" && event.pointerType !== "touch") {
            onActiveChange(null);
          }
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => onActiveChange(null)}
      />
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </>
  );
}

/**
 * Placement needs the rendered size, so it is applied in a layout effect
 * (before paint, no flash) by writing the style directly instead of storing
 * it in state, which would cost a second render per pointer move.
 * `pointer-events: none` keeps the tooltip from stealing hover from the plot.
 */
export function ChartTooltip({ anchor, bounds, children }: ChartTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const placement = placeTooltip({
      anchor,
      tooltip: { width: element.offsetWidth, height: element.offsetHeight },
      bounds,
    });
    element.style.transform = `translate(${placement.left}px, ${placement.top}px)`;
    element.style.visibility = "visible";
    element.dataset.side = placement.side;
  });

  return (
    <div
      ref={ref}
      data-chart-part="tooltip"
      aria-hidden="true"
      className="z-10 rounded-md bg-slate-950 px-3 py-2 text-xs text-white shadow-lg dark:bg-slate-100 dark:text-slate-950"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        visibility: "hidden",
        maxWidth: getTooltipMaxWidth(bounds.width),
      }}
    >
      {children}
    </div>
  );
}

function DefaultTooltipContent({ context }: { context: ChartTooltipContext }) {
  return (
    <>
      <div className="font-semibold">{context.title}</div>
      {context.isPartial ? (
        <div className="text-slate-400 dark:text-slate-500">Incomplete period</div>
      ) : null}
      <table className="mt-1.5 border-collapse">
        <tbody>
          {context.items.map((item) => (
            <tr key={item.key}>
              <td className="py-0.5 pr-2 align-middle">
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              </td>
              <td className="py-0.5 pr-4 text-slate-300 dark:text-slate-600">{item.label}</td>
              <td className="py-0.5 text-right font-medium tabular-nums">
                {item.formattedValue ?? (
                  <span className="text-slate-400 dark:text-slate-500">No data</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** Highlights (crosshair, band) stay in each chart, which knows its own marks. */
export function ChartTooltipLayer({
  plot,
  width,
  height,
  chartTitle,
  centres,
  titles,
  partial,
  series,
  values,
  formatValue,
  renderTooltip,
  active,
  onActiveChange,
  getAnchorY,
}: ChartTooltipLayerProps) {
  // An index can outlive its category when data change (e.g. a period switch).
  const index = active && active.index < centres.length ? active.index : null;
  const context: ChartTooltipContext | null =
    index === null
      ? null
      : {
          index,
          title: titles[index],
          previousTitle: index > 0 ? titles[index - 1] : null,
          isPartial: partial[index] ?? false,
          items: series.map((item, seriesIndex): ChartTooltipItem => {
            const value = values[seriesIndex][index];
            return {
              key: item.key,
              label: item.label,
              color: item.color,
              value,
              formattedValue:
                value === null ? null : formatValue(value, { target: "tooltip" }),
              previousValue: index > 0 ? values[seriesIndex][index - 1] : null,
            };
          }),
        };

  return (
    <>
      <ChartInteractionLayer
        plot={plot}
        centres={centres}
        active={index === null ? null : active}
        onActiveChange={onActiveChange}
        label={chartTitle}
        announcement={
          context && active?.source === "keyboard"
            ? describeCategory(
                context.isPartial ? `${context.title}, incomplete period` : context.title,
                context.items.map((item) => ({ label: item.label, value: item.formattedValue })),
              )
            : ""
        }
      />
      {context === null ? null : (
        <ChartTooltip
          anchor={{ x: centres[context.index], y: getAnchorY(context.index) }}
          bounds={{ width, height }}
        >
          {renderTooltip ? renderTooltip(context) : <DefaultTooltipContent context={context} />}
        </ChartTooltip>
      )}
    </>
  );
}
