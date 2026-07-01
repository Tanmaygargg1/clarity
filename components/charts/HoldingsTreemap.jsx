'use client';

import { ResponsiveTreeMap } from '@nivo/treemap';

const SECTOR_COLORS = {
  Technology: '#3B82F6',
  Healthcare: '#10B981',
  Financials: '#8B5CF6',
  'Consumer Discretionary': '#F59E0B',
  Industrials: '#6B7280',
  'Communication Services': '#EC4899',
  'Consumer Staples': '#14B8A6',
  Energy: '#F97316',
  Utilities: '#A78BFA',
  'Real Estate': '#34D399',
  Materials: '#FB923C',
  Other: '#4B5563',
};

function getColor(name) {
  return SECTOR_COLORS[name] || '#4B5563';
}

export default function HoldingsTreemap({ sectorWeights }) {
  if (!sectorWeights || Object.keys(sectorWeights).length === 0) {
    return (
      <div
        style={{
          height: 350,
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

  const data = {
    name: 'portfolio',
    children: Object.entries(sectorWeights)
      .filter(([, val]) => val > 0)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 10000) / 100, // Convert to percentage
        color: getColor(name),
      })),
  };

  if (data.children.length === 0) {
    return (
      <div
        style={{
          height: 350,
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

  return (
    <div style={{ height: 350 }}>
      <ResponsiveTreeMap
        data={data}
        identity="name"
        value="value"
        valueFormat=".1f"
        margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
        labelSkipSize={20}
        label={(node) => `${node.id}: ${node.value.toFixed(1)}%`}
        labelTextColor="#E5E7EB"
        colors={(node) => getColor(node.id)}
        borderColor="#0D0F12"
        borderWidth={2}
        theme={{
          background: '#161820',
          text: {
            fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
            fontSize: 11,
            fill: '#E5E7EB',
          },
          tooltip: {
            container: {
              backgroundColor: '#1F2128',
              color: '#E5E7EB',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
              border: '1px solid #374151',
              borderRadius: '0.25rem',
              padding: '0.5rem 0.75rem',
            },
          },
        }}
        tooltip={({ node }) => (
          <div>
            <strong>{node.id}</strong>: {node.value.toFixed(1)}%
          </div>
        )}
      />
    </div>
  );
}
