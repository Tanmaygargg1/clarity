import { NextResponse } from 'next/server';
import { searchTickers } from '@/lib/dataFetcher';

export async function GET(request) {
  try {
    const q = new URL(request.url).searchParams.get('q') || '';
    if (!q || q.length < 1) return NextResponse.json([]);
    const results = await searchTickers(q);
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json([], { status: 500 });
  }
}
