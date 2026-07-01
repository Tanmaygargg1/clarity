import { getRiskFreeRate } from './dataFetcher.js';

/**
 * Align tickers to common dates and compute weighted portfolio daily returns.
 * @param {Object} priceData - { AAPL: [{date, close}, ...], ... }
 * @param {Object} weights - { AAPL: 0.18, MSFT: 0.15, ... } (should sum to 1)
 * @returns {Array<{ date: string, return: number }>}
 */
export function calculatePortfolioReturns(priceData, weights) {
  const tickers = Object.keys(weights).filter((t) => priceData[t]?.length > 1);

  if (tickers.length === 0) return [];

  // Build per-ticker return series indexed by date
  const tickerReturns = {};
  for (const ticker of tickers) {
    const prices = priceData[ticker];
    tickerReturns[ticker] = {};
    for (let i = 1; i < prices.length; i++) {
      const prev = prices[i - 1].close;
      const curr = prices[i].close;
      if (prev && curr && prev !== 0) {
        tickerReturns[ticker][prices[i].date] = (curr - prev) / prev;
      }
    }
  }

  // Find common dates across all tickers
  const dateSets = tickers.map((t) => new Set(Object.keys(tickerReturns[t])));
  const commonDates = [...dateSets[0]].filter((d) => dateSets.every((s) => s.has(d)));
  commonDates.sort();

  // Normalize weights to sum to 1 (among available tickers)
  const totalWeight = tickers.reduce((sum, t) => sum + (weights[t] || 0), 0);
  const normWeights = {};
  for (const t of tickers) {
    normWeights[t] = totalWeight > 0 ? (weights[t] || 0) / totalWeight : 1 / tickers.length;
  }

  return commonDates.map((date) => {
    const ret = tickers.reduce((sum, t) => {
      return sum + normWeights[t] * (tickerReturns[t][date] ?? 0);
    }, 0);
    return { date, return: ret };
  });
}

/**
 * Calculate the full suite of risk metrics for a portfolio.
 * @param {Object} priceData - { ticker: [{date, close}, ...] }
 * @param {Object} weights - { ticker: weight }
 * @param {string} benchmark - 'SPY' | 'VT' | 'none'
 * @returns {Object} full risk metrics object
 */
