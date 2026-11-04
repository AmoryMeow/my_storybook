import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";

import {
  dailySales,
  dailyBalance,
  dailyConversion,
  formatPercent,
  formatUsdCompact,
  monthlyFinancials,
  type DailySales,
  type DailyBalance,
  type DailyConversion,
  type MonthlyFinancials,
} from "./chart.stories.data";
import { DemoChartCard } from "./chart.stories.card";
import {
  LineChart,
  type ChartCommonProps,
  type ChartTimeAxisProps,
  type LineChartOptions,
} from "./index";

/** Every line story uses a time axis; naming the branch keeps `render` and `play` typed. */
type Story<Datum> = StoryObj<
  ChartCommonProps<Datum> & ChartTimeAxisProps<Datum> & LineChartOptions
>;

const meta = {
  title: "Components/LineChart",
  component: LineChart,
  parameters: { layout: "padded" },
} satisfies Meta<typeof LineChart>;

export default meta;

export const SingleLine: Story<MonthlyFinancials> = {
  args: {
    title: "Monthly revenue, 2026",
    data: monthlyFinancials,
    getDate: (row) => row.date,
    period: "month",
    series: [{ key: "revenue", label: "Revenue", value: (row) => row.revenue }],
    formatValue: formatUsdCompact,
  },
  render: (args) => <LineChart {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chart = canvas.getByRole("img", { name: "Monthly revenue, 2026" });

    await expect(chart.querySelectorAll('[data-chart-part="line"]')).toHaveLength(1);
    await expect(chart.querySelectorAll('[data-chart-part="marker"]')).toHaveLength(12);
    await expect(chart.querySelectorAll('[data-chart-part="category-tick"]')).toHaveLength(12);
    await expect(chart.querySelector('[data-chart-part="value-axis-line"]')).not.toBeNull();
    // Every value label has a tick, matching the category axis.
    await expect(chart.querySelectorAll('[data-chart-part="value-tick"]').length).toBe(
      chart.querySelectorAll('[data-chart-part="value-axis"] text').length,
    );
    await expect(canvas.queryByRole("list", { name: "Legend" })).toBeNull();
    await expect(chart.querySelector("desc")?.textContent).toContain(
      "one series, Revenue",
    );
  },
};

export const MultipleLines: Story<MonthlyFinancials> = {
  args: {
    title: "Revenue and spend by month, 2026",
    data: monthlyFinancials,
    getDate: (row) => row.date,
    period: "month",
    series: [
      { key: "revenue", label: "Revenue", value: (row) => row.revenue },
      { key: "operatingCosts", label: "Operating costs", value: (row) => row.operatingCosts },
      { key: "marketing", label: "Marketing", value: (row) => row.marketing },
    ],
    formatValue: formatUsdCompact,
    includeZero: true,
  },
  render: (args) => <LineChart {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const legend = canvas.getByRole("list", { name: "Legend" });

    await expect(within(legend).getAllByRole("listitem")).toHaveLength(3);
    await expect(
      canvasElement.querySelectorAll('[data-chart-part="line"]'),
    ).toHaveLength(3);
  },
};

export const AreaAndSmoothCurve: Story<MonthlyFinancials> = {
  args: {
    title: "Monthly revenue, 2026",
    data: monthlyFinancials,
    getDate: (row) => row.date,
    period: "month",
    series: [{ key: "revenue", label: "Revenue", value: (row) => row.revenue }],
    formatValue: formatUsdCompact,
    categoryAxisLabel: "Month",
    valueAxisLabel: "Revenue",
    includeZero: true,
    area: true,
    curve: "monotone",
  },
  render: (args) => <LineChart {...args} />,
  play: async ({ canvasElement }) => {
    const chart = within(canvasElement).getByRole("img", { name: "Monthly revenue, 2026" });
    const line = chart.querySelector('[data-chart-part="line"]');

    await expect(chart.querySelectorAll('[data-chart-part="area"]')).toHaveLength(1);
    await expect(line?.getAttribute("d")).toContain("C");
    await expect(within(chart).getByText("Month")).toBeInTheDocument();
  },
};

