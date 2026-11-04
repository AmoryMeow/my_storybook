import type { ReactNode } from "react";

/**
 * Story-only dashboard card used to show charts in context. It is not part of
 * the chart components' public API: cards, KPIs and period pickers belong to
 * the consuming page. Colors follow the TreeTable slate/blue system.
 */

export interface DemoKpi {
  label: string;
  value: string;
  /** Signed change, for example `+12.4%`. */
  delta?: string;
  /** Whether the change is an improvement. Drives the badge tone. */
  isPositive?: boolean;
}

export interface DemoChartCardProps {
  title: string;
  subtitle?: string;
  kpis?: readonly DemoKpi[];
  periods?: readonly string[];
  children: ReactNode;
}

export function DemoChartCard({
  title,
  subtitle,
  kpis = [],
  periods,
  children,
}: DemoChartCardProps) {
  return (
    <section className="flex max-w-4xl flex-col gap-6 rounded-xl border border-line bg-surface p-6 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-lg font-semibold text-fg-strong">
            {title}
          </h2>
          {subtitle ? (
            <p className="m-0 mt-1 text-sm text-fg-muted">{subtitle}</p>
          ) : null}
        </div>
        {periods ? (
          <select
            aria-label="Period"
            defaultValue={periods[0]}
            className="rounded-md border border-line bg-surface-raised px-3 py-1.5 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            {periods.map((period) => (
              <option key={period}>{period}</option>
            ))}
          </select>
        ) : null}
      </header>

      {kpis.length > 0 ? (
        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="flex flex-col gap-1">
              <dt className="text-sm text-fg-muted">{kpi.label}</dt>
              <dd className="m-0 flex flex-wrap items-center gap-2">
                <span className="text-2xl font-semibold text-fg-strong">
                  {kpi.value}
                </span>
                {kpi.delta ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${
                      kpi.isPositive
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                    }`}
                  >
                    <span aria-hidden="true">{kpi.isPositive ? "↑" : "↓"}</span>
                    {kpi.delta}
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {children}
    </section>
  );
}
