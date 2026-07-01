'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ManualEntry from '@/components/input/ManualEntry';
import CSVUpload from '@/components/input/CSVUpload';
import { useAnalysis } from '@/context/AnalysisContext';
import { useAnalysisRunner } from '@/hooks/useAnalysis';

const STEP_LABELS = [
  'Fetching price data...',
  'Decomposing ETF holdings...',
  'Running factor regression...',
  'Stress testing regimes...',
  'Generating verdict...',
];

function InputContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') || 'manual';
  const [mode, setMode] = useState(initialMode);
  const [stepIdx, setStepIdx] = useState(0);
  const { loading, error } = useAnalysis();
  const { runAnalysis, progress } = useAnalysisRunner();

  async function handleSubmit(positions, horizon, benchmark) {
    setStepIdx(0);
    const interval = setInterval(() => setStepIdx(i => Math.min(i + 1, STEP_LABELS.length - 1)), 3000);
    try {
      await runAnalysis({ positions, horizon, benchmark });
      clearInterval(interval);
      router.push('/results');
    } catch {
      clearInterval(interval);
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0F12] text-gray-100">
      {loading && (
        <div className="fixed inset-0 bg-[#0D0F12]/95 z-50 flex flex-col items-center justify-center gap-6">
          <p className="font-mono text-blue-400 text-lg">{STEP_LABELS[stepIdx]}</p>
          <div className="w-80 bg-gray-800 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-gray-500 text-sm font-mono">{progress}%</p>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <a href="/" className="text-gray-500 text-sm hover:text-gray-300">← Clarity</a>
        </div>

        <div className="flex gap-1 mb-8 bg-[#161820] rounded-lg p-1 w-fit">
          {['manual', 'csv'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === m ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {m === 'manual' ? 'Enter Manually' : 'Upload CSV'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {mode === 'manual' ? (
          <ManualEntry onSubmit={handleSubmit} />
        ) : (
          <CSVUpload onSubmit={handleSubmit} />
        )}
      </div>
    </div>
  );
}

export default function InputPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0D0F12]" />}>
      <InputContent />
    </Suspense>
  );
}
