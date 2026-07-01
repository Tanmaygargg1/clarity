export default function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h2
        style={{
          fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
          fontSize: '1rem',
          fontWeight: 700,
          color: '#E5E7EB',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          margin: '0 0 0.375rem 0',
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            fontSize: '0.875rem',
            color: '#9CA3AF',
            margin: '0 0 0.75rem 0',
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      )}
      <div
        style={{
          height: '1px',
          backgroundColor: '#1F2128',
          width: '100%',
        }}
      />
    </div>
  );
}