export async function calculateRiskMetrics(priceData, weights, benchmark = 'SPY') {
  const rfRate = await getRiskFreeRate();

  const portfolioReturnsSeries = calculatePortfolioReturns(priceData, weights);
  const portReturns = portfolioReturnsSeries.map((r) => r.return);

  if (portReturns.length < 2) {
    return {
      portfolio_volatility_annual: null,
      portfolio_beta: null,
      rolling_beta: [],
      risk_contribution: {},
      correlation_matrix: {},
      max_drawdown: null,
      drawdown_duration_days: null,
      drawdown_history: [],
      cvar_95: null,
      sharpe: null,
      sortino: null,
      calmar: null,
      benchmark_sharpe: null,
    };
  }

  // --- Annual volatility ---
  const meanPort = portReturns.reduce((a, b) => a + b, 0) / portReturns.length;
  const variance = portReturns.reduce((acc, r) => acc + (r - meanPort) ** 2, 0) / (portReturns.length - 1);
  const dailyVol = Math.sqrt(variance);
  const annualVol = dailyVol * Math.sqrt(252);

  // --- Annual return ---
  const tradingDaysPerYear = 252;
  const annualReturn = meanPort * tradingDaysPerYear;

  // --- Benchmark data ---
  const benchTicker = benchmark !== 'none' ? benchmark : null;
  const benchData = benchTicker && priceData[benchTicker]?.length > 1
    ? calculatePortfolioReturns({ [benchTicker]: priceData[benchTicker] }, { [benchTicker]: 1 })
    : [];

  // Align portfolio and benchmark
  const portByDate = {};
  portfolioReturnsSeries.forEach(({ date, return: r }) => { portByDate[date] = r; });
  const benchByDate = {};
  benchData.forEach(({ date, return: r }) => { benchByDate[date] = r; });
  const alignedDates = Object.keys(portByDate).filter((d) => d in benchByDate).sort();

  const alignedPort = alignedDates.map((d) => portByDate[d]);
  const alignedBench = alignedDates.map((d) => benchByDate[d]);

  // --- Beta via OLS ---
  let portfolioBeta = null;
  if (alignedDates.length > 10) {
    const benchMean = alignedBench.reduce((a, b) => a + b, 0) / alignedBench.length;
    const portMean = alignedPort.reduce((a, b) => a + b, 0) / alignedPort.length;
    const cov = alignedBench.reduce((acc, bv, i) => acc + (bv - benchMean) * (alignedPort[i] - portMean), 0) / (alignedBench.length - 1);
    const varBench = alignedBench.reduce((acc, bv) => acc + (bv - benchMean) ** 2, 0) / (alignedBench.length - 1);
    portfolioBeta = varBench > 0 ? cov / varBench : null;
  }

  // --- Rolling 90-day beta ---
  const rollingBeta = [];
  const windowSize = 90;
  for (let i = windowSize; i <= alignedDates.length; i++) {
    const wPort = alignedPort.slice(i - windowSize, i);
    const wBench = alignedBench.slice(i - windowSize, i);
    const wPortMean = wPort.reduce((a, b) => a + b, 0) / windowSize;
    const wBenchMean = wBench.reduce((a, b) => a + b, 0) / windowSize;
    const cov = wBench.reduce((acc, bv, j) => acc + (bv - wBenchMean) * (wPort[j] - wPortMean), 0) / (windowSize - 1);
    const varW = wBench.reduce((acc, bv) => acc + (bv - wBenchMean) ** 2, 0) / (windowSize - 1);
    rollingBeta.push({
      date: alignedDates[i - 1],
      beta: varW > 0 ? cov / varW : null,
    });
  }

  // --- Risk contribution (marginal contribution to portfolio variance) ---
  const tickers = Object.keys(weights).filter((t) => priceData[t]?.length > 1);
  const totalW = tickers.reduce((s, t) => s + (weights[t] || 0), 0);
  const normW = {};
  for (const t of tickers) normW[t] = totalW > 0 ? (weights[t] || 0) / totalW : 1 / tickers.length;

  // Build return matrix for covariance
  const allDates = portfolioReturnsSeries.map((r) => r.date);
  const tickerReturnsByDate = {};
  for (const ticker of tickers) {
    tickerReturnsByDate[ticker] = {};
    const prices = priceData[ticker];
    for (let i = 1; i < prices.length; i++) {
      const prev = prices[i - 1].close;
      const curr = prices[i].close;
      if (prev && curr && prev !== 0) {
        tickerReturnsByDate[ticker][prices[i].date] = (curr - prev) / prev;
      }
    }
  }

  const covMatrix = {};
  for (const ti of tickers) {
    covMatrix[ti] = {};
    for (const tj of tickers) {
      const commonD = allDates.filter((d) => d in tickerReturnsByDate[ti] && d in tickerReturnsByDate[tj]);
      if (commonD.length < 2) { covMatrix[ti][tj] = 0; continue; }
      const ri = commonD.map((d) => tickerReturnsByDate[ti][d]);
      const rj = commonD.map((d) => tickerReturnsByDate[tj][d]);
      const mi = ri.reduce((a, b) => a + b, 0) / ri.length;
      const mj = rj.reduce((a, b) => a + b, 0) / rj.length;
      const cov = ri.reduce((acc, v, idx) => acc + (v - mi) * (rj[idx] - mj), 0) / (ri.length - 1);
      covMatrix[ti][tj] = cov;
    }
  }

  // Portfolio variance = w' Σ w
  let portVar = 0;
  for (const ti of tickers) {
    for (const tj of tickers) {
      portVar += normW[ti] * normW[tj] * (covMatrix[ti][tj] || 0);
    }
  }

  const riskContribution = {};
  for (const ti of tickers) {
    // Marginal contribution = (Σw)_i = sum_j(cov(i,j)*w_j)
    const marginal = tickers.reduce((acc, tj) => acc + (covMatrix[ti][tj] || 0) * normW[tj], 0);
    riskContribution[ti] = portVar > 0 ? normW[ti] * marginal / portVar : 0;
  }

  // --- Correlation matrix ---
  const correlationMatrix = {};
  for (const ti of tickers) {
    correlationMatrix[ti] = {};
    for (const tj of tickers) {
      const cov = covMatrix[ti][tj] || 0;
      const vari = covMatrix[ti][ti] || 0;
      const varj = covMatrix[tj][tj] || 0;
      const denom = Math.sqrt(vari * varj);
      correlationMatrix[ti][tj] = denom > 0 ? cov / denom : (ti === tj ? 1 : 0);
    }
  }

  // --- Max drawdown ---
  let peak = 1;
  let cumulative = 1;
  let maxDD = 0;
  let ddStart = null;
  let ddEnd = null;
  let peakDate = null;
  let ddDurationDays = 0;
  const drawdownHistory = [];

  for (let i = 0; i < portReturns.length; i++) {
    cumulative *= (1 + portReturns[i]);
    if (cumulative > peak) {
      peak = cumulative;
      peakDate = portfolioReturnsSeries[i].date;
    }
    const dd = (peak - cumulative) / peak;
    drawdownHistory.push({ date: portfolioReturnsSeries[i].date, value: -dd });
    if (dd > maxDD) {
      maxDD = dd;
      ddEnd = portfolioReturnsSeries[i].date;
      ddStart = peakDate;
    }
  }

  if (ddStart && ddEnd) {
    const msPerDay = 86400000;
    ddDurationDays = Math.round((new Date(ddEnd) - new Date(ddStart)) / msPerDay);
  }

  // --- CVaR 95% ---
  const sortedReturns = [...portReturns].sort((a, b) => a - b);
  const cutoff = Math.floor(0.05 * sortedReturns.length);
  const tailReturns = sortedReturns.slice(0, Math.max(1, cutoff));
  const cvar95Daily = tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length;
  const cvar95 = cvar95Daily * Math.sqrt(252); // annualized

  // --- Ratios ---
  const excessReturn = annualReturn - rfRate;
  const sharpe = annualVol > 0 ? excessReturn / annualVol : null;

  // Sortino: downside deviation
  const downsideReturns = portReturns.filter((r) => r < rfRate / 252);
  const downsideVar = downsideReturns.length > 0
    ? downsideReturns.reduce((acc, r) => acc + (r - rfRate / 252) ** 2, 0) / portReturns.length
    : 0;
  const downsideVol = Math.sqrt(downsideVar) * Math.sqrt(252);
  const sortino = downsideVol > 0 ? excessReturn / downsideVol : null;

  // Calmar: annual return / |max drawdown|
  const calmar = maxDD > 0 ? annualReturn / maxDD : null;

  // --- Benchmark Sharpe ---
  let benchmarkSharpe = null;
  if (alignedBench.length > 10) {
    const benchMean = alignedBench.reduce((a, b) => a + b, 0) / alignedBench.length;
    const benchVar = alignedBench.reduce((acc, r) => acc + (r - benchMean) ** 2, 0) / (alignedBench.length - 1);
    const benchAnnVol = Math.sqrt(benchVar) * Math.sqrt(252);
    const benchAnnReturn = benchMean * 252;
    benchmarkSharpe = benchAnnVol > 0 ? (benchAnnReturn - rfRate) / benchAnnVol : null;
  }

  return {
    portfolio_volatility_annual: annualVol,
    portfolio_beta: portfolioBeta,
    rolling_beta: rollingBeta,
    risk_contribution: riskContribution,
    correlation_matrix: correlationMatrix,
    max_drawdown: -maxDD,
    drawdown_duration_days: ddDurationDays,
    drawdown_history: drawdownHistory,
    cvar_95: cvar95,
    sharpe,
    sortino,
    calmar,
    benchmark_sharpe: benchmarkSharpe,
  };
}
