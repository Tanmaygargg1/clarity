const VARIANT_COLORS = {
  good: '#4ADE80',
  warn: '#FBBF24',
  bad: '#F87171',
  neutral: '#6B7280',
};

export default function ScoreCard({ label, value, subtext, variant = 'neutral' }) {
  const borderColor = VARIANT_COLORS[variant] || VARIANT_COLORS.neutral;

  return (
    <div
      style={{
        backgroundColor: '#1A1D27',
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: '0.375rem',
        padding: '1rem 1.25rem',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          color: '#6B7280',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '0.375rem',
          fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: borderColor,
          lineHeight: 1.1,
          marginBottom: subtext ? '0.25rem' : 0,
        }}
      >
        {value}
      </div>
      {subtext && (
        <div
          style={{
            fontSize: '0.75rem',
            color: '#9CA3AF',
            lineHeight: 1.4,
          }}
        >
          {subtext}
        </div>
      )}
    </div>
  );
}
