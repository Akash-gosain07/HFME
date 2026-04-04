import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateFrictionScore } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params;

    // Get all steps
    const steps = await prisma.step.findMany({
      where: { workflowId },
      orderBy: { order: 'asc' },
    });

    // Calculate metrics for each step
    const metricsPromises = steps.map(async (step) => {
      // Get all events for this step
      const events = await prisma.event.findMany({
        where: { stepId: step.id },
        include: { session: true },
        orderBy: { timestamp: 'asc' },
      });

      if (events.length === 0) {
        return {
          stepId: step.id,
          stepName: step.name,
          avgTime: 0,
          retries: 0,
          idleTime: 0,
          backNav: 0,
          dropOffRate: 0,
          frictionScore: 0,
          sessionCount: 0,
        };
      }

      // Group by session
      const sessionGroups = new Map<string, any[]>();
      events.forEach((event) => {
        if (!sessionGroups.has(event.sessionId)) {
          sessionGroups.set(event.sessionId, []);
        }
        sessionGroups.get(event.sessionId)!.push(event);
      });

      let totalTime = 0;
      let totalRetries = 0;
      let totalIdleTime = 0;
      let totalBackNav = 0;
      let droppedSessions = 0;

      sessionGroups.forEach((sessionEvents, sessionId) => {
        // Calculate time spent
        if (sessionEvents.length > 1) {
          const start = new Date(sessionEvents[0].timestamp).getTime();
          const end = new Date(sessionEvents[sessionEvents.length - 1].timestamp).getTime();
          totalTime += (end - start) / 1000;
        }

        // Count retries (validation failures)
        const retries = sessionEvents.filter((e) => e.type === 'validation_error').length;
        totalRetries += retries;

        // Calculate idle time
        for (let i = 1; i < sessionEvents.length; i++) {
          const gap =
            (new Date(sessionEvents[i].timestamp).getTime() -
              new Date(sessionEvents[i - 1].timestamp).getTime()) /
            1000;
          if (gap > 10) {
            totalIdleTime += gap;
          }
        }

        // Count back navigation
        const backNavEvents = sessionEvents.filter((e) => e.type === 'back_navigation').length;
        totalBackNav += backNavEvents;

        // Check if dropped off
        const completed = sessionEvents.some((e) => e.type === 'step_completed');
        if (!completed) {
          droppedSessions++;
        }
      });

      const sessionCount = sessionGroups.size;
      const avgTime = totalTime / sessionCount;
      const avgRetries = totalRetries / sessionCount;
      const avgIdleTime = totalIdleTime / sessionCount;
      const avgBackNav = totalBackNav / sessionCount;
      const dropOffRate = droppedSessions / sessionCount;

      const frictionScore = calculateFrictionScore({
        avgTime,
        expectedTime: step.expectedTimeSeconds,
        retries: avgRetries,
        idleTime: avgIdleTime,
        backNav: avgBackNav,
        dropOffRate,
      });

      // Upsert aggregated metrics
      await prisma.aggregatedMetrics.upsert({
        where: {
          workflowId_stepId: {
            workflowId,
            stepId: step.id,
          },
        },
        update: {
          avgTime,
          retries: Math.round(avgRetries),
          idleTime: avgIdleTime,
          backNav: Math.round(avgBackNav),
          dropOffRate,
          frictionScore,
          sessionCount,
          calculatedAt: new Date(),
        },
        create: {
          workflowId,
          stepId: step.id,
          avgTime,
          retries: Math.round(avgRetries),
          idleTime: avgIdleTime,
          backNav: Math.round(avgBackNav),
          dropOffRate,
          frictionScore,
          sessionCount,
        },
      });

      return {
        stepId: step.id,
        stepName: step.name,
        avgTime,
        retries: avgRetries,
        idleTime: avgIdleTime,
        backNav: avgBackNav,
        dropOffRate,
        frictionScore,
        sessionCount,
      };
    });

    const metrics = await Promise.all(metricsPromises);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Failed to calculate metrics:', error);
    return NextResponse.json({ error: 'Failed to calculate metrics' }, { status: 500 });
  }
}
