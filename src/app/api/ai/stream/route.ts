import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/session-guards';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireSession();
  if (auth.response) {
    return auth.response;
  }

  const response = await fetch(process.env.AI_SERVICE_URL ? `${process.env.AI_SERVICE_URL}/events/stream` : 'http://localhost:8000/events/stream', {
    headers: {
      'X-HFME-AI-Key': process.env.AI_INTERNAL_API_KEY || 'hfme-internal-key',
    },
    cache: 'no-store',
  });

  if (!response.ok || !response.body) {
    return NextResponse.json({ error: 'Unable to connect to the live AI stream.' }, { status: 502 });
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
