'use client';

import { useState, useCallback } from 'react';

let nextId = 4;

function createEmptyPosition(id) {
  return {
    id,
    ticker: '',
    amount: '',
    valueType: 'shares', // 'shares' | 'dollars' | 'percent'
    price: null,
    valid: null, // null = unchecked, true = valid, false = invalid
    name: '',
  };
}

const INITIAL_POSITIONS = [
  createEmptyPosition(1),
  createEmptyPosition(2),
  createEmptyPosition(3),
];

export function usePortfolio(initialPositions) {
  const [positions, setPositions] = useState(
    initialPositions && initialPositions.length > 0
      ? initialPositions.map((p, i) => ({
          id: i + 1,
          ticker: p.ticker || '',
          amount: p.amount != null ? String(p.amount) : '',
          valueType: p.valueType || 'shares',
          price: p.price || null,
          valid: p.valid != null ? p.valid : null,
          name: p.name || '',
        }))
      : INITIAL_POSITIONS
  );

  const addPosition = useCallback(() => {
    const id = nextId++;
    setPositions((prev) => [...prev, createEmptyPosition(id)]);
  }, []);

  const removePosition = useCallback((id) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updatePosition = useCallback((id, field, value) => {
    setPositions((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };
        // Reset validation when ticker changes
        if (field === 'ticker') {
          updated.valid = null;
          updated.name = '';
          updated.price = null;
        }
        return updated;
      })
    );
  }, []);

  const validateTicker = useCallback(async (id, ticker) => {
    if (!ticker || ticker.trim() === '') return;
    try {
      const res = await fetch('/api/validate-ticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.trim().toUpperCase() }),
      });
      const data = await res.json();
      setPositions((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          return {
            ...p,
            valid: data.valid === true,
            name: data.name || '',
            price: data.price || null,
          };
        })
      );
      return data;
    } catch (err) {
      console.error('validateTicker error:', err);
      setPositions((prev) =>
        prev.map((p) => (p.id !== id ? p : { ...p, valid: false }))
      );
      return { valid: false };
    }
  }, []);

  // Compute dollar values for each position
  function getDollarValue(position) {
    const amount = parseFloat(position.amount);
    if (isNaN(amount) || amount <= 0) return 0;
    if (position.valueType === 'dollars') return amount;
    if (position.valueType === 'shares') {
      const price = position.price;
      if (!price) return 0;
      return amount * price;
    }
    if (position.valueType === 'percent') return amount; // treat as raw percent for now
    return 0;
  }

  const totalValue = positions.reduce((sum, p) => {
    if (p.valueType === 'percent') return sum;
    return sum + getDollarValue(p);
  }, 0);

  const totalPercent = positions.reduce((sum, p) => {
    if (p.valueType === 'percent') {
      const v = parseFloat(p.amount);
      return sum + (isNaN(v) ? 0 : v);
    }
    return sum;
  }, 0);

  function toAnalysisInput() {
    // Compute weight for each position
    const validPositions = positions.filter(
      (p) => p.ticker.trim() !== '' && p.valid !== false
    );

    if (validPositions.length === 0) return [];

    // Determine if all are percent mode
    const allPercent = validPositions.every((p) => p.valueType === 'percent');

    let rawWeights;
    if (allPercent) {
      rawWeights = validPositions.map((p) => ({
        ticker: p.ticker.trim().toUpperCase(),
        raw: parseFloat(p.amount) || 0,
      }));
    } else {
      rawWeights = validPositions.map((p) => ({
        ticker: p.ticker.trim().toUpperCase(),
        raw: getDollarValue(p),
      }));
    }

    const total = rawWeights.reduce((s, r) => s + r.raw, 0);
    if (total === 0) return [];

    return rawWeights.map((r) => ({
      ticker: r.ticker,
      weight: r.raw / total,
    }));
  }

  const initPositions = useCallback((newPositions) => {
    setPositions(newPositions);
  }, []);

  return {
    positions,
    addPosition,
    removePosition,
    updatePosition,
    validateTicker,
    initPositions,
    totalValue,
    totalPercent,
    toAnalysisInput,
  };
}
