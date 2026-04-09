import { NextResponse } from 'next/server';

import { requireSession } from '@/lib/session-guards';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Increase max duration for long-lived SSE connections
export const maxDuration = 300;

export async function GET() {
  const auth = await requireSession();
  if (auth.response) {
    return auth.response;
  }

  const aiUrl = process.env.AI_SERVICE_URL
    ? `${process.env.AI_SERVICE_URL}/events/stream`
    : 'http://localhost:8000/events/stream';

  let response: Response;
  try {
    response = await fetch(aiUrl, {
      headers: {
        'X-HFME-AI-Key': process.env.AI_INTERNAL_API_KEY || 'hfme-internal-key',
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'AI service is unreachable.' }, { status: 502 });
  }

  if (!response.ok || !response.body) {
    return NextResponse.json({ error: 'Unable to connect to the live AI stream.' }, { status: 502 });
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Transfer-Encoding': 'chunked',
    },
  });
}
