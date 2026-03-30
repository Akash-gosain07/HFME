import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to generate random data
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

async function main() {
  console.log('Starting seed...');

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
      monitoringInterval: 300,
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

  console.log('Seed completed successfully! Generated 320 sessions across 3 workflows.');
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
