# My Storybook

A personal collection of reusable React components, UI experiments, and accessibility-focused implementations, built with React, TypeScript, Vite, Tailwind CSS v4, and Storybook.

**Demo:** [amorymeow.github.io/my_storybook](https://amorymeow.github.io/my_storybook/)

```
src/
  components/   independent components, each with its stories and tests
  palette/      color tokens shared by every component
scripts/        maintenance scripts (palette generation)
```

Global styles are loaded from `src/index.css`, which imports Tailwind and the palette. No Tailwind configuration file is needed.

## Components

- **TreeTable** — treegrid for flat or nested records, with inline editing and keyboard navigation (`src/components/TreeTable`)
- **LineChart** and **BarChart** — SVG charts over a time or category axis (`src/components/Chart`)

Each component has a Docs page in Storybook with usage, options and live examples.

## Palette and themes

Every color the components use is a token named by its role, defined in `src/palette/index.ts` and listed on the `Foundations/Palette` story. Each token has a light and a dark value and switches between them on its own.

- In class names, use the token as a Tailwind color: `bg-surface`, `text-fg-muted`, `border-line`, `ring-focus`. Do not pair raw colors with `dark:`.
- In SVG attributes and inline styles, use `paletteVar("chart-axis")`.

The theme follows the operating system unless `<html data-theme="light">` or `data-theme="dark"` overrides it; Tailwind's `dark:` variant follows the same rule.

To change or add a color, edit the token in `src/palette/index.ts` and regenerate the stylesheet:

```sh
npm run palette
```

This writes `src/palette/palette.css` and needs Node 22.18 or later, which runs TypeScript files directly. A unit test fails if the stylesheet and the tokens drift apart.

Chart series take `chart-series-1` to `chart-series-8` in order. The first four stay distinguishable from one another for color-blind readers; keep the order when changing them.

## Storybook

Run Storybook at `http://localhost:6006`:

```sh
npm run storybook
```

Use the **Theme** control in the toolbar to view components in the light or dark theme without changing the device or browser setting. The choice is kept in the URL, so a shared link opens in the same theme.

Pushes to `main` build Storybook and deploy it to [GitHub Pages](https://amorymeow.github.io/my_storybook/) (`.github/workflows/deploy-storybook.yml`). Create a production build locally with:

```sh
npm run build-storybook
```

## Getting started

Install dependencies:

```sh
npm install
```

Run the Vite app:

```sh
npm run dev
```

## Checks

| Command | What it runs |
| --- | --- |
| `npm run typecheck` | TypeScript project build |
| `npm run lint` | oxlint |
| `npm test` | all tests |
| `npm run test:unit` | unit tests in Node (`src/**/*.test.ts`) |
| `npm run test:storybook` | every story rendered in headless Chromium, including its `play` interaction test |
| `npm run build` | type check and production build of the Vite app |

Storybook tests need a Playwright browser; install it once with `npx playwright install chromium`.
