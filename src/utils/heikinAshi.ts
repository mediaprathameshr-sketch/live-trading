import type { OHLCVBar } from '../types/ohlcv';

export function calculateHeikinAshi(data: OHLCVBar[]): OHLCVBar[] {
    if (data.length === 0) return [];

    const haData: OHLCVBar[] = [];

    // First candle: standard initialization
    let prevOpen = data[0].open;
    let prevClose = data[0].close;

    haData.push({
        ...data[0],
        open: prevOpen,
        close: (data[0].open + data[0].high + data[0].low + data[0].close) / 4,
        high: data[0].high,
        low: data[0].low,
    });

    for (let i = 1; i < data.length; i++) {
        const current = data[i];

        // HA Close = (Open + High + Low + Close) / 4
        const haClose = (current.open + current.high + current.low + current.close) / 4;

        // HA Open = (Previous HA Open + Previous HA Close) / 2
        const haOpen = (prevOpen + prevClose) / 2;

        // HA High = Max(High, HA Open, HA Close)
        const haHigh = Math.max(current.high, haOpen, haClose);

        // HA Low = Min(Low, HA Open, HA Close)
        const haLow = Math.min(current.low, haOpen, haClose);

        haData.push({
            time: current.time,
            open: haOpen,
            high: haHigh,
            low: haLow,
            close: haClose,
            volume: current.volume, // Volume stays the same
        });

        prevOpen = haOpen;
        prevClose = haClose;
    }

    return haData;
}
