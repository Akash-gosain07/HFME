import { NextResponse } from 'next/server';

// Seeded realistic workflow definitions
const WORKFLOW_TEMPLATES = [
  { id: 'wf-1', name: 'Checkout Flow', steps: 6, baseFriction: 0.67, baseDropOff: 0.38 },
  { id: 'wf-2', name: 'User Onboarding', steps: 8, baseFriction: 0.41, baseDropOff: 0.18 },
  { id: 'wf-3', name: 'Account Settings', steps: 4, baseFriction: 0.22, baseDropOff: 0.09 },
  { id: 'wf-4', name: 'Password Reset', steps: 3, baseFriction: 0.55, baseDropOff: 0.24 },
  { id: 'wf-5', name: 'Product Search', steps: 5, baseFriction: 0.34, baseDropOff: 0.14 },
];

const STEP_TEMPLATES = [
  { name: 'Payment Details', baseFriction: 0.82, baseTime: 94, baseRetries: 6, baseDropOff: 0.38 },
  { name: 'Address Verification', baseFriction: 0.73, baseTime: 77, baseRetries: 4, baseDropOff: 0.29 },
  { name: 'Email Confirmation', baseFriction: 0.63, baseTime: 55, baseRetries: 3, baseDropOff: 0.21 },
  { name: 'Profile Picture Upload', baseFriction: 0.58, baseTime: 48, baseRetries: 5, baseDropOff: 0.17 },
  { name: 'Password Reset Link', baseFriction: 0.51, baseTime: 40, baseRetries: 2, baseDropOff: 0.14 },
  { name: 'Search Filters', baseFriction: 0.38, baseTime: 32, baseRetries: 1, baseDropOff: 0.10 },
  { name: 'Onboarding Intro', baseFriction: 0.29, baseTime: 25, baseRetries: 0, baseDropOff: 0.06 },
  { name: 'Account Settings', baseFriction: 0.19, baseTime: 18, baseRetries: 0, baseDropOff: 0.03 },
];

function drift(base: number, amplitude: number, seed: number): number {
  // Time-based gentle sine drift
  const t = Date.now() / 60000; // minutes since epoch
  const wave = Math.sin(t * 0.3 + seed) * amplitude;
  return Math.max(0, Math.min(1, base + wave));
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export async function GET() {
  const now = Date.now();
  const seedBase = (now / 30000) | 0; // changes every 30 seconds

  // ── Workflows ────────────────────────────────────────────────
  const workflows = WORKFLOW_TEMPLATES.map((wf, i) => {
    const frictionDrift = drift(wf.baseFriction, 0.07, i * 1.7 + seedBase * 0.01);
    const sessionBump = Math.round(Math.sin(now / 90000 + i) * 120 + wf.steps * 180);
    return {
      id: wf.id,
      name: wf.name,
      _count: {
        steps: wf.steps,
        sessions: clamp(3200 + sessionBump, 800, 9000),
      },
      avgFriction: parseFloat(frictionDrift.toFixed(3)),
    };
  });

  // ── High Friction Steps ───────────────────────────────────────
  const highFrictionSteps = STEP_TEMPLATES.slice(0, 5).map((s, i) => {
    const frictionDrift = drift(s.baseFriction, 0.05, i * 2.3 + seedBase * 0.02);
    const timeDrift = s.baseTime + Math.sin(now / 80000 + i * 1.1) * 8;
    const dropDrift = drift(s.baseDropOff, 0.04, i * 3.1 + seedBase * 0.015);
    const retriesDrift = clamp(
      s.baseRetries + Math.round(Math.sin(now / 70000 + i) * 1.5),
      0, 10
    );
    return {
      id: `s${i + 1}`,
      name: s.name,
      frictionScore: parseFloat(frictionDrift.toFixed(3)),
      avgTime: parseFloat(timeDrift.toFixed(1)),
      retries: retriesDrift,
      dropOffRate: parseFloat(dropDrift.toFixed(3)),
    };
  });

  // ── 3D Chart Data ────────────────────────────────────────────
  const chartData = STEP_TEMPLATES.map((s, i) => {
    const frictionDrift = drift(s.baseFriction, 0.05, i * 2.1 + seedBase * 0.025);
    const timeDrift = s.baseTime + Math.sin(now / 75000 + i * 1.3) * 7;
    const dropDrift = drift(s.baseDropOff, 0.03, i * 1.9 + seedBase * 0.02);
    const color =
      frictionDrift > 0.7 ? '#ef4444' :
      frictionDrift > 0.5 ? '#f97316' :
      frictionDrift > 0.35 ? '#eab308' : '#22c55e';
    return {
      label: s.name,
      frictionScore: parseFloat(frictionDrift.toFixed(3)),
      avgTime: parseFloat(timeDrift.toFixed(1)),
      dropOff: parseFloat(dropDrift.toFixed(3)),
      color,
    };
  });

  // ── Summary KPIs ─────────────────────────────────────────────
  const totalSessions = workflows.reduce((s, w) => s + w._count.sessions, 0);
  const avgFriction = workflows.reduce((s, w) => s + w.avgFriction, 0) / workflows.length;
  const avgDropOff = highFrictionSteps.reduce((s, st) => s + st.dropOffRate, 0) / highFrictionSteps.length;
  const dropOffChange = parseFloat((Math.sin(now / 120000) * 2.5 - 0.5).toFixed(1));

  return NextResponse.json({
    workflows,
    highFrictionSteps,
    chartData,
    kpis: {
      totalSessions,
      avgFriction: parseFloat(avgFriction.toFixed(3)),
      avgDropOff: parseFloat(avgDropOff.toFixed(3)),
      dropOffChange,
    },
    generatedAt: new Date().toISOString(),
  });
}
