export function scoreAll(xray, risk, factors, regime, behavioral) {
  return {
    diversification: scoreDiversification(xray, behavioral),
    risk_efficiency: scoreRiskEfficiency(risk),
    factor_quality: scoreFactorQuality(factors),
    regime_resilience: scoreRegimeResilience(regime),
    behavioral: scoreBehavioral(behavioral),
  };
}

function scoreDiversification(xray, behavioral) {
  let score = 100;
  const top10 = xray?.top_10_concentration ?? 0.5;
  if (top10 > 0.8) score -= 30;
  else if (top10 > 0.6) score -= 15;
  else if (top10 > 0.4) score -= 5;

  const hb = behavioral?.home_bias ?? {};
  if (hb.flag) score -= Math.min(20, Math.round((hb.excess ?? 0) * 50));

  const conc = behavioral?.concentration ?? {};
  if (conc.flag) score -= 15;
  score -= (conc.single_position_flags?.length ?? 0) * 5;

  return Math.max(0, Math.min(100, score));
}

function scoreRiskEfficiency(risk) {
  let score = 50;
  const sharpe = risk?.sharpe ?? 0;
  const benchSharpe = risk?.benchmark_sharpe ?? 1.0;

  if (sharpe >= benchSharpe * 1.1) score += 30;
  else if (sharpe >= benchSharpe * 0.9) score += 15;
  else if (sharpe < benchSharpe * 0.7) score -= 20;

  const maxDd = Math.abs(risk?.max_drawdown ?? 0);
  if (maxDd < 0.15) score += 20;
  else if (maxDd < 0.25) score += 10;
  else if (maxDd > 0.40) score -= 20;

  const topRisk = (risk?.risk_contribution ?? [])[0];
  if (topRisk?.risk_weight > 0.5) score -= 20;
  else if (topRisk?.risk_weight > 0.35) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function scoreFactorQuality(factors) {
  let score = 60;
  const pval = factors?.alpha_pvalue ?? 1.0;
  const alpha = factors?.alpha_annual ?? 0;

  if (pval < 0.05 && alpha > 0) score += 25;
  else if (pval < 0.10 && alpha > 0) score += 10;
  else if (pval >= 0.05) score -= 10;

  const excess = factors?.excess_cost ?? 0;
  if (excess > 0.01) score -= 20;
  else if (excess > 0.005) score -= 10;
  else if (excess > 0.002) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function scoreRegimeResilience(regime) {
  let score = 60;
  const worstReturn = regime?.worst_regime_return ?? -0.3;
  if (worstReturn > 0) score += 25;
  else if (worstReturn > -0.10) score += 10;
  else if (worstReturn > -0.20) score += 0;
  else if (worstReturn > -0.35) score -= 15;
  else score -= 30;

  const mostLikely = regime?.most_likely_regime;
  const perf = regime?.regime_performance ?? {};
  if (mostLikely && perf[mostLikely]) {
    const ret = perf[mostLikely].annual_return ?? 0;
    if (ret < 0) score -= 15;
    else if (ret > 0.10) score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

function scoreBehavioral(behavioral) {
  let score = 100;
  for (const flag of (behavioral?.behavioral_flags ?? [])) {
    if (flag.includes('KELLY_OVERBET')) score -= 12;
    else if (flag === 'CONCENTRATION') score -= 15;
    else if (flag === 'HOME_BIAS') score -= 10;
    else if (flag === 'RECENCY_BIAS') score -= 10;
    else if (flag === 'LEVERAGED_ETF') score -= 20;
  }
  return Math.max(0, Math.min(100, score));
}

function grade(score) {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function generateVerdict(xray, risk, factors, regime, behavioral, positions) {
  const dimScores = scoreAll(xray, risk, factors, regime, behavioral);
  const weights = { diversification: 0.25, risk_efficiency: 0.25, factor_quality: 0.20, regime_resilience: 0.15, behavioral: 0.15 };
  const overall = Math.round(Object.entries(weights).reduce((s, [k, w]) => s + (dimScores[k] ?? 50) * w, 0));

  const worstDim = Object.entries(dimScores).sort((a, b) => a[1] - b[1])[0][0];
  const headlines = {
    diversification: 'Your portfolio is more concentrated than it appears.',
    risk_efficiency: `You are taking ${(risk?.portfolio_beta ?? 1).toFixed(1)}x market risk without proportionate return.`,
    factor_quality: 'Your returns are explained by factor exposure, not selection. You are paying for beta.',
    regime_resilience: 'Your portfolio is optimised for conditions that may not persist.',
    behavioral: 'Behavioral errors are quietly working against you.',
  };

  const findings = [];
  const topRisk = (risk?.risk_contribution ?? [])[0];
  if (topRisk && topRisk.risk_weight > 0.30) {
    findings.push(`${topRisk.ticker} accounts for ${(topRisk.risk_weight * 100).toFixed(0)}% of your total portfolio risk despite being only ${(topRisk.dollar_weight * 100).toFixed(0)}% of your dollar allocation.`);
  }
  if ((factors?.alpha_pvalue ?? 1) > 0.05) {
    findings.push(`Your alpha is not statistically significant (p=${(factors?.alpha_pvalue ?? 1).toFixed(2)}). Factor models explain ${((factors?.r_squared ?? 0) * 100).toFixed(0)}% of your returns — you are paying for market exposure.`);
  }
  const mostLikely = regime?.most_likely_regime;
  if (mostLikely && regime?.regime_performance?.[mostLikely]) {
    const ret = regime.regime_performance[mostLikely].annual_return ?? 0;
    findings.push(`The current most likely regime is ${mostLikely.replace(/_/g, ' ')}. In this environment your expected annual return is ${(ret * 100).toFixed(1)}%.`);
  }
  for (const flag of (behavioral?.behavioral_flags ?? [])) {
    if (flag === 'HOME_BIAS') {
      const usW = behavioral?.home_bias?.user_us_weight ?? 0;
      findings.push(`Your portfolio is ${(usW * 100).toFixed(0)}% US equities. Global market weight for the US is 62%. You are not being compensated for this home bias.`);
    } else if (flag === 'RECENCY_BIAS') {
      const exp = behavioral?.recency_bias?.explanation;
      if (exp) findings.push(exp + ' Allocation appears driven by recent performance, not forward-looking thesis.');
    } else if (flag.includes('KELLY_OVERBET:')) {
      const ticker = flag.split(':')[1];
      const k = behavioral?.kelly?.by_ticker?.[ticker];
      if (k?.over_bet_ratio) findings.push(`${ticker} is sized at ${k.over_bet_ratio.toFixed(1)}x your Kelly-optimal weight given its volatility. This is a statistically dangerous overbet.`);
    }
  }
  if (findings.length < 3) {
    const maxDd = Math.abs(risk?.max_drawdown ?? 0);
    findings.push(`Your portfolio's maximum historical drawdown is ${(maxDd * 100).toFixed(0)}%. A similar drawdown is a realistic outcome in a market stress event.`);
  }

  const actions = [];
  const kellyByTicker = behavioral?.kelly?.by_ticker ?? {};
  const overBetTickers = behavioral?.kelly?.over_bet_positions ?? [];
  if (overBetTickers.length > 0) {
    const obTicker = overBetTickers[0];
    const ob = kellyByTicker[obTicker];
    if (ob) {
      const target = Math.min((ob.kelly_fraction ?? ob.actual_weight) * 1.5, ob.actual_weight * 0.5);
      const freed = ob.actual_weight - target;
      actions.push(`Reduce ${obTicker} from ${(ob.actual_weight * 100).toFixed(0)}% to ${(target * 100).toFixed(0)}% and redirect the ${(freed * 100).toFixed(0)}% into VXUS to reduce both concentration and home bias simultaneously.`);
    }
  }
  if (behavioral?.home_bias?.flag) {
    const usW = behavioral.home_bias.user_us_weight ?? 0.9;
    actions.push(`Add a ${Math.round((1 - usW) * 50 + 10)}% allocation to VXUS (Vanguard Total International) to bring US exposure from ${(usW * 100).toFixed(0)}% toward the global market weight of 62%.`);
  }
  if (mostLikely && (mostLikely.includes('Inflation') || mostLikely.includes('Stagflation'))) {
    actions.push('Add a 10–15% allocation to SCHP (TIPS, 0.03%/yr) as an inflation hedge given current regime signals.');
  }
  if (actions.length < 3) {
    if ((risk?.sharpe ?? 0) < (risk?.benchmark_sharpe ?? 1)) {
      actions.push('Replace any actively managed large-cap funds with VV or SCHX — same factor exposures, lower cost. The factor regression shows no statistically significant alpha to justify active fees.');
    } else {
      actions.push('Rebalance back to target weights quarterly. The single largest improvement most portfolios can make is disciplined rebalancing, not stock selection.');
    }
  }

  return {
    grade: grade(overall),
    overall_score: overall,
    dimension_scores: dimScores,
    headline: headlines[worstDim] ?? 'Your portfolio has meaningful structural weaknesses to address.',
    key_findings: findings.slice(0, 5),
    three_actions: actions.slice(0, 3),
  };
}
