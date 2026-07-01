/**
 * Behavioral bias detection and analysis for portfolio positions.
 */

/**
 * Calculate home bias — over-allocation to domestic (US) equities.
 * @param {Object} geography - { US: 0.85, International: 0.12, Unknown: 0.03 }
 * @returns {Object}
 */
export function calculateHomeBias(geography) {
  const usWeight = geography?.US || 0;
  const intlWeight = geography?.International || 0;
  const total = usWeight + intlWeight;
  const usShare = total > 0 ? usWeight / total : usWeight;

  // World market cap is approximately 60% US, 40% international
  const WORLD_US_WEIGHT = 0.60;
  const excessUsBias = Math.max(0, usShare - WORLD_US_WEIGHT);

  let severity = 'None';
  if (usShare > 0.95) severity = 'Severe';
  else if (usShare > 0.85) severity = 'High';
  else if (usShare > 0.75) severity = 'Moderate';
  else if (usShare > 0.65) severity = 'Low';

  return {
    us_weight: usShare,
    international_weight: 1 - usShare,
    world_benchmark_us: WORLD_US_WEIGHT,
    excess_home_bias: excessUsBias,
    severity,
    note:
      severity !== 'None'
        ? `Portfolio has ${(usShare * 100).toFixed(1)}% US exposure vs. ${(WORLD_US_WEIGHT * 100).toFixed(0)}% world-market-cap weight`
        : 'Home bias within acceptable range',
  };
}

/**
 * Calculate concentration risk across positions.
 * @param {Array<{ ticker: string, weight: number }>} positions
 * @returns {Object}
 */
export function calculateConcentration(positions) {
  if (!positions || positions.length === 0) {
    return { hhi: 0, effective_n: 0, top_position_weight: 0, is_concentrated: false };
  }

  const totalWeight = positions.reduce((sum, p) => sum + (p.weight || 0), 0);
  const normWeights = positions.map((p) => (totalWeight > 0 ? (p.weight || 0) / totalWeight : 1 / positions.length));

  // Herfindahl-Hirschman Index (HHI) — sum of squared weights
  const hhi = normWeights.reduce((acc, w) => acc + w * w, 0);

  // Effective N (inverse HHI) — equivalent number of equal-weight positions
  const effectiveN = hhi > 0 ? 1 / hhi : positions.length;

  const sorted = [...normWeights].sort((a, b) => b - a);
  const top1 = sorted[0] || 0;
  const top5 = sorted.slice(0, 5).reduce((a, b) => a + b, 0);

  const isConcentrated = hhi > 0.25 || top1 > 0.4;

  let severity = 'Low';
  if (hhi > 0.4) severity = 'Severe';
  else if (hhi > 0.25) severity = 'High';
  else if (hhi > 0.15) severity = 'Moderate';

  return {
    hhi,
    effective_n: effectiveN,
    top_position_weight: top1,
    top_5_weight: top5,
    is_concentrated: isConcentrated,
    concentration_severity: severity,
    position_count: positions.length,
  };
}

/**
 * Calculate Kelly criterion optimal sizing for each position.
 * Kelly = mean_annual_return / annual_variance
 * Values > 1 suggest the market is mis-pricing the asset (or data is noisy).
 * @param {Array<{ ticker: string, weight: number }>} positions
 * @param {Object} priceData - { ticker: [{date, close}, ...] }
 * @returns {Object}
 */
export function calculateKelly(positions, priceData) {
  const kellyByTicker = {};

  for (const pos of positions) {
    const prices = priceData[pos.ticker];
    if (!prices || prices.length < 60) {
      kellyByTicker[pos.ticker] = { kelly_fraction: null, actual_weight: pos.weight, over_bet: null };
      continue;
    }

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const prev = prices[i - 1].close;
      const curr = prices[i].close;
      if (prev && curr && prev > 0) {
        returns.push((curr - prev) / prev);
      }
    }

    if (returns.length < 30) {
      kellyByTicker[pos.ticker] = { kelly_fraction: null, actual_weight: pos.weight, over_bet: null };
      continue;
    }

    const n = returns.length;
    const mean = returns.reduce((a, b) => a + b, 0) / n;
    const variance = returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / (n - 1);

    const meanAnnual = mean * 252;
    const varianceAnnual = variance * 252;

    // Full Kelly = mean / variance
    const kellyFull = varianceAnnual > 0 ? meanAnnual / varianceAnnual : null;
    // Half-Kelly is commonly recommended in practice
    const kellyHalf = kellyFull !== null ? kellyFull * 0.5 : null;

    const overBet = kellyHalf !== null && pos.weight > 0
      ? pos.weight / kellyHalf
      : null;

    kellyByTicker[pos.ticker] = {
      kelly_fraction: kellyFull,
      kelly_half: kellyHalf,
      actual_weight: pos.weight,
      over_bet_ratio: overBet,
      is_over_bet: overBet !== null ? overBet > 2.0 : null,
      mean_annual_return: meanAnnual,
      annual_variance: varianceAnnual,
    };
  }

  const overBetPositions = Object.entries(kellyByTicker)
    .filter(([, v]) => v.is_over_bet === true)
    .map(([ticker]) => ticker);

  return {
    by_ticker: kellyByTicker,
    over_bet_positions: overBetPositions,
    has_over_bet: overBetPositions.length > 0,
  };
}

