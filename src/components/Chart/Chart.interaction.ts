export interface Size {
  width: number;
  height: number;
}

export interface TooltipPlacementOptions {
  /** In container coordinates, like `bounds`, which start at (0, 0). */
  anchor: { x: number; y: number };
  tooltip: Size;
  bounds: Size;
  offset?: number;
  padding?: number;
}

export interface TooltipPlacement {
  left: number;
  top: number;
  side: "right" | "left";
}

export interface DescribedValue {
  label: string;
  value: string | null;
}

/**
 * A tooltip larger than the bounds would be pinned to the top-left corner and
 * overflow; callers prevent that by capping its width with `getTooltipMaxWidth`.
 */
export function placeTooltip({
  anchor,
  tooltip,
  bounds,
  offset = 12,
  padding = 4,
}: TooltipPlacementOptions): TooltipPlacement {
  const minLeft = padding;
  const maxLeft = Math.max(minLeft, bounds.width - padding - tooltip.width);
  const minTop = padding;
  const maxTop = Math.max(minTop, bounds.height - padding - tooltip.height);

  const right = anchor.x + offset;
  const left = anchor.x - offset - tooltip.width;
  const fitsRight = right + tooltip.width <= bounds.width - padding;
  const fitsLeft = left >= padding;

  // When neither side fits, stay right and let clamping shift it inward.
  const side = fitsRight || !fitsLeft ? "right" : "left";
  const preferred = side === "right" ? right : left;

  return {
    left: clamp(preferred, minLeft, maxLeft),
    top: clamp(anchor.y - tooltip.height / 2, minTop, maxTop),
    side,
  };
}

/** Guarantees the tooltip can fit inside the bounds on at least one side. */
export function getTooltipMaxWidth(
  boundsWidth: number,
  preferred = 288,
  padding = 4,
): number {
  return Math.max(0, Math.min(preferred, boundsWidth - padding * 2));
}

/** `centres` must be sorted ascending (binary search). */
export function findNearestIndex(centres: readonly number[], x: number): number {
  if (centres.length === 0) {
    return -1;
  }

  let low = 0;
  let high = centres.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (centres[middle] < x) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  if (low > 0 && x - centres[low - 1] <= centres[low] - x) {
    return low - 1;
  }
  return low;
}

/** `undefined`: not a navigation key, let it through. `null`: clear the selection. */
export function getKeyboardIndex(
  key: string,
  current: number | null,
  count: number,
): number | null | undefined {
  if (count === 0) {
    return undefined;
  }
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return current === null ? 0 : Math.min(count - 1, current + 1);
    case "ArrowLeft":
    case "ArrowUp":
      return current === null ? count - 1 : Math.max(0, current - 1);
    case "Home":
      return 0;
    case "End":
      return count - 1;
    case "Escape":
      return null;
    default:
      return undefined;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function describeCategory(title: string, values: readonly DescribedValue[]): string {
  const parts = values.map(
    (item) => `${item.label}: ${item.value === null ? "no data" : item.value}`,
  );
  return [title, ...parts].join(". ") + ".";
}
