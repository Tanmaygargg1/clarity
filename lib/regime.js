import { getPriceHistory } from './dataFetcher.js';
import { calculatePortfolioReturns } from './risk.js';

/**
 * Historical market regime date ranges.
 * Stagflation is pre-Yahoo Finance data — handled analytically.
 */
const REGIMES = {
  Growth_LowInflation: {
    label: 'Growth / Low Inflation (2010–2019)',
    start: '2010-01-01',
    end: '2019-12-31',
    description: 'Long bull market with low rates and low inflation',
    analytical: false,
  },
  Growth_HighInflation: {
    label: 'Growth / High Inflation (2021 H1)',
    start: '2021-01-01',
    end: '2022-06-30',
    description: 'Post-COVID recovery with rising inflation',
    analytical: false,
  },
  Contraction_LowInflation: {
    label: 'Contraction / Low Inflation (GFC 2008–2009)',
    start: '2008-09-01',
    end: '2009-06-30',
    description: 'Global Financial Crisis — severe contraction',
    analytical: false,
  },
  COVID_Crash: {
    label: 'COVID Crash (Feb–Apr 2020)',
    start: '2020-02-01',
    end: '2020-04-30',
    description: 'Sharp pandemic-driven crash and recovery',
    analytical: false,
  },
  Rate_Rise_2022: {
    label: 'Rate Rising Cycle (2022)',
    start: '2022-01-01',
    end: '2022-12-31',
    description: 'Fed tightening cycle — worst bond/equity year in decades',
    analytical: false,
  },
  Stagflation: {
    label: 'Stagflation (1973–1981)',
    start: '1973-01-01',
    end: '1981-12-31',
    description: 'High inflation + low growth — pre-Yahoo data era',
    analytical: true,
    equity_real_return: -0.04,
    bond_real_return: -0.01,
    inflation: 0.09,
    max_drawdown: -0.48,
  },
};

/**
 * Fetch current macro regime signals from FRED and Yahoo Finance.
 * Falls back to estimates if FRED_API_KEY is not set.
 * @returns {Promise<Object>}
 */
export async function getCurrentRegimeSignals() {
  const apiKey = process.env.FRED_API_KEY;
  const signals = {
    yieldCurve: null,      // T10Y2Y: 10yr minus 2yr spread
    inflationBreakeven: null, // T10YIE: 10-year inflation breakeven
    vix: null,             // Current VIX level
    vix3m: null,           // 3-month VIX futures
    timestamp: new Date().toISOString(),
  };

  // Fetch VIX from Yahoo Finance
  try {
    const vixData = await getPriceHistory(['^VIX', '^VIX3M'], '1y');
    const vixSeries = vixData['^VIX'] || [];
    const vix3mSeries = vixData['^VIX3M'] || [];
    if (vixSeries.length > 0) signals.vix = vixSeries[vixSeries.length - 1].close;
    if (vix3mSeries.length > 0) signals.vix3m = vix3mSeries[vix3mSeries.length - 1].close;
  } catch (err) {
    console.error('getCurrentRegimeSignals: VIX fetch failed', err?.message);
  }

  if (!apiKey) {
    // Use reasonable estimates
    signals.yieldCurve = 0.2;       // slight positive slope (estimate)
    signals.inflationBreakeven = 2.3; // near 2% target (estimate)
    return signals;
  }

  // Fetch FRED series
  async function fetchFRED(seriesId) {
    try {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&sort_order=desc&limit=1&file_type=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const json = await res.json();
      const val = parseFloat(json?.observations?.[0]?.value);
      return isNaN(val) ? null : val;
    } catch {
      return null;
    }
  }

  const [yieldCurve, inflationBreakeven] = await Promise.all([
    fetchFRED('T10Y2Y'),
    fetchFRED('T10YIE'),
  ]);

  signals.yieldCurve = yieldCurve;
  signals.inflationBreakeven = inflationBreakeven;

  return signals;
}

/**
 * Classify current macroeconomic regime based on signals.
 * Returns probability scores for 4 quadrants.
 * @param {Object} signals - from getCurrentRegimeSignals()
 * @returns {Object}
 */
