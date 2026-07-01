'use client';

import TickerSearch from './TickerSearch';

const VALUE_TYPES = ['dollars', 'shares', 'percent'];

export default function PortfolioTable({ positions, onUpdate, onRemove }) {
  const totalPercent = positions.reduce((s, p) => s + (p.valueType === 'percent' ? (parseFloat(p.amount) || 0) : 0), 0);
  const hasPercentMode = positions.some(p => p.valueType === 'percent');
  const showPercentWarning = hasPercentMode && Math.abs(totalPercent - 100) > 0.5;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs border-b border-gray-800">
              <th className="text-left py-2 pr-3 font-normal">Ticker</th>
              <th className="text-left py-2 pr-3 font-normal">Type</th>
              <th className="text-left py-2 pr-3 font-normal">Amount</th>
              <th className="text-left py-2 pr-3 font-normal">Price</th>
              <th className="text-right py-2 font-normal">Remove</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => (
              <tr key={pos.id} className="border-b border-gray-800/50">
                <td className="py-2 pr-3 w-36">
                  <TickerSearch
                    value={pos.ticker}
                    onChange={(val) => onUpdate(pos.id, 'ticker', val)}
                    onValidated={(data) => {
                      onUpdate(pos.id, 'valid', data.valid);
                      onUpdate(pos.id, 'name', data.name || '');
                      if (data.price) onUpdate(pos.id, 'price', data.price);
                    }}
                  />
                </td>
                <td className="py-2 pr-3">
                  <button
                    onClick={() => {
                      const idx = VALUE_TYPES.indexOf(pos.valueType);
                      onUpdate(pos.id, 'valueType', VALUE_TYPES[(idx + 1) % VALUE_TYPES.length]);
                    }}
                    className="text-xs border border-gray-700 rounded px-2 py-1 text-gray-400 hover:text-gray-200 hover:border-gray-500 font-mono"
                  >
                    {pos.valueType === 'dollars' ? '$' : pos.valueType === 'shares' ? 'shares' : '%'}
                  </button>
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    value={pos.amount}
                    onChange={(e) => onUpdate(pos.id, 'amount', e.target.value)}
                    placeholder="0"
                    className="w-28 bg-[#0D0F12] border border-gray-700 rounded px-2 py-1 font-mono text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                  />
                </td>
                <td className="py-2 pr-3 font-mono text-xs text-gray-500">
                  {pos.price ? `$${pos.price.toLocaleString()}` : '—'}
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => onRemove(pos.id)}
                    className="text-gray-600 hover:text-red-400 text-lg leading-none"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPercentWarning && (
        <div className="mt-3 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800 rounded px-3 py-2">
          Percentages sum to {totalPercent.toFixed(1)}% — they will be normalized to 100% on analysis.
        </div>
      )}
    </div>
  );
}
