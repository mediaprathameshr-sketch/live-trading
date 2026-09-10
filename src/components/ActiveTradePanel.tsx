import React from 'react';
import { formatUnixToCsvTime } from '../utils/timeFormat';
import type { SimulationResult } from '../types/trade';

interface ActiveTradePanelProps {
    entryTime: number | null;
    entryPrice: number | null;
    result: SimulationResult | null;
    phase: 'none' | 'entry_selected' | 'complete';
    onBuy: () => void;
    onSell: () => void;
    onReset: () => void;
}

const ActiveTradePanel: React.FC<ActiveTradePanelProps> = ({ entryTime, entryPrice, result, phase, onBuy, onSell, onReset }) => (
    <section className="active-trade-panel">
        <div className="panel-heading">Active trade</div>
        <div className="active-trade-status" data-state={result?.result ?? phase}>
            {result ? result.result : phase === 'entry_selected' ? 'Entry selected' : 'Select an entry candle'}
        </div>
        <div className="active-trade-grid">
            <span>Entry</span><strong>{entryTime === null ? '—' : formatUnixToCsvTime(entryTime)}</strong>
            <span>Price</span><strong>{entryPrice === null ? '—' : entryPrice.toFixed(5)}</strong>
            <span>Exit</span><strong>{result?.exitTime === null || !result ? '—' : formatUnixToCsvTime(result.exitTime)}</strong>
            <span>RR</span><strong>{result ? result.maxRR.toFixed(2) : '—'}</strong>
        </div>
        <div className="action-buttons">
            <button className="btn btn-buy" onClick={onBuy} disabled={entryTime === null}>▲ BUY</button>
            <button className="btn btn-sell" onClick={onSell} disabled={entryTime === null}>▼ SELL</button>
        </div>
        <button className="btn btn-reset" onClick={onReset}>↺ Reset entry</button>
    </section>
);

export default ActiveTradePanel;