export const InDashboardCard: Story<MonthlyFinancials> = {
  args: {
    title: "Revenue and spend by month, 2026",
    data: monthlyFinancials,
    getDate: (row) => row.date,
    period: "month",
    series: [
      { key: "revenue", label: "Revenue", value: (row) => row.revenue },
      { key: "operatingCosts", label: "Operating costs", value: (row) => row.operatingCosts },
    ],
    formatValue: formatUsdCompact,
    categoryAxisLabel: "Month",
    includeZero: true,
    area: true,
    curve: "monotone",
  },
  render: (args) => (
    <DemoChartCard
      title="Revenue trends"
      subtitle="Revenue against operating costs"
      periods={["Last 12 months", "Last 6 months", "Year to date"]}
      kpis={[
        { label: "Total revenue", value: "$2.67M", delta: "+18.4%", isPositive: true },
        { label: "Operating costs", value: "$1.88M", delta: "+9.1%", isPositive: false },
        { label: "Operating margin", value: "29.6%", delta: "+4.2 pp", isPositive: true },
      ]}
    >
      <LineChart {...args} />
    </DemoChartCard>
  ),
};

export const GridOptions: Story<MonthlyFinancials> = {
  args: {
    ...MultipleLines.args,
    height: 220,
  },
  render: (args) => (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] gap-8">
      <LineChart {...args} title='grid="y" (default)' grid="y" />
      <LineChart {...args} title='grid="xy"' grid="xy" />
      <LineChart {...args} title='grid="none"' grid="none" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const count = (name: string, part: string) =>
      canvas.getByRole("img", { name }).querySelectorAll(`[data-chart-part="${part}"]`).length;

    await expect(count('grid="y" (default)', "grid-y")).toBeGreaterThan(0);
    await expect(count('grid="y" (default)', "grid-x")).toBe(0);
    await expect(count('grid="xy"', "grid-x")).toBeGreaterThan(0);
    await expect(count('grid="none"', "grid-y")).toBe(0);
    // The zero baseline stays even without a grid.
    await expect(count('grid="none"', "baseline")).toBe(1);
  },
};

export const NarrowValueRange: Story<DailyBalance> = {
  args: {
    title: "Operating account balance, last 7 days",
    data: dailyBalance,
    getDate: (row) => row.date,
    period: "day",
    series: [{ key: "balance", label: "Balance", value: (row) => row.balance }],
  },
  render: (args) => <LineChart {...args} />,
  play: async ({ canvasElement }) => {
    const chart = within(canvasElement).getByRole("img", {
      name: "Operating account balance, last 7 days",
    });
    const labels = Array.from(
      chart.querySelectorAll('[data-chart-part="value-axis"] text'),
      (node) => node.textContent,
    );

    // Values differ only in the third digit, so labels need extra precision.
    await expect(labels.length).toBeGreaterThan(2);
    await expect(new Set(labels).size).toBe(labels.length);
  },
};

export const CustomColors: Story<MonthlyFinancials> = {
  args: {
    ...MultipleLines.args,
    title: "Revenue against costs with brand colors",
    series: [
      { key: "revenue", label: "Revenue", value: (row) => row.revenue, color: "#0f766e" },
      {
        key: "operatingCosts",
        label: "Operating costs",
        value: (row) => row.operatingCosts,
        color: "#9333ea",
      },
    ],
    showMarkers: false,
  },
  render: (args) => <LineChart {...args} />,
};

