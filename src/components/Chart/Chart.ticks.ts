/**
 * Simplified "Extended Wilkinson" tick search (Talbot, Lin & Hanrahan, InfoVis
 * 2010). Candidate tick sets are scored on simplicity (preferred step, zero
 * included), coverage (little empty space) and density (count near the
 * target). d3's 1/2/5 steps can nearly double the requested tick count or
 * leave a third of a short axis empty; this search avoids both.
 */

export interface NiceTicks {
  min: number;
  max: number;
  step: number;
  /** Rounded to the step's precision, so floating-point noise never reaches a label. */
  ticks: number[];
}

export interface NiceTicksOptions {
  minCount?: number;
  maxCount?: number;
}

/** Order matters: simplicity scoring prefers earlier entries. */
const NICE_STEPS = [1, 5, 2, 2.5, 4, 3] as const;

const WEIGHT_SIMPLICITY = 0.25;
const WEIGHT_COVERAGE = 0.2;
const WEIGHT_DENSITY = 0.5;
/** Legibility is not modelled; it contributes its maximum to every candidate. */
const WEIGHT_LEGIBILITY = 0.05;

const EPSILON = 1e-10;
/** Hard caps that bound the search even when pruning cannot. */
const MAX_SKIP = 10;
const MAX_TICKS = 25;

export function countDecimals(value: number): number {
  for (let decimals = 0; decimals <= 15; decimals += 1) {
    const scaled = value * 10 ** decimals;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-6 * Math.max(1, Math.abs(scaled))) {
      return decimals;
    }
  }
  return 15;
}

function simplicity(
  stepIndex: number,
  skip: number,
  min: number,
  max: number,
  step: number,
): number {
  const remainder = ((min % step) + step) % step;
  const hasZero =
    min <= 0 && max >= 0 && (remainder < EPSILON || step - remainder < EPSILON);
  return 1 - stepIndex / (NICE_STEPS.length - 1) - skip + (hasZero ? 1 : 0);
}

function maxSimplicity(stepIndex: number, skip: number): number {
  return 1 - stepIndex / (NICE_STEPS.length - 1) - skip + 1;
}

function coverage(dataMin: number, dataMax: number, min: number, max: number): number {
  const range = dataMax - dataMin;
  return (
    1 - (0.5 * ((dataMax - max) ** 2 + (dataMin - min) ** 2)) / (0.1 * range) ** 2
  );
}

function maxCoverage(dataMin: number, dataMax: number, span: number): number {
  const range = dataMax - dataMin;
  if (span <= range) {
    return 1;
  }
  const half = (span - range) / 2;
  return 1 - (0.5 * (2 * half ** 2)) / (0.1 * range) ** 2;
}

function density(
  count: number,
  target: number,
  dataMin: number,
  dataMax: number,
  min: number,
  max: number,
): number {
  const actual = (count - 1) / (max - min);
  const wanted =
    (target - 1) / (Math.max(max, dataMax) - Math.min(dataMin, min));
  return 2 - Math.max(actual / wanted, wanted / actual);
}

function maxDensity(count: number, target: number): number {
  return count >= target ? 2 - (count - 1) / (target - 1) : 1;
}

function score(s: number, c: number, d: number): number {
  return (
    WEIGHT_SIMPLICITY * s +
    WEIGHT_COVERAGE * c +
    WEIGHT_DENSITY * d +
    WEIGHT_LEGIBILITY
  );
}

function buildTicks(min: number, step: number, count: number): number[] {
  const decimals = countDecimals(step);
  return Array.from({ length: count }, (_, index) => {
    const value = Number((min + index * step).toFixed(decimals));
    // Normalise -0 so that it formats and compares as zero.
    return value === 0 ? 0 : value;
  });
}

/**
 * The count is held within `[minCount, maxCount]` because the original
 * coverage term is harsh enough to pick twice the target count for a slightly
 * tighter fit.
 */
