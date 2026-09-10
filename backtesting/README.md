# Independent Signal Backtester

This folder runs one independent simulation per predefined signal:

```text
Signal CSV + FineTimeframe CSV -> trade outcome CSV
```

## Run

From the repository root:

```powershell
python -m backtesting.main path\to\signals.csv path\to\fine.csv
```

The output is written beside the Signal CSV as `<signal-name>_trade_outcomes.csv`. Use `-o path\to\output.csv` to choose another location. The Python standard library is the only dependency.

Signal CSV headers are `Date`, `Time`, and `Side`; `Side` must be `BUY` or `SELL`. FineTimeframe CSVs use `time` (or `datetime`/`date`) plus `open`, `high`, `low`, `close`, and optional `volume`. Both `DD-MM-YYYY` and ISO date forms are accepted and interpreted as UTC, matching the current application's timestamp handling.

The simulator mirrors `src/services/simulationEngine.ts`: entry uses the matching fine candle's open, levels use the configured distances, candles are processed in timestamp order, MFE/MAE are updated before exit resolution, and a candle touching both stop and target resolves to the worst case (SL). Break-even activation happens only after the trigger candle resolves. Each signal starts a fresh position.

The current application does not implement commissions, fees, ETD, or P&L. Those output columns are therefore present with zero/blank values rather than an invented fee model. Defaults match the application's current simulation defaults (`SL 0.2`, `TP 0.4`, BE disabled, position size 1). Invalid signals and signals without an exact matching market candle remain as output rows with a clear status and error.