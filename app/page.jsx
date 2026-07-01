import Link from 'next/link';

const layers = [
  {
    id: 'xray',
    name: 'X-Ray',
    desc: 'Decomposes every ETF to its underlying holdings, sectors, and geographies.',
  },
  {
    id: 'risk',
    name: 'Risk',
    desc: 'Separates dollar weight from risk weight. Shows where your volatility actually lives.',
  },
  {
    id: 'factors',
    name: 'Factors',
    desc: 'Regression against market, size, value, momentum, and quality factors.',
  },
  {
    id: 'regime',
    name: 'Regime',
    desc: 'Stress-tests the portfolio across four macro regimes using historical analogs.',
  },
  {
    id: 'behavioral',
    name: 'Behavioral',
    desc: 'Audits for home bias, over-concentration, and position sizing errors.',
  },
  {
    id: 'verdict',
    name: 'Verdict',
    desc: 'Single letter grade, three concrete actions, no platitudes.',
  },
];

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#0D0F12',
        color: '#E5E7EB',
        padding: '0 1rem',
      }}
    >
      {/* Hero */}
      <section
        style={{
          maxWidth: 680,
          margin: '0 auto',
          paddingTop: '5rem',
          paddingBottom: '4rem',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
            fontSize: 'clamp(2.5rem, 8vw, 4rem)',
            fontWeight: 700,
            color: '#E5E7EB',
            margin: '0 0 0.5rem 0',
            letterSpacing: '-0.02em',
          }}
        >
          Clarity
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
            fontSize: '1.125rem',
            color: '#9CA3AF',
            margin: '0 0 1.5rem 0',
          }}
        >
          The truth about your portfolio.
        </p>
        <p
          style={{
            fontSize: '1rem',
            color: '#9CA3AF',
            lineHeight: 1.7,
            margin: '0 0 2.5rem 0',
            maxWidth: 540,
          }}
        >
          Six layers of real financial analysis. No feel-good metrics. Just what your
          portfolio actually is.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link
            href="/input?mode=manual"
            style={{
              display: 'inline-block',
              backgroundColor: '#3B82F6',
              color: '#ffffff',
              fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
              fontSize: '0.875rem',
              fontWeight: 600,
              padding: '0.75rem 1.5rem',
              borderRadius: '0.375rem',
              textDecoration: 'none',
              letterSpacing: '0.01em',
            }}
          >
            Enter Manually
          </Link>
          <Link
            href="/input?mode=csv"
            style={{
              display: 'inline-block',
              backgroundColor: 'transparent',
              color: '#9CA3AF',
              fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
              fontSize: '0.875rem',
              fontWeight: 600,
              padding: '0.75rem 1.5rem',
              borderRadius: '0.375rem',
              textDecoration: 'none',
              border: '1px solid #374151',
              letterSpacing: '0.01em',
            }}
          >
            Upload CSV
          </Link>
        </div>
      </section>

      {/* Six Layer Grid */}
      <section
        style={{
          maxWidth: 900,
          margin: '0 auto',
          paddingBottom: '4rem',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1px',
            backgroundColor: '#1F2128',
            border: '1px solid #1F2128',
            borderRadius: '0.5rem',
            overflow: 'hidden',
          }}
        >
          {layers.map((layer) => (
            <div
              key={layer.id}
              style={{
                backgroundColor: '#161820',
                padding: '1.5rem',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#3B82F6',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem',
                }}
              >
                {layer.name}
              </div>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#9CA3AF',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {layer.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          maxWidth: 900,
          margin: '0 auto',
          paddingBottom: '2rem',
          borderTop: '1px solid #1F2128',
          paddingTop: '1.5rem',
        }}
      >
        <p
          style={{
            fontSize: '0.75rem',
            color: '#6B7280',
            margin: 0,
          }}
        >
          For educational purposes only. Not financial advice.
        </p>
      </footer>
    </main>
  );
}
