'use client';

import SectionHeader from '@/components/ui/SectionHeader';
import FlagBadge from '@/components/ui/FlagBadge';
import { formatPercent } from '@/utils/formatters';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

const FLAG_INFO = {
  HOME_BIAS: { severity: 'medium', desc: 'Excess domestic equity allocation relative to global market weight.' },
  CONCENTRATION: { severity: 'high', desc: 'Top positions are too large relative to a well-diversified portfolio.' },
  RECENCY_BIAS: { severity: 'medium', desc: 'Allocation appears driven by recent performance, not forward-looking thesis.' },
  LEVERAGED_ETF: { severity: 'high', desc: 'Leveraged ETFs compound volatility decay over time.' },
};

export default function BehavioralAudit({ data }) {
  if (!data) return <div className="text-gray-500 text-sm">Insufficient data.</div>;

  const { home_bias = {}, concentration = {}, kelly = [], implicit_leverage = {}, recency_bias = {}, behavioral_flags = [] } = data;

  const kellyData = kelly.filter(k => k.kelly_fraction > 0).map(k => ({
    ticker: k.ticker,
    x: Math.round(k.kelly_fraction * 1000) / 10,
    y: Math.round(k.actual_weight * 1000) / 10,
    flag: k.flag,
  }));

  const usWeight = home_bias.user_us_weight ?? 0;
  const globalWeight = home_bias.global_benchmark ?? 0.62;

  return (
    <div>
      <SectionHeader title="Behavioral Audit" subtitle="Unconscious biases in your position sizing" />

      {behavioral_flags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {behavioral_flags.map(flag => {
            const base = flag.includes(':') ? flag.split(':')[0] : flag;
            const info = FLAG_INFO[base] || { severity: 'medium', desc: '' };
            return (
              <div key={flag} className="bg-[#0D0F12] border border-gray-800 rounded-lg p-4 flex-1 min-w-48">
                <FlagBadge flag={flag} severity={info.severity} />
                <p className="text-gray-400 text-xs mt-2">{info.desc || flag.replace(/_/g, ' ')}</p>
              </div>
            );
          })}
        </div>
      )}

      {behavioral_flags.length === 0 && (
        <div className="mb-6 p-4 bg-green-900/20 border border-green-800 rounded-lg text-green-300 text-sm">
          No significant behavioral flags detected.
        </div>
      )}

      {home_bias.user_us_weight !== undefined && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Home Bias Meter</p>
          <div className="relative h-6 bg-gray-800 rounded-full overflow-hidden">
            <div className="absolute h-full bg-blue-600/30 rounded-full" style={{ width: `${usWeight * 100}%` }} />
            <div className="absolute top-0 h-full w-0.5 bg-green-400" style={{ left: `${globalWeight * 100}%` }} />
            <div className="absolute top-0 h-full w-0.5 bg-blue-400" style={{ left: `${usWeight * 100}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>0%</span>
            <span className="text-green-400">Global benchmark: {formatPercent(globalWeight)}</span>
            <span className="text-blue-400">You: {formatPercent(usWeight)}</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {kellyData.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Kelly Criterion: Actual vs Optimal</p>
          <p className="text-xs text-gray-600 mb-3">Points above the line are overbets; below are underbets.</p>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart>
              <XAxis dataKey="x" name="Kelly Optimal %" tick={{ fill: '#6B7280', fontSize: 10 }} label={{ value: 'Kelly Optimal Weight (%)', position: 'insideBottom', offset: -5, fill: '#6B7280', fontSize: 10 }} />
              <YAxis dataKey="y" name="Actual %" tick={{ fill: '#6B7280', fontSize: 10 }} label={{ value: 'Actual Weight (%)', angle: -90, position: 'insideLeft', fill: '#6B7280', fontSize: 10 }} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: '#161820', border: '1px solid #374151', color: '#E5E7EB' }}
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const d = payload[0]?.payload;
                  return <div className="text-xs p-2"><p className="font-mono text-blue-400">{d?.ticker}</p><p>Kelly: {d?.x}%</p><p>Actual: {d?.y}%</p></div>;
                }}
              />
              <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 50, y: 50 }]} stroke="#4B5563" strokeDasharray="4 4" />
              <Scatter data={kellyData}>
                {kellyData.map((d, i) => (
                  <Cell key={i} fill={d.flag === 'OVERBET' ? '#EF4444' : d.flag === 'UNDERBET' ? '#6B7280' : '#3B82F6'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {recency_bias.flag && recency_bias.explanation && (
        <div className="p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg text-yellow-300 text-sm">
          {recency_bias.explanation}
        </div>
      )}
    </div>
  );
}
