import { inflateRawSync } from 'zlib';
import { ols } from './matrix.js';

function unzipFirstFile(buf) {
  const sig = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  const offset = buf.indexOf(sig);
  if (offset === -1) throw new Error('Not a ZIP file');
  const compression = buf.readUInt16LE(offset + 8);
  const compressedSize = buf.readUInt32LE(offset + 18);
  const fnLen = buf.readUInt16LE(offset + 26);
  const extraLen = buf.readUInt16LE(offset + 28);
  const dataOffset = offset + 30 + fnLen + extraLen;
  const compressed = buf.slice(dataOffset, dataOffset + compressedSize);
  return (compression === 8 ? inflateRawSync(compressed) : compressed).toString('latin1');
}

/**
 * Fetches and parses Fama-French 5-factor daily data.
 * @returns {Array<{ date: string, 'MKT-RF': number, SMB: number, HML: number, RMW: number, CMA: number, RF: number }>}
 */
export async function fetchFrenchFactors() {
  const url = 'https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/F-F_Research_Data_5_Factors_2x3_daily_CSV.zip';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const csvText = unzipFirstFile(buf);
    return parseFrenchCSV(csvText, ['MKT-RF', 'SMB', 'HML', 'RMW', 'CMA', 'RF']);
  } catch (err) {
    console.error('fetchFrenchFactors failed:', err?.message || err);
    return [];
  }
}

/**
 * Fetches and parses Fama-French Momentum factor daily data.
 * @returns {Array<{ date: string, MOM: number }>}
 */
export async function fetchMomentum() {
  const url = 'https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/F-F_Momentum_Factor_daily_CSV.zip';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const csvText = unzipFirstFile(buf);
    return parseFrenchCSV(csvText, ['MOM']);
  } catch (err) {
    console.error('fetchMomentum failed:', err?.message || err);
    return [];
  }
}

/**
 * Parses Fama-French CSV format.
 * Header rows are skipped until we find rows starting with 8-digit dates (YYYYMMDD).
 * All factor values are divided by 100 (they are in percent).
 * @param {string} csvText
 * @param {string[]} factorNames - ordered factor column names after the date column
 * @returns {Array<Object>}
 */
function parseFrenchCSV(csvText, factorNames) {
  const lines = csvText.split('\n');
  const result = [];
  const dateRegex = /^\s*(\d{8})\s*,/;

  for (const line of lines) {
    if (!dateRegex.test(line)) continue;
    const parts = line.trim().split(',').map((s) => s.trim());
    const dateStr = parts[0];
    // Parse YYYYMMDD
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    const date = `${year}-${month}-${day}`;

    const entry = { date };
    for (let i = 0; i < factorNames.length; i++) {
      const val = parseFloat(parts[i + 1]);
      entry[factorNames[i]] = isNaN(val) ? null : val / 100;
    }

    // Skip rows where essential values are missing
    if (Object.values(entry).some((v) => v === null && v !== entry.date)) continue;
    result.push(entry);
  }

  return result;
}

/**
 * Run Fama-French 5-factor + momentum regression on portfolio returns.
 * @param {Array<{ date: string, return: number }>} portfolioReturns
 * @param {Array<{ ticker: string, weight: number, value: number }>} positions
 * @returns {Object} factor analysis result
 */