export function classifyRegime(signals) {
  const { yieldCurve, inflationBreakeven, vix } = signals;

  // Default priors
  let probs = {
    Growth_LowInflation: 0.25,
    Growth_HighInflation: 0.25,
    Contraction_LowInflation: 0.25,
    Stagflation: 0.25,
  };

  // Inflation signal
  const highInflation = inflationBreakeven !== null ? inflationBreakeven > 2.5 : false;

  // Growth/recession signal
  const recession = yieldCurve !== null ? yieldCurve < 0 : false;
  const stressedMarket = vix !== null ? vix > 25 : false;

  if (!recession && !highInflation) {
    probs = { Growth_LowInflation: 0.70, Growth_HighInflation: 0.15, Contraction_LowInflation: 0.10, Stagflation: 0.05 };
  } else if (!recession && highInflation) {
    probs = { Growth_LowInflation: 0.10, Growth_HighInflation: 0.65, Contraction_LowInflation: 0.10, Stagflation: 0.15 };
  } else if (recession && !highInflation) {
    probs = { Growth_LowInflation: 0.05, Growth_HighInflation: 0.05, Contraction_LowInflation: 0.75, Stagflation: 0.15 };
  } else {
    // recession + high inflation = stagflationary risk
    probs = { Growth_LowInflation: 0.05, Growth_HighInflation: 0.10, Contraction_LowInflation: 0.25, Stagflation: 0.60 };
  }

  // VIX adjustment: high volatility → more recession probability
  if (stressedMarket) {
    probs.Contraction_LowInflation += 0.10;
    probs.Growth_LowInflation -= 0.10;
  }

  // Normalize
  const total = Object.values(probs).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(probs)) probs[k] /= total;

  const dominant = Object.entries(probs).sort((a, b) => b[1] - a[1])[0];

  return {
    probabilities: probs,
    dominant_regime: dominant[0],
    dominant_probability: dominant[1],
    signals,
  };
}

/**
 * Simulate portfolio performance during a historical regime.
 * For Stagflation (pre-1990 data), uses analytical estimates.
 * For other regimes, uses SPY as equity proxy and real Yahoo Finance data.
 *
 * @param {Array<{ ticker: string, weight: number }>} positions
 * @param {string} regimeName - key from REGIMES
 * @returns {Promise<{ annual_return: number, max_drawdown: number, sharpe: number, note: string }>}
 */
export async function simulateRegimePerformance(positions, regimeName) {
  const regime = REGIMES[regimeName];
  if (!regime) return null;

  // Stagflation: analytical estimate
  if (regime.analytical) {
    // Classify each position as equity or bond
    let equityWeight = 0;
    let bondWeight = 0;
    let otherWeight = 0;

    const BOND_TICKERS = new Set(['AGG', 'BND', 'TLT', 'IEF', 'SHY', 'BNDW', 'GOVT', 'LQD', 'HYG', 'MUB']);
    const EQUITY_TICKERS_PREFIX = ['SPY', 'VOO', 'VTI', 'QQQ', 'VT', 'VEA', 'VWO', 'IVV'];

    for (const pos of positions) {
      const t = pos.ticker?.toUpperCase() || '';
      if (BOND_TICKERS.has(t)) {
        bondWeight += pos.weight;
      } else if (EQUITY_TICKERS_PREFIX.some((p) => t.startsWith(p)) || /^[A-Z]{1,5}$/.test(t)) {
        equityWeight += pos.weight;
      } else {
        otherWeight += pos.weight;
      }
    }

    // Normalize
    const total = equityWeight + bondWeight + otherWeight;
    if (total > 0) {
      equityWeight /= total;
      bondWeight /= total;
      otherWeight /= total;
    }

    const nominalReturn =
      equityWeight * (regime.equity_real_return + regime.inflation) +
      bondWeight * (regime.bond_real_return + regime.inflation) +
      otherWeight * (0 + regime.inflation);

    return {
      annual_return: nominalReturn,
      max_drawdown: regime.max_drawdown * equityWeight, // weighted by equity exposure
      sharpe: null, // not meaningful with analytical estimate
      note: 'Analytically estimated — historical data unavailable for pre-1990 period',
      data_source: 'analytical',
    };
  }

  // Historical simulation with real data
  try {
    // Use SPY as the market proxy for each equity position
    const period1 = regime.start;
    const period2 = regime.end;

    const tickers = positions.map((p) => p.ticker);
    const uniqueTickers = [...new Set(tickers)];

    // Fetch historical data for the regime period
    const years = Math.ceil(
      (new Date(period2) - new Date(period1)) / (365.25 * 86400000)
    );
    const priceData = await getPriceHistoryBetween(uniqueTickers, period1, period2);

    if (Object.keys(priceData).length === 0) {
      // Fall back to SPY proxy
      const spyData = await getPriceHistoryBetween(['SPY'], period1, period2);
      return computeMetricsFromSeries(spyData, { SPY: 1 }, regimeName);
    }

    const weights = {};
    const totalW = positions.reduce((s, p) => s + p.weight, 0);
    for (const pos of positions) {
      weights[pos.ticker] = totalW > 0 ? pos.weight / totalW : 1 / positions.length;
    }

    return computeMetricsFromSeries(priceData, weights, regimeName);
  } catch (err) {
    console.error(`simulateRegimePerformance failed for ${regimeName}:`, err?.message);
    return {
      annual_return: null,
      max_drawdown: null,
      sharpe: null,
      error: err?.message,
    };
  }
}

