import { yquote } from './dataFetcher.js';

/**
 * Known ETF sector breakdowns as fallback when live data is unavailable.
 * Weights are approximate and represent sector allocations.
 */
const ETF_SECTOR_PROXIES = {
  QQQ: {
    Technology: 0.55,
    'Consumer Cyclical': 0.18,
    Healthcare: 0.07,
    'Communication Services': 0.08,
    'Consumer Defensive': 0.04,
    Industrials: 0.04,
    Other: 0.04,
  },
  VOO: {
    Technology: 0.30,
    Healthcare: 0.13,
    Financials: 0.13,
    'Consumer Cyclical': 0.11,
    'Communication Services': 0.09,
    Industrials: 0.08,
    'Consumer Defensive': 0.06,
    Energy: 0.04,
    'Real Estate': 0.03,
    Materials: 0.02,
    Utilities: 0.02,
  },
  SPY: {
    Technology: 0.30,
    Healthcare: 0.13,
    Financials: 0.13,
    'Consumer Cyclical': 0.11,
    'Communication Services': 0.09,
    Industrials: 0.08,
    'Consumer Defensive': 0.06,
    Energy: 0.04,
    'Real Estate': 0.03,
    Materials: 0.02,
    Utilities: 0.02,
  },
  IVV: {
    Technology: 0.30,
    Healthcare: 0.13,
    Financials: 0.13,
    'Consumer Cyclical': 0.11,
    'Communication Services': 0.09,
    Industrials: 0.08,
    'Consumer Defensive': 0.06,
    Energy: 0.04,
    'Real Estate': 0.03,
    Materials: 0.02,
    Utilities: 0.02,
  },
  VT: {
    Technology: 0.22,
    Financials: 0.15,
    Industrials: 0.13,
    Healthcare: 0.12,
    'Consumer Cyclical': 0.10,
    'Communication Services': 0.07,
    'Consumer Defensive': 0.07,
    Energy: 0.05,
    Materials: 0.04,
    'Real Estate': 0.03,
    Utilities: 0.03,
  },
  VTI: {
    Technology: 0.29,
    Healthcare: 0.13,
    Financials: 0.13,
    'Consumer Cyclical': 0.11,
    Industrials: 0.09,
    'Communication Services': 0.09,
    'Consumer Defensive': 0.06,
    Energy: 0.04,
    'Real Estate': 0.03,
    Materials: 0.02,
    Utilities: 0.02,
  },
  VEA: {
    Financials: 0.19,
    Industrials: 0.16,
    Healthcare: 0.14,
    Technology: 0.10,
    'Consumer Cyclical': 0.10,
    'Consumer Defensive': 0.10,
    Materials: 0.08,
    Energy: 0.05,
    'Communication Services': 0.04,
    Utilities: 0.04,
  },
  VWO: {
    Technology: 0.20,
    Financials: 0.22,
    'Consumer Cyclical': 0.12,
    'Communication Services': 0.10,
    Energy: 0.08,
    Materials: 0.07,
    Healthcare: 0.05,
    Industrials: 0.07,
    'Consumer Defensive': 0.05,
    Other: 0.04,
  },
  AGG: {
    'US Treasuries': 0.43,
    'Mortgage-Backed': 0.27,
    'Corporate Bonds': 0.24,
    Other: 0.06,
  },
  BND: {
    'US Treasuries': 0.44,
    'Mortgage-Backed': 0.21,
    'Corporate Bonds': 0.28,
    Other: 0.07,
  },
  GLD: {
    Commodities: 1.0,
  },
  IAU: {
    Commodities: 1.0,
  },
  XLK: {
    Technology: 0.95,
    Other: 0.05,
  },
  XLF: {
    Financials: 0.95,
    Other: 0.05,
  },
  XLV: {
    Healthcare: 0.95,
    Other: 0.05,
  },
  ARKK: {
    Technology: 0.45,
    Healthcare: 0.30,
    'Consumer Cyclical': 0.15,
    Other: 0.10,
  },
};

/**
 * International exchange suffixes indicating non-US equities.
 */
