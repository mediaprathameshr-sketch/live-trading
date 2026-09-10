import React, { useState } from 'react';
import type { IChartApi } from 'lightweight-charts';
import '../styles/ScaleControls.css';

interface ScaleControlsProps {
    chart: IChartApi | null;
}

const ScaleControls: React.FC<ScaleControlsProps> = ({ chart }) => {
    const [scaleType, setScaleType] = useState<'linear' | 'logarithmic'>('linear');

    const handleZoomIn = () => {
        if (!chart) return;
        const timeScale = chart.timeScale();
        const currentRange = timeScale.getVisibleLogicalRange();
        if (!currentRange) return;
        const range = currentRange.to - currentRange.from;
        const newFrom = currentRange.from + range * 0.15;
        const newTo = currentRange.to - range * 0.15;
        timeScale.setVisibleLogicalRange({ from: newFrom, to: newTo });
    };

    const handleZoomOut = () => {
        if (!chart) return;
        const timeScale = chart.timeScale();
        const currentRange = timeScale.getVisibleLogicalRange();
        if (!currentRange) return;
        const range = currentRange.to - currentRange.from;
        const newFrom = currentRange.from - range * 0.15;
        const newTo = currentRange.to + range * 0.15;
        timeScale.setVisibleLogicalRange({ from: newFrom, to: newTo });
    };

    const handleFitContent = () => {
        if (!chart) return;
        chart.timeScale().fitContent();
        chart.priceScale('right').applyOptions({ autoScale: true });
    };

    const handleResetZoom = () => {
        if (!chart) return;
        chart.timeScale().resetTimeScale();
        chart.priceScale('right').applyOptions({ autoScale: true });
    };

    const handleToggleScale = (type: 'linear' | 'logarithmic') => {
        if (!chart) return;
        setScaleType(type);
        chart.priceScale('right').applyOptions({
            mode: type === 'logarithmic' ? 1 : 0, // 1 = logarithmic, 0 = normal
        });
    };

    const handleAutoScale = () => {
        if (!chart) return;
        chart.priceScale('right').applyOptions({ autoScale: true });
    };

    return (
        <div className="scale-controls">
            <div className="scale-controls-section">
                <label className="scale-label">Time Zoom</label>
                <div className="scale-buttons-group">
                    <button
                        className="scale-btn scale-btn-sm"
                        onClick={handleZoomOut}
                        title="Zoom Out (Show more candles)"
                    >
                        🔍−
                    </button>
                    <button
                        className="scale-btn scale-btn-sm"
                        onClick={handleZoomIn}
                        title="Zoom In (Show fewer candles)"
                    >
                        🔍+
                    </button>
                    <button
                        className="scale-btn scale-btn-sm"
                        onClick={handleFitContent}
                        title="Fit all data"
                    >
                        ⊡
                    </button>
                </div>
            </div>

            <div className="scale-controls-section">
                <label className="scale-label">Price Scale</label>
                <div className="scale-buttons-group">
                    <button
                        className={`scale-btn scale-btn-toggle ${scaleType === 'linear' ? 'active' : ''}`}
                        onClick={() => handleToggleScale('linear')}
                        title="Linear scale"
                    >
                        Lin
                    </button>
                    <button
                        className={`scale-btn scale-btn-toggle ${scaleType === 'logarithmic' ? 'active' : ''}`}
                        onClick={() => handleToggleScale('logarithmic')}
                        title="Logarithmic scale"
                    >
                        Log
                    </button>
                    <button
                        className="scale-btn scale-btn-sm"
                        onClick={handleAutoScale}
                        title="Auto scale"
                    >
                        ⚙
                    </button>
                </div>
            </div>

            <div className="scale-controls-section">
                <button
                    className="scale-btn scale-btn-reset"
                    onClick={handleResetZoom}
                    title="Reset all zoom and scale settings"
                >
                    ↺ Reset All
                </button>
            </div>
        </div>
    );
};

export default ScaleControls;
