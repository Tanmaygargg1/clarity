'use client';

import { useState, useRef, useEffect } from 'react';

export default function TickerSearch({ value, onChange, onValidated }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null); // null | 'valid' | 'invalid'
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleChange(e) {
    const val = e.target.value.toUpperCase();
    onChange(val);
    setStatus(null);
    clearTimeout(debounceRef.current);
    if (val.length < 1) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-tickers?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch { setResults([]); }
    }, 300);
  }

  async function handleBlur() {
    if (!value) return;
    try {
      const res = await fetch('/api/validate-ticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: value }),
      });
      const data = await res.json();
      setStatus(data.valid ? 'valid' : 'invalid');
      if (onValidated) onValidated(data);
    } catch { setStatus('invalid'); }
  }

  function selectResult(r) {
    onChange(r.ticker);
    setOpen(false);
    setStatus('valid');
    if (onValidated) onValidated({ valid: true, name: r.name, ticker: r.ticker });
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="AAPL"
          className="w-full bg-[#0D0F12] border border-gray-700 rounded px-3 py-2 font-mono text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
        {status === 'valid' && <span className="absolute right-2 top-2 text-green-400 text-xs">✓</span>}
        {status === 'invalid' && <span className="absolute right-2 top-2 text-red-400 text-xs">✗</span>}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#1e2028] border border-gray-700 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.ticker}
              onMouseDown={() => selectResult(r)}
              className="w-full text-left px-3 py-2 hover:bg-[#2a2d3a] flex justify-between items-center gap-2"
            >
              <span className="font-mono text-sm text-blue-400">{r.ticker}</span>
              <span className="text-xs text-gray-400 truncate">{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
