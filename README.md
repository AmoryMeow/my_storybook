# Component Storybook

A lightweight React and TypeScript workspace for building independent, reusable UI components with Storybook. The repository intentionally starts without application-specific components or a testing stack.

## Structure

- `src/components/` — reusable components, grouped into their own folders as they are added
- `src/stories/` — the minimal Storybook setup check; future component stories can live beside their components
- `.storybook/` — Storybook configuration

## Getting started

Install dependencies:

```sh
npm install
```

Start Storybook at `http://localhost:6006`:

```sh
npm run storybook
```

The Vite placeholder app is available with `npm run dev` when needed.

## Verification

```sh
npm run typecheck
npm run lint
npm run build
npm run build-storybook
```
