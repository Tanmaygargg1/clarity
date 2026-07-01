import yahooFinance from 'yahoo-finance2';

/**
 * Fetches historical price data for multiple tickers.
 * @param {string[]} tickers - Array of ticker symbols
 * @param {string} period - '1y', '2y', '3y', '5y'
 * @returns {Object} keyed by ticker: { AAPL: [{date, close}, ...], ... }
 */
export async function getPriceHistory(tickers, period = '3y') {
  const years = parseInt(period.replace('y', ''), 10) || 3;
  const period2 = new Date();
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - years);

  const results = await Promise.allSettled(
    tickers.map(async (ticker) => {
      const data = await yahooFinance.historical(ticker, {
        period1: period1.toISOString().split('T')[0],
        period2: period2.toISOString().split('T')[0],
        interval: '1d',
      });
      return {
        ticker,
        data: (data || []).map((row) => ({
          date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date),
          open: row.open ?? null,
          high: row.high ?? null,
          low: row.low ?? null,
          close: row.close ?? null,
          adjClose: row.adjClose ?? row.close ?? null,
          volume: row.volume ?? null,
        })),
      };
    })
  );

  const output = {};
  for (const result of results) {
    if (result.status === 'fulfilled') {
      output[result.value.ticker] = result.value.data;
    } else {
      // Log the error but return empty array for this ticker
      const ticker = tickers[results.indexOf(result)];
      console.error(`getPriceHistory failed for ticker:`, result.reason?.message || result.reason);
      if (ticker) output[ticker] = [];
    }
  }

  // Ensure all requested tickers have an entry
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
    const quote = await yahooFinance.quote(ticker, {}, { validateResult: false });
    if (!quote) return { valid: false, error: 'no quote returned' };

    let type = 'stock';
    if (quote.quoteType === 'ETF') type = 'ETF';
    else if (quote.quoteType === 'CRYPTOCURRENCY') type = 'crypto';

    return {
      valid: true,
      name: quote.longName || quote.shortName || ticker,
      price: quote.regularMarketPrice ?? null,
      type,
      sector: quote.sector || null,
      expenseRatio: quote.annualReportExpenseRatio ?? quote.trailingAnnualDividendRate ?? null,
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
    const res = await yahooFinance.search(query);
    const quotes = res?.quotes || [];
    return quotes.slice(0, 8).map((q) => ({
      ticker: q.symbol || '',
      name: q.longname || q.shortname || q.symbol || '',
      exchange: q.exchange || '',
      type: q.quoteType || 'stock',
    }));
  } catch (err) {
    console.error(`searchTickers failed for "${query}":`, err?.message || err);
    return [{ error: err?.message || String(err) }];
  }
}

/**
 * Returns the current price of a ticker.
 * @param {string} ticker
 * @returns {number|null}
 */
export async function getCurrentPrice(ticker) {
  try {
    const quote = await yahooFinance.quote(ticker);
    return quote?.regularMarketPrice ?? null;
  } catch (err) {
    console.error(`getCurrentPrice failed for ${ticker}:`, err?.message || err);
    return null;
  }
}

/**
 * Returns the current risk-free rate (3-month T-bill yield).
 * Uses FRED API if FRED_API_KEY is set; otherwise falls back to 0.05.
 * @returns {number} annual decimal rate (e.g. 0.052)
 */
export async function getRiskFreeRate() {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return 0.05;
  }

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=DTB3&api_key=${apiKey}&sort_order=desc&limit=1&file_type=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`FRED returned ${res.status}`);
    const json = await res.json();
    const value = parseFloat(json?.observations?.[0]?.value);
    if (isNaN(value)) throw new Error('FRED value NaN');
    // FRED returns in percent (e.g. 5.25), convert to decimal
    return value / 100;
  } catch (err) {
    console.error('getRiskFreeRate FRED fetch failed:', err?.message || err);
    return 0.05;
  }
}