export const MissingData: Story<DailyConversion> = {
  args: {
    title: "Daily conversion rate by platform",
    description:
      "Conversion rate for web and mobile, October 1 to 10. Web data is missing on October 4 and 5; mobile data is missing on October 1, 5 and 7.",
    data: dailyConversion,
    getDate: (row) => row.date,
    period: "day",
    series: [
      { key: "web", label: "Web", value: (row) => row.web },
      { key: "mobile", label: "Mobile", value: (row) => row.mobile },
    ],
    formatValue: formatPercent,
  },
  render: (args) => <LineChart {...args} />,
  play: async ({ canvasElement }) => {
    const web = canvasElement.querySelector('[data-series="web"]');
    const mobile = canvasElement.querySelector('[data-series="mobile"]');

    // Web: Oct 1–3 and Oct 6–10 → two segments, 8 points.
    await expect(web?.querySelectorAll('[data-chart-part="line"]')).toHaveLength(2);
    await expect(web?.querySelectorAll('[data-chart-part="marker"]')).toHaveLength(8);
    // Mobile: Oct 2–4, Oct 6 alone, Oct 8–10 → two lines; the lone Oct 6 is a marker only.
    await expect(mobile?.querySelectorAll('[data-chart-part="line"]')).toHaveLength(2);
    await expect(mobile?.querySelectorAll('[data-chart-part="marker"]')).toHaveLength(7);
  },
};

export const ResponsiveContainer: Story<MonthlyFinancials> = {
  args: {
    ...MultipleLines.args,
    title: "Revenue and spend in a resizable container",
    height: 260,
  },
  render: (args) => (
    <div className="flex flex-col gap-6">
      <p className="m-0 text-sm text-fg-secondary">
        Drag the bottom-right corner of the first box to resize it. The chart follows the
        container width, and labels thin out when space runs low.
      </p>
      <div className="w-full max-w-full min-w-48 resize-x overflow-hidden rounded-lg border border-line-strong p-3">
        <LineChart {...args} />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-6">
        <div className="max-w-xs">
          <LineChart {...args} title="Narrow container" height={200} />
        </div>
        <div>
          <LineChart {...args} title="Flexible container" height={200} />
        </div>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The narrow chart re-measures once styles apply, then thins its labels.
    await waitFor(() => {
      const narrow = canvas.getByRole("img", { name: "Narrow container" });
      const labels = narrow.querySelectorAll('[data-chart-part="category-axis"] text');
      expect(narrow.getBoundingClientRect().width).toBeLessThanOrEqual(320);
      expect(labels.length).toBeGreaterThan(0);
      expect(labels.length).toBeLessThan(12);
      // Thinned labels thin their ticks too.
      expect(narrow.querySelectorAll('[data-chart-part="category-tick"]')).toHaveLength(
        labels.length,
      );
    });
  },
};

export const EmptyData: Story<MonthlyFinancials> = {
  args: {
    title: "Monthly revenue, 2026",
    data: [],
    getDate: (row) => row.date,
    period: "month",
    series: [{ key: "revenue", label: "Revenue", value: (row) => row.revenue }],
    emptyContent: "No revenue recorded for this period yet.",
  },
  render: (args) => <LineChart {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText("No revenue recorded for this period yet.")).toBeVisible();
    await expect(canvas.getByRole("figure", { name: "Monthly revenue, 2026" })).toBeVisible();
    await expect(canvas.queryByRole("img")).toBeNull();
  },
};

export const PeriodGranularity: Story<DailySales> = {
  args: {
    title: "Revenue, July 2025 to June 2026",
    description:
      "One year of daily revenue grouped into the selected period. Use the period control to switch between days, weeks, months and quarters.",
    data: dailySales,
    getDate: (row) => row.date,
    period: "week",
    series: [{ key: "revenue", label: "Revenue", value: (row) => row.revenue, aggregate: "sum" }],
    formatValue: formatUsdCompact,
    includeZero: true,
    area: true,
    curve: "monotone",
    showMarkers: false,
  },
  argTypes: {
    period: { control: "inline-radio", options: ["day", "week", "month", "quarter"] },
  },
  render: (args) => <LineChart {...args} />,
  play: async ({ canvasElement }) => {
    const chart = within(canvasElement).getByRole("img", {
      name: "Revenue, July 2025 to June 2026",
    });
    const labels = Array.from(
      chart.querySelectorAll('[data-chart-part="category-axis"] text'),
      (node) => node.textContent ?? "",
    );

    // 365 days starting on a Tuesday span 53 Monday-based weeks; the line is unbroken.
    await expect(chart.querySelectorAll('[data-chart-part="line"]')).toHaveLength(1);
    // The range crosses a year boundary, so labels carry the year.
    await expect(labels[0]).toMatch(/2025/);
  },
};

