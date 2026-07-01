'use client';

import SectionHeader from '@/components/ui/SectionHeader';
import RegimeChart from '@/components/charts/RegimeChart';
import { formatPercent, formatDecimal } from '@/utils/formatters';

export default function RegimeStressTest({ data }) {
  if (!data) return <div className="text-gray-500 text-sm">Insufficient data.</div>;

  const { regime_performance = {}, current_regime_signals = {}, current_regime_probabilities = {}, most_likely_regime, worst_regime, worst_regime_return = 0 } = data;

  const signals = [
    { label: 'Yield Curve (T10Y2Y)', value: current_regime_signals.yield_curve, unit: '%', good: v => v > 0 },
    { label: 'Inflation Breakeven', value: current_regime_signals.inflation_breakeven, unit: '%', good: v => v < 2.5 },
    { label: 'Credit Spread', value: current_regime_signals.credit_spread, unit: '%', good: v => v < 4 },
    { label: 'VIX Term Structure', value: current_regime_signals.vix_term, unit: 'x', good: v => v < 1 },
  ];

  const mostLikelyPerf = most_likely_regime && regime_performance[most_likely_regime];

  return (
    <div>
      <SectionHeader title="Regime Stress Test" subtitle="How your portfolio behaves when the world changes" />

      {signals.some(s => s.value !== undefined) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {signals.map(s => (
            <div key={s.label} className="bg-[#0D0F12] border border-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`font-mono text-lg ${s.value !== undefined ? (s.good(s.value) ? 'text-green-400' : 'text-red-400') : 'text-gray-600'}`}>
                {s.value !== undefined ? `${s.value.toFixed(2)}${s.unit}` : '—'}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6">
        <RegimeChart
          regimePerformance={regime_performance}
          regimeProbabilities={current_regime_probabilities}
          mostLikelyRegime={most_likely_regime}
        />
      </div>

      {most_likely_regime && mostLikelyPerf && (
        <div className={`p-4 rounded-lg border mb-4 ${mostLikelyPerf.annual_return < 0 ? 'bg-red-900/20 border-red-800' : 'bg-blue-900/20 border-blue-800'}`}>
          <p className={`text-sm ${mostLikelyPerf.annual_return < 0 ? 'text-red-300' : 'text-blue-300'}`}>
            Most likely current regime: <strong>{most_likely_regime.replace(/_/g, ' ')}</strong>.{' '}
            In this environment your expected annual return is{' '}
            <span className="font-mono">{formatPercent(mostLikelyPerf.annual_return)}</span>.
          </p>
        </div>
      )}

      {worst_regime && (
        <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-400">
          Worst historical regime for this portfolio: <strong className="text-gray-200">{worst_regime.replace(/_/g, ' ')}</strong>{' '}
          at <span className="font-mono text-red-400">{formatPercent(worst_regime_return)}/year</span>.
        </div>
      )}
    </div>
  );
}
