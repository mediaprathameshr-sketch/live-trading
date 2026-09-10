import React, { useState, useMemo } from 'react';
import type { OHLCVBar } from '../types/ohlcv';

interface DateNavigatorProps {
    data: OHLCVBar[];
    onDateSelect: (timestamp: number) => void;
}

const DateNavigator: React.FC<DateNavigatorProps> = ({ data, onDateSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');

    // Extract unique dates from data
    const availableDates = useMemo(() => {
        const dateSet = new Set<string>();
        data.forEach((bar) => {
            const date = new Date(bar.time * 1000);
            const dateStr = date.toISOString().split('T')[0];
            dateSet.add(dateStr);
        });
        return Array.from(dateSet).sort();
    }, [data]);

    const handleDateChange = (dateStr: string) => {
        setSelectedDate(dateStr);
        
        // Find the first candle for the selected date
        const candle = data.find((bar) => {
            const barDate = new Date(bar.time * 1000);
            const barDateStr = barDate.toISOString().split('T')[0];
            return barDateStr === dateStr;
        });
        
        if (candle) {
            onDateSelect(candle.time);
            setIsOpen(false);
        }
    };

    const currentDate = selectedDate || (data.length > 0 ? 
        new Date(data[0].time * 1000).toISOString().split('T')[0] : '');

    return (
        <div className="date-navigator">
            <div className="date-selector-wrapper">
                <button 
                    className="date-selector-button"
                    onClick={() => setIsOpen(!isOpen)}
                    title="Select a date to jump to"
                >
                    📅 {currentDate || 'Pick Date'}
                </button>
                
                {isOpen && (
                    <div className="date-picker-dropdown">
                        <div className="date-picker-header">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => handleDateChange(e.target.value)}
                                min={availableDates[0]}
                                max={availableDates[availableDates.length - 1]}
                                className="date-input"
                            />
                        </div>
                        <div className="date-list">
                            {availableDates.map((dateStr) => (
                                <button
                                    key={dateStr}
                                    className={`date-list-item ${selectedDate === dateStr ? 'active' : ''}`}
                                    onClick={() => handleDateChange(dateStr)}
                                >
                                    {new Date(dateStr).toLocaleDateString('en-IN', {
                                        weekday: 'short',
                                        year: 'numeric',
                                        month: 'short',
                                        day: '2-digit',
                                    })}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DateNavigator;
