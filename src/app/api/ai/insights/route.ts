import { NextRequest, NextResponse } from 'next/server';

import { aiClient } from '@/lib/ai-client';
import { findStep } from '@/lib/live-snapshot';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session-guards';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if (auth.response) {
    return auth.response;
  }

  try {
    const { workflowId, stepId } = (await request.json()) as {
      workflowId?: string;
      stepId?: string;
    };

    if (!workflowId || !stepId) {
      return NextResponse.json(
        { error: 'workflowId and stepId are required.' },
        { status: 400 }
      );
    }

    const snapshot = await aiClient.getLiveSnapshot();
    const result = findStep(snapshot, workflowId, stepId);

    if (!result) {
      return NextResponse.json({ error: 'Live workflow step not found.' }, { status: 404 });
    }

    const explanation = await aiClient.generateExplanation(
      workflowId,
      stepId,
      result.step.name,
      result.step.current,
      result.step.anomaly.hasAnomaly,
      result.step.prediction.trend
    );

    const insight = await prisma.aIInsight.create({
      data: {
        workflowId,
        stepId,
        detectedIssue: explanation.detectedIssue,
        impactScore: explanation.impactScore,
        recommendation: explanation.recommendation,
        confidenceLevel: explanation.confidenceLevel,
        insightType: result.step.anomaly.hasAnomaly ? 'anomaly' : 'recommendation',
      },
    });

    return NextResponse.json({
      insight,
      explanation,
      anomaly: result.step.anomaly,
      prediction: result.step.prediction,
    });
  } catch (error) {
    console.error('Failed to generate live insights:', error);
    return NextResponse.json({ error: 'Failed to generate live insights.' }, { status: 500 });
  }
}
