# Trade Analytics Upgrade Task

Status: Awaiting approval

## Goal

Convert the current TradeLabel candle-labeling app into an on-the-go trade analytics tool. The user selects a primary candle CSV and a finer-timeframe CSV for the same asset, selects one entry candle on the primary chart, and the app simulates the trade outcome using the finer data.

The app should record each simulated trade and export the requested analytics CSV.

## Current implementation anchor

- `src/App.tsx` owns the current single-CSV load, candle selection state, markers, and trade confirmation.
- `src/components/MultiChartLayout.tsx` renders the synchronized standard and Heikin Ashi charts.
- `src/components/TradeControls.tsx` is the current right sidebar and owns stock/date/trade controls.
- `src/services/csvLoader.ts` parses OHLCV CSV files from `public/data/`.
- `src/services/tradeRecorder.ts` currently exports the old `stock,entry_time,exit_time,signal` format.
- `vite.config.ts` provides the development-only file listing and CSV save endpoints.

## Proposed user flow

1. Select the primary candle CSV.
2. Select the fine-timeframe CSV for the same asset.
3. Select the result unit: `USD`, `INR`, or `PIPS`.
4. Configure SL, TP, and optional BE settings.
5. Choose `BUY` or `SELL`.
6. Double-click one candle on the primary chart to select the entry candle.
7. The engine finds fine candles at or after the selected primary candle time.
8. The engine evaluates SL, TP, and optional BE in chronological fine-candle order.
9. The current chart shows the selected entry candle and the candle where the simulated exit occurred.
10. The result is added to the trade table and becomes available for CSV export.

Manual exit-candle selection is removed from the normal workflow. Reset should clear the active entry and simulation result without deleting saved trades.

## Proposed UI layout

### Desktop

- Header: app identity, data status, and compact run/reset actions.
- Top setup bar: primary CSV, fine CSV, unit selector, SL panel, TP panel, BE toggle/panel, and same-candle policy.
- Main workspace: standard chart and Heikin Ashi chart remain synchronized and occupy the largest area.
- Right sidebar: selected entry details, BUY/SELL direction, simulation status, and latest result summary.
- Bottom results strip: saved trade count, latest result, and export button.

### Mobile

- Header remains compact.
- Setup controls become a horizontally scrollable or stacked control region.
- One chart is shown at a time with a standard/Heikin Ashi tab or segmented switch.
- Entry/setup controls remain above the result summary; trade history is below it.

## Simulator contract

### Inputs

- Primary OHLCV bars and fine OHLCV bars.
- Entry bar selected from the primary timeframe.
- Side: `BUY` or `SELL`.
- SL distance/value.
- TP distance/value.
- BE enabled/disabled.
- BE trigger and optional BE offset.
- Unit: `USD`, `INR`, or `PIPS`.
- Same fine-candle collision policy: `Worst case` or `Best case`.

### Price levels

For a BUY:

- SL price = entry price - SL distance.
- TP price = entry price + TP distance.

For a SELL:

- SL price = entry price + SL distance.
- TP price = entry price - TP distance.

The engine uses fine-candle high/low ranges, not fine-candle close prices, to determine whether a level was touched.

### Same fine-candle collision policy

When both SL and TP are touched by the same fine candle and the CSV does not provide intrabar order:

- `Worst case`: choose the outcome least favorable to the selected side.
- `Best case`: choose the outcome most favorable to the selected side.

The selected policy must be stored with the run configuration and reflected in the result metadata if the export schema is extended later.

### BE behavior

- BE is disabled by default.
- When enabled, the engine activates BE after the configured BE trigger is touched.
- After activation, the stop moves to the configured BE level/offset.
- If the moved stop and TP are both touched in one fine candle, apply the selected same-candle policy.

Approval is needed on whether the BE input means a trigger distance, a trigger R multiple, or a price/pip value. The implementation should not infer this silently.

### Exit and metrics

