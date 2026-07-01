'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const val = payload[0]?.value;
  return (
    <div
      style={{
        backgroundColor: '#1F2128',
        border: '1px solid #374151',
        borderRadius: '0.25rem',
        padding: '0.5rem 0.75rem',
        fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
        fontSize: '0.75rem',
        color: '#E5E7EB',
      }}
    >
      <div style={{ color: '#9CA3AF', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ color: val < 0 ? '#F87171' : '#9CA3AF' }}>
        {val != null ? `${(val * 100).toFixed(2)}%` : '—'}
      </div>
    </div>
  );
};

export default function DrawdownChart({ drawdownHistory }) {
  if (!drawdownHistory || drawdownHistory.length === 0) {
    return (
      <div
        style={{
          height: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6B7280',
          fontSize: '0.875rem',
          fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
          backgroundColor: '#1A1D27',
          borderRadius: '0.375rem',
        }}
      >
        Insufficient data
      </div>
    );
  }

  // Downsample to ~200 points for performance
  const data =
    drawdownHistory.length > 200
      ? drawdownHistory.filter((_, i) => i % Math.ceil(drawdownHistory.length / 200) === 0)
      : drawdownHistory;

  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="drawdownFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#374151' }}
            tickLine={false}
            tickFormatter={(d) => {
              if (!d) return '';
              const parts = String(d).split('-');
              return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : d;
            }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#374151' }}
            tickLine={false}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            domain={['auto', 0]}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#EF4444"
            strokeWidth={1.5}
            fill="url(#drawdownFill)"
            dot={false}
            activeDot={{ r: 3, fill: '#EF4444' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
