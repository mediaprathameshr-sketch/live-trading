import csv
import tempfile
import unittest
from pathlib import Path

from backtesting.main import BacktestConfig, run_backtest


class BacktesterTests(unittest.TestCase):
    def test_buy_tp_and_invalid_signal_are_exported(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            signals = root / "signals.csv"
            fine = root / "fine.csv"
            signals.write_text("Date,Time,Side\n01-01-2026,00:00,BUY\n01-01-2026,00:01,HOLD\n", encoding="utf-8")
            fine.write_text(
                "time,open,high,low,close,volume\n"
                "01-01-2026 00:00,100,100.1,99.9,100,1\n"
                "01-01-2026 00:01,100,100.5,99.9,100.3,1\n",
                encoding="utf-8",
            )
            report = run_backtest(signals, fine, BacktestConfig(sl_distance=0.2, tp_distance=0.4))
            with report.output_path.open(newline="", encoding="utf-8") as output:
                rows = list(csv.DictReader(output))
            self.assertEqual(rows[0]["Exit reason"], "TP")
            self.assertEqual(rows[0]["Status"], "OK")
            self.assertEqual(rows[1]["Status"], "INVALID_SIGNAL")
            self.assertEqual(len(rows), 2)

    def test_same_candle_collision_is_worst_case(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            signals = root / "signals.csv"
            fine = root / "fine.csv"
            signals.write_text("Date,Time,Side\n01-01-2026,00:00,SELL\n", encoding="utf-8")
            fine.write_text(
                "time,open,high,low,close\n01-01-2026 00:00,100,100.3,99.5,100\n",
                encoding="utf-8",
            )
            report = run_backtest(signals, fine)
            self.assertEqual(report.rows[0]["Exit reason"], "SL")


if __name__ == "__main__":
    unittest.main()