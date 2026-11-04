import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import {
  dailySales,
  departmentSpend,
  formatUsdCompact,
  productLineRevenue,
  monthlyCashFlow,
  regionalQuarters,
  type DailySales,
  type MonthlyCashFlow,
  type ProductLineRevenue,
  type RegionalQuarter,
} from "./chart.stories.data";
import { DemoChartCard } from "./chart.stories.card";
import {
  BarChart,
  type BarChartOptions,
  type ChartCategoryAxisProps,
  type ChartCommonProps,
  type ChartTimeAxisProps,
} from "./index";

/** Story types name the axis branch so that `render` and `play` stay typed. */
type Story<Datum> = StoryObj<
  ChartCommonProps<Datum> & ChartTimeAxisProps<Datum> & BarChartOptions
>;

type CategoryStory<Datum> = StoryObj<
  ChartCommonProps<Datum> & ChartCategoryAxisProps<Datum> & BarChartOptions
>;

const meta = {
  title: "Components/BarChart",
  component: BarChart,
  parameters: { layout: "padded" },
} satisfies Meta<typeof BarChart>;

export default meta;

export const SingleBar: Story<RegionalQuarter> = {
  args: {
    title: "Americas revenue by quarter, 2026",
    data: regionalQuarters,
    getDate: (row) => row.date,
    period: "quarter",
    series: [{ key: "americas", label: "Americas", value: (row) => row.americas }],
    formatValue: formatUsdCompact,
  },
  render: (args) => <BarChart {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chart = canvas.getByRole("img", { name: "Americas revenue by quarter, 2026" });

    await expect(chart.querySelectorAll('[data-chart-part="bar"]')).toHaveLength(4);
    await expect(canvas.queryByRole("list", { name: "Legend" })).toBeNull();
  },
};

export const GroupedBars: Story<RegionalQuarter> = {
  args: {
    title: "Revenue by region and quarter, 2026",
    data: regionalQuarters,
    getDate: (row) => row.date,
    period: "quarter",
    series: [
      { key: "emea", label: "EMEA", value: (row) => row.emea },
      { key: "americas", label: "Americas", value: (row) => row.americas },
      { key: "apac", label: "APAC", value: (row) => row.apac },
    ],
    formatValue: formatUsdCompact,
  },
  render: (args) => <BarChart {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const legend = canvas.getByRole("list", { name: "Legend" });

    await expect(within(legend).getAllByRole("listitem")).toHaveLength(3);
    await expect(
      canvasElement.querySelectorAll('[data-chart-part="bar"]'),
    ).toHaveLength(12);
  },
};

export const InDashboardCard: Story<RegionalQuarter> = {
  args: {
    ...GroupedBars.args,
    categoryAxisLabel: "Quarter",
    valueAxisLabel: "Revenue",
  },
  render: (args) => (
    <DemoChartCard
      title="Regional performance"
      subtitle="Quarterly revenue by region"
      periods={["2026", "2025"]}
      kpis={[
        { label: "Total revenue", value: "$5.79M", delta: "+14.8%", isPositive: true },
        { label: "Best region", value: "Americas" },
      ]}
    >
      <BarChart {...args} />
    </DemoChartCard>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByRole("heading", { name: "Regional performance" })).toBeVisible();
    const chart = canvas.getByRole("img", { name: "Revenue by region and quarter, 2026" });
    await expect(within(chart).getByText("Quarter")).toBeInTheDocument();
    await expect(
      canvasElement.querySelectorAll('[data-chart-part="bar"]'),
    ).toHaveLength(12);
  },
};

