'use client';

import { useState } from 'react';
import PortfolioTable from './PortfolioTable';
import { usePortfolio } from '@/hooks/usePortfolio';

const HORIZONS = [
  { value: 'short', label: 'Less than 2 years' },
  { value: 'medium', label: '2–10 years' },
  { value: 'long', label: 'More than 10 years' },
];

const BENCHMARKS = [
  { value: 'SPY', label: 'S&P 500 (SPY)' },
  { value: 'VT', label: 'Global Market (VT)' },
  { value: 'SIXTYFORTY', label: '60/40 Portfolio' },
  { value: 'none', label: 'No benchmark' },
];

export default function ManualEntry({ onSubmit }) {
  const { positions, addPosition, removePosition, updatePosition, toAnalysisInput } = usePortfolio();
  const [horizon, setHorizon] = useState('medium');
  const [benchmark, setBenchmark] = useState('SPY');

  const hasValidPositions = positions.some(p => p.ticker && p.valid !== false && parseFloat(p.amount) > 0);

  function handleSubmit() {
    const analysisPositions = toAnalysisInput();
    if (analysisPositions.length === 0) return;
    onSubmit(analysisPositions, horizon, benchmark);
  }

  return (
    <div>
      <PortfolioTable
        positions={positions}
        onUpdate={updatePosition}
        onRemove={removePosition}
      />

      <button
        onClick={addPosition}
        className="mt-4 text-sm text-gray-500 hover:text-gray-300 border border-dashed border-gray-700 rounded px-4 py-2 w-full"
      >
        + Add position
      </button>

      <div className="mt-8 space-y-6">
        <div>
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Investment horizon</p>
          <div className="flex gap-2 flex-wrap">
            {HORIZONS.map(h => (
              <button
                key={h.value}
                onClick={() => setHorizon(h.value)}
                className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                  horizon === h.value
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Benchmark</p>
          <div className="flex gap-2 flex-wrap">
            {BENCHMARKS.map(b => (
              <button
                key={b.value}
                onClick={() => setBenchmark(b.value)}
                className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                  benchmark === b.value
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!hasValidPositions}
        className="mt-8 w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
      >
        Analyze Portfolio
      </button>
    </div>
  );
}
