import { NextRequest, NextResponse } from 'next/server';

import { aiClient } from '@/lib/ai-client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session-guards';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getOrCreateConfig() {
  const existing = await prisma.aIMonitoringConfig.findFirst();
  if (existing) {
    return existing;
  }

  return prisma.aIMonitoringConfig.create({
    data: {
      enabled: true,
      anomalySensitivity: 0.1,
      predictionEnabled: true,
      explanationEnabled: true,
      monitoringInterval: 1,
      alertThreshold: 0.7,
    },
  });
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) {
    return auth.response;
  }

  const config = await getOrCreateConfig();
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const current = await getOrCreateConfig();
    const updated = await prisma.aIMonitoringConfig.update({
      where: { id: current.id },
      data: {
        enabled: typeof body.enabled === 'boolean' ? body.enabled : current.enabled,
        anomalySensitivity:
          typeof body.anomalySensitivity === 'number'
            ? body.anomalySensitivity
            : current.anomalySensitivity,
        predictionEnabled:
          typeof body.predictionEnabled === 'boolean'
            ? body.predictionEnabled
            : current.predictionEnabled,
        explanationEnabled:
          typeof body.explanationEnabled === 'boolean'
            ? body.explanationEnabled
            : current.explanationEnabled,
        monitoringInterval:
          typeof body.monitoringInterval === 'number'
            ? body.monitoringInterval
            : current.monitoringInterval,
        alertThreshold:
          typeof body.alertThreshold === 'number' ? body.alertThreshold : current.alertThreshold,
      },
    });

    await aiClient.updateMonitoringConfig({
      enabled: updated.enabled,
      anomalySensitivity: updated.anomalySensitivity,
      predictionEnabled: updated.predictionEnabled,
      explanationEnabled: updated.explanationEnabled,
      monitoringInterval: updated.monitoringInterval,
      alertThreshold: updated.alertThreshold,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update AI config:', error);
    return NextResponse.json({ error: 'Failed to update AI config.' }, { status: 500 });
  }
}
