from __future__ import annotations

import argparse
import csv
import math
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Literal

Signal = Literal["BUY", "SELL"]
Result = Literal["TP", "SL", "BE", "OPEN"]


@dataclass(frozen=True)
class BacktestConfig:
    sl_distance: float = 0.08
    tp_distance: float = 0.16
    be_enabled: bool = False
    be_trigger: float = 500
    be_offset: float = 0.0
    position_size: float = 1.0
    output_path: Path | None = None


@dataclass(frozen=True)
class Bar:
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float


@dataclass(frozen=True)
class SignalRow:
    row_number: int
    date: str
    time: str
    side: str
    timestamp: int | None
    error: str = ""


@dataclass
class BacktestReport:
    output_path: Path
    rows: list[dict[str, object]]
    warnings: list[str]


def _timestamp(value: str) -> int:
    value = value.strip()
    formats = ("%d-%m-%Y %H:%M:%S", "%d-%m-%Y %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M")
    for date_format in formats:
        try:
            return int(datetime.strptime(value, date_format).replace(tzinfo=timezone.utc).timestamp())
        except ValueError:
            continue
    raise ValueError(f"invalid timestamp '{value}'")


def _number(value: str, field: str) -> float:
    try:
        parsed = float(value.strip())
    except (AttributeError, ValueError):
        raise ValueError(f"invalid {field} '{value}'") from None
    if not math.isfinite(parsed):
        raise ValueError(f"invalid {field} '{value}'")
    return parsed


def _headers(row: dict[str, str]) -> dict[str, str]:
    return {key.strip().lower(): (value or "").strip() for key, value in row.items()}


def _load_bars(path: Path) -> list[Bar]:
    with path.open("r", newline="", encoding="utf-8-sig") as source:
        reader = csv.DictReader(source)
        bars: list[Bar] = []
        for row_number, raw_row in enumerate(reader, 2):
            row = _headers(raw_row)
            raw_time = row.get("time") or row.get("datetime") or row.get("date")
            if not raw_time:
                raise ValueError(f"FineTimeframe row {row_number}: missing time/datetime/date")
            try:
                bars.append(Bar(
                    _timestamp(raw_time),
                    _number(row.get("open", ""), "open"),
                    _number(row.get("high", ""), "high"),
                    _number(row.get("low", ""), "low"),
                    _number(row.get("close", ""), "close"),
                    _number(row.get("volume", "0") or "0", "volume"),
                ))
            except ValueError as error:
                raise ValueError(f"FineTimeframe row {row_number}: {error}") from None
    return sorted(bars, key=lambda bar: bar.timestamp)


def _load_signals(path: Path) -> list[SignalRow]:
    with path.open("r", newline="", encoding="utf-8-sig") as source:
        reader = csv.DictReader(source)
        signals: list[SignalRow] = []
        for row_number, raw_row in enumerate(reader, 2):
            row = _headers(raw_row)
            date = row.get("date", "")
            time = row.get("time", "")
            side = row.get("side", "").upper()
            error = ""
            timestamp: int | None = None
            try:
                if not date or not time:
                    raise ValueError("missing Date or Time")
                timestamp = _timestamp(f"{date} {time}")
                if side not in ("BUY", "SELL"):
                    raise ValueError("Side must be BUY or SELL")
            except ValueError as caught:
                error = str(caught)
            signals.append(SignalRow(row_number, date, time, side, timestamp, error))
    return signals


def _move(side: Signal, entry: float, bar: Bar, favorable: bool) -> float:
    value = bar.high - entry if side == "BUY" else entry - bar.low
    if not favorable:
        value = entry - bar.low if side == "BUY" else bar.high - entry
    return max(0.0, value)


def _simulate(signal: SignalRow, bars: list[Bar], config: BacktestConfig) -> dict[str, object]:
    assert signal.timestamp is not None
    entry_index = next((index for index, bar in enumerate(bars) if bar.timestamp == signal.timestamp), None)
    if entry_index is None:
        raise ValueError("no FineTimeframe candle exactly matches the signal timestamp")
    if config.sl_distance <= 0 or config.tp_distance <= 0:
        raise ValueError("SL and TP must be greater than zero")

    side: Signal = signal.side  # type: ignore[assignment]
    entry_bar = bars[entry_index]
    entry = entry_bar.open
    sl = entry - config.sl_distance if side == "BUY" else entry + config.sl_distance
    tp = entry + config.tp_distance if side == "BUY" else entry - config.tp_distance
    be = entry + config.be_offset if side == "BUY" else entry - config.be_offset
    max_favorable = 0.0
    max_adverse = 0.0
    be_activated = False
    exit_bar: Bar | None = None
    exit_price = entry
    result: Result = "OPEN"
    bars_held = 0

    for bar in bars[entry_index:]:
        bars_held += 1
        max_favorable = max(max_favorable, _move(side, entry, bar, True))
        max_adverse = max(max_adverse, _move(side, entry, bar, False))
        stop = be if be_activated else sl
        stop_touched = bar.low <= stop if side == "BUY" else bar.high >= stop
        target_touched = bar.high >= tp if side == "BUY" else bar.low <= tp
        if stop_touched or target_touched:
            if stop_touched and target_touched:
                event = "SL"
            else:
                event = "TP" if target_touched else "SL"
            exit_bar = bar
            result = "TP" if event == "TP" else ("BE" if be_activated else "SL")
            exit_price = tp if event == "TP" else stop
            break
        if config.be_enabled and not be_activated and _move(side, entry, bar, True) >= config.be_trigger:
            be_activated = True

    exit_timestamp = exit_bar.timestamp if exit_bar else None
    duration = round((exit_timestamp - signal.timestamp) / 60) if exit_timestamp is not None else 0
    signed_move = (exit_price - entry) if side == "BUY" else (entry - exit_price)
    gross = signed_move * config.position_size if exit_bar else 0.0
    return {
        "Entry time": _format_timestamp(signal.timestamp),
        "Entry price": entry,
        "Exit time": _format_timestamp(exit_timestamp) if exit_timestamp is not None else "",
        "Exit price": exit_price,
        "Unit": "USD",
        "SL": sl,
        "TP": tp,
        "BE": be if config.be_enabled else "",
        "Exit reason": result,
        "TP/SL outcome": result,
        "Gross profit/loss": gross,
        "Commission": 0.0,
        "Clearing fee": 0.0,
        "Exchange fee": 0.0,
        "IP fee": 0.0,
        "NFA fee": 0.0,
        "Net profit/loss": gross,
        "MAE": max_adverse,
        "MFE": max_favorable,
        "ETD": "",
        "Bars held": bars_held,
        "Duration minutes": duration,
        "Max RR": round(max_favorable / config.sl_distance, 2),
        "BE activated": be_activated,
        "Status": "OK",
        "Error": "",
    }


