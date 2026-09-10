export type Signal = 'BUY' | 'SELL';
export type TradeUnit = 'USD' | 'INR' | 'PIPS';
export type CollisionPolicy = 'worst' | 'best';
export type TradeResult = 'TP' | 'SL' | 'BE' | 'OPEN';

export interface SimulationConfig {
    slDistance: number;
    tpDistance: number;
    beEnabled: boolean;
    beTrigger: number;
    beOffset: number;
    unit: TradeUnit;
    collisionPolicy: CollisionPolicy;
    pipSize: number;
    positionSize: number;
    inrPerUsd: number;
}

export interface SimulationResult {
    entryTime: number;
    entryPrice: number;
    exitTime: number | null;
    exitPrice: number;
    sl: number;
    tp: number;
    be: number | null;
    durationMinutes: number;
    mfe: number;
    mae: number;
    maxRR: number;
    beActivated: boolean;
    result: TradeResult;
}

export interface Trade {
    stock: string;
    timeframe: string;
    entry_time: number; // unix timestamp (seconds)
    exit_time: number;  // unix timestamp (seconds)
    signal: Signal;
    unit: TradeUnit;
    entry: number;
    sl: number;
    tp: number;
    be: number | null;
    exit: number;
    duration: string;
    mfe: number;
    mae: number;
    maxRR: number;
    beActivated: boolean;
    result: TradeResult;
}