- Exit is the first resolved event in fine-timeframe order: SL, TP, BE stop, or end of available fine data.
- `ExitTime` is the timestamp of the fine candle that resolved the trade.
- `Duration` is entry-to-exit elapsed time, formatted for export.
- `MFE` is the most favorable excursion after entry before exit.
- `MAE` is the most adverse excursion after entry before exit.
- `MaxRR` is the maximum favorable excursion divided by the initial SL risk.
- `BEActivated` is a boolean.
- `Result` is `TP`, `SL`, `BE`, or `OPEN` when fine data ends without a resolved exit.

## Export schema

The target columns are:

```text
Date,Time,Symbol,Timeframe,Side,Unit,Entry,SL,TP,BE,Exit,ExitTime,Duration,MFE,MAE,MaxRR,BEActivated,Result
```

Example shape:

```text
03-08-2026,04:30,CRUDEOIL,M15,BUY,Price / Dollars,81.21,0.2,0.4,15.0,81.01,03-08-2026 04:38,8m,700.0,2800.0,0.35,False,SL
```

Before implementation, confirm whether `SL`, `TP`, and `BE` are exported as configured distances or absolute prices, and whether `MFE`/`MAE` are expressed in price, pips, or selected account unit. The sample appears to mix price-level inputs with non-price excursion values.

## Implementation phases

### Phase 1: Data and configuration

- Add explicit primary/fine CSV selection and pair metadata.
- Extend CSV loading to support independently loaded datasets and robust filename/timeframe labels.
- Add typed simulation configuration and result models.

### Phase 2: Pure simulation engine

- Add a pure service function that accepts bars/configuration and returns one deterministic result.
- Cover BUY/SELL, SL-first/TP-first, no-hit/open, BE activation, and same-candle worst/best behavior.
- Keep timezone parsing consistent with the current UTC CSV behavior.

### Phase 3: Chart workflow

- Replace manual exit selection with entry selection plus side confirmation.
- Add entry/exit markers and levels for SL, TP, and BE.
- Show the primary candle containing the selected entry and the fine candle that resolved the event on the current chart.
- Preserve existing synchronized standard/Heikin Ashi chart behavior unless a focused change is required.

### Phase 4: Analytics UI and export

- Build the top setup bar and right-side simulation panel.
- Add a compact trade history/results table.
- Replace the old exporter with the target schema and CSV escaping.
- Preserve saved-trade persistence for the current session and the existing local save endpoint.

### Phase 5: Verification and usability

- Run `npm run lint` and `npm run build`.
- Add focused tests for the pure simulation engine.
- Verify desktop and narrow/mobile layouts.
- Verify that selecting a primary entry at a time such as `10:45` starts fine-timeframe evaluation at the correct timestamp.

## Acceptance criteria

- A user can select two CSVs for the same asset and see both selections clearly.
- A single primary-chart entry selection is enough to run a simulation after choosing BUY or SELL.
- The fine timeframe determines the actual exit candle and exit timestamp.
- Worst-case and best-case same-candle outcomes are deterministic and visibly selectable.
- SL, TP, and optional BE configuration is visible before running a trade.
- The chart marks entry, exit, and configured levels without losing existing chart navigation.
- Results contain all requested export columns with consistent units and timestamps.
- CSV export correctly escapes values and saves through the existing local development workflow.
- Existing chart loading and navigation continue to work when simulation configuration is incomplete.

## Approval decisions required

1. Confirm that the primary CSV is the displayed/entry-selection timeframe and the fine CSV is used only by the simulator.
2. Confirm SL/TP inputs: absolute price, price distance, percentage, or account-unit amount.
3. Define BE precisely: trigger input, moved stop price/offset, and whether BE can produce a distinct `BE` result.
4. Define pip size per symbol, especially for FX, indices, commodities, and crypto.
5. Define position size/contract size for USD and INR conversion.
6. Confirm the end-of-fine-data result should be `OPEN` or a forced exit.
7. Confirm whether each asset must have a filename convention or whether the user may pair arbitrary CSV files.

## Approval gate

Do not begin application-code implementation until this task and the UI layout document are approved, with the seven decisions above either answered or explicitly accepted as defaults.
