'use client';

import SectionHeader from '@/components/ui/SectionHeader';
import ScoreCard from '@/components/ui/ScoreCard';
import CorrelationHeatmap from '@/components/charts/CorrelationHeatmap';
import DrawdownChart from '@/components/charts/DrawdownChart';
import { formatPercent, formatDecimal, signedPercent } from '@/utils/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function RiskDecomposition({ data }) {
  if (!data) return <div className="text-gray-500 text-sm">Insufficient data.</div>;

  const { portfolio_volatility_annual = 0, portfolio_beta = 1, risk_contribution = [], correlation_matrix = {}, max_drawdown = 0, cvar_95 = 0, sharpe = 0, sortino = 0, benchmark_sharpe = 1, drawdown_history = [] } = data;

  const riskData = risk_contribution.slice(0, 10).map(r => ({
    ticker: r.ticker,
    'Dollar Weight': Math.round(r.dollar_weight * 1000) / 10,
    'Risk Weight': Math.round(r.risk_weight * 1000) / 10,
  }));

  const topRisk = risk_contribution[0];

  return (
    <div>
      <SectionHeader title="Risk Decomposition" subtitle="Where your risk actually comes from" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <ScoreCard label="Portfolio Beta" value={formatDecimal(portfolio_beta)} subtext="vs market" variant={portfolio_beta > 1.3 ? 'bad' : portfolio_beta > 1.1 ? 'warn' : 'good'} />
        <ScoreCard label="Max Drawdown" value={formatPercent(Math.abs(max_drawdown))} subtext="peak to trough" variant={Math.abs(max_drawdown) > 0.35 ? 'bad' : Math.abs(max_drawdown) > 0.2 ? 'warn' : 'good'} />
        <ScoreCard label="Sharpe Ratio" value={formatDecimal(sharpe)} subtext={`Benchmark: ${formatDecimal(benchmark_sharpe)}`} variant={sharpe >= benchmark_sharpe ? 'good' : sharpe >= benchmark_sharpe * 0.8 ? 'warn' : 'bad'} />
        <ScoreCard label="CVaR 95%" value={formatPercent(Math.abs(cvar_95))} subtext="avg worst day annlzd" variant={Math.abs(cvar_95) > 0.4 ? 'bad' : 'warn'} />
      </div>

      {riskData.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Dollar Weight vs Risk Weight</p>
          <p className="text-xs text-gray-600 mb-3">Risk is not distributed like your money.</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={riskData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="ticker" tick={{ fill: '#9CA3AF', fontSize: 11 }} width={55} />
              <Tooltip contentStyle={{ background: '#161820', border: '1px solid #374151', color: '#E5E7EB' }} formatter={v => `${v}%`} />
              <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: 11 }} />
              <Bar dataKey="Dollar Weight" fill="#3B82F6" radius={2} />
              <Bar dataKey="Risk Weight" fill="#EF4444" radius={2} />
            </BarChart>
          </ResponsiveContainer>
          {topRisk && topRisk.risk_weight > 0.30 && (
            <p className="text-xs text-red-400 mt-2 bg-red-900/20 border border-red-900 rounded px-3 py-2">
              {topRisk.ticker} accounts for {formatPercent(topRisk.risk_weight)} of your total portfolio risk despite being only {formatPercent(topRisk.dollar_weight)} of your dollar allocation.
            </p>
          )}
        </div>
      )}

      {Object.keys(correlation_matrix).length > 1 && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Correlation Matrix</p>
          <p className="text-xs text-gray-600 mb-3">Highly correlated assets (red) don't reduce risk when combined.</p>
          <CorrelationHeatmap matrix={correlation_matrix} />
        </div>
      )}

      {drawdown_history.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Drawdown History</p>
          <p className="text-xs text-gray-600 mb-3">Time spent below previous peak.</p>
          <DrawdownChart drawdownHistory={drawdown_history} />
        </div>
      )}
    </div>
  );
}
