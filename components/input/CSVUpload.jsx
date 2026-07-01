'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { usePortfolio } from '@/hooks/usePortfolio';
import PortfolioTable from './PortfolioTable';

const HORIZONS = [
  { value: 'short', label: 'Less than 2 years' },
  { value: 'medium', label: '2–10 years' },
  { value: 'long', label: 'More than 10 years' },
];
const BENCHMARKS = [
  { value: 'SPY', label: 'S&P 500 (SPY)' },
  { value: 'VT', label: 'Global Market (VT)' },
  { value: 'SIXTYFORTY', label: '60/40 Portfolio' },
  { value: 'none', label: 'No benchmark' },
];

export default function CSVUpload({ onSubmit }) {
  const [broker, setBroker] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [horizon, setHorizon] = useState('medium');
  const [benchmark, setBenchmark] = useState('SPY');

  const { positions, updatePosition, removePosition, addPosition, toAnalysisInput, initPositions } = usePortfolio();

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/parse-csv', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Parse failed');
      setBroker(data.broker_detected);
      setWarnings(data.warnings || []);
      const parsed = (data.positions || []).map((p, i) => ({
        id: `csv-${i}`,
        ticker: p.ticker,
        amount: p.value > 0 ? p.value.toString() : p.shares.toString(),
        valueType: p.value > 0 ? 'dollars' : 'shares',
        price: null,
        valid: true,
        name: '',
      }));
      initPositions(parsed);
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  }, [initPositions]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'text/plain': ['.txt'] },
    maxFiles: 1,
  });

  function handleSubmit() {
    const analysisPositions = toAnalysisInput();
    if (analysisPositions.length === 0) return;
    onSubmit(analysisPositions, horizon, benchmark);
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-900/10' : 'border-gray-700 hover:border-gray-500'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <p className="text-gray-400">Parsing CSV...</p>
        ) : isDragActive ? (
          <p className="text-blue-400">Drop it here</p>
        ) : (
          <>
            <p className="text-gray-300 mb-1">Drag & drop your brokerage CSV</p>
            <p className="text-gray-600 text-sm">Fidelity · Schwab · Robinhood · Vanguard · Interactive Brokers</p>
            <p className="text-gray-700 text-xs mt-2">or click to browse</p>
          </>
        )}
      </div>

      {uploadError && (
        <div className="mt-3 text-red-400 text-sm bg-red-900/20 border border-red-800 rounded px-3 py-2">
          {uploadError}
        </div>
      )}

      {broker && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-500">Detected:</span>
          <span className="text-xs font-mono bg-blue-900/30 text-blue-400 border border-blue-800 rounded px-2 py-0.5">{broker}</span>
        </div>
      )}

      {warnings.map((w, i) => (
        <div key={i} className="mt-2 text-yellow-400 text-xs bg-yellow-900/20 border border-yellow-800 rounded px-3 py-2">{w}</div>
      ))}

      {positions.length > 0 && (
        <>
          <div className="mt-6">
            <PortfolioTable positions={positions} onUpdate={updatePosition} onRemove={removePosition} />
            <button onClick={addPosition} className="mt-3 text-xs text-gray-600 hover:text-gray-400 border border-dashed border-gray-800 rounded px-3 py-1.5 w-full">
              + Add position
            </button>
          </div>

          <div className="mt-8 space-y-6">
            <div>
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Investment horizon</p>
              <div className="flex gap-2 flex-wrap">
                {HORIZONS.map(h => (
                  <button key={h.value} onClick={() => setHorizon(h.value)}
                    className={`px-4 py-2 rounded-lg text-sm border transition-colors ${horizon === h.value ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Benchmark</p>
              <div className="flex gap-2 flex-wrap">
                {BENCHMARKS.map(b => (
                  <button key={b.value} onClick={() => setBenchmark(b.value)}
                    className={`px-4 py-2 rounded-lg text-sm border transition-colors ${benchmark === b.value ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleSubmit} className="mt-8 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors">
            Confirm & Analyze
          </button>
        </>
      )}
    </div>
  );
}
