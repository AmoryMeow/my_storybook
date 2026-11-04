import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CHART_SERIES_TOKENS, COLOR_TOKENS, paletteVar } from "./index";

const css = readFileSync(new URL("./palette.css", import.meta.url), "utf8");
const block = (start: string, end?: string) =>
  css.slice(css.indexOf(start), end ? css.indexOf(end, css.indexOf(start)) : undefined);
const themeBlock = block("@theme inline", "\n:root {");
const lightBlock = block("\n:root {", "@media (prefers-color-scheme: dark) {\n  :root");
const systemDarkBlock = block("@media (prefers-color-scheme: dark) {\n  :root", ':root[data-theme="dark"]');
const explicitDarkBlock = block(':root[data-theme="dark"]');

function cssValue(value: string) {
  const [color, alpha] = value.split("/");
  const ref = `var(--color-${color})`;
  return alpha ? `color-mix(in oklab, ${ref} ${alpha}%, transparent)` : ref;
}

describe("palette.css", () => {
  it.each(COLOR_TOKENS)("declares $name for every theme", ({ name, light, dark }) => {
    expect(themeBlock).toContain(`--color-${name}: var(--palette-${name});`);
    expect(lightBlock).toContain(`--palette-${name}: ${cssValue(light)};`);
    // Dark applies both from the OS setting and from data-theme="dark".
    expect(systemDarkBlock).toContain(`--palette-${name}: ${cssValue(dark)};`);
    expect(explicitDarkBlock).toContain(`--palette-${name}: ${cssValue(dark)};`);
  });

  it("lets data-theme override the OS setting", () => {
    expect(systemDarkBlock).toContain(':root:not([data-theme="light"])');
    expect(lightBlock).toContain("color-scheme: light;");
    expect(explicitDarkBlock).toContain("color-scheme: dark;");
  });

  it("declares no tokens beyond index.ts", () => {
    const declared = new Set(css.match(/--palette-[a-z0-9-]+(?=:)/g));
    expect([...declared].sort()).toEqual(COLOR_TOKENS.map(({ name }) => `--palette-${name}`).sort());
  });
});

describe("tokens", () => {
  it("have unique names", () => {
    const names = COLOR_TOKENS.map(({ name }) => name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("list the chart series in slot order", () => {
    expect(CHART_SERIES_TOKENS).toEqual(
      Array.from({ length: 8 }, (_, index) => `chart-series-${index + 1}`),
    );
  });

  it("resolve to CSS variables", () => {
    expect(paletteVar("surface")).toBe("var(--palette-surface)");
  });
});
