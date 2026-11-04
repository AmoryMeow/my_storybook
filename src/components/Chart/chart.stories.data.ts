import { getTickSignificantDigits, type ValueFormatter } from "./index";

export interface MonthlyFinancials {
  /** First day of the month. */
  date: string;
  revenue: number;
  operatingCosts: number;
  marketing: number;
}

export interface RegionalQuarter {
  /** First day of the quarter. */
  date: string;
  emea: number;
  americas: number;
  apac: number;
}

export interface MonthlyCashFlow {
  /** First day of the month. */
  date: string;
  netCashFlow: number;
  forecast: number;
}

export interface DailyConversion {
  date: string;
  web: number | null;
  mobile: number | null;
}

export interface DailyBalance {
  /** Moment the end-of-day balance was recorded. */
  date: string;
  balance: number;
}

export interface DailySales {
  date: string;
  revenue: number;
  orders: number;
}

export interface ProductLineRevenue {
  productLine: string;
  revenue: number;
  target: number;
}

/**
 * Synthetic financial and analytics data used by the chart stories.
 * Values are invented and deterministic.
 */

export const monthlyFinancials: MonthlyFinancials[] = [
  { date: "2026-01-01", revenue: 182_000, operatingCosts: 141_000, marketing: 22_000 },
  { date: "2026-02-01", revenue: 176_500, operatingCosts: 138_200, marketing: 19_500 },
  { date: "2026-03-01", revenue: 204_300, operatingCosts: 146_900, marketing: 27_800 },
  { date: "2026-04-01", revenue: 211_800, operatingCosts: 150_400, marketing: 31_200 },
  { date: "2026-05-01", revenue: 198_600, operatingCosts: 152_100, marketing: 24_600 },
  { date: "2026-06-01", revenue: 226_400, operatingCosts: 155_700, marketing: 29_900 },
  { date: "2026-07-01", revenue: 219_900, operatingCosts: 158_300, marketing: 21_300 },
  { date: "2026-08-01", revenue: 208_200, operatingCosts: 157_000, marketing: 18_700 },
  { date: "2026-09-01", revenue: 241_700, operatingCosts: 163_500, marketing: 33_400 },
  { date: "2026-10-01", revenue: 253_100, operatingCosts: 166_800, marketing: 35_100 },
  { date: "2026-11-01", revenue: 262_400, operatingCosts: 171_200, marketing: 38_600 },
  { date: "2026-12-01", revenue: 289_500, operatingCosts: 178_900, marketing: 41_200 },
];

export const regionalQuarters: RegionalQuarter[] = [
  { date: "2026-01-01", emea: 412_000, americas: 538_000, apac: 276_000 },
  { date: "2026-04-01", emea: 455_000, americas: 561_000, apac: 301_000 },
  { date: "2026-07-01", emea: 431_000, americas: 597_000, apac: 344_000 },
  { date: "2026-10-01", emea: 489_000, americas: 624_000, apac: 362_000 },
];

/** Net cash flow with surplus, deficit and exactly break-even months. */
export const monthlyCashFlow: MonthlyCashFlow[] = [
  { date: "2026-01-01", netCashFlow: 42_000, forecast: 35_000 },
  { date: "2026-02-01", netCashFlow: -18_500, forecast: -10_000 },
  { date: "2026-03-01", netCashFlow: 0, forecast: 5_000 },
  { date: "2026-04-01", netCashFlow: 27_300, forecast: 20_000 },
  { date: "2026-05-01", netCashFlow: -36_800, forecast: -25_000 },
  { date: "2026-06-01", netCashFlow: 15_400, forecast: 0 },
];

/**
 * Conversion rate in percent. Gaps model tracking outages: a two-day web
 * outage, an isolated mobile reading between outages and a missing first day.
 */
