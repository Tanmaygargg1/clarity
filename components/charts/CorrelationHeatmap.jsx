'use client';

import { useRef, useEffect } from 'react';

export default function CorrelationHeatmap({ matrix }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Clear previous SVG
    container.innerHTML = '';

    if (!matrix || Object.keys(matrix).length === 0) {
      const msg = document.createElement('div');
      msg.style.cssText =
        'display:flex;align-items:center;justify-content:center;height:100%;color:#6B7280;font-size:0.875rem;font-family:monospace;';
      msg.textContent = 'Insufficient data';
      container.appendChild(msg);
      return;
    }

    const tickers = Object.keys(matrix);
    const n = tickers.length;
    if (n === 0) return;

    // Layout constants
    const margin = { top: 20, right: 20, bottom: 60, left: 60 };
    const containerWidth = container.clientWidth || 400;
    const cellSize = Math.min(Math.floor((containerWidth - margin.left - margin.right) / n), 60);
    const width = cellSize * n + margin.left + margin.right;
    const height = cellSize * n + margin.top + margin.bottom;

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.overflow = 'visible';

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${margin.left},${margin.top})`);
    svg.appendChild(g);

    // Color scale: correlation -1 → green, 0 → white, 1 → red
    function corrColor(val) {
      if (val == null || isNaN(val)) return '#374151';
      const v = Math.max(-1, Math.min(1, val));
      if (v >= 0) {
        // 0 → white, 1 → red
        const t = v;
        const r = Math.round(255);
        const gr = Math.round(255 * (1 - t));
        const b = Math.round(255 * (1 - t));
        return `rgb(${r},${gr},${b})`;
      } else {
        // -1 → green, 0 → white
        const t = -v;
        const r = Math.round(255 * (1 - t));
        const gr = Math.round(255);
        const b = Math.round(255 * (1 - t));
        return `rgb(${r},${gr},${b})`;
      }
    }

    function textColorForCorr(val) {
      if (val == null || isNaN(val)) return '#E5E7EB';
      const absV = Math.abs(val);
      // Use dark text when cell is light (near 0), light text when cell is saturated
      return absV > 0.5 ? '#1F2128' : '#374151';
    }

    // Create tooltip div
    const tooltip = document.createElement('div');
    tooltip.style.cssText = [
      'position:fixed',
      'background:#1F2128',
      'color:#E5E7EB',
      'border:1px solid #374151',
      'border-radius:4px',
      'padding:6px 10px',
      'font-family:monospace',
      'font-size:12px',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity 0.1s',
      'z-index:9999',
    ].join(';');
    document.body.appendChild(tooltip);

    // Draw cells
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const rowTicker = tickers[row];
        const colTicker = tickers[col];
        const val =
          matrix[rowTicker]?.[colTicker] ?? matrix[colTicker]?.[rowTicker] ?? null;

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', col * cellSize);
        rect.setAttribute('y', row * cellSize);
        rect.setAttribute('width', cellSize - 1);
        rect.setAttribute('height', cellSize - 1);
        rect.setAttribute('fill', corrColor(val));
        rect.style.cursor = 'default';

        rect.addEventListener('mouseenter', (e) => {
          tooltip.style.opacity = '1';
          tooltip.textContent =
            val != null
              ? `${rowTicker} / ${colTicker}: ${val.toFixed(3)}`
              : `${rowTicker} / ${colTicker}: N/A`;
        });
        rect.addEventListener('mousemove', (e) => {
          tooltip.style.left = e.clientX + 12 + 'px';
          tooltip.style.top = e.clientY - 28 + 'px';
        });
        rect.addEventListener('mouseleave', () => {
          tooltip.style.opacity = '0';
        });

        g.appendChild(rect);

        // Value text inside cell if cell is big enough
        if (cellSize >= 36 && val != null) {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', col * cellSize + cellSize / 2 - 0.5);
          text.setAttribute('y', row * cellSize + cellSize / 2 + 4);
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('font-size', '10');
          text.setAttribute('font-family', 'monospace');
          text.setAttribute('fill', textColorForCorr(val));
          text.setAttribute('pointer-events', 'none');
          text.textContent = val.toFixed(2);
          g.appendChild(text);
        }
      }
    }

    // X axis labels (bottom)
    tickers.forEach((ticker, i) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', i * cellSize + cellSize / 2);
      text.setAttribute('y', n * cellSize + 14);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '10');
      text.setAttribute('font-family', 'monospace');
      text.setAttribute('fill', '#9CA3AF');
      text.textContent = ticker;
      g.appendChild(text);
    });

    // Y axis labels (left)
    tickers.forEach((ticker, i) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', -6);
      text.setAttribute('y', i * cellSize + cellSize / 2 + 4);
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('font-size', '10');
      text.setAttribute('font-family', 'monospace');
      text.setAttribute('fill', '#9CA3AF');
      text.textContent = ticker;
      g.appendChild(text);
    });

    container.appendChild(svg);

    return () => {
      if (document.body.contains(tooltip)) {
        document.body.removeChild(tooltip);
      }
    };
  }, [matrix]);

  // ResizeObserver to re-render on width change
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      // Trigger re-render by dispatching a custom event — handled via the main effect
      // Simple approach: force re-run by clearing and redrawing
      const event = new Event('resize-redraw');
      containerRef.current && containerRef.current.dispatchEvent(event);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        minHeight: 200,
        backgroundColor: '#1A1D27',
        borderRadius: '0.375rem',
        overflow: 'hidden',
      }}
    />
  );
}
