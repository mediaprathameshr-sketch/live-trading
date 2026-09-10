import React from 'react';
import DateNavigator from './DateNavigator';
import { formatUnixToCsvTime } from '../utils/timeFormat';
import type { OHLCVBar } from '../types/ohlcv';

interface TradeControlsProps {
    selectedStock: string;
    onStockChange: (stock: string) => void;
    entryTime: number | null;
    exitTime: number | null;
    phase: 'none' | 'entry_selected' | 'complete';
    onBuy: () => void;
    onSell: () => void;
    onReset: () => void;
    onDownload: () => void;
    tradeCount: number;
    loading: boolean;
    availableStocks?: string[];
    ohlcvData?: OHLCVBar[];
    onDateNavigate?: (timestamp: number) => void;
}

function formatTimestamp(ts: number | null): string {
    if (ts === null) return '—';
    return formatUnixToCsvTime(ts);
}

const TradeControls: React.FC<TradeControlsProps> = ({
    selectedStock,
    onStockChange,
    entryTime,
    exitTime,
    phase,
    onBuy,
    onSell,
    onReset,
    onDownload,
    tradeCount,
    loading,
    availableStocks = [],
    ohlcvData = [],
    onDateNavigate = () => {},
}) => {
    const canConfirm = phase === 'complete';

    const phaseLabel = {
        none: '① Double-click to select ENTRY candle',
        entry_selected: '② Double-click to select EXIT candle',
        complete: '③ Choose direction: BUY or SELL',
    }[phase];

    const stocks = availableStocks.length > 0 ? availableStocks : ['RELIANCE', 'TCS', 'INFY'];

    return (
        <div className="trade-controls">
            <div className="controls-section">
                <label className="controls-label" htmlFor="stock-select">Stock</label>
                <select
                    id="stock-select"
                    className="stock-select"
                    value={selectedStock}
                    onChange={(e) => onStockChange(e.target.value)}
                    disabled={loading}
                >
                    {stocks.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                {loading && <span className="loading-badge">Loading…</span>}
            </div>

            <div className="controls-divider" />

            {ohlcvData.length > 0 && (
                <>
                    <div className="controls-section">
                        <label className="controls-label">Jump to Date</label>
                        <DateNavigator 
                            data={ohlcvData} 
                            onDateSelect={onDateNavigate}
                        />
                    </div>
                    <div className="controls-divider" />
                </>
            )}

            <div className="controls-section">
                <div className="phase-indicator">
                    <span className="phase-dot" data-phase={phase} />
                    <span className="phase-label">{phaseLabel}</span>
                </div>
            </div>

            <div className="controls-section">
                <div className="time-row">
                    <div className={`time-card ${entryTime ? 'active-entry' : ''}`}>
                        <span className="time-card-label">ENTRY</span>
                        <span className="time-card-value">{formatTimestamp(entryTime)}</span>
                    </div>
                    <div className={`time-card ${exitTime ? 'active-exit' : ''}`}>
                        <span className="time-card-label">EXIT</span>
                        <span className="time-card-value">{formatTimestamp(exitTime)}</span>
                    </div>
                </div>
            </div>

            <div className="controls-divider" />

            <div className="controls-section">
                <div className="action-buttons">
                    <button
                        className="btn btn-buy"
                        onClick={onBuy}
                        disabled={!canConfirm}
                        title="Keyboard: B"
                    >
                        ▲ BUY
                    </button>
                    <button
                        className="btn btn-sell"
                        onClick={onSell}
                        disabled={!canConfirm}
                        title="Keyboard: S"
                    >
                        ▼ SELL
                    </button>
                </div>
                <button className="btn btn-reset" onClick={onReset} title="Keyboard: R">
                    ↺ Reset Trade
                </button>
            </div>

            <div className="controls-divider" />

            <div className="controls-section">
                <div className="trade-stats">
                    <span className="trade-count-badge">{tradeCount}</span>
                    <span className="trade-count-label">
                        {tradeCount === 1 ? 'trade saved' : 'trades saved'}
                    </span>
                </div>
                <button
                    className="btn btn-download"
                    onClick={onDownload}
                    disabled={tradeCount === 0}
                >
                    ⬇ Download Trades CSV
                </button>
            </div>

            <div className="controls-divider" />

            <div className="controls-section shortcuts-hint">
                <span className="shortcut-key">B</span> Buy&nbsp;&nbsp;
                <span className="shortcut-key">S</span> Sell&nbsp;&nbsp;
                <span className="shortcut-key">R</span> Reset
            </div>
        </div>
    );
};

export default TradeControls;
