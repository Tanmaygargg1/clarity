/**
 * Format a decimal as a percentage string.
 * @param {number} val - e.g. 0.187
 * @param {number} decimals
 * @returns {string} "18.7%"
 */
export function formatPercent(val, decimals = 1) {
  if (val == null || isNaN(val)) return '—';
  return (val * 100).toFixed(decimals) + '%';
}

/**
 * Format a number to fixed decimal places.
 * @param {number} val
 * @param {number} decimals
 * @returns {string}
 */
export function formatDecimal(val, decimals = 2) {
  if (val == null || isNaN(val)) return '—';
  return Number(val).toFixed(decimals);
}

/**
 * Format a number as a compact currency string.
 * @param {number} val - e.g. 1234567
 * @returns {string} "$1.23M"
 */
export function formatCurrency(val) {
  if (val == null || isNaN(val)) return '—';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${abs.toFixed(2)}`;
}

/**
 * Format a decimal as a signed percentage string.
 * @param {number} val - e.g. 0.034
 * @returns {string} "+3.4%" or "-2.0%"
 */
export function signedPercent(val) {
  if (val == null || isNaN(val)) return '—';
  const pct = val * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

/**
 * Return a Tailwind text color class based on letter grade.
 * @param {string} grade - 'A', 'B', 'C', 'D', or 'F'
 * @returns {string} Tailwind class
 */
export function gradeColor(grade) {
  if (!grade) return 'text-gray-400';
  const g = grade.toUpperCase().trim();
  if (g.startsWith('A')) return 'text-green-400';
  if (g.startsWith('B')) return 'text-blue-400';
  if (g.startsWith('C')) return 'text-yellow-400';
  if (g.startsWith('D') || g.startsWith('F')) return 'text-red-400';
  return 'text-gray-400';
}

/**
 * Return a Tailwind text color class based on a 0–100 score.
 * @param {number} score
 * @returns {string} Tailwind class
 */
export function scoreColor(score) {
  if (score == null || isNaN(score)) return 'text-gray-400';
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-blue-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

/**
 * Return an inline style color based on 0–100 score (for use without Tailwind).
 * @param {number} score
 * @returns {string} CSS color value
 */
export function scoreColorHex(score) {
  if (score == null || isNaN(score)) return '#9CA3AF';
  if (score >= 80) return '#4ADE80';
  if (score >= 60) return '#60A5FA';
  if (score >= 40) return '#FBBF24';
  return '#F87171';
}

/**
 * Return an inline style color based on letter grade.
 * @param {string} grade
 * @returns {string} CSS color value
 */
export function gradeColorHex(grade) {
  if (!grade) return '#9CA3AF';
  const g = grade.toUpperCase().trim();
  if (g.startsWith('A')) return '#4ADE80';
  if (g.startsWith('B')) return '#60A5FA';
  if (g.startsWith('C')) return '#FBBF24';
  if (g.startsWith('D') || g.startsWith('F')) return '#F87171';
  return '#9CA3AF';
}
