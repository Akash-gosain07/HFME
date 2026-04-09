import { NextResponse } from 'next/server';

import { aiClient } from '@/lib/ai-client';
import { requireSession } from '@/lib/session-guards';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireSession();
  if (auth.response) {
    return auth.response;
  }

  try {
    return NextResponse.json(await aiClient.getLiveSnapshot());
  } catch (error) {
    console.error('Failed to fetch live snapshot:', error);
    return NextResponse.json({ error: 'Failed to fetch live snapshot.' }, { status: 502 });
  }
}