export const FixedTimeRange: Story<MonthlyFinancials> = {
  args: {
    title: "Monthly revenue, last 18 months",
    data: monthlyFinancials,
    getDate: (row) => row.date,
    period: "month",
    timeRange: { start: "2025-07-01", end: "2026-12-31" },
    series: [{ key: "revenue", label: "Revenue", value: (row) => row.revenue }],
    formatValue: formatUsdCompact,
  },
  render: (args) => <LineChart {...args} />,
  play: async ({ canvasElement }) => {
    const chart = within(canvasElement).getByRole("img", {
      name: "Monthly revenue, last 18 months",
    });

    // 18 periods on the axis, but data only for the last 12: no invented points.
    await expect(chart.querySelector("desc")?.textContent).toContain("18 categories");
    await expect(chart.querySelectorAll('[data-chart-part="marker"]')).toHaveLength(12);
  },
};

function expectInside(element: Element, container: Element) {
  const box = element.getBoundingClientRect();
  const area = container.getBoundingClientRect();
  expect(box.left).toBeGreaterThanOrEqual(area.left);
  expect(box.top).toBeGreaterThanOrEqual(area.top);
  expect(box.right).toBeLessThanOrEqual(area.right);
  expect(box.bottom).toBeLessThanOrEqual(area.bottom);
}

export const Tooltip: Story<MonthlyFinancials> = {
  args: {
    ...MultipleLines.args,
    title: "Revenue and spend by month, 2026 (tooltip)",
  },
  render: (args) => <LineChart {...args} />,
  play: async ({ canvasElement }) => {
    const layer = canvasElement.querySelector<HTMLElement>(
      '[data-chart-part="interaction-layer"]',
    )!;
    const container = layer.parentElement!;
    const getTooltip = () =>
      canvasElement.querySelector<HTMLElement>('[data-chart-part="tooltip"]');

    // Pointer: the nearest period is shown with every series and a crosshair.
    const rect = layer.getBoundingClientRect();
    fireEvent.pointerMove(layer, { clientX: rect.left + 2, clientY: rect.top + 10 });
    await waitFor(() => expect(getTooltip()).toHaveTextContent("January 2026"));
    await expect(getTooltip()).toHaveTextContent("$182,000");
    await expect(getTooltip()).toHaveTextContent("Operating costs");
    await expect(canvasElement.querySelector('[data-chart-part="crosshair"]')).not.toBeNull();
    await expect(
      canvasElement.querySelectorAll('[data-chart-part="active-marker"]'),
    ).toHaveLength(3);
    expectInside(getTooltip()!, container);

    await userEvent.unhover(layer);
    await waitFor(() => expect(getTooltip()).toBeNull());

    // Keyboard: the last period flips the tooltip to the left and is announced.
    layer.focus();
    await userEvent.keyboard("{End}");
    await waitFor(() => expect(getTooltip()).toHaveTextContent("December 2026"));
    await expect(getTooltip()?.dataset.side).toBe("left");
    expectInside(getTooltip()!, container);
    await expect(
      canvasElement.querySelector('[aria-live="polite"]')?.textContent,
    ).toContain("December 2026. Revenue: $289,500.");

    await userEvent.keyboard("{ArrowLeft}");
    await waitFor(() => expect(getTooltip()).toHaveTextContent("November 2026"));

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(getTooltip()).toBeNull());
    layer.blur();
  },
};

export const WithoutTooltip: Story<MonthlyFinancials> = {
  args: {
    ...SingleLine.args,
    title: "Monthly revenue without tooltip",
    tooltip: false,
  },
  render: (args) => <LineChart {...args} />,
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector('[data-chart-part="interaction-layer"]'),
    ).toBeNull();
  },
};

