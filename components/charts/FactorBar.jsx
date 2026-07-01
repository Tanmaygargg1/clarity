'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

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
      <div style={{ color: val >= 0 ? '#60A5FA' : '#F87171' }}>
        {val != null ? val.toFixed(3) : '—'}
      </div>
    </div>
  );
};

function BarSection({ title, data, valueKey = 'value', significantKey = 'significant' }) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          backgroundColor: '#1A1D27',
          borderRadius: '0.375rem',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6B7280',
          fontSize: '0.875rem',
          fontFamily: 'monospace',
        }}
      >
        Insufficient data
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#9CA3AF',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
          marginBottom: '0.75rem',
        }}
      >
        {title}
      </div>
      <ResponsiveContainer width="100%" height={data.length * 36 + 20}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, left: 16, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#374151' }}
            tickLine={false}
            tickFormatter={(v) => v.toFixed(2)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={({ x, y, payload }) => {
              const item = data.find((d) => d.name === payload.value);
              return (
                <text
                  x={x}
                  y={y}
                  dy={4}
                  textAnchor="end"
                  fontSize={10}
                  fontFamily="monospace"
                  fill={item?.[significantKey] ? '#E5E7EB' : '#6B7280'}
                >
                  {payload.value}
                  {item?.[significantKey] ? '*' : ''}
                </text>
              );
            }}
            width={90}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <ReferenceLine x={0} stroke="#374151" />
          <Bar dataKey={valueKey} radius={[0, 2, 2, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry[valueKey] >= 0 ? '#3B82F6' : '#EF4444'}
                opacity={entry[significantKey] ? 1 : 0.5}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function FactorBar({ factorLoadings, returnAttribution }) {
  const hasLoadings = factorLoadings && factorLoadings.length > 0;
  const hasAttribution = returnAttribution && returnAttribution.length > 0;

  if (!hasLoadings && !hasAttribution) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#6B7280',
          fontSize: '0.875rem',
          fontFamily: 'monospace',
        }}
      >
        Insufficient data
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
      {hasLoadings && (
        <BarSection
          title="Factor Loadings"
          data={factorLoadings}
          valueKey="loading"
          significantKey="significant"
        />
      )}
      {hasAttribution && (
        <BarSection
          title="Return Attribution"
          data={returnAttribution}
          valueKey="attribution"
          significantKey="significant"
        />
      )}
    </div>
  );
}
