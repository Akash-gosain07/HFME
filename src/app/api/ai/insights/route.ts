import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { aiClient } from '@/lib/ai-client';

export async function POST(request: NextRequest) {
  try {
    const { workflowId, stepId } = await request.json();

    // Get step and metrics
    const step = await prisma.step.findUnique({
      where: { id: stepId },
      include: {
        aggregatedMetrics: true,
      },
    });

    if (!step || !step.aggregatedMetrics) {
      return NextResponse.json({ error: 'Step or metrics not found' }, { status: 404 });
    }

    const metrics = step.aggregatedMetrics;

    // Get historical metrics for anomaly detection
    const historicalMetrics = await prisma.aggregatedMetrics.findMany({
      where: {
        workflowId,
        stepId,
      },
      orderBy: { calculatedAt: 'asc' },
      take: 30,
    });

    const metricData = historicalMetrics.map((m) => ({
      timestamp: m.calculatedAt.toISOString(),
      frictionScore: m.frictionScore,
      avgTime: m.avgTime,
      retries: m.retries,
      idleTime: m.idleTime,
      backNav: m.backNav,
      dropOffRate: m.dropOffRate,
    }));

    // Detect anomalies
    const anomalyResult = await aiClient.detectAnomalies(workflowId, stepId, metricData);

    // Predict friction
    const predictionResult = await aiClient.predictFriction(workflowId, stepId, metricData);

    // Generate explanation
    const currentMetrics = {
      timestamp: metrics.calculatedAt.toISOString(),
      frictionScore: metrics.frictionScore,
      avgTime: metrics.avgTime,
      retries: metrics.retries,
      idleTime: metrics.idleTime,
      backNav: metrics.backNav,
      dropOffRate: metrics.dropOffRate,
    };

    const explanationResult = await aiClient.generateExplanation(
      workflowId,
      stepId,
      step.name,
      currentMetrics,
      anomalyResult.hasAnomaly,
      predictionResult.trend
    );

    // Store AI insight
    const insight = await prisma.aIInsight.create({
      data: {
        workflowId,
        stepId,
        detectedIssue: explanationResult.detectedIssue,
        impactScore: explanationResult.impactScore,
        recommendation: explanationResult.recommendation,
        confidenceLevel: explanationResult.confidenceLevel,
        insightType: anomalyResult.hasAnomaly ? 'anomaly' : 'prediction',
      },
    });

    return NextResponse.json({
      insight,
      anomaly: anomalyResult,
      prediction: predictionResult,
      explanation: explanationResult,
    });
  } catch (error) {
    console.error('Failed to generate insights:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}
