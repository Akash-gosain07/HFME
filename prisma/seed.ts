import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

import { calculateFrictionScore } from '../src/lib/utils';

const prisma = new PrismaClient();

// Helper to generate random data
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

async function persistAggregatedMetrics(
  workflowId: string,
  steps: Array<{ id: string; name: string; expectedTimeSeconds: number }>
) {
  for (const step of steps) {
    const events = await prisma.event.findMany({
      where: { stepId: step.id },
      orderBy: { timestamp: 'asc' },
    });

    if (!events.length) {
      continue;
    }

    const sessions = new Map<string, typeof events>();
    for (const event of events) {
      const current = sessions.get(event.sessionId) || [];
      current.push(event);
      sessions.set(event.sessionId, current);
    }

    let totalTime = 0;
    let totalRetries = 0;
    let totalIdleTime = 0;
    let totalBackNav = 0;
    let droppedSessions = 0;

    for (const sessionEvents of sessions.values()) {
      if (sessionEvents.length > 1) {
        const start = new Date(sessionEvents[0].timestamp).getTime();
        const end = new Date(sessionEvents[sessionEvents.length - 1].timestamp).getTime();
        totalTime += (end - start) / 1000;
      }

      totalRetries += sessionEvents.filter((event: any) => event.type === 'validation_error').length;
      totalBackNav += sessionEvents.filter((event: any) => event.type === 'back_navigation').length;

      for (let index = 1; index < sessionEvents.length; index++) {
        const gap =
          (new Date(sessionEvents[index].timestamp).getTime() -
            new Date(sessionEvents[index - 1].timestamp).getTime()) /
          1000;
        if (gap > 10) {
          totalIdleTime += gap;
        }
      }

      if (!sessionEvents.some((event: any) => event.type === 'step_completed')) {
        droppedSessions++;
      }
    }

    const sessionCount = sessions.size;
    const avgTime = totalTime / sessionCount;
    const retries = totalRetries / sessionCount;
    const idleTime = totalIdleTime / sessionCount;
    const backNav = totalBackNav / sessionCount;
    const dropOffRate = droppedSessions / sessionCount;
    const frictionScore = calculateFrictionScore({
      avgTime,
      expectedTime: step.expectedTimeSeconds,
      retries,
      idleTime,
      backNav,
      dropOffRate,
    });

    await prisma.aggregatedMetrics.upsert({
      where: {
        workflowId_stepId: {
          workflowId,
          stepId: step.id,
        },
      },
      update: {
        avgTime,
        retries: Math.round(retries),
        idleTime,
        backNav: Math.round(backNav),
        dropOffRate,
        frictionScore,
        sessionCount,
        calculatedAt: new Date(),
      },
      create: {
        workflowId,
        stepId: step.id,
        avgTime,
        retries: Math.round(retries),
        idleTime,
        backNav: Math.round(backNav),
        dropOffRate,
        frictionScore,
        sessionCount,
      },
    });
  }
}

