import type { Trade } from '../types/trade';
import { formatUnixToCsvTime } from '../utils/timeFormat';

const trades: Trade[] = [];

export function addTrade(trade: Trade): void {
    trades.push(trade);
}

export function removeTrade(trade: Trade): void {
    const index = trades.indexOf(trade);
    if (index !== -1) trades.splice(index, 1);
}

export function getTrades(): Trade[] {
    return [...trades];
}

export function getTradeCount(): number {
    return trades.length;
}

export async function exportCSV(stockName: string): Promise<void> {
    if (trades.length === 0) {
        alert('No trades to export!');
        return;
    }

    const header = 'Date,Time,Symbol,Timeframe,Side,Unit,Entry,SL,TP,BE,Exit,ExitTime,Duration,MFE,MAE,MaxRR,BEActivated,Result';
    const rows = trades.map((t) => {
        const [date, time] = formatUnixToCsvTime(t.entry_time).split(' ');
        return [
            date,
            time,
            t.stock,
            t.timeframe,
            t.signal,
            t.unit,
            t.entry,
            t.sl,
            t.tp,
            t.be ?? '',
            t.exit,
            t.result === 'OPEN' ? '' : formatUnixToCsvTime(t.exit_time),
            t.duration,
            t.mfe,
            t.mae,
            t.maxRR,
            t.beActivated,
            t.result,
        ].join(',');
    });
    const csvContent = [header, ...rows].join('\n');

    try {
        const response = await fetch('/api/save-csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: `${stockName}.csv`,
                content: csvContent
            })
        });
        const result = await response.json();
        if (result.success) {
            alert(`Trade successfully saved to: ${result.path}`);
        } else {
            alert(`Failed to save CSV: ${result.error}`);
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        alert(`Server connection failed! Ensure you are running locally via Vite. Error: ${message}`);
    }
}
