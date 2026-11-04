/** A Tailwind color, optionally with an opacity: `slate-700`, `white`, `slate-950/70`. */
export type PaletteValue = string;

export type TokenGroup = "surface" | "text" | "line" | "control" | "chart";

export interface ColorToken {
  /** Used as `--palette-<name>` and as the Tailwind color name: `bg-surface`, `text-fg-muted`. */
  name: string;
  group: TokenGroup;
  usage: string;
  light: PaletteValue;
  dark: PaletteValue;
}

/**
 * Every color the components use, named by role. `palette.css` turns each
 * token into a CSS variable that switches with the color scheme and into a
 * Tailwind color, so components never pair `slate-…` with `dark:slate-…`.
 * `palette.test.ts` keeps the two files in step.
 */
export const COLOR_TOKENS = [
  { name: "surface", group: "surface", usage: "Page, table and chart background", light: "white", dark: "slate-900" },
  { name: "surface-raised", group: "surface", usage: "Menus and popovers above the page", light: "white", dark: "slate-800" },
  { name: "surface-muted", group: "surface", usage: "Table headers", light: "slate-50", dark: "slate-800" },
  { name: "surface-hover", group: "surface", usage: "Hovered table rows", light: "slate-50", dark: "slate-800" },
  { name: "surface-inverse", group: "surface", usage: "Tooltips", light: "slate-950", dark: "slate-100" },
  { name: "surface-overlay", group: "surface", usage: "Translucent cover while loading", light: "white/75", dark: "slate-950/70" },
  { name: "surface-summary", group: "surface", usage: "Summary (total) column cells", light: "indigo-50", dark: "indigo-950/40" },
  { name: "surface-summary-header", group: "surface", usage: "Summary (total) column header", light: "indigo-100", dark: "indigo-950" },

  { name: "fg", group: "text", usage: "Body text", light: "slate-700", dark: "slate-200" },
  { name: "fg-strong", group: "text", usage: "Headings and emphasis", light: "slate-900", dark: "slate-100" },
  { name: "fg-secondary", group: "text", usage: "Secondary controls", light: "slate-600", dark: "slate-300" },
  { name: "fg-muted", group: "text", usage: "Descriptions, axis labels, icons", light: "slate-500", dark: "slate-400" },
  { name: "fg-subtle", group: "text", usage: "Placeholders such as “No data”", light: "slate-400", dark: "slate-500" },
  { name: "fg-danger", group: "text", usage: "Destructive actions", light: "red-700", dark: "red-400" },
  { name: "fg-link", group: "text", usage: "Links", light: "blue-700", dark: "blue-300" },
  { name: "fg-inverse", group: "text", usage: "Text on inverse surfaces", light: "white", dark: "slate-950" },
  { name: "fg-inverse-muted", group: "text", usage: "Secondary text on inverse surfaces", light: "slate-300", dark: "slate-600" },
  { name: "fg-inverse-subtle", group: "text", usage: "Placeholders on inverse surfaces", light: "slate-400", dark: "slate-500" },

  { name: "line", group: "line", usage: "Borders and dividers", light: "slate-200", dark: "slate-700" },
  { name: "line-strong", group: "line", usage: "Borders of outlined controls", light: "slate-300", dark: "slate-600" },
  { name: "line-subtle", group: "line", usage: "Light row dividers", light: "slate-100", dark: "slate-800" },
  { name: "link-underline", group: "line", usage: "Link underline at rest", light: "blue-300", dark: "blue-700" },
  { name: "line-invalid", group: "line", usage: "Underline of a field with an invalid value", light: "red-500", dark: "red-500" },
  { name: "focus", group: "line", usage: "Keyboard focus ring", light: "blue-600", dark: "blue-400" },

  { name: "control-hover", group: "control", usage: "Hovered buttons and menu items", light: "slate-100", dark: "slate-700" },
  { name: "control-pressed", group: "control", usage: "Pressed buttons", light: "slate-200", dark: "slate-600" },

  { name: "chart-grid", group: "chart", usage: "Gridlines", light: "slate-200", dark: "slate-800" },
  { name: "chart-axis", group: "chart", usage: "Axis lines, ticks and baseline", light: "slate-400", dark: "slate-600" },
  { name: "chart-highlight", group: "chart", usage: "Hovered period band", light: "slate-100", dark: "slate-800" },
  { name: "chart-series-1", group: "chart", usage: "Series 1 (TreeTable accent)", light: "blue-600", dark: "blue-500" },
  { name: "chart-series-2", group: "chart", usage: "Series 2", light: "pink-500", dark: "pink-500" },
  { name: "chart-series-3", group: "chart", usage: "Series 3", light: "red-600", dark: "red-600" },
  { name: "chart-series-4", group: "chart", usage: "Series 4", light: "emerald-700", dark: "emerald-700" },
  { name: "chart-series-5", group: "chart", usage: "Series 5", light: "purple-500", dark: "purple-500" },
  { name: "chart-series-6", group: "chart", usage: "Series 6", light: "yellow-700", dark: "yellow-700" },
  { name: "chart-series-7", group: "chart", usage: "Series 7", light: "teal-600", dark: "teal-600" },
  { name: "chart-series-8", group: "chart", usage: "Series 8", light: "orange-600", dark: "orange-600" },
  { name: "chart-series-overflow", group: "chart", usage: "Series past the eighth", light: "slate-400", dark: "slate-400" },
] as const satisfies readonly ColorToken[];

export type ColorTokenName = (typeof COLOR_TOKENS)[number]["name"];

/**
 * Series colors in slot order. Picked by an exhaustive search over Tailwind
 * hues, steps and orders, scored with OKLab ΔE (×100) under simulated
 * protanopia and deuteranopia on the white and slate-900 surfaces: every pair
 * among the first four slots and every adjacent pair ≥ 10.7, adjacent slots
 * ≥ 15.8 for normal vision, 3:1 contrast in both themes. Reordering
 * invalidates that, so slots follow series position.
 */
export const CHART_SERIES_TOKENS = [
  "chart-series-1",
  "chart-series-2",
  "chart-series-3",
  "chart-series-4",
  "chart-series-5",
  "chart-series-6",
  "chart-series-7",
  "chart-series-8",
] as const satisfies readonly ColorTokenName[];

/**
 * Blue stays in slot 1 as the TreeTable accent, and no fifth Tailwind hue
 * stays clear of it under deuteranopia; beyond this many series, the legend,
 * tooltip and table carry identity.
 */
export const SAFE_SERIES_COUNT = 4;

/** For SVG attributes and inline styles, where Tailwind classes do not apply. */
export function paletteVar(name: ColorTokenName): string {
  return `var(--palette-${name})`;
}
