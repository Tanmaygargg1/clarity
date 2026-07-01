'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AnalysisContext = createContext(null);

export function AnalysisProvider({ children }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Persist results to sessionStorage
  useEffect(() => {
    if (results) {
      try {
        sessionStorage.setItem('clarity_results', JSON.stringify(results));
      } catch (e) {
        console.error('Failed to persist results to sessionStorage:', e);
      }
    }
  }, [results]);

  // Restore on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('clarity_results');
      if (saved) {
        setResults(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to restore results from sessionStorage:', e);
    }
  }, []);

  return (
    <AnalysisContext.Provider
      value={{ results, setResults, loading, setLoading, error, setError }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export const useAnalysis = () => useContext(AnalysisContext);
