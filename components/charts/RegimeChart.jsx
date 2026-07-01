'use client';

import { signedPercent } from '@/utils/formatters';

const REGIME_LAYOUT = [
  { key: 'Growth_LowInflation', label: 'Growth + Low Inflation', col: 1, row: 1 },
  { key: 'Growth_HighInflation', label: 'Growth + High Inflation', col: 2, row: 1 },
  { key: 'Contraction_LowInflation', label: 'Contraction + Low Inflation', col: 1, row: 2 },
  { key: 'Stagflation', label: 'Stagflation', col: 2, row: 2 },
];

function returnColor(val) {
  if (val == null || isNaN(val)) return '#9CA3AF';
  if (val >= 0.05) return '#4ADE80';
  if (val >= 0) return '#9CA3AF';
  if (val >= -0.1) return '#FBBF24';
  return '#F87171';
}

export default function RegimeChart({ regimePerformance, regimeProbabilities, mostLikelyRegime }) {
  const hasData =
    regimePerformance && Object.keys(regimePerformance).length > 0;

  if (!hasData) {
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
    <div>
      {/* Header labels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          marginBottom: '0.5rem',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            fontSize: '0.7rem',
            color: '#6B7280',
            fontFamily: 'monospace',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Low Inflation
        </div>
        <div
          style={{
            textAlign: 'center',
            fontSize: '0.7rem',
            color: '#6B7280',
            fontFamily: 'monospace',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          High Inflation
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: '0.75rem',
        }}
      >
        {REGIME_LAYOUT.map((regime) => {
          const perf = regimePerformance?.[regime.key];
          const prob = regimeProbabilities?.[regime.key];
          const isLikely = mostLikelyRegime === regime.key;
          const ret = perf?.portfolioReturn ?? perf?.portfolio_return ?? perf?.return ?? null;
          const benchmarkRet =
            perf?.benchmarkReturn ?? perf?.benchmark_return ?? null;

          return (
            <div
              key={regime.key}
              style={{
                backgroundColor: '#1A1D27',
                border: isLikely ? '2px solid #3B82F6' : '1px solid #2D3139',
                borderRadius: '0.5rem',
                padding: '1rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.7rem',
                  color: isLikely ? '#3B82F6' : '#6B7280',
                  fontFamily: 'monospace',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem',
                  fontWeight: isLikely ? 700 : 400,
                }}
              >
                {regime.key.includes('growth') ? 'Growth' : 'Contraction'}
                {isLikely && (
                  <span style={{ marginLeft: '0.5rem', color: '#3B82F6' }}>
                    &#x25CF; Current
                  </span>
                )}
              </div>

              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: returnColor(ret),
                  marginBottom: '0.25rem',
                }}
              >
                {ret != null ? signedPercent(ret) : '—'}
              </div>

              {benchmarkRet != null && (
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#9CA3AF',
                    fontFamily: 'monospace',
                    marginBottom: '0.25rem',
                  }}
                >
                  Benchmark: {signedPercent(benchmarkRet)}
                </div>
              )}

              {prob != null && (
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#6B7280',
                    fontFamily: 'monospace',
                  }}
                >
                  {Math.round(prob * 100)}% probability
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