/**
 * Detect implicit leverage in the portfolio (use of leveraged ETFs, concentrated bets).
 * @param {Array<{ ticker: string, weight: number, name?: string }>} positions
 * @returns {Object}
 */
export function detectImplicitLeverage(positions) {
  const LEVERAGED_ETF_PATTERNS = [
    /^TQQQ$/, /^SQQQ$/, /^UPRO$/, /^SPXU$/, /^UDOW$/, /^SDOW$/,
    /^SSO$/, /^SDS$/, /^QLD$/, /^QID$/, /^UGL$/, /^GLL$/,
    /^LABU$/, /^LABD$/, /^NUGT$/, /^DUST$/, /^TECL$/, /^TECS$/,
    /^FAS$/, /^FAZ$/, /^TNA$/, /^TZA$/, /^ERX$/, /^ERY$/,
  ];

  const LEVERAGE_MULTIPLIERS = {
    TQQQ: 3, SQQQ: -3, UPRO: 3, SPXU: -3, UDOW: 3, SDOW: -3,
    SSO: 2, SDS: -2, QLD: 2, QID: -2, UGL: 2, GLL: -2,
    LABU: 3, LABD: -3, NUGT: 3, DUST: -3, TECL: 3, TECS: -3,
    FAS: 3, FAZ: -3, TNA: 3, TZA: -3, ERX: 2, ERY: -2,
  };

  const leveragedPositions = [];
  let impliedLeverage = 1.0;
  let totalLeveragedWeight = 0;

  for (const pos of positions) {
    const t = pos.ticker?.toUpperCase() || '';
    const isLeveraged = LEVERAGED_ETF_PATTERNS.some((pattern) => pattern.test(t));
    const multiplier = LEVERAGE_MULTIPLIERS[t];

    if (isLeveraged && multiplier !== undefined) {
      leveragedPositions.push({
        ticker: pos.ticker,
        weight: pos.weight,
        leverage_multiplier: multiplier,
        implied_notional: pos.weight * Math.abs(multiplier),
      });
      totalLeveragedWeight += pos.weight;
      impliedLeverage += pos.weight * (Math.abs(multiplier) - 1);
    }
  }

  return {
    has_leverage: leveragedPositions.length > 0,
    leveraged_positions: leveragedPositions,
    implied_leverage_ratio: impliedLeverage,
    leveraged_weight: totalLeveragedWeight,
    warning: leveragedPositions.length > 0
      ? `Portfolio contains ${leveragedPositions.length} leveraged ETF(s) — these reset daily and suffer volatility decay`
      : null,
  };
}

/**
 * Detect recency bias — over-weighting recent winners.
 * Recency bias: high correlation between current weight and recent performance.
 * @param {Array<{ ticker: string, weight: number }>} positions
 * @param {Object} priceData - { ticker: [{date, close}, ...] }
 * @returns {Object}
 */
