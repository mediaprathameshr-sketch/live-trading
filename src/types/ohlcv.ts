export interface OHLCVBar {
    time: number; // unix timestamp (seconds)
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
