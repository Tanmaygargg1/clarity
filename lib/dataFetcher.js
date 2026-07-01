const YF_BASE = 'https://query1.finance.yahoo.com';
const YF_BASE2 = 'https://query2.finance.yahoo.com';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

async function yFetch(url) {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status} for ${url}`);
  return res.json();
}

/**
 * Lightweight Yahoo Finance quote — returns fields commonly needed by the app.
 * Uses the v8 chart endpoint (no authentication required).
 * @param {string} ticker
 * @returns {Promise<{ quoteType: string, longName: string, shortName: string, regularMarketPrice: number|null, marketCap: number|null, sector: string|null, country: string|null } | null>}
 */
export async function yquote(ticker) {
  try {
    const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
    const json = await yFetch(url);
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return {
      quoteType: meta.instrumentType ?? 'EQUITY',
      longName: meta.longName ?? meta.shortName ?? ticker,
      shortName: meta.shortName ?? meta.longName ?? ticker,
      regularMarketPrice: meta.regularMarketPrice ?? null,
      marketCap: meta.marketCap ?? null,
      sector: null,
      country: null,
    };
  } catch {
    return null;
  }
}

/**
 * Fetches historical price data for multiple tickers.
 * @param {string[]} tickers
 * @param {string} period - '1y', '2y', '3y', '5y'
 * @returns {Object} keyed by ticker: { AAPL: [{date, close}, ...], ... }
 */
export async function getPriceHistory(tickers, period = '3y') {
  const years = parseInt(period.replace('y', ''), 10) || 3;
  const range = `${years}y`;

  const results = await Promise.allSettled(
    tickers.map(async (ticker) => {
      const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=${range}`;
      const json = await yFetch(url);
      const result = json?.chart?.result?.[0];
      if (!result) return { ticker, data: [] };

      const timestamps = result.timestamp || [];
      const closes = result.indicators?.adjclose?.[0]?.adjclose || result.indicators?.quote?.[0]?.close || [];
      const opens = result.indicators?.quote?.[0]?.open || [];
      const highs = result.indicators?.quote?.[0]?.high || [];
      const lows = result.indicators?.quote?.[0]?.low || [];
      const volumes = result.indicators?.quote?.[0]?.volume || [];

      const data = timestamps.map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        open: opens[i] ?? null,
        high: highs[i] ?? null,
        low: lows[i] ?? null,
        close: closes[i] ?? null,
        adjClose: closes[i] ?? null,
        volume: volumes[i] ?? null,
      })).filter((row) => row.close !== null);

      return { ticker, data };
    })
  );

  const output = {};
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      output[result.value.ticker] = result.value.data;
    } else {
      console.error(`getPriceHistory failed for ${tickers[i]}:`, result.reason?.message);
      output[tickers[i]] = [];
    }
  }
  for (const t of tickers) {
    if (!(t in output)) output[t] = [];
  }
  return output;
}

/**
 * Validates a ticker symbol via Yahoo Finance.
 * @param {string} ticker
 * @returns {{ valid: boolean, name: string, price: number, type: string, sector: string, expenseRatio: number|null }}
 */
export async function validateTicker(ticker) {
  try {
    const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
    const json = await yFetch(url);
    const result = json?.chart?.result?.[0];
    if (!result) return { valid: false, error: 'no result from Yahoo Finance' };

    const meta = result.meta || {};
    const type = meta.instrumentType === 'ETF' ? 'ETF'
      : meta.instrumentType === 'CRYPTOCURRENCY' ? 'crypto'
      : 'stock';

    return {
      valid: true,
      name: meta.longName || meta.shortName || ticker,
      price: meta.regularMarketPrice ?? null,
      type,
      sector: null,
      expenseRatio: null,
    };
  } catch (err) {
    console.error(`validateTicker failed for ${ticker}:`, err?.message || err);
    return { valid: false, error: err?.message || String(err) };
  }
}

/**
 * Searches for tickers matching a query string.
 * @param {string} query
 * @returns {Array<{ ticker: string, name: string, exchange: string, type: string }>}
 */
export async function searchTickers(query) {
  try {
    const url = `${YF_BASE2}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;
    const json = await yFetch(url);
    const quotes = json?.finance?.result?.[0]?.quotes || json?.quotes || [];
    return quotes.slice(0, 8).map((q) => ({
      ticker: q.symbol || '',
      name: q.longname || q.shortname || q.symbol || '',
      exchange: q.exchange || '',
      type: q.quoteType || 'stock',
    }));
  } catch (err) {
    console.error(`searchTickers failed for "${query}":`, err?.message || err);
    return [];
  }
}

/**
 * Returns the current price of a ticker.
 * @param {string} ticker
 * @returns {number|null}
 */
export async function getCurrentPrice(ticker) {
  try {
    const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
    const json = await yFetch(url);
    return json?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch (err) {
    console.error(`getCurrentPrice failed for ${ticker}:`, err?.message || err);
    return null;
  }
}

/**
 * Returns the current risk-free rate (3-month T-bill yield) from FRED.
 * @returns {number} annual decimal rate (e.g. 0.052)
 */
export async function getRiskFreeRate() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return 0.05;

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=DTB3&api_key=${apiKey}&sort_order=desc&limit=1&file_type=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`FRED returned ${res.status}`);
    const json = await res.json();
    const value = parseFloat(json?.observations?.[0]?.value);
    if (isNaN(value)) throw new Error('FRED value NaN');
    return value / 100;
  } catch (err) {
    console.error('getRiskFreeRate FRED fetch failed:', err?.message || err);
    return 0.05;
  }
}