export const dailyConversion: DailyConversion[] = [
  { date: "2026-10-01", web: 3.1, mobile: null },
  { date: "2026-10-02", web: 3.4, mobile: 2.2 },
  { date: "2026-10-03", web: 3.3, mobile: 2.5 },
  { date: "2026-10-04", web: null, mobile: 2.4 },
  { date: "2026-10-05", web: null, mobile: null },
  { date: "2026-10-06", web: 3.9, mobile: 2.9 },
  { date: "2026-10-07", web: 4.2, mobile: null },
  { date: "2026-10-08", web: 4.0, mobile: 3.1 },
  { date: "2026-10-09", web: 3.7, mobile: 2.8 },
  { date: "2026-10-10", web: 3.8, mobile: 3.0 },
];

/**
 * Formats currency values compactly, for example `$1.2M`. On the axis it uses
 * the tick step to pick the precision, so adjacent ticks never collide; in
 * tooltips it shows the exact amount.
 */
export const formatUsdCompact: ValueFormatter = (value, context) => {
  if (context?.target === "tooltip") {
    // Tooltips show the exact amount: $48,920.
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    ...(context?.step === undefined
      ? { maximumFractionDigits: 1 }
      : { maximumSignificantDigits: getTickSignificantDigits(value, context.step) }),
  }).format(value);
};

/** Formats a percentage value given in percent units, for example `3.5%`. */
export const formatPercent: ValueFormatter = (value, context) => {
  // Tick steps are already rounded, so their decimal places are exact.
  const decimals =
    context?.step === undefined ? 1 : (String(context.step).split(".")[1] ?? "").length;
  return `${value.toFixed(decimals)}%`;
};

/** End-of-day account balance that moves within a narrow band around $1M. */
export const dailyBalance: DailyBalance[] = [
  { date: "2026-10-05T18:00:00", balance: 1_012_400 },
  { date: "2026-10-06T18:00:00", balance: 1_018_900 },
  { date: "2026-10-07T18:00:00", balance: 1_004_200 },
  { date: "2026-10-08T18:00:00", balance: 1_027_600 },
  { date: "2026-10-09T18:00:00", balance: 1_041_300 },
  { date: "2026-10-10T18:00:00", balance: 1_036_800 },
  { date: "2026-10-11T18:00:00", balance: 1_046_100 },
];

/**
 * One year of daily sales, July 2025 to June 2026, from a seeded generator:
 * a growth trend, weekly seasonality (quiet weekends) and noise. Deterministic
 * so stories and tests render identically every time.
 */
export const dailySales: DailySales[] = (() => {
  let seed = 42;
  const random = () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    return seed / 2_147_483_648;
  };

  const rows: DailySales[] = [];
  const start = Date.UTC(2025, 6, 1);
  for (let day = 0; day < 365; day += 1) {
    const date = new Date(start + day * 86_400_000);
    const weekday = date.getUTCDay();
    const weekend = weekday === 0 || weekday === 6 ? 0.55 : 1;
    const trend = 1 + day / 365;
    const orders = Math.round(40 * trend * weekend * (0.8 + random() * 0.4));
    rows.push({
      date: date.toISOString().slice(0, 10),
      orders,
      revenue: Math.round(orders * (180 + random() * 40)),
    });
  }
  return rows;
})();

/** Revenue by product line: a category axis with no time dimension. */
export const productLineRevenue: ProductLineRevenue[] = [
  { productLine: "Payments", revenue: 1_840_000, target: 1_700_000 },
  { productLine: "Lending", revenue: 1_210_000, target: 1_400_000 },
  { productLine: "Treasury", revenue: 860_000, target: 800_000 },
  { productLine: "Cards", revenue: 1_420_000, target: 1_350_000 },
  { productLine: "Advisory", revenue: 460_000, target: 520_000 },
];

/** Many categories with long names, to show labels wrapping and truncating. */
export const departmentSpend: { department: string; spend: number }[] = [
  { department: "Corporate Banking", spend: 412_000 },
  { department: "Small Business Lending", spend: 286_000 },
  { department: "Treasury", spend: 198_000 },
  { department: "Wealth Management Advisory", spend: 344_000 },
  { department: "Payments", spend: 251_000 },
  { department: "Risk & Compliance", spend: 377_000 },
  { department: "Retail Cards", spend: 163_000 },
  { department: "Infrastructure Operations", spend: 229_000 },
];
