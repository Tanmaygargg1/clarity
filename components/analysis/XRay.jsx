'use client';

import HoldingsTreemap from '@/components/charts/HoldingsTreemap';
import SectionHeader from '@/components/ui/SectionHeader';
import { formatPercent } from '@/utils/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function XRay({ data }) {
  if (!data) return <div className="text-gray-500 text-sm">Insufficient data.</div>;

  const { effective_holdings = [], top_10_concentration = 0, sector_weights = {}, geography = {}, market_cap = {}, unique_underlying_stocks = 0 } = data;

  const geoData = Object.entries(geography).map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: Math.round(v * 1000) / 10 }));
  const capData = Object.entries(market_cap).map(([k, v]) => ({ name: k, value: Math.round(v * 1000) / 10 }));
  const CAP_COLORS = { Mega: '#3B82F6', Large: '#6366F1', Mid: '#8B5CF6', Small: '#A78BFA' };

  return (
    <div>
      <SectionHeader title="Portfolio X-Ray" subtitle="What you actually own under the ticker labels" />

      <div className="bg-[#0D0F12] rounded-lg p-4 mb-6 border border-gray-800">
        <p className="text-gray-300 text-sm">
          You hold <span className="text-blue-400 font-mono">{effective_holdings.length}</span> positions with effective exposure to{' '}
          <span className="text-blue-400 font-mono">{unique_underlying_stocks}</span> underlying stocks.{' '}
          Top 10 holdings represent <span className={`font-mono ${top_10_concentration > 0.6 ? 'text-red-400' : 'text-yellow-400'}`}>{formatPercent(top_10_concentration)}</span> of the portfolio.
        </p>
      </div>

      {Object.keys(sector_weights).length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Sector Breakdown</p>
          <HoldingsTreemap sectorWeights={sector_weights} />
          <p className="text-xs text-gray-600 mt-2">Sector breakdown by effective portfolio weight.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-6">
        {geoData.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Geography</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={geoData} layout="vertical">
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} width={110} />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: '#161820', border: '1px solid #374151', color: '#E5E7EB' }} />
                <Bar dataKey="value" fill="#3B82F6" radius={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {capData.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Market Cap</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={capData} layout="vertical">
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} width={60} />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: '#161820', border: '1px solid #374151', color: '#E5E7EB' }} />
                <Bar dataKey="value" radius={2}>
                  {capData.map((entry) => <Cell key={entry.name} fill={CAP_COLORS[entry.name] || '#3B82F6'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {effective_holdings.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Top 10 Effective Holdings</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-600 text-xs border-b border-gray-800">
                <th className="text-left py-2 font-normal">Ticker</th>
                <th className="text-right py-2 font-normal">Effective Weight</th>
                <th className="text-left py-2 pl-4 font-normal">Source</th>
              </tr>
            </thead>
            <tbody>
              {effective_holdings.slice(0, 10).map((h) => (
                <tr key={h.ticker} className="border-b border-gray-800/50">
                  <td className="py-2 font-mono text-blue-400">{h.ticker}</td>
                  <td className="py-2 text-right font-mono text-gray-300">{formatPercent(h.weight)}</td>
                  <td className="py-2 pl-4 text-xs text-gray-500">
                    {h.sector || h.geography || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