/**
 * Fetch price history between two specific dates.
 */
async function getPriceHistoryBetween(tickers, period1, period2) {
  const start = new Date(period1);
  const end = new Date(period2);
  const years = Math.max(1, Math.ceil((end - start) / (365.25 * 24 * 3600 * 1000)));
  const allData = await getPriceHistory(tickers, `${years}y`);

  // Filter to the requested date range
  const results = {};
  for (const ticker of tickers) {
    results[ticker] = (allData[ticker] || []).filter(
      (row) => row.date >= period1 && row.date <= period2
    ).map((row) => ({ date: row.date, close: row.adjClose ?? row.close ?? null }));
  }
  return results;
}

/**
 * Compute return/drawdown/sharpe from price data during a regime period.
 */
function computeMetricsFromSeries(priceData, weights, regimeName) {
  const portReturns = calculatePortfolioReturns(priceData, weights);
  if (portReturns.length < 5) {
    return { annual_return: null, max_drawdown: null, sharpe: null, error: 'Insufficient data' };
  }

  const returns = portReturns.map((r) => r.return);
  const n = returns.length;
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const variance = returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / (n - 1);
  const vol = Math.sqrt(variance);

  const annualized_return = mean * 252;
  const annualized_vol = vol * Math.sqrt(252);
  const rf = 0.02 / 252; // approximate RF for historical period
  const sharpe = annualized_vol > 0 ? (annualized_return - rf * 252) / annualized_vol : null;

  // Drawdown
  let peak = 1;
  let cum = 1;
  let maxDD = 0;
  for (const r of returns) {
    cum *= (1 + r);
    if (cum > peak) peak = cum;
    const dd = (peak - cum) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  return {
    annual_return: annualized_return,
    max_drawdown: -maxDD,
    sharpe,
    observation_days: n,
    data_source: 'historical',
  };
}

/**
 * Calculate performance across all regimes for the given portfolio.
 * @param {Array<{ ticker: string, weight: number }>} positions
 * @returns {Promise<Object>}
 */
export async function calculateRegimeResults(positions) {
  const [signals, ...regimeResults] = await Promise.allSettled([
    getCurrentRegimeSignals(),
    ...Object.keys(REGIMES).map((name) => simulateRegimePerformance(positions, name)),
  ]);

  const currentSignals = signals.status === 'fulfilled' ? signals.value : {};
  const regimeClassification = classifyRegime(currentSignals);

  const performance = {};
  const regimeNames = Object.keys(REGIMES);
  for (let i = 0; i < regimeNames.length; i++) {
    const name = regimeNames[i];
    performance[name] = {
      ...REGIMES[name],
      ...(regimeResults[i]?.status === 'fulfilled' ? regimeResults[i].value : { error: 'Simulation failed' }),
    };
  }

  return {
    current_regime: regimeClassification,
    performance_by_regime: performance,
    regime_definitions: Object.fromEntries(
      Object.entries(REGIMES).map(([k, v]) => [k, { label: v.label, description: v.description }])
    ),
  };
}
