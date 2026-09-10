__all__ = ["Backtest", "BacktestConfig", "BacktestReport", "run_backtest"]


def __getattr__(name: str):
	if name in __all__:
		from .main import Backtest, BacktestConfig, BacktestReport, run_backtest
		return {
			"Backtest": Backtest,
			"BacktestConfig": BacktestConfig,
			"BacktestReport": BacktestReport,
			"run_backtest": run_backtest,
		}[name]
	raise AttributeError(name)