export const NegativeAndZeroValues: Story<MonthlyCashFlow> = {
  args: {
    title: "Net cash flow against forecast, H1 2026",
    data: monthlyCashFlow,
    getDate: (row) => row.date,
    period: "month",
    series: [
      { key: "netCashFlow", label: "Actual", value: (row) => row.netCashFlow },
      { key: "forecast", label: "Forecast", value: (row) => row.forecast },
    ],
    formatValue: formatUsdCompact,
  },
  render: (args) => <BarChart {...args} />,
  play: async ({ canvasElement }) => {
    const actual = canvasElement.querySelector('[data-series="netCashFlow"]');
    const forecast = canvasElement.querySelector('[data-series="forecast"]');

    // Zero values (actual in March, forecast in June) draw no bar.
    await expect(actual?.querySelectorAll('[data-chart-part="bar"]')).toHaveLength(5);
    await expect(forecast?.querySelectorAll('[data-chart-part="bar"]')).toHaveLength(5);

    // Positive and negative bars meet at the same baseline.
    const positive = actual?.querySelector<SVGPathElement>('[data-value="42000"]');
    const negative = actual?.querySelector<SVGPathElement>('[data-value="-18500"]');
    const positiveBox = positive!.getBBox();
    const negativeBox = negative!.getBBox();
    await expect(positiveBox.y + positiveBox.height).toBeCloseTo(negativeBox.y, 3);
  },
};

export const EmptyData: Story<RegionalQuarter> = {
  args: {
    title: "Revenue by region and quarter, 2026",
    data: regionalQuarters,
    getDate: (row) => row.date,
    period: "quarter",
    series: [],
  },
  render: (args) => <BarChart {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText("No data to display")).toBeVisible();
    await expect(canvas.queryByRole("img")).toBeNull();
  },
};

export const PeriodGranularity: Story<DailySales> = {
  args: {
    title: "Orders per period, July 2025 to June 2026",
    data: dailySales,
    getDate: (row) => row.date,
    period: "month",
    series: [{ key: "orders", label: "Orders", value: (row) => row.orders }],
  },
  argTypes: {
    period: { control: "inline-radio", options: ["day", "week", "month", "quarter"] },
  },
  render: (args) => <BarChart {...args} />,
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelectorAll('[data-chart-part="bar"]'),
    ).toHaveLength(12);
  },
};

const russianQuarter = (start: Date) =>
  `${Math.floor(start.getMonth() / 3) + 1} кв. ${start.getFullYear()}`;

export const CustomPeriodFormat: Story<DailySales> = {
  args: {
    title: "Выручка по кварталам",
    data: dailySales,
    getDate: (row) => row.date,
    period: "quarter",
    formatPeriod: russianQuarter,
    locale: "ru-RU",
    series: [{ key: "revenue", label: "Выручка", value: (row) => row.revenue }],
  },
  render: (args) => <BarChart {...args} />,
  play: async ({ canvasElement }) => {
    const chart = within(within(canvasElement).getByRole("img", { name: "Выручка по кварталам" }));

    await expect(chart.getByText("3 кв. 2025")).toBeInTheDocument();
    await expect(chart.getByText("2 кв. 2026")).toBeInTheDocument();
  },
};

export const CategoryAxis: CategoryStory<ProductLineRevenue> = {
  args: {
    title: "Revenue against target by product line, 2026",
    data: productLineRevenue,
    getCategory: (row) => row.productLine,
    series: [
      { key: "revenue", label: "Revenue", value: (row) => row.revenue },
      { key: "target", label: "Target", value: (row) => row.target },
    ],
    formatValue: formatUsdCompact,
  },
  render: (args) => <BarChart {...args} />,
  play: async ({ canvasElement }) => {
    const chart = within(canvasElement).getByRole("img", {
      name: "Revenue against target by product line, 2026",
    });

    await expect(within(chart).getByText("Treasury")).toBeInTheDocument();
    await expect(
      canvasElement.querySelectorAll('[data-chart-part="bar"]'),
    ).toHaveLength(10);
  },
};

