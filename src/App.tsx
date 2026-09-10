import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { IChartApi } from 'lightweight-charts';
import MultiChartLayout from './components/MultiChartLayout';
import TradeHistory from './components/TradeHistory';
import AnalyticsSetup from './components/AnalyticsSetup';
import ActiveTradePanel from './components/ActiveTradePanel';
import type { ChartMarker } from './components/ChartPanel';
import type { OHLCVBar } from './types/ohlcv';
import type { Trade, Signal, SimulationConfig, SimulationResult } from './types/trade';
import { loadCSV, AVAILABLE_STOCKS, loadAvailableStocks } from './services/csvLoader';
import { simulateTrade } from './services/simulationEngine';
import { addTrade, removeTrade, exportCSV } from './services/tradeRecorder';

type Phase = 'none' | 'entry_selected' | 'complete';

const App: React.FC = () => {
  const [availableStocks, setAvailableStocks] = useState<string[]>(AVAILABLE_STOCKS);
  const [selectedStock, setSelectedStock] = useState<string>(AVAILABLE_STOCKS[0]);
  const [fineStock, setFineStock] = useState<string>(AVAILABLE_STOCKS[0]);
  const [ohlcvData, setOhlcvData] = useState<OHLCVBar[]>([]);
  const [fineData, setFineData] = useState<OHLCVBar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [entryTime, setEntryTime] = useState<number | null>(null);
  const [exitTime, setExitTime] = useState<number | null>(null);
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [config, setConfig] = useState<SimulationConfig>({
    slDistance: 0.2,
    tpDistance: 0.4,
    beEnabled: false,
    beTrigger: 0.2,
    beOffset: 0,
    unit: 'USD',
    collisionPolicy: 'worst',
    pipSize: 0.0001,
    positionSize: 1,
    inrPerUsd: 83,
  });
  const [phase, setPhase] = useState<Phase>('none');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  
  // Truncation feature state
  const [truncatedCandleTime, setTruncatedCandleTime] = useState<number | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  
  // Alt+Shift truncation feature state
  const [altShiftTruncatedCandleTime, setAltShiftTruncatedCandleTime] = useState<number | null>(null);
  const [isAltShiftTruncated, setIsAltShiftTruncated] = useState(false);
  
  const chartRef = useRef<IChartApi | null>(null);
  const lastShiftClickRef = useRef<{ time: number; timestamp: number } | null>(null);

  // Load available stocks on app mount
  useEffect(() => {
    loadAvailableStocks().then((stocks) => {
      setAvailableStocks(stocks);
      if (selectedStock === AVAILABLE_STOCKS[0] && stocks.length > 0) {
        setSelectedStock(stocks[0]);
        setFineStock(stocks[0]);
      }
    });
  }, [selectedStock]);

  const resetSelection = useCallback(() => {
    setEntryTime(null);
    setExitTime(null);
    setEntryPrice(null);
    setSimulation(null);
    setPhase('none');
  }, []);

  const markers = useMemo<ChartMarker[]>(() => {
    const nextMarkers: ChartMarker[] = [];
    if (entryTime !== null) nextMarkers.push({ time: entryTime, type: 'entry' });
    if (exitTime !== null) {
      const exitCandleIndex = ohlcvData.findIndex((bar, index) => {
        const nextBar = ohlcvData[index + 1];
        return exitTime >= bar.time && (!nextBar || exitTime < nextBar.time);
      });
      if (exitCandleIndex !== -1) {
        nextMarkers.push({ time: ohlcvData[exitCandleIndex].time, type: 'exit' });
      }
    }
    return nextMarkers;
  }, [entryTime, exitTime, ohlcvData]);

  const handleShiftLeftClick = useCallback(
    (time: number) => {
      const now = Date.now();
      const isDoubleClick = 
        lastShiftClickRef.current &&
        lastShiftClickRef.current.time === time &&
        now - lastShiftClickRef.current.timestamp < 300; // 300ms window for double click

      lastShiftClickRef.current = { time, timestamp: now };

      if (isDoubleClick) {
        // Toggle truncation on the same candle
        if (truncatedCandleTime === time && isTruncated) {
          setTruncatedCandleTime(null);
          setIsTruncated(false);
        } else {
          setTruncatedCandleTime(time);
          setIsTruncated(true);
        }
      }
    },
    [truncatedCandleTime, isTruncated]
  );

  const handleAltShiftLeftClick = useCallback(
    (time: number) => {
      if (altShiftTruncatedCandleTime === time && isAltShiftTruncated) {
        // Toggle off - restore original
        setAltShiftTruncatedCandleTime(null);
        setIsAltShiftTruncated(false);
      } else {
        // Toggle on - truncate to this candle
        setAltShiftTruncatedCandleTime(time);
        setIsAltShiftTruncated(true);
      }
    },
    [altShiftTruncatedCandleTime, isAltShiftTruncated]
  );

  const handleSidebarResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;

    const handleMove = (moveEvent: PointerEvent) => {
      const nextWidth = startWidth - (moveEvent.clientX - startX);
      setSidebarWidth(Math.min(520, Math.max(260, nextWidth)));
    };
    const handleStop = () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleStop);
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleStop, { once: true });
  }, [sidebarWidth]);

  // Load CSV when stock changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    resetSelection();
    setTruncatedCandleTime(null);
    setIsTruncated(false);
    setAltShiftTruncatedCandleTime(null);
    setIsAltShiftTruncated(false);
    lastShiftClickRef.current = null;
    Promise.all([loadCSV(selectedStock), loadCSV(fineStock)])
      .then(([primary, fine]) => {
        setOhlcvData(primary);
        setFineData(fine);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedStock, fineStock, resetSelection]);

  const handleCandleDoubleClick = useCallback(
    (time: number) => {
      if (phase === 'none' || phase === 'complete') {
        setEntryTime(time);
        setPhase('entry_selected');
        setExitTime(null);
        setEntryPrice(ohlcvData.find((bar) => bar.time === time)?.close ?? null);
        setSimulation(null);
      }
    },
    [phase, ohlcvData]
  );

  const confirmTrade = useCallback(
    (signal: Signal) => {
      if (entryTime === null) return;
      try {
        const result = simulateTrade(ohlcvData, fineData, entryTime, signal, config);
        const timeframe = selectedStock.match(/(?:^|_)(M\d+|H\d+|D\d+)(?:_|$)/i)?.[1]?.toUpperCase() ?? selectedStock;
        const trade: Trade = {
          stock: selectedStock,
          timeframe,
          entry_time: result.entryTime,
          exit_time: result.exitTime ?? result.entryTime,
          signal,
          unit: config.unit,
          entry: result.entryPrice,
          sl: result.sl,
          tp: result.tp,
          be: result.be,
          exit: result.exitPrice,
          duration: `${result.durationMinutes}m`,
          mfe: result.mfe,
          mae: result.mae,
          maxRR: result.maxRR,
          beActivated: result.beActivated,
          result: result.result,
        };
        setSimulation(result);
        setExitTime(result.exitTime);
        setPhase('complete');
        addTrade(trade);
        setTrades((prev) => [...prev, trade]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Simulation failed.');
      }
    },
    [entryTime, selectedStock, ohlcvData, fineData, config]
  );

  const handleDeleteTrade = useCallback((trade: Trade) => {
    removeTrade(trade);
    setTrades((previous) => previous.filter((candidate) => candidate !== trade));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      switch (e.key.toLowerCase()) {
        case 'b':
          if (entryTime !== null) confirmTrade('BUY');
          break;
        case 's':
          if (entryTime !== null) confirmTrade('SELL');
          break;
        case 'r':
          resetSelection();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [entryTime, confirmTrade, resetSelection]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-brand">
          <span className="header-icon">📈</span>
          <span className="header-title">TradeLabel</span>
          <span className="header-subtitle">OHLCV Chart Labeling Tool</span>
        </div>
        <div className="header-status">
          {error && <span className="error-badge">⚠ {error}</span>}
        </div>
      </header>

      <div className="main-layout" style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}>
        <div className="workspace-column">
          <AnalyticsSetup
            primaryCsv={selectedStock}
            fineCsv={fineStock}
            availableCsvs={availableStocks}
            config={config}
            onPrimaryChange={setSelectedStock}
            onFineChange={setFineStock}
            onConfigChange={(nextConfig) => { setConfig(nextConfig); resetSelection(); }}
            disabled={loading}
          />
        <div className="charts-area">
          {ohlcvData.length > 0 ? (
            <MultiChartLayout
              ref={chartRef}
              data={ohlcvData}
              markers={markers}
              onCandleDoubleClick={handleCandleDoubleClick}
              onShiftLeftClick={handleShiftLeftClick}
              onAltShiftLeftClick={handleAltShiftLeftClick}
            />
          ) : (
            <div className="charts-placeholder">
              {loading ? 'Loading chart data…' : 'No data loaded'}
            </div>
          )}
        </div>
        </div>

        <div className="sidebar-resizer" onPointerDown={handleSidebarResizeStart} role="separator" aria-label="Resize right panel" />
        <aside className="sidebar">
          <ActiveTradePanel
            entryTime={entryTime}
            entryPrice={entryPrice}
            result={simulation}
            phase={phase}
            onBuy={() => confirmTrade('BUY')}
            onSell={() => confirmTrade('SELL')}
            onReset={resetSelection}
          />
          <button className="btn btn-download sidebar-export" onClick={() => exportCSV(selectedStock)} disabled={trades.length === 0}>⬇ Export CSV ({trades.length})</button>
          <TradeHistory trades={trades} onDelete={handleDeleteTrade} />
        </aside>
      </div>
    </div>
  );
};

export default App;
