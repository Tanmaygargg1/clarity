'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalysis } from '@/context/AnalysisContext';
import Verdict from '@/components/analysis/Verdict';
import XRay from '@/components/analysis/XRay';
import RiskDecomposition from '@/components/analysis/RiskDecomposition';
import FactorAnalysis from '@/components/analysis/FactorAnalysis';
import RegimeStressTest from '@/components/analysis/RegimeStressTest';
import BehavioralAudit from '@/components/analysis/BehavioralAudit';

export default function ResultsPage() {
  const router = useRouter();
  const { results } = useAnalysis();

  useEffect(() => {
    if (!results) router.push('/input');
  }, [results, router]);

  if (!results) return <div className="min-h-screen bg-[#0D0F12]" />;

  const sections = [
    { component: Verdict, data: results.verdict, key: 'verdict' },
    { component: XRay, data: results.xray, key: 'xray' },
    { component: RiskDecomposition, data: results.risk, key: 'risk' },
    { component: FactorAnalysis, data: results.factors, key: 'factors' },
    { component: RegimeStressTest, data: results.regime, key: 'regime' },
    { component: BehavioralAudit, data: results.behavioral, key: 'behavioral' },
  ];

  return (
    <div className="min-h-screen bg-[#0D0F12] text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-mono text-xl text-blue-400">Clarity</h1>
          <button
            onClick={() => router.push('/input')}
            className="text-sm text-gray-400 hover:text-gray-200 border border-gray-700 px-4 py-2 rounded-lg"
          >
            Start Over
          </button>
        </div>

        {sections.map(({ component: Component, data, key }) => (
          <div key={key} className="bg-[#161820] rounded-lg p-6 mb-6">
            <Component data={data} />
          </div>
        ))}

        <p className="text-center text-gray-600 text-xs py-8">
          For educational purposes only. Not financial advice. | Clarity v1.0
        </p>
      </div>
    </div>
  );
}
