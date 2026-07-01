'use client';

import { useState, useContext } from 'react';
import { useAnalysis as useAnalysisContext } from '@/context/AnalysisContext';

export function useAnalysisRunner() {
  const { setResults, setLoading, setError } = useAnalysisContext();
  const [progress, setProgress] = useState(0);

  async function runAnalysis(portfolioInput) {
    setLoading(true);
    setError(null);
    setProgress(0);

    const steps = [
      'Fetching price data...',
      'Decomposing ETF holdings...',
      'Running factor regression...',
      'Stress testing regimes...',
      'Generating verdict...',
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 4, 90));
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
    }, 2000);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portfolioInput),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Analysis failed (${res.status})`);
      }

      const data = await res.json();
      clearInterval(interval);
      setProgress(100);
      setResults(data);
      setLoading(false);
      return data;
    } catch (err) {
      clearInterval(interval);
      setError(err.message || 'Analysis failed. Please try again.');
      setLoading(false);
      setProgress(0);
      throw err;
    }
  }

  return { runAnalysis, progress };
}
