'use client';

import { gradeColor, formatPercent } from '@/utils/formatters';

export default function Verdict({ data }) {
  if (!data) return <div className="text-gray-500 text-sm">No verdict available.</div>;

  const { grade, overall_score, dimension_scores = {}, headline, key_findings = [], three_actions = [] } = data;

  const dimLabels = {
    diversification: 'Diversification',
    risk_efficiency: 'Risk Efficiency',
    factor_quality: 'Factor Quality',
    regime_resilience: 'Regime Resilience',
    behavioral: 'Behavioral',
  };

  return (
    <div>
      <div className="flex items-end gap-6 mb-8">
        <span className={`font-mono font-bold leading-none ${gradeColor(grade)}`} style={{ fontSize: '6rem' }}>{grade}</span>
        <div>
          <div className="font-mono text-4xl text-gray-200">{overall_score}</div>
          <div className="text-gray-500 text-sm">/ 100</div>
        </div>
      </div>

      {headline && (
        <p className="text-gray-200 text-lg mb-8 leading-relaxed border-l-2 border-blue-500 pl-4">{headline}</p>
      )}

      <div className="mb-8 space-y-3">
        {Object.entries(dimLabels).map(([key, label]) => {
          const score = dimension_scores[key] ?? 0;
          return (
            <div key={key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">{label}</span>
                <span className="font-mono text-gray-300">{score}</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full">
                <div
                  className={`h-1.5 rounded-full ${score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-800 pt-6 mb-6">
        <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-4">Key Findings</h3>
        <ol className="space-y-3">
          {key_findings.map((f, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-blue-400 text-sm shrink-0">{i + 1}.</span>
              <span className="text-gray-300 text-sm leading-relaxed">{f}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="border-t border-gray-800 pt-6">
        <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-4">Three Actions</h3>
        <ol className="space-y-4">
          {three_actions.map((a, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-blue-400 text-sm shrink-0">{i + 1}.</span>
              <span className="text-gray-300 text-sm leading-relaxed">{a}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
