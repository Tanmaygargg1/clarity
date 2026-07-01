const SEVERITY_STYLES = {
  high: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#F87171',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  medium: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    color: '#FBBF24',
    border: '1px solid rgba(251, 191, 36, 0.3)',
  },
  low: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
    color: '#9CA3AF',
    border: '1px solid rgba(107, 114, 128, 0.3)',
  },
};

export default function FlagBadge({ flag, severity = 'medium' }) {
  const style = SEVERITY_STYLES[severity] || SEVERITY_STYLES.medium;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.25rem 0.625rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
        letterSpacing: '0.02em',
        ...style,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: style.color,
          flexShrink: 0,
        }}
      />
      {flag}
    </span>
  );
}
