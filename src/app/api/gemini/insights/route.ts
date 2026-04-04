import { NextRequest, NextResponse } from 'next/server';
import { generateFrictionInsights, FrictionMetricInput } from '@/lib/gemini-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const metrics: FrictionMetricInput[] = body.metrics;

    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return NextResponse.json({ error: 'metrics array is required' }, { status: 400 });
    }

    const insights = await generateFrictionInsights(metrics);

    return NextResponse.json({ insights, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[api/gemini/insights] Error:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}

// GET: generate insights from default high-friction steps (for dashboard auto-load)
export async function GET() {
  const defaultMetrics: FrictionMetricInput[] = [
    { stepName: 'Payment Details', frictionScore: 0.82, avgTime: 94.2, retries: 6, idleTime: 41, backNav: 3, dropOffRate: 0.38, sessionCount: 1240 },
    { stepName: 'Address Verification', frictionScore: 0.73, avgTime: 77.5, retries: 4, idleTime: 31, backNav: 2, dropOffRate: 0.29, sessionCount: 980 },
    { stepName: 'Email Confirmation', frictionScore: 0.63, avgTime: 55.1, retries: 3, idleTime: 19, backNav: 1, dropOffRate: 0.21, sessionCount: 2100 },
  ];

  try {
    const insights = await generateFrictionInsights(defaultMetrics);
    return NextResponse.json({ insights, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[api/gemini/insights] GET Error:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}
