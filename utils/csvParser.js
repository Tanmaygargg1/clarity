/**
 * Client-side CSV parsing with PapaParse.
 * Used for previewing broker exports before upload.
 */

// Dynamic import guard — PapaParse is client-only
let Papa = null;
async function getPapa() {
  if (!Papa) {
    Papa = (await import('papaparse')).default;
  }
  return Papa;
}

const BROKER_SIGNATURES = {
  Fidelity: ['Symbol', 'Description', 'Quantity', 'Last Price', 'Current Value'],
  Schwab: ['Symbol', 'Description', 'Quantity', 'Price', 'Market Value'],
  'TD Ameritrade': ['Symbol', 'Description', 'Quantity', 'Trade Price', 'Market Value'],
  Vanguard: ['Ticker Symbol', 'Investment Name', 'Shares', 'Share Price', 'Total Value'],
  'Interactive Brokers': ['Symbol', 'Description', 'Quantity', 'Price', 'Value'],
  Robinhood: ['symbol', 'name', 'quantity', 'average_buy_price', 'equity'],
};

/**
 * Detect broker from CSV headers.
 * @param {string[]} headers
 * @returns {string} broker name or 'Unknown'
 */
export function detectBroker(headers) {
  const headerSet = new Set(headers.map((h) => h.trim()));
  let bestBroker = 'Unknown';
  let bestScore = 0;

  for (const [broker, signature] of Object.entries(BROKER_SIGNATURES)) {
    const matched = signature.filter((col) => headerSet.has(col)).length;
    const score = matched / signature.length;
    if (score > bestScore) {
      bestScore = score;
      bestBroker = broker;
    }
  }

  return bestBroker;
}

/**
 * Normalize row data to a standard position object based on broker.
 */
function normalizeRow(row, broker, headers) {
  const h = headers.map((h) => h.trim());
  const get = (candidates) => {
    for (const c of candidates) {
      const idx = h.findIndex(
        (header) => header.toLowerCase() === c.toLowerCase()
      );
      if (idx !== -1) {
        const val = row[h[idx]];
        return val != null ? String(val).trim() : '';
      }
    }
    return '';
  };

  const ticker = get(['Symbol', 'symbol', 'Ticker Symbol', 'Ticker']);
  const name = get(['Description', 'name', 'Investment Name', 'Security Name']);
  const quantityRaw = get(['Quantity', 'quantity', 'Shares']);
  const priceRaw = get(['Last Price', 'Price', 'Share Price', 'average_buy_price', 'Trade Price']);
  const valueRaw = get(['Current Value', 'Market Value', 'Total Value', 'Value', 'equity']);

  // Clean numeric values
  const cleanNum = (str) => {
    if (!str) return null;
    const cleaned = String(str).replace(/[$,%\s]/g, '').replace(/,/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  };

  const quantity = cleanNum(quantityRaw);
  const price = cleanNum(priceRaw);
  const value = cleanNum(valueRaw);

  return { ticker, name, quantity, price, value };
}

const CASH_PATTERN = /^(cash|money market|settlement|pending|--|-)\s*$/i;
const OPTIONS_PATTERN = /^[A-Z]{1,5}\s+\d{6}[CP]\d+$/;

function isSkippableRow(ticker, name) {
  if (!ticker || ticker === '--' || ticker === '-' || ticker === '') return true;
  if (CASH_PATTERN.test(ticker)) return true;
  if (CASH_PATTERN.test(name)) return true;
  if (OPTIONS_PATTERN.test(ticker)) return true;
  return false;
}

/**
 * Parse a CSV text string and return normalized positions.
 * @param {string} text - raw CSV text
 * @returns {{ broker: string, positions: Array, warnings: string[] }}
 */
export async function parseCSV(text) {
  const papa = await getPapa();

  const warnings = [];

  // PapaParse
  const parsed = papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors && parsed.errors.length > 0) {
    parsed.errors.forEach((e) => {
      warnings.push(`Parse warning row ${e.row}: ${e.message}`);
    });
  }

  const headers = parsed.meta.fields || [];
  const broker = detectBroker(headers);

  const positions = [];
  let skipped = 0;

  for (const row of parsed.data) {
    const norm = normalizeRow(row, broker, headers);

    if (isSkippableRow(norm.ticker, norm.name)) {
      skipped++;
      continue;
    }

    // Determine value type and amount
    let valueType = 'shares';
    let amount = norm.quantity;

    if (amount == null && norm.value != null) {
      valueType = 'dollars';
      amount = norm.value;
    }

    if (amount == null || amount <= 0) {
      warnings.push(`Skipped ${norm.ticker}: no valid quantity or value.`);
      continue;
    }

    positions.push({
      ticker: norm.ticker.toUpperCase(),
      name: norm.name,
      amount: String(amount),
      valueType,
      price: norm.price,
      valid: null,
    });
  }

  if (skipped > 0) {
    warnings.push(`Skipped ${skipped} row(s) (cash, options, or empty tickers).`);
  }

  if (positions.length === 0) {
    warnings.push('No valid positions found in the CSV file.');
  }

  return { broker, positions, warnings };
}
