import { NextResponse } from 'next/server';
import { getPriceHistory } from '@/lib/dataFetcher';
import { decomposePortfolio } from '@/lib/etfDecomposer';
import { calculateRiskMetrics, calculatePortfolioReturns } from '@/lib/risk';
import { runFactorAnalysis } from '@/lib/factors';
import { calculateRegimeResults } from '@/lib/regime';
import { calculateBehavioralResults } from '@/lib/behavioral';
import { generateVerdict } from '@/lib/verdict';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const body = await request.json();
    const { positions: rawPositions, horizon = 'medium', benchmark = 'SPY' } = body;

    if (!rawPositions || rawPositions.length === 0) {
      return NextResponse.json({ error: 'No positions provided' }, { status: 400 });
    }

    const totalWeight = rawPositions.reduce((s, p) => s + (p.weight ?? 0), 0);
    if (totalWeight <= 0) return NextResponse.json({ error: 'Weights must be positive' }, { status: 400 });

    const positions = rawPositions.map(p => ({
      ticker: p.ticker.toUpperCase(),
      weight: p.weight / totalWeight,
    }));

    const tickers = positions.map(p => p.ticker).filter(t => t !== 'CASH');
    const benchTicker = benchmark !== 'none' ? benchmark : null;
    const fetchTickers = [...new Set([...tickers, ...(benchTicker ? [benchTicker] : [])])];

    const priceData = await getPriceHistory(fetchTickers, '3y');

    const errors = [];
    let xray = {}, risk = {}, factors = {}, regime = {}, behavioral = {}, verdict = {};

    try {
      xray = await decomposePortfolio(positions);
    } catch (e) {
      errors.push(`xray: ${e.message}`);
      xray = { effective_holdings: [], top_10_concentration: 0, sector_weights: {}, geography: { US: 1 }, market_cap: {}, unique_underlying_stocks: tickers.length };
    }

    try {
      const weightMap = Object.fromEntries(positions.map(p => [p.ticker, p.weight]));
      risk = calculateRiskMetrics(priceData, weightMap, benchTicker || 'SPY');
    } catch (e) {
      errors.push(`risk: ${e.message}`);
      risk = { portfolio_volatility_annual: 0, portfolio_beta: 1, rolling_beta: [], risk_contribution: [], correlation_matrix: {}, max_drawdown: 0, drawdown_duration_days: 0, drawdown_history: [], cvar_95: 0, sharpe: 0, sortino: 0, calmar: 0, benchmark_sharpe: 1 };
    }

    try {
      const weightMap = Object.fromEntries(positions.map(p => [p.ticker, p.weight]));
      const portReturns = calculatePortfolioReturns(priceData, weightMap);
      factors = await runFactorAnalysis(portReturns, positions);
    } catch (e) {
      errors.push(`factors: ${e.message}`);
      factors = { alpha_annual: 0, alpha_pvalue: 1, r_squared: 0, factor_loadings: {}, return_attribution: {}, blended_expense_ratio: 0, factor_replication_cost: 0.001, excess_cost: 0 };
    }

    try {
      const rawRegime = await calculateRegimeResults(positions);
      // Normalize to frontend-expected shape
      const perf = rawRegime.performance_by_regime || {};
      const rawSignals = rawRegime.current_regime?.signals ?? {};
      const sortedByReturn = Object.entries(perf)
        .filter(([, v]) => v.annual_return != null)
        .sort((a, b) => a[1].annual_return - b[1].annual_return);
      const worstEntry = sortedByReturn[0];
      regime = {
        regime_performance: perf,
        current_regime_signals: {
          yield_curve: rawSignals.yieldCurve ?? null,
          inflation_breakeven: rawSignals.inflationBreakeven ?? null,
          credit_spread: rawSignals.creditSpread ?? null,
          vix_term: rawSignals.vix ?? null,
        },
        current_regime_probabilities: rawRegime.current_regime?.probabilities ?? {},
        most_likely_regime: rawRegime.current_regime?.dominant_regime ?? null,
        worst_regime: worstEntry?.[0] ?? null,
        worst_regime_return: worstEntry?.[1]?.annual_return ?? 0,
      };
    } catch (e) {
      errors.push(`regime: ${e.message}`);
      regime = { regime_performance: {}, current_regime_signals: {}, current_regime_probabilities: {}, most_likely_regime: null, worst_regime: null, worst_regime_return: 0 };
    }

    try {
      const weightMap = Object.fromEntries(positions.map(p => [p.ticker, p.weight]));
      behavioral = calculateBehavioralResults(positions, priceData, xray.geography ?? { US: 1 }, xray.effective_holdings ?? []);
    } catch (e) {
      errors.push(`behavioral: ${e.message}`);
      behavioral = { home_bias: { flag: false }, concentration: { flag: false }, kelly: { by_ticker: {}, over_bet_positions: [], has_over_bet: false }, implicit_leverage: { has_leveraged_etf: false, effective_market_exposure: 1 }, recency_bias: { flag: false }, behavioral_flags: [] };
    }

    try {
      verdict = generateVerdict(xray, risk, factors, regime, behavioral, positions);
    } catch (e) {
      errors.push(`verdict: ${e.message}`);
      verdict = { grade: 'C', overall_score: 55, dimension_scores: {}, headline: 'Analysis partially complete.', key_findings: [], three_actions: [] };
    }

    return NextResponse.json({ xray, risk, factors, regime, behavioral, verdict, _errors: errors });
  } catch (err) {
    console.error('Analyze error:', err);
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 });
  }
}
