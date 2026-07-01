'use client';

import SectionHeader from '@/components/ui/SectionHeader';
import FactorBar from '@/components/charts/FactorBar';
import { formatPercent, formatDecimal } from '@/utils/formatters';

export default function FactorAnalysis({ data }) {
  if (!data) return <div className="text-gray-500 text-sm">Insufficient data.</div>;

  const { alpha_annual = 0, alpha_pvalue = 1, r_squared = 0, factor_loadings = {}, return_attribution = {}, blended_expense_ratio = 0, factor_replication_cost = 0.001, excess_cost = 0 } = data;

  const alphaInsignificant = alpha_pvalue > 0.05;

  return (
    <div>
      <SectionHeader title="Factor Analysis" subtitle="What actually explains your returns" />

      {alphaInsignificant && (
        <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
          <p className="text-yellow-300 text-sm">
            Your alpha is not statistically significant (p={alpha_pvalue.toFixed(2)}). Factor models explain{' '}
            <span className="font-mono">{formatPercent(r_squared)}</span> of your returns — you are paying for market exposure, not skill.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#0D0F12] border border-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Alpha (annual)</p>
          <p className={`font-mono text-lg ${alpha_annual > 0 && !alphaInsignificant ? 'text-green-400' : 'text-gray-400'}`}>{formatPercent(alpha_annual)}</p>
          <p className="text-xs text-gray-600">p={alpha_pvalue.toFixed(3)}</p>
        </div>
        <div className="bg-[#0D0F12] border border-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">R²</p>
          <p className="font-mono text-lg text-gray-300">{formatPercent(r_squared)}</p>
          <p className="text-xs text-gray-600">factor explained</p>
        </div>
        <div className="bg-[#0D0F12] border border-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Sortino</p>
          <p className="font-mono text-lg text-gray-300">{formatDecimal(data.sortino ?? 0)}</p>
          <p className="text-xs text-gray-600">downside-adj return</p>
        </div>
      </div>

      <div className="mb-6">
        <FactorBar factorLoadings={factor_loadings} returnAttribution={return_attribution} />
      </div>

      {(blended_expense_ratio > 0 || excess_cost > 0) && (
        <div className="bg-[#0D0F12] border border-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Cost Analysis</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Your portfolio cost</span>
              <span className="font-mono text-gray-300">{formatPercent(blended_expense_ratio)}/yr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Factor replication cost</span>
              <span className="font-mono text-green-400">{formatPercent(factor_replication_cost)}/yr</span>
            </div>
            <div className="flex justify-between border-t border-gray-800 pt-2">
              <span className="text-gray-400">Excess cost</span>
              <span className={`font-mono ${excess_cost > 0.005 ? 'text-red-400' : 'text-gray-300'}`}>{formatPercent(excess_cost)}/yr</span>
            </div>
            {excess_cost > 0 && (
              <p className="text-xs text-gray-600 mt-2">
                = ${Math.round(excess_cost * 100000).toLocaleString()} extra per year on a $100,000 portfolio
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