const INTL_SUFFIXES = ['.L', '.T', '.HK', '.PA', '.DE', '.TO', '.AX', '.MI', '.NS', '.BO', '.KS', '.SW', '.SZ', '.SS'];

/**
 * Checks if a ticker is an ETF via Yahoo Finance.
 * @param {string} ticker
 * @returns {Promise<boolean>}
 */
export async function isETF(ticker) {
  try {
    const quote = await yquote(ticker);
    return quote?.quoteType === 'ETF';
  } catch {
    return false;
  }
}

/**
 * Attempts to retrieve ETF holdings.
 * Falls back to sector proxy or Yahoo Finance topHoldings.
 * @param {string} ticker
 * @returns {Promise<Array<{ ticker: string, weight: number, name: string }>>}
 */
export async function getETFHoldings(ticker) {
  const upperTicker = ticker.toUpperCase();

  // Try iShares CSV endpoint first (works for BlackRock ETFs)
  try {
    const iSharesUrl = `https://www.ishares.com/us/products/239726/IVV/1467271812596.ajax?fileType=csv&fileName=IVV_holdings&dataType=fund`;
    // Note: iShares URL structure varies by ETF; this is a generic attempt
    // In production, you'd maintain a mapping of ETF → iShares product ID
    // We'll skip this and fall through to Yahoo Finance
    throw new Error('iShares CSV not implemented for generic ETFs');
  } catch {
    // Fall through to proxy / Yahoo Finance
  }

  // Check sector proxy
  if (ETF_SECTOR_PROXIES[upperTicker]) {
    // Convert sector proxy to pseudo-holdings format
    return Object.entries(ETF_SECTOR_PROXIES[upperTicker]).map(([sector, weight]) => ({
      ticker: `[${sector}]`,
      weight,
      name: sector,
      isSector: true,
    }));
  }

  // No holdings data available from free API — fall through to last resort

  // Last resort: return the ETF itself as a single holding
  return [{ ticker, weight: 1.0, name: ticker }];
}

/**
 * Classify market cap tier based on USD value.
 * @param {number|null} marketCap
 * @returns {string}
 */
function classifyMarketCap(marketCap) {
  if (!marketCap) return 'Unknown';
  if (marketCap >= 200e9) return 'Mega';
  if (marketCap >= 10e9) return 'Large';
  if (marketCap >= 2e9) return 'Mid';
  if (marketCap >= 300e6) return 'Small';
  return 'Micro';
}

/**
 * Determine geography classification for a ticker.
 * @param {string} ticker
 * @param {string|null} country - from Yahoo Finance quote
 * @returns {string}
 */
function classifyGeography(ticker, country) {
  if (country && country !== 'United States') return 'International';
  if (INTL_SUFFIXES.some((suffix) => ticker.endsWith(suffix))) return 'International';
  return 'US';
}

/**
 * Decomposes a portfolio into effective holdings, sector weights, geography, and market cap.
 * @param {Array<{ ticker: string, weight: number, value: number }>} positions
 * @returns {Promise<Object>}
 */