async function main() {
  console.log('Starting seed...');
  const runtimeWorkflows: Array<Record<string, unknown>> = [];

  // Clear existing data
  await prisma.aIInsight.deleteMany();
  await prisma.aggregatedMetrics.deleteMany();
  await prisma.event.deleteMany();
  await prisma.session.deleteMany();
  await prisma.step.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.user.deleteMany();
  await prisma.aIMonitoringConfig.deleteMany();

  // Create admin user
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'hfme_admin_2024', 10);
  await prisma.user.create({
    data: {
      name: 'Admin User',
      email: process.env.ADMIN_EMAIL || 'admin@hfme.io',
      passwordHash,
      role: 'admin',
    },
  });

  // Create AI monitoring config
  await prisma.aIMonitoringConfig.create({
    data: {
      enabled: true,
      anomalySensitivity: 0.1,
      predictionEnabled: true,
      explanationEnabled: true,
      monitoringInterval: 1,
      alertThreshold: 0.7,
    },
  });

  // Workflow 1: E-commerce Checkout (Stable, low friction)
  const workflow1 = await prisma.workflow.create({
    data: {
      name: 'E-commerce Checkout Flow',
      description: 'Standard checkout process with cart, shipping, and payment',
      steps: {
        create: [
          { name: 'Cart Review', order: 0, expectedTimeSeconds: 30 },
          { name: 'Shipping Information', order: 1, expectedTimeSeconds: 45 },
          { name: 'Payment Method', order: 2, expectedTimeSeconds: 40 },
          { name: 'Order Confirmation', order: 3, expectedTimeSeconds: 20 },
        ],
      },
    },
    include: { steps: true },
  });
  runtimeWorkflows.push({
    id: workflow1.id,
    name: workflow1.name,
    description: workflow1.description,
    profile: { mode: 'stable', activeUsers: 18, volatility: 0.06 },
    steps: workflow1.steps.map((step) => ({
      id: step.id,
      name: step.name,
      order: step.order,
      expectedTimeSeconds: step.expectedTimeSeconds,
      baseline:
        step.order === 0
          ? { avgTime: 28, retries: 0.6, idleTime: 4, backNav: 0.2, dropOffRate: 0.05 }
          : step.order === 1
            ? { avgTime: 42, retries: 1.2, idleTime: 8, backNav: 0.3, dropOffRate: 0.08 }
            : step.order === 2
              ? { avgTime: 44, retries: 2.1, idleTime: 12, backNav: 0.5, dropOffRate: 0.12 }
              : { avgTime: 24, retries: 0.4, idleTime: 3, backNav: 0.1, dropOffRate: 0.04 },
    })),
  });

  // Workflow 2: SaaS Onboarding (Rising friction trend)
  const workflow2 = await prisma.workflow.create({
    data: {
      name: 'SaaS User Onboarding',
      description: 'New user signup and configuration process',
      steps: {
        create: [
          { name: 'Account Creation', order: 0, expectedTimeSeconds: 40 },
          { name: 'Email Verification', order: 1, expectedTimeSeconds: 60 },
          { name: 'Profile Setup', order: 2, expectedTimeSeconds: 50 },
          { name: 'Team Invitation', order: 3, expectedTimeSeconds: 45 },
          { name: 'Integration Setup', order: 4, expectedTimeSeconds: 90 },
        ],
      },
    },
    include: { steps: true },
  });
  runtimeWorkflows.push({
    id: workflow2.id,
    name: workflow2.name,
    description: workflow2.description,
    profile: { mode: 'rising', activeUsers: 26, volatility: 0.09 },
    steps: workflow2.steps.map((step) => ({
      id: step.id,
      name: step.name,
      order: step.order,
      expectedTimeSeconds: step.expectedTimeSeconds,
      baseline:
        step.order === 0
          ? { avgTime: 38, retries: 0.9, idleTime: 7, backNav: 0.2, dropOffRate: 0.07 }
          : step.order === 1
            ? { avgTime: 58, retries: 1.4, idleTime: 16, backNav: 0.4, dropOffRate: 0.12 }
            : step.order === 2
              ? { avgTime: 49, retries: 1.8, idleTime: 18, backNav: 0.6, dropOffRate: 0.13 }
              : step.order === 3
                ? { avgTime: 47, retries: 1.9, idleTime: 19, backNav: 0.7, dropOffRate: 0.14 }
                : { avgTime: 85, retries: 2.5, idleTime: 24, backNav: 0.9, dropOffRate: 0.18 },
    })),
  });

  // Workflow 3: Document Upload (Sudden anomaly spike)
  const workflow3 = await prisma.workflow.create({
    data: {
      name: 'Document Upload & Processing',
      description: 'Upload, validate, and process documents',
      steps: {
        create: [
          { name: 'File Selection', order: 0, expectedTimeSeconds: 25 },
          { name: 'Document Upload', order: 1, expectedTimeSeconds: 35 },
          { name: 'Format Validation', order: 2, expectedTimeSeconds: 20 },
          { name: 'Metadata Entry', order: 3, expectedTimeSeconds: 60 },
          { name: 'Final Review', order: 4, expectedTimeSeconds: 30 },
        ],
      },
    },
    include: { steps: true },
  });
  runtimeWorkflows.push({
    id: workflow3.id,
    name: workflow3.name,
    description: workflow3.description,
    profile: { mode: 'anomaly', activeUsers: 14, volatility: 0.12, anomalyStepOrder: 1 },
    steps: workflow3.steps.map((step) => ({
      id: step.id,
      name: step.name,
      order: step.order,
      expectedTimeSeconds: step.expectedTimeSeconds,
      baseline:
        step.order === 0
          ? { avgTime: 23, retries: 0.5, idleTime: 3, backNav: 0.1, dropOffRate: 0.04 }
          : step.order === 1
            ? { avgTime: 34, retries: 1.8, idleTime: 11, backNav: 0.6, dropOffRate: 0.11 }
            : step.order === 2
              ? { avgTime: 27, retries: 1.4, idleTime: 10, backNav: 0.5, dropOffRate: 0.1 }
              : step.order === 3
                ? { avgTime: 58, retries: 2.1, idleTime: 14, backNav: 0.7, dropOffRate: 0.12 }
                : { avgTime: 31, retries: 1.3, idleTime: 9, backNav: 0.4, dropOffRate: 0.09 },
    })),
  });

  console.log('Created workflows and steps');

  // Generate sessions and events for Workflow 1 (Stable)
  for (let i = 0; i < 100; i++) {
    const session = await prisma.session.create({
      data: {
        workflowId: workflow1.id,
        startedAt: new Date(Date.now() - randomInt(1, 30) * 24 * 60 * 60 * 1000),
        completed: Math.random() > 0.1, // 90% completion
      },
    });

    for (const step of workflow1.steps) {
      const baseTime = step.expectedTimeSeconds;
      const actualTime = baseTime + randomFloat(-5, 10);
      const retries = Math.random() > 0.8 ? randomInt(1, 2) : 0;
      const backNav = Math.random() > 0.9 ? 1 : 0;

      // Start event
      await prisma.event.create({
        data: {
          sessionId: session.id,
          stepId: step.id,
          type: 'step_started',
          timestamp: new Date(session.startedAt.getTime() + step.order * 60000),
        },
      });

      // Retries
      for (let r = 0; r < retries; r++) {
        await prisma.event.create({
          data: {
            sessionId: session.id,
            stepId: step.id,
            type: 'validation_error',
            timestamp: new Date(session.startedAt.getTime() + step.order * 60000 + r * 5000),
          },
        });
      }

      // Back navigation
      if (backNav > 0) {
        await prisma.event.create({
          data: {
            sessionId: session.id,
            stepId: step.id,
            type: 'back_navigation',
            timestamp: new Date(session.startedAt.getTime() + step.order * 60000 + 10000),
          },
        });
      }

      // Complete
      if (session.completed || step.order < workflow1.steps.length - 1) {
        await prisma.event.create({
          data: {
            sessionId: session.id,
            stepId: step.id,
            type: 'step_completed',
            timestamp: new Date(session.startedAt.getTime() + step.order * 60000 + actualTime * 1000),
          },
        });
      }
    }
  }

  console.log('Generated data for Workflow 1 (100 sessions)');

  // Generate sessions for Workflow 2 (Rising friction trend)
  for (let i = 0; i < 120; i++) {
    const daysAgo = 30 - Math.floor(i / 4); // More recent sessions
    const frictionMultiplier = 1 + (30 - daysAgo) * 0.02; // Increasing friction over time

    const session = await prisma.session.create({
      data: {
        workflowId: workflow2.id,
        startedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        completed: Math.random() > 0.15 * frictionMultiplier, // Increasing drop-off
      },
    });

    for (const step of workflow2.steps) {
      const baseTime = step.expectedTimeSeconds;
      const actualTime = baseTime * frictionMultiplier + randomFloat(-5, 15);
      const retries = Math.random() > 0.7 / frictionMultiplier ? randomInt(1, 4) : 0;
      const backNav = Math.random() > 0.85 / frictionMultiplier ? randomInt(1, 2) : 0;
      const idleTime = Math.random() > 0.8 ? randomInt(10, 40) : 0;

      await prisma.event.create({
        data: {
          sessionId: session.id,
          stepId: step.id,
          type: 'step_started',
          timestamp: new Date(session.startedAt.getTime() + step.order * 90000),
        },
      });

      for (let r = 0; r < retries; r++) {
        await prisma.event.create({
          data: {
            sessionId: session.id,
            stepId: step.id,
            type: 'validation_error',
            timestamp: new Date(session.startedAt.getTime() + step.order * 90000 + r * 8000),
          },
        });
      }

      for (let b = 0; b < backNav; b++) {
        await prisma.event.create({
          data: {
            sessionId: session.id,
            stepId: step.id,
            type: 'back_navigation',
            timestamp: new Date(session.startedAt.getTime() + step.order * 90000 + 15000 + b * 5000),
          },
        });
      }

      if (session.completed || step.order < workflow2.steps.length - 1) {
        await prisma.event.create({
          data: {
            sessionId: session.id,
            stepId: step.id,
            type: 'step_completed',
            timestamp: new Date(session.startedAt.getTime() + step.order * 90000 + actualTime * 1000 + idleTime * 1000),
          },
        });
      }
    }
  }

  console.log('Generated data for Workflow 2 (120 sessions with rising friction)');

  // Generate sessions for Workflow 3 (Sudden anomaly spike)
  for (let i = 0; i < 100; i++) {
    const daysAgo = randomInt(1, 30);
    const isAnomalyPeriod = daysAgo <= 5; // Last 5 days have anomaly
    const frictionMultiplier = isAnomalyPeriod ? 2.5 : 1;

    const session = await prisma.session.create({
      data: {
        workflowId: workflow3.id,
        startedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        completed: Math.random() > (isAnomalyPeriod ? 0.35 : 0.12),
      },
    });

    for (const step of workflow3.steps) {
      const baseTime = step.expectedTimeSeconds;
      const actualTime = baseTime * frictionMultiplier + randomFloat(-5, 20);
      const retries = isAnomalyPeriod && Math.random() > 0.4 ? randomInt(3, 8) : randomInt(0, 2);
      const backNav = isAnomalyPeriod && Math.random() > 0.5 ? randomInt(2, 4) : randomInt(0, 1);
      const idleTime = isAnomalyPeriod ? randomInt(20, 60) : randomInt(0, 15);

      await prisma.event.create({
        data: {
          sessionId: session.id,
          stepId: step.id,
          type: 'step_started',
          timestamp: new Date(session.startedAt.getTime() + step.order * 80000),
        },
      });

      for (let r = 0; r < retries; r++) {
        await prisma.event.create({
          data: {
            sessionId: session.id,
            stepId: step.id,
            type: 'validation_error',
            timestamp: new Date(session.startedAt.getTime() + step.order * 80000 + r * 6000),
          },
        });
      }

      for (let b = 0; b < backNav; b++) {
        await prisma.event.create({
          data: {
            sessionId: session.id,
            stepId: step.id,
            type: 'back_navigation',
            timestamp: new Date(session.startedAt.getTime() + step.order * 80000 + 12000 + b * 4000),
          },
        });
      }

      if (session.completed || step.order < workflow3.steps.length - 1) {
        await prisma.event.create({
          data: {
            sessionId: session.id,
            stepId: step.id,
            type: 'step_completed',
            timestamp: new Date(session.startedAt.getTime() + step.order * 80000 + actualTime * 1000 + idleTime * 1000),
          },
        });
      }
    }
  }

  console.log('Generated data for Workflow 3 (100 sessions with anomaly spike)');

  await persistAggregatedMetrics(workflow1.id, workflow1.steps);
  await persistAggregatedMetrics(workflow2.id, workflow2.steps);
  await persistAggregatedMetrics(workflow3.id, workflow3.steps);

  const runtimeDirectory = join(process.cwd(), 'data');
  await mkdir(runtimeDirectory, { recursive: true });
  await writeFile(
    join(runtimeDirectory, 'live-runtime.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        workflows: runtimeWorkflows,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log('Seed completed successfully! Generated 320 sessions across 3 workflows.');
  console.log('Wrote realtime runtime map to data/live-runtime.json');
  console.log('\nDefault credentials:');
  console.log('Email:', process.env.ADMIN_EMAIL || 'admin@hfme.io');
  console.log('Password:', process.env.ADMIN_PASSWORD || 'hfme_admin_2024');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