export const IncompletePeriods: Story<DailySales> = {
  args: {
    title: "Weekly revenue with incomplete first and last weeks",
    data: dailySales,
    getDate: (row) => row.date,
    period: "week",
    series: [{ key: "revenue", label: "Revenue", value: (row) => row.revenue }],
    formatValue: formatUsdCompact,
    includeZero: true,
    showMarkers: false,
  },
  render: (args) => <LineChart {...args} />,
  play: async ({ canvasElement }) => {
    const chart = within(canvasElement).getByRole("img", {
      name: "Weekly revenue with incomplete first and last weeks",
    });
    const layer = canvasElement.querySelector<HTMLElement>(
      '[data-chart-part="interaction-layer"]',
    )!;
    const getTooltip = () => canvasElement.querySelector('[data-chart-part="tooltip"]');

    // The data start on a Tuesday and end on a Tuesday: both edge weeks are partial.
    await expect(chart.querySelectorAll('[data-chart-part="partial-line"]')).toHaveLength(2);
    await expect(chart.querySelectorAll('[data-partial]')).toHaveLength(2);
    await expect(chart.querySelector("desc")?.textContent).toContain("Incomplete periods");

    layer.focus();
    await userEvent.keyboard("{End}");
    await waitFor(() => expect(getTooltip()).toHaveTextContent("Incomplete period"));
    await userEvent.keyboard("{Escape}");
    layer.blur();
  },
};

const percentChange = (value: number, previous: number) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format((value - previous) / Math.abs(previous));

export const CustomTooltip: Story<MonthlyFinancials> = {
  args: {
    title: "Monthly revenue with change on the previous month",
    data: monthlyFinancials,
    getDate: (row) => row.date,
    period: "month",
    series: [{ key: "revenue", label: "Revenue", value: (row) => row.revenue }],
    formatValue: formatUsdCompact,
    area: true,
    curve: "monotone",
    renderTooltip: ({ title, previousTitle, items }) => {
      const [revenue] = items;
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold">{title}</span>
          <span className="text-sm font-semibold tabular-nums">{revenue.formattedValue}</span>
          {revenue.value !== null && revenue.previousValue !== null && previousTitle ? (
            <span className="text-fg-inverse-muted">
              {percentChange(revenue.value, revenue.previousValue)} vs. {previousTitle}
            </span>
          ) : null}
        </div>
      );
    },
  },
  render: (args) => <LineChart {...args} />,
  play: async ({ canvasElement }) => {
    const layer = canvasElement.querySelector<HTMLElement>(
      '[data-chart-part="interaction-layer"]',
    )!;
    const getTooltip = () => canvasElement.querySelector('[data-chart-part="tooltip"]');

    layer.focus();
    await userEvent.keyboard("{End}");
    // December $289,500 against November $262,400.
    await waitFor(() => expect(getTooltip()).toHaveTextContent("+10.3% vs. November 2026"));
    // Screen readers still get the default reading of the values.
    await expect(
      canvasElement.querySelector('[aria-live="polite"]')?.textContent,
    ).toContain("December 2026. Revenue: $289,500.");
    await userEvent.keyboard("{Escape}");
    layer.blur();
  },
};

export const DataTable: Story<MonthlyFinancials> = {
  args: {
    ...MultipleLines.args,
    title: "Revenue and spend by month, 2026 (table)",
  },
  render: function Render(args) {
    const [showTable, setShowTable] = useState(false);
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          aria-pressed={showTable}
          onClick={() => setShowTable((value) => !value)}
          className="self-start rounded-md border border-line px-3 py-1.5 text-sm text-fg hover:bg-control-hover focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
        >
          {showTable ? "Hide table" : "Show as table"}
        </button>
        <LineChart {...args} dataTable={showTable ? "visible" : "hidden"} />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = () => canvasElement.querySelector('[data-chart-part="data-table"]')!;

    // The table always exists for screen readers, with every period and series.
    await expect(within(table() as HTMLElement).getAllByRole("row")).toHaveLength(13);
    await expect(table()).toHaveTextContent("December 2026");
    await expect(canvas.queryByRole("region", { name: /data table/ })).toBeNull();

    await userEvent.click(canvas.getByRole("button", { name: "Show as table" }));
    await expect(canvas.getByRole("region", { name: /data table/ })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Hide table" }));
  },
};
