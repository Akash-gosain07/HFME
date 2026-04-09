import { NextResponse } from 'next/server';

import { aiClient } from '@/lib/ai-client';
import { requireAdmin } from '@/lib/session-guards';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) {
    return auth.response;
  }

  try {
    return NextResponse.json(await aiClient.getModelStatus());
  } catch (error) {
    console.error('Failed to fetch AI model status:', error);
    return NextResponse.json({ error: 'Failed to fetch AI model status.' }, { status: 502 });
  }
}
