import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
    createChart,
    type IChartApi,
    type ISeriesApi,
    type SeriesType,
    type SeriesMarker,
    type Time,
    CrosshairMode,
    ColorType,
    CandlestickSeries,
    HistogramSeries,
    createSeriesMarkers,
    type ISeriesMarkersPluginApi,
} from 'lightweight-charts';
import type { OHLCVBar } from '../types/ohlcv';

export interface ChartMarker {
    time: number;
    type: 'entry' | 'exit';
}

interface ChartPanelProps {
    data: OHLCVBar[];
    markers: ChartMarker[];
    onCandleDoubleClick: (time: number) => void;
    onShiftLeftClick?: (time: number) => void;
    onAltShiftLeftClick?: (time: number) => void;
    chartRef: React.MutableRefObject<IChartApi | null>;
    seriesRef?: React.MutableRefObject<ISeriesApi<SeriesType> | null>;
    label?: string;
}

const ChartPanel: React.FC<ChartPanelProps> = ({
    data,
    markers,
    onCandleDoubleClick,
    onShiftLeftClick,
    onAltShiftLeftClick,
    chartRef,
    seriesRef,
    label,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const candleSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
    const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);
    const isDraggingRef = useRef(false);
    const measurementTooltipRef = useRef<HTMLDivElement>(null);
    const startPriceRef = useRef<number | null>(null);
    const isShiftPressedRef = useRef(false);
    const lastShiftClickRef = useRef<{ time: number; timestamp: number } | null>(null);

    const [localTruncatedCandleTime, setLocalTruncatedCandleTime] = useState<number | null>(null);
    const [isLocalTruncated, setIsLocalTruncated] = useState(false);
    const [localAltShiftTruncatedCandleTime, setLocalAltShiftTruncatedCandleTime] = useState<number | null>(null);
    const [isLocalAltShiftTruncated, setIsLocalAltShiftTruncated] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            autoSize: true,
            layout: {
                background: { type: ColorType.Solid, color: '#0b0e1a' },
                textColor: '#94a3b8',
                fontSize: 11,
                fontFamily: "'Inter', sans-serif",
            },
            grid: {
                vertLines: { color: '#1a2035' },
                horzLines: { color: '#1a2035' },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { color: '#4f8ef7', width: 1, style: 2, labelBackgroundColor: '#1d4ed8' },
                horzLine: { color: '#4f8ef7', width: 1, style: 2, labelBackgroundColor: '#1d4ed8' },
            },
            rightPriceScale: {
                borderColor: '#1e2a45',
                scaleMargins: { top: 0.05, bottom: 0.25 },
            },
            timeScale: {
                borderColor: '#1e2a45',
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 5,
            },
            localization: {
                timeFormatter: (time: number) => {
                    const date = new Date(time * 1000);
                    const year = date.getUTCFullYear();
                    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
                    const day = date.getUTCDate().toString().padStart(2, '0');
                    const hour = date.getUTCHours().toString().padStart(2, '0');
                    const minute = date.getUTCMinutes().toString().padStart(2, '0');
                    return `${year}-${month}-${day} ${hour}:${minute}`;
                },
            },
        });

        chartRef.current = chart;

        const cs = chart.addSeries(CandlestickSeries, {
            upColor: '#26c97a',
            downColor: '#ef5350',
            borderUpColor: '#26c97a',
            borderDownColor: '#ef5350',
            wickUpColor: '#26c97a',
            wickDownColor: '#ef5350',
            priceFormat: {
        type: 'price',
        precision: 5,
        minMove: 0.00001,
},  


        });
        candleSeriesRef.current = cs;

        if (seriesRef) {
            seriesRef.current = cs;
        }

        markersPluginRef.current = createSeriesMarkers(cs);

        const vs = chart.addSeries(HistogramSeries, {
            color: '#26c97a',
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
        });
        chart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });
        volumeSeriesRef.current = vs;

        return () => {
            markersPluginRef.current = null;
            chart.remove();
            chartRef.current = null;
            if (seriesRef) seriesRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const renderData = useMemo(() => {
        const activeTime = isLocalAltShiftTruncated && localAltShiftTruncatedCandleTime !== null
            ? localAltShiftTruncatedCandleTime
            : isLocalTruncated && localTruncatedCandleTime !== null
                ? localTruncatedCandleTime
                : null;

        if (activeTime === null) {
            return data.map((bar) => ({ ...bar }));
        }

        const truncatedIndex = data.findIndex((bar) => bar.time === activeTime);
        if (truncatedIndex === -1) {
            return data.map((bar) => ({ ...bar }));
        }

        return data.slice(0, truncatedIndex + 1).map((bar, index) =>
            index === truncatedIndex
                ? { ...bar, high: bar.open, low: bar.open, close: bar.open }
                : { ...bar }
        );
    }, [data, isLocalTruncated, localTruncatedCandleTime, isLocalAltShiftTruncated, localAltShiftTruncatedCandleTime]);

    useEffect(() => {
        const cs = candleSeriesRef.current;
        const vs = volumeSeriesRef.current;
        const chart = chartRef.current;
        if (!cs || !vs || !chart) return;

        cs.setData(
            renderData.map((b) => ({
                time: b.time as Time,
                open: b.open,
                high: b.high,
                low: b.low,
                close: b.close,
            }))
        );

        vs.setData(
            renderData.map((b) => ({
                time: b.time as Time,
                value: b.volume,
                color: b.close >= b.open ? 'rgba(38,201,122,0.4)' : 'rgba(239,83,80,0.4)',
            }))
        );

        chart.priceScale('right').applyOptions({ autoScale: true });
        chart.timeScale().fitContent();
    }, [renderData, chartRef]);

    useEffect(() => {
        if (!markersPluginRef.current) return;
        
        const seriesMarkers: SeriesMarker<Time>[] = markers.map((m) => ({
            time: m.time as Time,
            position: m.type === 'entry' ? 'belowBar' : 'aboveBar',
            color: m.type === 'entry' ? '#00e676' : '#ff1744',
            shape: m.type === 'entry' ? 'arrowUp' : 'arrowDown',
            text: m.type === 'entry' ? 'ENTRY' : 'EXIT',
            size: 2,
        }));

        seriesMarkers.sort((a, b) => (a.time as number) - (b.time as number));
        markersPluginRef.current.setMarkers(seriesMarkers);
    }, [markers]);

    const handleDblClick = useCallback(
        (param: { time?: Time }) => {
            // Skip double-click when shift is pressed (used for truncation feature)
            if (isShiftPressedRef.current) return;
            if (!param.time) return;
            onCandleDoubleClick(param.time as number);
        },
        [onCandleDoubleClick]
    );

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || !containerRef.current) return;

        const resolveClickedTime = (x: number): number | null => {
            if (data.length === 0) return null;

            const logical = chart.timeScale().coordinateToLogical(x);
            if (logical !== null) {
                const closestIndex = Math.min(Math.max(Math.round(logical), 0), data.length - 1);
                return data[closestIndex].time;
            }

            const possibleTime = chart.timeScale().coordinateToTime(x);
            if (typeof possibleTime === 'number') {
                let lo = 0;
                let hi = data.length - 1;
                while (lo <= hi) {
                    const mid = Math.floor((lo + hi) / 2);
                    if (data[mid].time === possibleTime) {
                        return data[mid].time;
                    }
                    if (data[mid].time < possibleTime) {
                        lo = mid + 1;
                    } else {
                        hi = mid - 1;
                    }
                }

                const candidateIndex = Math.min(Math.max(hi, 0), data.length - 1);
                const nextIndex = Math.min(candidateIndex + 1, data.length - 1);
                const candidateTime = data[candidateIndex].time;
                const nextTime = data[nextIndex].time;
                return Math.abs(candidateTime - possibleTime) <= Math.abs(nextTime - possibleTime)
                    ? candidateTime
                    : nextTime;
            }

            return null;
        };

        const handleMouseDown = (e: MouseEvent) => {
            // Check for alt + shift + left-click (left-click is button 0)
            if (e.altKey && e.shiftKey && e.button === 0) {
                const rect = containerRef.current!.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const clickedTime = resolveClickedTime(x);
                if (clickedTime !== null) {
                    if (isLocalAltShiftTruncated && localAltShiftTruncatedCandleTime === clickedTime) {
                        setLocalAltShiftTruncatedCandleTime(null);
                        setIsLocalAltShiftTruncated(false);
                    } else {
                        setLocalAltShiftTruncatedCandleTime(clickedTime);
                        setIsLocalAltShiftTruncated(true);
                        setLocalTruncatedCandleTime(null);
                        setIsLocalTruncated(false);
                    }
                    onAltShiftLeftClick?.(clickedTime);
                }
                return;
            }
            
            // Check for shift + left-click (left-click is button 0)
            if (e.shiftKey && e.button === 0) {
                const rect = containerRef.current!.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const clickedTime = resolveClickedTime(x);
                if (clickedTime !== null) {
                    const now = Date.now();
                    const isDoubleClick =
                        lastShiftClickRef.current &&
                        lastShiftClickRef.current.time === clickedTime &&
                        now - lastShiftClickRef.current.timestamp < 300;

                    lastShiftClickRef.current = { time: clickedTime, timestamp: now };

                    if (isDoubleClick) {
                        if (isLocalTruncated && localTruncatedCandleTime === clickedTime) {
                            setLocalTruncatedCandleTime(null);
                            setIsLocalTruncated(false);
                        } else {
                            setLocalTruncatedCandleTime(clickedTime);
                            setIsLocalTruncated(true);
                            setLocalAltShiftTruncatedCandleTime(null);
                            setIsLocalAltShiftTruncated(false);
                        }
                    }

                    onShiftLeftClick?.(clickedTime);
                }
                return;
            }

            // Check for shift + right-click (right-click is button 2)
            if (e.shiftKey && e.button === 2) {
                e.preventDefault();
                isDraggingRef.current = true;
                dragStartRef.current = { x: e.clientX, y: e.clientY };
                containerRef.current!.style.cursor = 'crosshair';

                // Get the starting price from the chart
                const series = candleSeriesRef.current;
                if (series) {
                    const priceAtPoint = series.coordinateToPrice(e.clientY);
                    startPriceRef.current = priceAtPoint;
                }

                // Create measurement tooltip
                if (!measurementTooltipRef.current) {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'price-measurement-tooltip';
                    containerRef.current!.appendChild(tooltip);
                    measurementTooltipRef.current = tooltip;
                }
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingRef.current || !dragStartRef.current || !startPriceRef.current) return;

            const series = candleSeriesRef.current;
            
            if (series) {
                const endPrice = series.coordinateToPrice(e.clientY);
                if (endPrice === null) return;

                const startPrice = startPriceRef.current;
                const priceDiff = endPrice - startPrice;
                const percentChange = ((priceDiff / startPrice) * 100).toFixed(5);

                // Update tooltip
                if (measurementTooltipRef.current) {
                    const tooltip = measurementTooltipRef.current;
                    const isPositive = priceDiff >= 0;
                    const color = isPositive ? '#26c97a' : '#ef5350';
                    const arrow = isPositive ? '▲' : '▼';

                    tooltip.innerHTML = `
                        <div style="color: ${color}; font-weight: bold;">
                            ${arrow} ${Math.abs(priceDiff).toFixed(5)}
                        </div>
                        <div style="color: ${color}; font-size: 12px;">
                            ${isPositive ? '+' : ''}${percentChange}%
                        </div>
                    `;
                    tooltip.style.left = e.clientX + 10 + 'px';
                    tooltip.style.top = e.clientY - 50 + 'px';
                    tooltip.style.display = 'block';
                }
            }
        };

        const handleMouseUp = () => {
            if (isDraggingRef.current) {
                isDraggingRef.current = false;
                dragStartRef.current = null;
                startPriceRef.current = null;
                containerRef.current!.style.cursor = 'default';
                
                if (measurementTooltipRef.current) {
                    measurementTooltipRef.current.style.display = 'none';
                }
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            // Prevent context menu when shift+right-clicking
            if (e.shiftKey) {
                e.preventDefault();
            }
        };

        containerRef.current.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        containerRef.current.addEventListener('contextmenu', handleContextMenu);

        return () => {
            containerRef.current?.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            containerRef.current?.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [chartRef, onShiftLeftClick, onAltShiftLeftClick, data]);

    useEffect(() => {
        lastShiftClickRef.current = null;
        setLocalTruncatedCandleTime(null);
        setIsLocalTruncated(false);
        setLocalAltShiftTruncatedCandleTime(null);
        setIsLocalAltShiftTruncated(false);
    }, [data]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.shiftKey) {
                isShiftPressedRef.current = true;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') {
                isShiftPressedRef.current = false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;
        chart.subscribeDblClick(handleDblClick);
        return () => {
            chart.unsubscribeDblClick(handleDblClick);
        };
    }, [handleDblClick, chartRef]);

    return (
        <div className="chart-panel-wrapper">
            {label && <div className="chart-label">{label}</div>}
            <div ref={containerRef} className="chart-container" />
        </div>
    );
};

export default ChartPanel;
