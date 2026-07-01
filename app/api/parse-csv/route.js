import { NextResponse } from 'next/server';

const BROKER_FORMATS = {
  fidelity:   { tickerCol: 'Symbol', valueCol: 'Current Value', sharesCol: 'Quantity' },
  schwab:     { tickerCol: 'Symbol', valueCol: 'Market Value', sharesCol: 'Quantity' },
  ib:         { tickerCol: 'Financial Instrument', valueCol: 'Value in USD', sharesCol: 'Position' },
  robinhood:  { tickerCol: 'symbol', valueCol: null, sharesCol: 'quantity', priceCol: 'average_buy_price' },
  vanguard:   { tickerCol: 'Investment Name', valueCol: 'Current Value', sharesCol: 'Shares' },
};

function detectBroker(headers) {
  const hl = headers.map(h => h.toLowerCase().trim());
  if (hl.includes('symbol') && hl.includes('description') && hl.some(h => h.includes('current value'))) return 'fidelity';
  if (hl.includes('symbol') && hl.some(h => h.includes('market value'))) return 'schwab';
  if (hl.some(h => h.includes('financial instrument'))) return 'ib';
  if (hl.includes('symbol') && hl.includes('average_buy_price')) return 'robinhood';
  if (hl.some(h => h.includes('investment name'))) return 'vanguard';
  return 'generic';
}

function isOptionsRow(ticker) {
  return /\s[CP]\s/.test(ticker) || /\d{6}[CP]\d/.test(ticker);
}

function isCashRow(ticker, name = '') {
  const kw = ['cash', 'sweep', 'pending', 'money market', 'settlement', 'fdic', 'core'];
  return kw.some(k => (ticker + name).toLowerCase().includes(k));
}

function parseNum(str) {
  if (!str) return 0;
  const n = parseFloat(String(str).replace(/[$,%]/g, '').replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());

    let headerIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
      const lower = cols.map(c => c.toLowerCase());
      if (lower.some(c => ['symbol', 'ticker', 'financial instrument', 'investment name'].includes(c))) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) return NextResponse.json({ error: 'Could not detect CSV format' }, { status: 400 });

    const headers = lines[headerIdx].split(',').map(c => c.trim().replace(/"/g, ''));
    const broker = detectBroker(headers);
    const fmt = BROKER_FORMATS[broker] || {};

    const tickerCol = fmt.tickerCol || headers.find(h => /symbol|ticker/i.test(h));
    const valueCol = fmt.valueCol || headers.find(h => /value|amount/i.test(h));
    const sharesCol = fmt.sharesCol || headers.find(h => /share|qty|quantity/i.test(h));
    const priceCol = fmt.priceCol;

    const positions = [];
    const warnings = [];

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
      if (cells.length < 2) continue;
      const row = {};
      headers.forEach((h, idx) => { row[h] = cells[idx] || ''; });

      const ticker = (row[tickerCol] || '').trim();
      if (!ticker || ticker === '--' || ticker === '') continue;
      if (isOptionsRow(ticker)) continue;
      const name = row['Description'] || row['Name'] || '';
      if (isCashRow(ticker, name)) continue;

      let value = valueCol ? parseNum(row[valueCol]) : 0;
      let shares = sharesCol ? parseNum(row[sharesCol]) : 0;

      if (broker === 'robinhood' && priceCol && shares > 0) {
        value = shares * parseNum(row[priceCol]);
      }

      if (value > 0 || shares > 0) {
        positions.push({ ticker, shares: Math.round(shares * 10000) / 10000, value: Math.round(value * 100) / 100 });
      }
    }

    if (positions.length === 0) warnings.push('No positions found. Please check the file format.');

    return NextResponse.json({ broker_detected: broker, positions, warnings });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
