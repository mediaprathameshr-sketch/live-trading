import React, { useRef, useEffect, useCallback, useMemo, forwardRef } from 'react';
import type { IChartApi, ISeriesApi, SeriesType, LogicalRange, MouseEventParams, Time } from 'lightweight-charts';
import ChartPanel, { type ChartMarker } from './ChartPanel';
import type { OHLCVBar } from '../types/ohlcv';
import { calculateHeikinAshi } from '../utils/heikinAshi';

interface MultiChartLayoutProps {
    data: OHLCVBar[];
    markers: ChartMarker[];
    onCandleDoubleClick: (time: number) => void;
    onShiftLeftClick?: (time: number) => void;
    onAltShiftLeftClick?: (time: number) => void;
}

const MultiChartLayout = forwardRef<IChartApi | null, MultiChartLayoutProps>(
    ({ data, markers, onCandleDoubleClick, onShiftLeftClick, onAltShiftLeftClick }, ref) => {
    const chart1Ref = useRef<IChartApi | null>(null);
    const chart2Ref = useRef<IChartApi | null>(null);
    const series1Ref = useRef<ISeriesApi<SeriesType> | null>(null);
    const series2Ref = useRef<ISeriesApi<SeriesType> | null>(null);
    const isSyncingRef = useRef(false);

    const makeSyncRange = useCallback(
        (target: React.MutableRefObject<IChartApi | null>) =>
            (range: LogicalRange | null) => {
                if (isSyncingRef.current || !range || !target.current) return;
                isSyncingRef.current = true;
                try {
                    target.current.timeScale().setVisibleLogicalRange(range);
                } finally {
                    isSyncingRef.current = false;
                }
            },
        []
    );

    const makeSyncCrosshair = useCallback(
        (
            targetChart: React.MutableRefObject<IChartApi | null>,
            targetSeries: React.MutableRefObject<ISeriesApi<SeriesType> | null>
        ) =>
            (param: MouseEventParams<Time>) => {
                if (isSyncingRef.current || !targetChart.current || !targetSeries.current) return;
                isSyncingRef.current = true;
                try {
                    if (param.time && param.point) {
                        const price = targetSeries.current.coordinateToPrice(param.point.y);
                        if (price !== null) {
                            targetChart.current.setCrosshairPosition(price, param.time, targetSeries.current);
                        }
                    } else {
                        targetChart.current.clearCrosshairPosition();
                    }
                } finally {
                    isSyncingRef.current = false;
                }
            },
        []
    );

    useEffect(() => {
        const onRange1Change = makeSyncRange(chart2Ref);
        const onRange2Change = makeSyncRange(chart1Ref);

        const intervalId = setInterval(() => {
            const c1 = chart1Ref.current;
            const c2 = chart2Ref.current;
            const s1 = series1Ref.current;
            const s2 = series2Ref.current;
            if (!c1 || !c2 || !s1 || !s2) return;

            clearInterval(intervalId);
            
            // Forward the ref to parent
            if (typeof ref === 'function') {
                ref(c1);
            } else if (ref) {
                ref.current = c1;
            }

            c1.timeScale().subscribeVisibleLogicalRangeChange(onRange1Change);
            c2.timeScale().subscribeVisibleLogicalRangeChange(onRange2Change);

            const onCross1 = makeSyncCrosshair(chart2Ref, series2Ref);
            const onCross2 = makeSyncCrosshair(chart1Ref, series1Ref);
            c1.subscribeCrosshairMove(onCross1);
            c2.subscribeCrosshairMove(onCross2);
        }, 100);

        return () => clearInterval(intervalId);
    }, [makeSyncRange, makeSyncCrosshair, ref]);

    const haData = useMemo(() => calculateHeikinAshi(data), [data]);

    return (
        <div className="multi-chart-layout">
            <ChartPanel
                data={data}
                markers={markers}
                onCandleDoubleClick={onCandleDoubleClick}
                onShiftLeftClick={onShiftLeftClick}
                onAltShiftLeftClick={onAltShiftLeftClick}
                chartRef={chart1Ref}
                seriesRef={series1Ref}
                label="Chart 1 (Standard)"
            />
            <ChartPanel
                data={haData}
                markers={markers}
                onCandleDoubleClick={onCandleDoubleClick}
                onShiftLeftClick={onShiftLeftClick}
                onAltShiftLeftClick={onAltShiftLeftClick}
                chartRef={chart2Ref}
                seriesRef={series2Ref}
                label="Chart 2 (Heikin Ashi)"
            />
        </div>
    );
});

MultiChartLayout.displayName = 'MultiChartLayout';

export default MultiChartLayout;