def _format_timestamp(value: int | None) -> str:
    if value is None:
        return ""
    return datetime.fromtimestamp(value, timezone.utc).strftime("%d-%m-%Y %H:%M")


OUTPUT_FIELDS = [
    "Trade number", "Signal date", "Signal time", "Side", "Entry time", "Entry price", "Exit time", "Exit price",
    "SL", "TP", "BE", "Unit", "Exit reason", "TP/SL outcome", "Gross profit/loss", "Commission", "Clearing fee",
    "Exchange fee", "IP fee", "NFA fee", "Net profit/loss", "MAE", "MFE", "ETD", "Bars held", "Duration minutes",
    "Max RR", "BE activated", "Cumulative net profit", "Status", "Error",
]


def run_backtest(signal_csv: str | Path, finetimeframe_csv: str | Path, config: BacktestConfig | None = None) -> BacktestReport:
    config = config or BacktestConfig()
    signal_path = Path(signal_csv)
    fine_path = Path(finetimeframe_csv)
    bars = _load_bars(fine_path)
    signals = _load_signals(signal_path)
    output_path = config.output_path or signal_path.with_name(f"{signal_path.stem}_trade_outcomes.csv")
    rows: list[dict[str, object]] = []
    warnings: list[str] = []
    cumulative = 0.0
    for trade_number, signal in enumerate(signals, 1):
        row: dict[str, object] = {
            "Trade number": trade_number, "Signal date": signal.date, "Signal time": signal.time, "Side": signal.side,
        }
        if signal.error:
            row.update({"Status": "INVALID_SIGNAL", "Error": signal.error})
            warnings.append(f"Signal row {signal.row_number}: {signal.error}")
        else:
            try:
                row.update(_simulate(signal, bars, config))
            except ValueError as error:
                row.update({"Status": "MISSING_MARKET_DATA", "Error": str(error)})
                warnings.append(f"Signal row {signal.row_number}: {error}")
        cumulative += float(row.get("Net profit/loss", 0.0) or 0.0)
        row["Cumulative net profit"] = cumulative
        rows.append(row)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as destination:
        writer = csv.DictWriter(destination, fieldnames=OUTPUT_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    return BacktestReport(output_path, rows, warnings)


Backtest = run_backtest


# def _main() -> int:
#     parser = argparse.ArgumentParser(description="Run the independent signal CSV backtester.")
#     parser.add_argument("signal_csv", type=Path)
#     parser.add_argument("finetimeframe_csv", type=Path)
#     parser.add_argument("-o", "--output", type=Path)
#     args = parser.parse_args()
#     report = run_backtest(args.signal_csv, args.finetimeframe_csv, BacktestConfig(output_path=args.output))
#     print(f"Wrote {len(report.rows)} trade outcomes to {report.output_path}")
#     for warning in report.warnings:
#         print(f"WARNING: {warning}")
#     return 0


# if __name__ == "__main__":
#     raise SystemExit(_main())



# =========================
# BACKTEST INPUTS
# =========================

SIGNAL_CSV = Path(r"D:\Fin\Prod\Live Trading\collected data\XAGUSD\SILVER_M15_IST_20260517_20260824.csv")
FINETIMEFRAME_CSV = Path(r"D:\Fin\Prod\Live Trading\public\data\SILVER_M1_IST_20260801_20260904.csv")

# Optional: leave as None to use the default output location
OUTPUT_CSV = Path(r"D:\Fin\Prod\Live Trading\backtesting\Output\output.csv")


def main():
    report = run_backtest(
        SIGNAL_CSV,
        FINETIMEFRAME_CSV,
        BacktestConfig(
            output_path=OUTPUT_CSV
        ),
    )

    print(f"Wrote {len(report.rows)} trade outcomes to {report.output_path}")

    for warning in report.warnings:
        print(f"WARNING: {warning}")


if __name__ == "__main__":
    main()