export const TooltipInNarrowChart: Story<RegionalQuarter> = {
  args: {
    ...GroupedBars.args,
    title: "Revenue by region, narrow chart",
    height: 220,
  },
  render: (args) => (
    <div className="w-60">
      <BarChart {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const layer = canvasElement.querySelector<HTMLElement>(
      '[data-chart-part="interaction-layer"]',
    )!;
    const container = layer.parentElement!;
    const getTooltip = () =>
      canvasElement.querySelector<HTMLElement>('[data-chart-part="tooltip"]');

    layer.focus();
    for (const key of ["{Home}", "{ArrowRight}", "{ArrowRight}", "{End}"]) {
      await userEvent.keyboard(key);
      await waitFor(() => expect(getTooltip()).not.toBeNull());
      // Every category, including the edges, keeps the tooltip inside the chart.
      const box = getTooltip()!.getBoundingClientRect();
      const area = container.getBoundingClientRect();
      await expect(box.left).toBeGreaterThanOrEqual(area.left);
      await expect(box.right).toBeLessThanOrEqual(area.right);
      await expect(box.top).toBeGreaterThanOrEqual(area.top);
      await expect(box.bottom).toBeLessThanOrEqual(area.bottom);
    }

    await expect(getTooltip()).toHaveTextContent("Q4 2026");
    await expect(canvasElement.querySelector('[data-chart-part="highlight"]')).not.toBeNull();

    // Leave the story as a viewer would first see it: no tooltip, nothing focused.
    await userEvent.keyboard("{Escape}");
    layer.blur();
    await waitFor(() => expect(getTooltip()).toBeNull());
    await expect(canvasElement.querySelector('[data-chart-part="highlight"]')).toBeNull();
  },
};

export const IncompletePeriods: Story<DailySales> = {
  args: {
    title: "Monthly orders, current month in progress",
    data: dailySales,
    getDate: (row) => row.date,
    period: "month",
    // The window ends mid-June, as a dashboard viewed on June 15 would.
    timeRange: { start: "2025-07-01", end: "2026-06-15" },
    series: [{ key: "orders", label: "Orders", value: (row) => row.orders }],
  },
  render: (args) => <BarChart {...args} />,
  play: async ({ canvasElement }) => {
    const bars = Array.from(canvasElement.querySelectorAll('[data-chart-part="bar"]'));
    const partial = bars.filter((bar) => bar.hasAttribute("data-partial"));
    await expect(partial).toHaveLength(1);
    await expect(partial[0].getAttribute("data-category")).toBe("Jun 2026");
    // Only June 1–15 count: orders after the window must not inflate the partial month.
    const [may, june] = bars.slice(-2).map((bar) => Number(bar.getAttribute("data-value")));
    await expect(june).toBeLessThan(may * 0.6);
  },
};

export const ManyCategories: CategoryStory<(typeof departmentSpend)[number]> = {
  args: {
    title: "Operating spend by department",
    data: departmentSpend,
    getCategory: (row) => row.department,
    series: [{ key: "spend", label: "Spend", value: (row) => row.spend }],
    formatValue: formatUsdCompact,
  },
  render: (args) => (
    <div className="max-w-xl">
      <BarChart {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const chart = within(canvasElement).getByRole("img", {
      name: "Operating spend by department",
    });

    // No category loses its label: names wrap or shorten instead of being skipped.
    await expect(chart.querySelectorAll('[data-chart-part="category-tick"]')).toHaveLength(8);
    // Shortened names keep the full name for hover.
    await expect(
      Array.from(chart.querySelectorAll('[data-chart-part="category-axis"] title'), (node) =>
        node.textContent,
      ),
    ).toContain("Wealth Management Advisory");
  },
};

export const Loading: Story<RegionalQuarter> = {
  args: {
    ...GroupedBars.args,
    title: "Revenue by region, refreshing",
    isLoading: true,
  },
  render: (args) => (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-6">
      <BarChart {...args} title="First load" data={[]} height={220} />
      <BarChart {...args} height={220} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [firstLoad, refreshing] = canvas.getAllByRole("figure");

    // Without data: a placeholder that announces loading.
    await expect(within(firstLoad).getByRole("status")).toHaveTextContent("Loading chart data");
    // With data: the chart stays, covered and not explorable until fresh data arrive.
    await expect(within(refreshing).getByRole("status")).toHaveTextContent("Loading chart data");
    await expect(refreshing).toHaveAttribute("aria-busy", "true");
    await expect(
      refreshing.querySelector('[data-chart-part="interaction-layer"]')?.closest("[inert]"),
    ).not.toBeNull();
  },
};
