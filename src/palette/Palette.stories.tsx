import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { COLOR_TOKENS, SAFE_SERIES_COUNT, type ColorToken, type TokenGroup } from "./index";

type Story = StoryObj;

const meta = {
  title: "Foundations/Palette",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;

const GROUPS: Record<TokenGroup, string> = {
  surface: "Surfaces",
  text: "Text",
  line: "Lines and focus",
  control: "Controls",
  chart: "Charts",
};

/** Mirrors palette.css, so both themes can be shown side by side whatever the OS theme. */
function cssValue(value: string) {
  const [color, alpha] = value.split("/");
  const ref = `var(--color-${color})`;
  return alpha ? `color-mix(in oklab, ${ref} ${alpha}%, transparent)` : ref;
}

function Swatch({ value, theme }: { value: string; theme: "light" | "dark" }) {
  const isDark = theme === "dark";
  return (
    <div className="flex items-center gap-2">
      <span
        data-swatch={theme}
        // A faint inset edge only, so a swatch matching its column (white on white) stays visible.
        className={`block h-6 w-12 rounded ring-1 ring-inset ${
          isDark ? "ring-white/10" : "ring-black/10"
        }`}
        style={{ backgroundColor: cssValue(value) }}
      />
      <code className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{value}</code>
    </div>
  );
}

function TokenRow({ token }: { token: ColorToken }) {
  const slot = token.name.match(/^chart-series-(\d+)$/)?.[1];
  return (
    <tr data-token={token.name}>
      <th scope="row" className="border-b border-line py-2 pr-4 text-left align-middle font-normal">
        <code className="text-sm font-medium text-fg-strong">{token.name}</code>
        <div className="text-xs text-fg-muted">
          {token.usage}
          {slot && Number(slot) > SAFE_SERIES_COUNT ? " · legend needed" : ""}
        </div>
      </th>
      {/* Each column keeps its theme's surface whatever the OS theme, so translucent tokens read correctly. */}
      <td className="border-b border-slate-200 bg-white px-3 py-2 align-middle">
        <Swatch value={token.light} theme="light" />
      </td>
      <td className="border-b border-slate-800 bg-slate-900 px-3 py-2 align-middle">
        <Swatch value={token.dark} theme="dark" />
      </td>
    </tr>
  );
}

export const Palette: Story = {
  render: () => (
    <div className="flex max-w-3xl flex-col gap-8 text-sm">
      <p className="m-0">
        Every color the components use is a token named by its role. In code, use the token as
        a Tailwind color (<code>bg-surface</code>, <code>text-fg-muted</code>,{" "}
        <code>border-line</code>) or, in SVG and inline styles,{" "}
        <code>paletteVar(&quot;chart-axis&quot;)</code>. Each token switches between its light and
        dark value on its own, so components never pair a color with <code>dark:</code>.
      </p>
      {(Object.keys(GROUPS) as TokenGroup[]).map((group) => (
        <section key={group} aria-labelledby={`palette-${group}`}>
          <h2 id={`palette-${group}`} className="m-0 mb-2 text-base font-semibold text-fg-strong">
            {GROUPS[group]}
          </h2>
          {group === "chart" ? (
            <p className="m-0 mb-2 text-fg-muted">
              Series take colors in slot order. The first {SAFE_SERIES_COUNT} stay distinguishable
              from one another for color-blind readers; past the eighth, charts use gray instead of
              repeating a color.
            </p>
          ) : null}
          <table className="w-full table-fixed border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs text-fg-muted">
                <th scope="col" className="w-1/2 border-b border-line pb-1 font-medium">Token</th>
                <th scope="col" className="border-b border-line px-3 pb-1 font-medium">Light</th>
                <th scope="col" className="border-b border-line px-3 pb-1 font-medium">Dark</th>
              </tr>
            </thead>
            <tbody>
              {COLOR_TOKENS.filter((token) => token.group === group).map((token) => (
                <TokenRow key={token.name} token={token} />
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const rows = canvasElement.querySelectorAll("[data-token]");
    await expect(rows).toHaveLength(COLOR_TOKENS.length);

    // Every swatch resolves to a real color: a typo in a Tailwind name would leave it transparent.
    for (const swatch of canvasElement.querySelectorAll<HTMLElement>("[data-swatch]")) {
      await expect(getComputedStyle(swatch).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    }

    // The live tokens resolve too: the page text uses `text-fg`.
    const intro = within(canvasElement).getByText(/Every color the components use/);
    await expect(getComputedStyle(intro).color).not.toBe("rgba(0, 0, 0, 0)");
  },
};
