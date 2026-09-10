import React from 'react';
import type { CollisionPolicy, SimulationConfig, TradeUnit } from '../types/trade';

interface AnalyticsSetupProps {
    primaryCsv: string;
    fineCsv: string;
    availableCsvs: string[];
    config: SimulationConfig;
    onPrimaryChange: (value: string) => void;
    onFineChange: (value: string) => void;
    onConfigChange: (config: SimulationConfig) => void;
    disabled?: boolean;
}

const AnalyticsSetup: React.FC<AnalyticsSetupProps> = ({
    primaryCsv,
    fineCsv,
    availableCsvs,
    config,
    onPrimaryChange,
    onFineChange,
    onConfigChange,
    disabled = false,
}) => {
    const update = (changes: Partial<SimulationConfig>) => onConfigChange({ ...config, ...changes });
    const units: TradeUnit[] = ['USD', 'INR', 'PIPS'];
    const policies: CollisionPolicy[] = ['worst', 'best'];

    return (
        <section className="analytics-setup" aria-label="Simulation setup">
            <div className="setup-file-group">
                <label className="setup-field">
                    <span>Primary candles</span>
                    <select value={primaryCsv} onChange={(event) => onPrimaryChange(event.target.value)} disabled={disabled}>
                        {availableCsvs.map((csv) => <option key={csv} value={csv}>{csv}</option>)}
                    </select>
                </label>
                <label className="setup-field">
                    <span>Fine timeframe</span>
                    <select value={fineCsv} onChange={(event) => onFineChange(event.target.value)} disabled={disabled}>
                        {availableCsvs.map((csv) => <option key={csv} value={csv}>{csv}</option>)}
                    </select>
                </label>
            </div>
            <div className="setup-risk-group">
                <label className="setup-field compact-field">
                    <span>Unit</span>
                    <select value={config.unit} onChange={(event) => update({ unit: event.target.value as TradeUnit })}>
                        {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                    </select>
                </label>
                <label className="setup-field compact-field">
                    <span>SL distance</span>
                    <input type="number" min="0.00001" step="any" value={config.slDistance} onChange={(event) => update({ slDistance: Number(event.target.value) })} />
                </label>
                <label className="setup-field compact-field">
                    <span>TP distance</span>
                    <input type="number" min="0.00001" step="any" value={config.tpDistance} onChange={(event) => update({ tpDistance: Number(event.target.value) })} />
                </label>
                <label className="setup-field compact-field">
                    <span>Collision</span>
                    <select value={config.collisionPolicy} onChange={(event) => update({ collisionPolicy: event.target.value as CollisionPolicy })}>
                        {policies.map((policy) => <option key={policy} value={policy}>{policy === 'worst' ? 'Worst case' : 'Best case'}</option>)}
                    </select>
                </label>
                <label className="setup-toggle">
                    <input type="checkbox" checked={config.beEnabled} onChange={(event) => update({ beEnabled: event.target.checked })} />
                    <span>BE</span>
                </label>
                <label className="setup-field compact-field">
                    <span>BE trigger</span>
                    <input type="number" min="0" step="any" value={config.beTrigger} onChange={(event) => update({ beTrigger: Number(event.target.value) })} disabled={!config.beEnabled} />
                </label>
                <label className="setup-field compact-field">
                    <span>BE offset</span>
                    <input type="number" step="any" value={config.beOffset} onChange={(event) => update({ beOffset: Number(event.target.value) })} disabled={!config.beEnabled} />
                </label>
            </div>
        </section>
    );
};

export default AnalyticsSetup;
