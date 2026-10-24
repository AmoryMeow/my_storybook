# My Storybook

A personal collection of reusable React components, UI experiments, and accessibility-focused implementations, built with React, TypeScript, Vite, and Storybook.

Future independent components and their stories belong in `src/components/`.

Tailwind CSS v4 is available in both the Vite app and Storybook. Global styles are loaded from `src/index.css`; no Tailwind configuration file is needed for the current setup.

## TreeTable

`TreeTable` is a generic, standalone treegrid for flat or nested records. It supports controlled or uncontrolled expansion, locale-aware value columns, inline editing and validation, links, row actions, add actions, loading and empty states, and sticky headers, hierarchy columns, and total rows. Its public component and TypeScript types are exported from `src/components/TreeTable`.

The component uses native table semantics and applies the ARIA treegrid pattern when a child accessor is supplied. Arrow keys move between visible cells, Home and End move to the row edges, Ctrl+Home and Ctrl+End move to the grid edges, and Left and Right collapse or expand the focused hierarchy row. Space toggles a focused group, while Enter activates editing, links, or cell actions when available. Within an editor, Enter commits and Escape cancels and restores focus.

The `Components/TreeTable` Storybook stories demonstrate the complete interactive example plus loading and empty states. Example data is synthetic and can be edited safely in the browser.

## Getting started

Install dependencies:

```sh
npm install
```

Run the Vite app:

```sh
npm run dev
```

Run Storybook at `http://localhost:6006`:

```sh
npm run storybook
```

Create a production Storybook build with:

```sh
npm run build-storybook
```