export async function decomposePortfolio(positions) {
  const totalValue = positions.reduce((sum, p) => sum + (p.value || 0), 0);

  // Normalize weights
  const normalizedPositions = positions.map((p) => ({
    ...p,
    weight: totalValue > 0 ? (p.value || 0) / totalValue : 1 / positions.length,
  }));

  // Determine which are ETFs
  const etfFlags = await Promise.allSettled(
    normalizedPositions.map((p) => isETF(p.ticker))
  );

  const effective = {}; // ticker → { weight, name, sector, geography, marketCap }
  const sectorWeights = {};
  const geographyWeights = { US: 0, International: 0, Unknown: 0 };
  const marketCapBuckets = { Mega: 0, Large: 0, Mid: 0, Small: 0, Micro: 0, Unknown: 0 };

  // Fetch quote data for all positions
  const quoteResults = await Promise.allSettled(
    normalizedPositions.map((p) => yquote(p.ticker))
  );

  for (let i = 0; i < normalizedPositions.length; i++) {
    const pos = normalizedPositions[i];
    const isEtf = etfFlags[i]?.status === 'fulfilled' ? etfFlags[i].value : false;
    const quote = quoteResults[i]?.status === 'fulfilled' ? quoteResults[i].value : null;

    if (isEtf) {
      // Decompose ETF into underlying holdings
      const holdings = await getETFHoldings(pos.ticker).catch(() => []);

      for (const holding of holdings) {
        const effectiveWeight = pos.weight * holding.weight;
        if (!holding.ticker || holding.isSector) {
          // Sector proxy — add to sector weights directly
          const sectorName = holding.name;
          sectorWeights[sectorName] = (sectorWeights[sectorName] || 0) + effectiveWeight;
          geographyWeights['US'] += effectiveWeight; // assume US for known ETFs
        } else {
          const key = holding.ticker.toUpperCase();
          if (effective[key]) {
            effective[key].weight += effectiveWeight;
          } else {
            effective[key] = {
              weight: effectiveWeight,
              name: holding.name,
              sector: null,
              geography: null,
              marketCap: null,
            };
          }
        }
      }
    } else {
      // Direct stock holding
      const key = pos.ticker.toUpperCase();
      if (effective[key]) {
        effective[key].weight += pos.weight;
      } else {
        effective[key] = {
          weight: pos.weight,
          name: quote?.longName || quote?.shortName || pos.ticker,
          sector: quote?.sector || null,
          geography: classifyGeography(pos.ticker, quote?.country),
          marketCap: quote?.marketCap ? classifyMarketCap(quote.marketCap) : null,
        };
      }
    }
  }

  // Fetch additional data for direct stock holdings without sector/geo info
  const unknownTickers = Object.entries(effective)
    .filter(([, v]) => !v.sector || !v.geography)
    .map(([k]) => k)
    .filter((k) => !k.startsWith('['));

  if (unknownTickers.length > 0) {
    const extraQuotes = await Promise.allSettled(
      unknownTickers.map((t) => yquote(t))
    );
    for (let i = 0; i < unknownTickers.length; i++) {
      const t = unknownTickers[i];
      const q = extraQuotes[i]?.status === 'fulfilled' ? extraQuotes[i].value : null;
      if (q && effective[t]) {
        effective[t].sector = effective[t].sector || q.sector || null;
        effective[t].geography = effective[t].geography || classifyGeography(t, q.country);
        effective[t].marketCap = effective[t].marketCap || classifyMarketCap(q.marketCap);
      }
    }
  }

  // Aggregate sector, geography, market cap from effective holdings
  for (const [ticker, data] of Object.entries(effective)) {
    if (ticker.startsWith('[')) continue; // already counted as sector proxy

    const w = data.weight;

    // Sector
    if (data.sector) {
      sectorWeights[data.sector] = (sectorWeights[data.sector] || 0) + w;
    } else {
      sectorWeights['Unknown'] = (sectorWeights['Unknown'] || 0) + w;
    }

    // Geography
    const geo = data.geography || 'Unknown';
    geographyWeights[geo] = (geographyWeights[geo] || 0) + w;

    // Market cap
    const cap = data.marketCap || 'Unknown';
    if (cap in marketCapBuckets) {
      marketCapBuckets[cap] += w;
    } else {
      marketCapBuckets['Unknown'] += w;
    }
  }

  // Top 10 concentration
  const sortedHoldings = Object.entries(effective)
    .filter(([k]) => !k.startsWith('['))
    .map(([ticker, data]) => ({ ticker, ...data }))
    .sort((a, b) => b.weight - a.weight);

  const top10 = sortedHoldings.slice(0, 10);
  const top10Concentration = top10.reduce((sum, h) => sum + h.weight, 0);

  // Count unique underlying stocks
  const uniqueUnderlyingStocks = sortedHoldings.filter(([k]) => !k?.startsWith?.('[')).length;

  return {
    effective_holdings: sortedHoldings,
    top_10_concentration: top10Concentration,
    top_10_holdings: top10,
    sector_weights: sectorWeights,
    geography: geographyWeights,
    market_cap: marketCapBuckets,
    unique_underlying_stocks: uniqueUnderlyingStocks,
  };
}