export function computeNiceTicks(
  dataMin: number,
  dataMax: number,
  targetCount: number,
  options: NiceTicksOptions = {},
): NiceTicks | null {
  if (!Number.isFinite(dataMin) || !Number.isFinite(dataMax) || dataMax - dataMin < EPSILON) {
    return null;
  }

  const target = Math.max(2, targetCount);
  const minCount = Math.max(2, options.minCount ?? target - 2);
  const maxCount = Math.min(MAX_TICKS, Math.max(minCount, options.maxCount ?? target + 2));
  let best: { min: number; step: number; count: number } | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let skip = 1; skip <= MAX_SKIP; skip += 1) {
    let skipExhausted = true;

    for (let stepIndex = 0; stepIndex < NICE_STEPS.length; stepIndex += 1) {
      const mantissa = NICE_STEPS[stepIndex];
      const sMax = maxSimplicity(stepIndex, skip);
      if (score(sMax, 1, 1) < bestScore) {
        continue;
      }
      skipExhausted = false;

      for (let count = minCount; count <= maxCount; count += 1) {
        const dMax = maxDensity(count, target);
        if (score(sMax, 1, dMax) < bestScore) {
          break;
        }

        const roughStep = (dataMax - dataMin) / (count - 1) / skip / mantissa;
        for (let power = Math.floor(Math.log10(roughStep)); power <= 308; power += 1) {
          const step = skip * mantissa * 10 ** power;
          const span = step * (count - 1);
          if (span < dataMax - dataMin - EPSILON) {
            continue;
          }
          if (score(sMax, maxCoverage(dataMin, dataMax, span), dMax) < bestScore) {
            break;
          }

          const unit = step / skip;
          const firstStart = Math.floor(dataMax / unit) - (count - 1) * skip;
          const lastStart = Math.ceil(dataMin / unit);
          for (let start = firstStart; start <= lastStart; start += 1) {
            const min = start * unit;
            const max = min + span;
            // Unlike the original algorithm, ticks must contain the data: the
            // first and last tick become the axis domain, so this keeps every mark inside.
            if (min > dataMin + EPSILON || max < dataMax - EPSILON) {
              continue;
            }
            const candidate = score(
              simplicity(stepIndex, skip, min, max, step),
              coverage(dataMin, dataMax, min, max),
              density(count, target, dataMin, dataMax, min, max),
            );
            if (candidate > bestScore) {
              bestScore = candidate;
              best = { min, step, count };
            }
          }
        }
      }
    }

    if (skipExhausted) {
      break;
    }
  }

  if (!best) {
    return null;
  }

  const ticks = buildTicks(best.min, best.step, best.count);
  return {
    min: ticks[0],
    max: ticks[ticks.length - 1],
    step: Number(best.step.toFixed(countDecimals(best.step))),
    ticks,
  };
}

/**
 * Returns the number of significant digits that shows `value` exactly to the
 * precision of `step`. For example, with a step of 10,000 the value 1,050,000
 * needs 3 digits (1.05M), and with a step of 200 the value 1,200 needs 2 (1.2K).
 *
 * Significant digits are independent of how a locale groups magnitudes in
 * compact notation (K/M in English, 万 in Japanese), so the same rule works
 * for every locale. Pass the result to `Intl.NumberFormat`'s
 * `maximumSignificantDigits` option.
 */
export function getTickSignificantDigits(value: number, step: number): number {
  if (value === 0 || !Number.isFinite(value) || !(step > 0)) {
    return 1;
  }
  const stepPrecision = -countDecimals(step);
  let lowestDigit = stepPrecision;
  // For steps ≥ 10, find the lowest non-zero digit (e.g. 50,000 → 10⁴).
  if (stepPrecision === 0) {
    lowestDigit = 0;
    while (lowestDigit < 308 && (step / 10 ** (lowestDigit + 1)) % 1 === 0) {
      lowestDigit += 1;
    }
  }
  const leadingDigit = Math.floor(Math.log10(Math.abs(value)));
  return Math.min(21, Math.max(1, leadingDigit - lowestDigit + 1));
}
