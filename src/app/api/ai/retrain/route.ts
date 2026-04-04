import { NextResponse } from 'next/server';

import { aiClient } from '@/lib/ai-client';
import { requireAdmin } from '@/lib/session-guards';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const auth = await requireAdmin();
  if (auth.response) {
    return auth.response;
  }

  try {
    return NextResponse.json(await aiClient.retrainLiveModels());
  } catch (error) {
    console.error('Failed to retrain live models:', error);
    return NextResponse.json({ error: 'Failed to retrain live models.' }, { status: 502 });
  }
}