export function detectRecencyBias(positions, priceData) {
  const recentPeriodDays = 252; // 1-year lookback for "recent"
  const longPeriodDays = 756;   // 3-year for "long-term"

  const positionStats = [];

  for (const pos of positions) {
    const prices = priceData[pos.ticker];
    if (!prices || prices.length < recentPeriodDays) continue;

    const recent = prices.slice(-recentPeriodDays);
    const long = prices.slice(-longPeriodDays);

    const recentReturn = recent.length > 1
      ? (recent[recent.length - 1].close - recent[0].close) / recent[0].close
      : null;

    const longReturn = long.length > 1
      ? (long[long.length - 1].close - long[0].close) / long[0].close
      : null;

    positionStats.push({
      ticker: pos.ticker,
      weight: pos.weight,
      recent_1y_return: recentReturn,
      long_3y_return: longReturn,
      return_rank_recency: null, // populated below
    });
  }

  if (positionStats.length < 2) {
    return { recency_bias_score: null, recency_bias_detected: false, positions: positionStats };
  }

  // Rank by recent return
  const sorted = [...positionStats].sort((a, b) => (b.recent_1y_return ?? -Infinity) - (a.recent_1y_return ?? -Infinity));
  sorted.forEach((p, i) => { p.return_rank_recency = i + 1; });

  // Compute Spearman correlation between weight and recent return rank
  // High positive correlation = chasing recent winners (recency bias)
  const n = positionStats.length;
  const weightRanks = positionStats
    .map((p) => p.weight)
    .map((w, _, arr) => {
      const sorted = [...arr].sort((a, b) => b - a);
      return sorted.indexOf(w) + 1;
    });

  const returnRanks = positionStats.map((p) => p.return_rank_recency || 0);
  const wMean = weightRanks.reduce((a, b) => a + b, 0) / n;
  const rMean = returnRanks.reduce((a, b) => a + b, 0) / n;
  const cov = weightRanks.reduce((acc, w, i) => acc + (w - wMean) * (returnRanks[i] - rMean), 0);
  const stdW = Math.sqrt(weightRanks.reduce((acc, w) => acc + (w - wMean) ** 2, 0));
  const stdR = Math.sqrt(returnRanks.reduce((acc, r) => acc + (r - rMean) ** 2, 0));
  const spearman = stdW > 0 && stdR > 0 ? cov / (stdW * stdR) : 0;

  // Negative spearman = high weight given to high return (rank 1 = best)
  // Because rank 1 = best performer, we expect negative correlation for recency bias
  const recencyBiasScore = -spearman; // flip sign so positive = bias

  return {
    recency_bias_score: recencyBiasScore,
    recency_bias_detected: recencyBiasScore > 0.3,
    interpretation:
      recencyBiasScore > 0.3
        ? 'Portfolio shows evidence of chasing recent winners — positions with higher recent returns have larger weights'
        : 'No strong recency bias detected',
    positions: positionStats,
  };
}

/**
 * Calculate all behavioral bias metrics.
 * @param {Array<{ ticker: string, weight: number }>} positions
 * @param {Object} priceData
 * @param {Object} geography - from etfDecomposer
 * @param {Array} effectiveHoldings - from etfDecomposer
 * @returns {Object}
 */
export function calculateBehavioralResults(positions, priceData, geography, effectiveHoldings) {
  const homeBias = calculateHomeBias(geography);
  const concentration = calculateConcentration(
    effectiveHoldings?.length > 0 ? effectiveHoldings : positions
  );
  const kelly = calculateKelly(positions, priceData);
  const implicitLeverage = detectImplicitLeverage(positions);
  const recencyBias = detectRecencyBias(positions, priceData);

  // Behavioral score: 0-100 (higher = fewer behavioral biases)
  let score = 100;

  // Deductions
  if (homeBias.severity === 'Severe') score -= 20;
  else if (homeBias.severity === 'High') score -= 12;
  else if (homeBias.severity === 'Moderate') score -= 6;

  if (concentration.concentration_severity === 'Severe') score -= 25;
  else if (concentration.concentration_severity === 'High') score -= 15;
  else if (concentration.concentration_severity === 'Moderate') score -= 8;

  if (kelly.has_over_bet) score -= 10;
  if (implicitLeverage.has_leverage) score -= 15;
  if (recencyBias.recency_bias_detected) score -= 10;

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    home_bias: homeBias,
    concentration,
    kelly,
    implicit_leverage: implicitLeverage,
    recency_bias: recencyBias,
    summary: buildBehavioralSummary({ homeBias, concentration, implicitLeverage, recencyBias, kelly }),
  };
}

/**
 * Build a plain-language summary of behavioral findings.
 */
function buildBehavioralSummary({ homeBias, concentration, implicitLeverage, recencyBias, kelly }) {
  const issues = [];

  if (homeBias.severity === 'Severe' || homeBias.severity === 'High') {
    issues.push(`Heavy home bias: ${(homeBias.us_weight * 100).toFixed(1)}% in US vs. ${(homeBias.world_benchmark_us * 100).toFixed(0)}% world weight`);
  }

  if (concentration.concentration_severity === 'Severe' || concentration.concentration_severity === 'High') {
    issues.push(`High concentration: effective N = ${concentration.effective_n.toFixed(1)} positions (HHI = ${concentration.hhi.toFixed(3)})`);
  }

  if (implicitLeverage.has_leverage) {
    issues.push(`Implicit leverage detected in ${implicitLeverage.leveraged_positions.map((p) => p.ticker).join(', ')}`);
  }

  if (recencyBias.recency_bias_detected) {
    issues.push('Recency bias: portfolio weights favor recent winners');
  }

  if (kelly.has_over_bet && kelly.over_bet_positions.length > 0) {
    issues.push(`Over-sized bets relative to Kelly criterion: ${kelly.over_bet_positions.join(', ')}`);
  }

  return issues.length > 0 ? issues : ['No major behavioral biases detected'];
}
