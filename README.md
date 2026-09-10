# TradeLabel — OHLCV Chart Labeling Tool

This repository is a React + TypeScript + Vite app for labeling entry/exit candles on OHLCV charts and exporting trade signals as CSV.

## Available commands

From the project root, use `npm` or `pnpm` as appropriate.

- `npm install`
  - Installs dependencies.
- `npm run dev`
  - Starts the Vite development server and opens the app at `http://localhost:5173`.
- `npm run build`
  - Builds the app for production.
- `npm run preview`
  - Serves the built app locally for previewing.
- `npm run lint`
  - Runs ESLint across the project.

## What this app does

The app loads OHLCV CSV files from `public/data/` and displays two synchronized charts:

- left chart: standard OHLC candles
- right chart: Heikin Ashi candles

It supports:

- Selecting an entry candle by double-clicking on a candle
- Selecting an exit candle by double-clicking again
- Confirming a trade as `BUY` or `SELL`
- Resetting the current selection
- Downloading labeled trades as a CSV file
- Jumping to a specific date from the sidebar
- Truncating chart data with shift-click interactions

## Keyboard shortcuts

- `B` — confirm the current trade as **BUY** (when entry + exit are selected)
- `S` — confirm the current trade as **SELL** (when entry + exit are selected)
- `R` — reset the active entry/exit selection

## Mouse interactions

- Double-click on a candle to select an **ENTRY** candle.
- Double-click again to select an **EXIT** candle.
- After entry and exit are selected, use the BUY/SELL buttons or keyboard shortcuts.
- `Shift + double-click` on a candle toggles truncated chart mode for that candle.
- `Alt + Shift + left-click` on a candle toggles an alternate truncation mode.

## Where to see the main app functionality

### Main app behavior
- `src/App.tsx`
  - Main app state, chart data loading, keyboard shortcuts, and trade flow.
  - Controls chart interactions and passes props into components.

### Chart UI and interactions
- `src/components/MultiChartLayout.tsx`
  - Renders the two synchronized chart panels.
  - Keeps crosshair and visible ranges in sync.
- `src/components/ChartPanel.tsx`
  - Creates the charts with `lightweight-charts`.
  - Handles double-click, Shift-click, and Alt+Shift-click events.

### Sidebar controls
- `src/components/TradeControls.tsx`
  - Stock selector, status labels, BUY/SELL buttons, reset button, download button.
  - Displays entry and exit timestamps.
- `src/components/DateNavigator.tsx`
  - Jump-to-date control for the current stock data.

### Data loading and export logic
- `src/services/csvLoader.ts`
  - Loads OHLCV CSV files from `public/data/`.
  - Fetches available stock names from `/api/available-stocks`.
- `src/services/tradeRecorder.ts`
  - Stores trades in memory.
  - Sends export requests to `/api/save-csv`.

### Server endpoints used in development
- `vite.config.ts`
  - Defines the Vite dev server endpoints:
    - `/api/available-stocks` — lists CSV files from `public/data/`
    - `/api/save-csv` — saves exported trade CSVs to `signals recorded/`

## Where data lives

- `public/data/`
  - Input CSV files for the charts.
  - Filenames become stock names in the app.
- `signals recorded/`
  - Output CSV files created when you click Download Trades CSV.

## How to change or extend behavior

### Add or update source data
- Add new CSV files to `public/data/`.
- Filenames are mapped to stock names automatically.

### Change chart visuals or interaction behavior
- Edit `src/components/ChartPanel.tsx` for chart rendering and chart mouse events.
- Edit `src/components/MultiChartLayout.tsx` for synchronization logic.

### Change trade control behavior
- Edit `src/components/TradeControls.tsx` for buttons, labels, and sidebar layout.
- Edit `src/components/DateNavigator.tsx` for date jump behavior.

### Change load/export behavior
- Edit `src/services/csvLoader.ts` to modify CSV parsing or stock loading.
- Edit `src/services/tradeRecorder.ts` to change trade storage, export format, or save behavior.

### Change server-side API handling
- Edit `vite.config.ts` to change the development-only API endpoints.

## Notes

- The app is a Vite development app and the API endpoints are provided by `vite.config.ts` only during `npm run dev`.
- Exported CSV files are saved into the local folder `signals recorded/` when running the dev server.

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