export async function runFactorAnalysis(portfolioReturns, positions) {
  try {
    // 1. Fetch FF5 + momentum factors in parallel
    const [ff5Data, momData] = await Promise.all([fetchFrenchFactors(), fetchMomentum()]);

    if (ff5Data.length === 0) {
      return buildFallbackFactorResult(positions);
    }

    // 2. Build lookup maps by date
    const ff5Map = {};
    for (const row of ff5Data) {
      ff5Map[row.date] = row;
    }
    const momMap = {};
    for (const row of momData) {
      momMap[row.date] = row;
    }

    // 3. Align portfolio returns with factor data
    const portMap = {};
    for (const row of portfolioReturns) {
      portMap[row.date] = row.return;
    }

    const commonDates = Object.keys(portMap).filter(
      (d) => ff5Map[d] && ff5Map[d]['MKT-RF'] !== null
    ).sort();

    if (commonDates.length < 30) {
      return buildFallbackFactorResult(positions);
    }

    // 4. Calculate portfolio excess returns
    const yData = commonDates.map((d) => portMap[d] - (ff5Map[d].RF || 0));
    const xData = commonDates.map((d) => {
      const ff = ff5Map[d];
      const mom = momMap[d];
      return [
        ff['MKT-RF'] ?? 0,
        ff.SMB ?? 0,
        ff.HML ?? 0,
        ff.RMW ?? 0,
        ff.CMA ?? 0,
        mom?.MOM ?? 0,
      ];
    });

    // 5. OLS regression
    const reg = ols(xData, yData);
    const [intercept, mktBeta, smbBeta, hmlBeta, rmwBeta, cmaBeta, momBeta] = reg.coefficients;

    // 6. Annualize alpha
    const alphaAnnual = intercept * 252;

    // R-squared
    const rSquared = reg.rSquared;

    // Factor t-stats and p-values (skip intercept at index 0)
    const factors = ['MKT-RF', 'SMB', 'HML', 'RMW', 'CMA', 'MOM'];
    const factorLoadings = {};
    for (let i = 0; i < factors.length; i++) {
      factorLoadings[factors[i]] = {
        beta: reg.coefficients[i + 1],
        tStat: reg.tStats[i + 1],
        pValue: reg.pValues[i + 1],
        stderr: reg.stderr[i + 1],
      };
    }

    // 7. Expense ratios
    const { blended_expense_ratio, factor_replication_cost } = await calculateCosts(positions);

    // 8. Factor attribution (% of variance explained)
    const totalVariance = yData.reduce((acc, y) => acc + y * y, 0) / yData.length;
    const residualVariance = reg.residuals.reduce((acc, e) => acc + e * e, 0) / yData.length;
    const explainedVariance = totalVariance - residualVariance;

    // Interpret factor style
    const styleProfile = interpretStyle({
      mktBeta,
      smbBeta,
      hmlBeta,
      rmwBeta,
      cmaBeta,
      momBeta,
    });

    return {
      alpha_annual: alphaAnnual,
      alpha_tstat: reg.tStats[0],
      alpha_pvalue: reg.pValues[0],
      r_squared: rSquared,
      factor_loadings: factorLoadings,
      style_profile: styleProfile,
      blended_expense_ratio,
      factor_replication_cost,
      observation_count: commonDates.length,
      date_range: {
        start: commonDates[0],
        end: commonDates[commonDates.length - 1],
      },
    };
  } catch (err) {
    console.error('runFactorAnalysis failed:', err?.message || err);
    return buildFallbackFactorResult(positions);
  }
}

/**
 * Calculate blended expense ratio from positions.
 */
async function calculateCosts(positions) {
  const FACTOR_REPLICATION_COST = 0.001; // 10bps constant

  if (!positions || positions.length === 0) {
    return { blended_expense_ratio: 0, factor_replication_cost: FACTOR_REPLICATION_COST };
  }

  const totalValue = positions.reduce((sum, p) => sum + (p.value || 0), 0);
  let weightedER = 0;

  try {
    const { default: yahooFinance } = await import('yahoo-finance2');
    const erResults = await Promise.allSettled(
      positions.map(async (pos) => {
        const q = await yahooFinance.quote(pos.ticker);
        return {
          weight: totalValue > 0 ? (pos.value || 0) / totalValue : 0,
          er: q?.annualReportExpenseRatio ?? 0,
        };
      })
    );

    for (const result of erResults) {
      if (result.status === 'fulfilled') {
        weightedER += result.value.weight * result.value.er;
      }
    }
  } catch (err) {
    console.error('calculateCosts: expense ratio fetch failed', err?.message);
  }

  return {
    blended_expense_ratio: weightedER,
    factor_replication_cost: FACTOR_REPLICATION_COST,
  };
}

/**
 * Interpret style from factor loadings.
 */
function interpretStyle({ mktBeta, smbBeta, hmlBeta, rmwBeta, cmaBeta, momBeta }) {
  const size = smbBeta > 0.1 ? 'Small-cap tilt' : smbBeta < -0.1 ? 'Large-cap tilt' : 'Market-cap neutral';
  const value = hmlBeta > 0.1 ? 'Value tilt' : hmlBeta < -0.1 ? 'Growth tilt' : 'Blend';
  const profitability = rmwBeta > 0.1 ? 'Profitable firms' : rmwBeta < -0.1 ? 'Speculative firms' : 'Neutral profitability';
  const investment = cmaBeta > 0.1 ? 'Conservative investment' : cmaBeta < -0.1 ? 'Aggressive investment' : 'Neutral investment';
  const momentum = momBeta > 0.1 ? 'Momentum exposure' : momBeta < -0.1 ? 'Contrarian exposure' : 'Neutral momentum';

  return { size, value, profitability, investment, momentum, market_beta: mktBeta };
}

/**
 * Fallback factor result when data fetch fails.
 */
function buildFallbackFactorResult(positions) {
  return {
    alpha_annual: null,
    alpha_tstat: null,
    alpha_pvalue: null,
    r_squared: null,
    factor_loadings: {},
    style_profile: null,
    blended_expense_ratio: null,
    factor_replication_cost: 0.001,
    observation_count: 0,
    error: 'Factor data unavailable',
  };
}
