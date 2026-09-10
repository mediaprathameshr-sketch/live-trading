import React from 'react';
import type { Trade } from '../types/trade';
import { formatUnixToCsvTime } from '../utils/timeFormat';

interface TradeHistoryProps {
    trades: Trade[];
    onDelete: (trade: Trade) => void;
}

function formatTs(ts: number): string {
    return formatUnixToCsvTime(ts);
}

const TradeHistory: React.FC<TradeHistoryProps> = ({ trades, onDelete }) => {
    if (trades.length === 0) {
        return (
            <div className="trade-history empty">
                <span className="empty-msg">No trades yet. Start labeling!</span>
            </div>
        );
    }

    return (
        <div className="trade-history">
            <div className="history-header">Trade History</div>
            <div className="history-table-wrapper">
                <table className="history-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Stock</th>
                            <th>Entry</th>
                            <th>Exit</th>
                            <th>Side</th>
                            <th>Result</th>
                            <th>RR</th>
                            <th aria-label="Actions" />
                        </tr>
                    </thead>
                    <tbody>
                        {[...trades].reverse().map((t, i) => (
                            <tr key={i} className={t.signal === 'BUY' ? 'row-buy' : 'row-sell'}>
                                <td>{trades.length - i}</td>
                                <td>{t.stock}</td>
                                <td>{formatTs(t.entry_time)}</td>
                                <td>{t.result === 'OPEN' ? '—' : formatTs(t.exit_time)}</td>
                                <td>
                                    <span className={`signal-badge signal-${t.signal.toLowerCase()}`}>
                                        {t.signal === 'BUY' ? '▲' : '▼'} {t.signal}
                                    </span>
                                </td>
                                <td><span className={`result-badge result-${t.result.toLowerCase()}`}>{t.result}</span></td>
                                <td>{t.maxRR.toFixed(2)}</td>
                                <td>
                                    <button className="history-delete" onClick={() => onDelete(t)} title="Delete trade" aria-label={`Delete ${t.stock} trade`}>
                                        ×
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TradeHistory;
