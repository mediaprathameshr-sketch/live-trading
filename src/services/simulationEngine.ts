import type { OHLCVBar } from '../types/ohlcv';
import type { Signal, SimulationConfig, SimulationResult } from '../types/trade';

function favorableMove(side: Signal, entryPrice: number, bar: OHLCVBar): number {
    return side === 'BUY' ? bar.high - entryPrice : entryPrice - bar.low;
}

function adverseMove(side: Signal, entryPrice: number, bar: OHLCVBar): number {
    return side === 'BUY' ? entryPrice - bar.low : bar.high - entryPrice;
}

function levelTouched(bar: OHLCVBar, level: number, type: 'upper' | 'lower'): boolean {
    return type === 'upper' ? bar.high >= level : bar.low <= level;
}

function convertMove(move: number, config: SimulationConfig): number {
    if (config.unit === 'PIPS') return move / config.pipSize;
    const money = move * config.positionSize;
    return config.unit === 'INR' ? money * config.inrPerUsd : money;
}

function chooseCollision(policy: SimulationConfig['collisionPolicy']): 'TP' | 'SL' {
    return policy === 'worst' ? 'SL' : 'TP';
}

export function simulateTrade(
    primaryBars: OHLCVBar[],
    fineBars: OHLCVBar[],
    entryTime: number,
    side: Signal,
    config: SimulationConfig
): SimulationResult {
    const entryBar = primaryBars.find((bar) => bar.time === entryTime);
    if (!entryBar) throw new Error('The selected entry candle is not available.');
    if (config.slDistance <= 0 || config.tpDistance <= 0) {
        throw new Error('SL and TP must be greater than zero.');
    }

    const entryPrice = entryBar.open;
    const sl = side === 'BUY' ? entryPrice - config.slDistance : entryPrice + config.slDistance;
    const tp = side === 'BUY' ? entryPrice + config.tpDistance : entryPrice - config.tpDistance;
    const be = side === 'BUY' ? entryPrice + config.beOffset : entryPrice - config.beOffset;
    const relevantBars = fineBars.filter((bar) => bar.time >= entryTime);
    if (relevantBars.length === 0) throw new Error('No fine-timeframe candles exist after the selected entry.');

    let maxFavorable = 0;
    let maxAdverse = 0;
    let beActivated = false;
    let exitBar: OHLCVBar | null = null;
    let exitPrice = entryPrice;
    let result: SimulationResult['result'] = 'OPEN';

    for (const bar of relevantBars) {
        maxFavorable = Math.max(maxFavorable, Math.max(0, favorableMove(side, entryPrice, bar)));
        maxAdverse = Math.max(maxAdverse, Math.max(0, adverseMove(side, entryPrice, bar)));

        // A BE trigger becomes active only after this candle resolves. This
        // prevents one OHLC candle from using a stop that did not exist yet.
        const stopPrice = beActivated ? be : sl;
        const stopTouched = side === 'BUY'
            ? levelTouched(bar, stopPrice, 'lower')
            : levelTouched(bar, stopPrice, 'upper');
        const targetTouched = side === 'BUY'
            ? levelTouched(bar, tp, 'upper')
            : levelTouched(bar, tp, 'lower');

        if (stopTouched || targetTouched) {
            const event = stopTouched && targetTouched
                ? chooseCollision(config.collisionPolicy)
                : targetTouched ? 'TP' : 'SL';
            exitBar = bar;
            result = event === 'TP' ? 'TP' : beActivated && stopPrice === be ? 'BE' : 'SL';
            exitPrice = event === 'TP' ? tp : stopPrice;
            break;
        }

        // Keep this after exit resolution so BE cannot affect its trigger candle.
        if (config.beEnabled && !beActivated && favorableMove(side, entryPrice, bar) >= config.beTrigger) {
            beActivated = true;
        }
    }

    const resolvedExitTime = exitBar?.time ?? null;
    const resolvedExitPrice = exitBar ? exitPrice : entryPrice;
    const durationMinutes = exitBar
        ? Math.max(0, Math.round((exitBar.time - entryTime) / 60))
        : 0;

    const risk = config.slDistance;
    return {
        entryTime,
        entryPrice,
        exitTime: resolvedExitTime,
        exitPrice: resolvedExitPrice,
        sl,
        tp,
        be: config.beEnabled ? be : null,
        durationMinutes,
        mfe: convertMove(maxFavorable, config),
        mae: convertMove(maxAdverse, config),
        maxRR: Number((maxFavorable / risk).toFixed(2)),
        beActivated,
        result,
    };
}
