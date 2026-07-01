import { NextResponse } from 'next/server';
import { validateTicker } from '@/lib/dataFetcher';

export async function POST(request) {
  try {
    const { ticker } = await request.json();
    if (!ticker) return NextResponse.json({ valid: false }, { status: 400 });
    const result = await validateTicker(ticker.toUpperCase());
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ valid: false, error: err.message }, { status: 500 });
  }
}
