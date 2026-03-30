import Link from 'next/link';
import { Activity, TrendingUp, AlertTriangle, BarChart3, Layers, Zap, Sparkles, Users, Clock, ArrowUpRight } from 'lucide-react';
import { getFrictionLevel } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/MotionComponents';
import { AIInsightCard } from '@/components/AIInsightCard';
import { FrictionChart3D } from '@/components/FrictionChart3D';
import DashboardWithIntro from '@/components/DashboardWithIntro';

export const dynamic = 'force-dynamic';

// ─── Dummy Data ────────────────────────────────────────────────────────────────

const DUMMY_WORKFLOWS = [
  {
    id: 'wf-1',
    name: 'Checkout Flow',
    _count: { steps: 6, sessions: 3842 },
    avgFriction: 0.67,
  },
  {
    id: 'wf-2',
    name: 'User Onboarding',
    _count: { steps: 8, sessions: 5120 },
    avgFriction: 0.41,
  },
  {
    id: 'wf-3',
    name: 'Account Settings',
    _count: { steps: 4, sessions: 1230 },
    avgFriction: 0.22,
  },
  {
    id: 'wf-4',
    name: 'Password Reset',
    _count: { steps: 3, sessions: 987 },
    avgFriction: 0.55,
  },
  {
    id: 'wf-5',
    name: 'Product Search',
    _count: { steps: 5, sessions: 7410 },
    avgFriction: 0.34,
  },
];

const DUMMY_HIGH_FRICTION_STEPS = [
  { id: 's1', name: 'Payment Details', frictionScore: 0.82, avgTime: 94.2, retries: 6, dropOffRate: 0.38 },
  { id: 's2', name: 'Address Verification', frictionScore: 0.73, avgTime: 77.5, retries: 4, dropOffRate: 0.29 },
  { id: 's3', name: 'Email Confirmation', frictionScore: 0.63, avgTime: 55.1, retries: 3, dropOffRate: 0.21 },
  { id: 's4', name: 'Profile Picture Upload', frictionScore: 0.58, avgTime: 48.3, retries: 5, dropOffRate: 0.17 },
  { id: 's5', name: 'Password Reset Link', frictionScore: 0.51, avgTime: 39.7, retries: 2, dropOffRate: 0.14 },
];

const DUMMY_AI_INSIGHTS = [
  {
    id: 'ai-1',
    insightType: 'anomaly',
    detectedIssue: 'Checkout Drop-off Spike',
    recommendation: 'Payment step latency increased 3× in the last 2h. Consider simplifying the form or adding auto-fill support.',
    confidenceLevel: 0.92,
    impactScore: 8.7,
  },
  {
    id: 'ai-2',
    insightType: 'recommendation',
    detectedIssue: 'Address Field Redundancy',
    recommendation: 'Users re-enter city & state after postcode. Auto-populate via postcode lookup to cut avg time by ~40s.',
    confidenceLevel: 0.87,
    impactScore: 6.4,
  },
  {
    id: 'ai-3',
    insightType: 'anomaly',
    detectedIssue: 'Mobile Retry Surge',
    recommendation: 'Retry rate on mobile is 2.8× higher than desktop during account creation. Keyboard UX may be the cause.',
    confidenceLevel: 0.79,
    impactScore: 7.1,
  },
];

const DUMMY_3D_CHART_DATA = [
  { label: 'Payment Details', frictionScore: 0.82, avgTime: 94, dropOff: 0.38, color: '#ef4444' },
  { label: 'Address Verify', frictionScore: 0.73, avgTime: 78, dropOff: 0.29, color: '#f97316' },
  { label: 'Email Confirm', frictionScore: 0.63, avgTime: 55, dropOff: 0.21, color: '#f97316' },
  { label: 'Profile Upload', frictionScore: 0.58, avgTime: 48, dropOff: 0.17, color: '#f97316' },
  { label: 'Password Reset', frictionScore: 0.51, avgTime: 40, dropOff: 0.14, color: '#eab308' },
  { label: 'Search Filters', frictionScore: 0.38, avgTime: 32, dropOff: 0.10, color: '#eab308' },
  { label: 'Onboarding Intro', frictionScore: 0.29, avgTime: 25, dropOff: 0.06, color: '#22c55e' },
  { label: 'Account Settings', frictionScore: 0.19, avgTime: 18, dropOff: 0.03, color: '#22c55e' },
];

const TOTAL_SESSIONS = DUMMY_WORKFLOWS.reduce((s, w) => s + w._count.sessions, 0);
const AVG_FRICTION = DUMMY_WORKFLOWS.reduce((s, w) => s + w.avgFriction, 0) / DUMMY_WORKFLOWS.length;
const ANOMALY_COUNT = DUMMY_AI_INSIGHTS.filter(i => i.insightType === 'anomaly').length;

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const frictionLevel = getFrictionLevel(AVG_FRICTION);

  return (
    <DashboardWithIntro>
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Layers className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                HFME 2.0
              </h1>
            </div>
            <nav className="flex items-center gap-6">
              <Link href="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Dashboard</Link>
              <Link href="/workflows" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Workflows</Link>
              <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Admin</Link>
              <ThemeToggle />
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StaggerContainer className="space-y-10">

          {/* ── Hero / KPI ──────────────────────────────────── */}
          <StaggerItem className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-4xl font-bold tracking-tight mb-4">
                Analyze and Optimize <br />
                <span className="text-primary">User Friction</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-md">
                AI-powered behavioral analytics to detect bottlenecks and improve user flow
                efficiency in real-time.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
                <p className="text-sm text-muted-foreground mb-2">Friction Index</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold" style={{ color: frictionLevel.color }}>
                    {(AVG_FRICTION * 100).toFixed(0)}
                  </span>
                  <span className="text-sm font-medium mb-1.5" style={{ color: frictionLevel.color }}>
                    {frictionLevel.label}
                  </span>
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
                <p className="text-sm text-primary mb-2">AI Status</p>
                <div className="flex items-center gap-2">
                  <Zap className="h-8 w-8 text-primary" />
                  <span className="text-xl font-bold text-primary">Active</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Monitoring {DUMMY_WORKFLOWS.length} workflows
                </p>
              </div>
            </div>
          </StaggerItem>

          {/* ── Key Metrics ─────────────────────────────────── */}
          <StaggerItem className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {[
              {
                icon: <BarChart3 className="h-5 w-5 text-secondary-foreground" />,
                bg: 'bg-secondary',
                value: TOTAL_SESSIONS.toLocaleString(),
                label: 'Total Sessions',
                badge: 'All-time',
                badgeColor: 'bg-secondary text-secondary-foreground',
              },
              {
                icon: <AlertTriangle className="h-5 w-5 text-purple-400" />,
                bg: 'bg-purple-500/10',
                value: ANOMALY_COUNT,
                label: 'Detected Anomalies',
                badge: 'Live',
                badgeColor: 'bg-purple-500/20 text-purple-400',
                pulse: true,
              },
              {
                icon: <TrendingUp className="h-5 w-5 text-blue-400" />,
                bg: 'bg-blue-500/10',
                value: DUMMY_WORKFLOWS.length,
                label: 'Active Workflows',
                badge: 'Running',
                badgeColor: 'bg-blue-500/20 text-blue-400',
              },
              {
                icon: <Users className="h-5 w-5 text-emerald-400" />,
                bg: 'bg-emerald-500/10',
                value: '18.4%',
                label: 'Avg Drop-off Rate',
                badge: '↓ 3.2%',
                badgeColor: 'bg-emerald-500/20 text-emerald-400',
              },
            ].map((m, i) => (
              <div key={i} className="group bg-card p-6 rounded-xl border border-border hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${m.bg}`}>{m.icon}</div>
                  <div className="flex items-center gap-1">
                    {m.pulse && (
                      <span className="relative flex h-2.5 w-2.5 mr-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500" />
                      </span>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.badgeColor}`}>{m.badge}</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{m.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{m.label}</p>
              </div>
            ))}
          </StaggerItem>

          {/* ── 3D Friction Graph ────────────────────────────── */}
          <StaggerItem>
            <div className="rounded-2xl border border-border overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#0f0f1a 0%,#14141f 60%,#1a1025 100%)' }}>
              <div className="px-6 py-5 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">3D Friction Landscape</h2>
                    <p className="text-xs text-white/40">Step-by-step friction score across all workflows</p>
                  </div>
                </div>
                {/* Legend */}
                <div className="hidden sm:flex items-center gap-4 text-xs text-white/50">
                  {[
                    { color: '#ef4444', label: 'Critical' },
                    { color: '#f97316', label: 'High' },
                    { color: '#eab308', label: 'Medium' },
                    { color: '#22c55e', label: 'Low' },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-sm inline-block" style={{ background: l.color }} />
                      {l.label}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ height: 340, padding: '16px 8px 8px 8px' }}>
                <FrictionChart3D data={DUMMY_3D_CHART_DATA} />
              </div>
              {/* Mini stat row */}
              <div className="grid grid-cols-3 divide-x divide-white/5 border-t border-white/5">
                {[
                  { label: 'Peak Friction Step', value: 'Payment Details', sub: '82 / 100' },
                  { label: 'Avg Friction Score', value: `${(AVG_FRICTION * 100).toFixed(0)} / 100`, sub: frictionLevel.label },
                  { label: 'Steps Monitored', value: DUMMY_3D_CHART_DATA.length, sub: 'Across all workflows' },
                ].map((s, i) => (
                  <div key={i} className="px-6 py-4">
                    <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">{s.label}</p>
                    <p className="text-lg font-bold text-white">{s.value}</p>
                    <p className="text-xs text-white/40">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </StaggerItem>

          {/* ── AI Insights ─────────────────────────────────── */}
          <StaggerItem>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Latest AI Insights</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {DUMMY_AI_INSIGHTS.map((insight) => (
                <AIInsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </StaggerItem>

          {/* ── Main Grid: Workflows + High Friction ────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Workflows list */}
            <StaggerItem className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Active Workflows</h2>
                <span className="text-xs text-muted-foreground">{DUMMY_WORKFLOWS.length} workflows</span>
              </div>
              <div className="divide-y divide-border">
                {DUMMY_WORKFLOWS.map((workflow) => {
                  const level = getFrictionLevel(workflow.avgFriction);
                  return (
                    <Link
                      key={workflow.id}
                      href={`/workflows/${workflow.id}`}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group"
                    >
                      <div>
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {workflow.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />{workflow._count.steps} steps
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />{workflow._count.sessions.toLocaleString()} sessions
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className="px-2.5 py-0.5 text-xs font-medium rounded-full border"
                          style={{
                            backgroundColor: `${level.color}15`,
                            color: level.color,
                            borderColor: `${level.color}30`,
                          }}
                        >
                          {level.label}
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </StaggerItem>

            {/* High Friction Steps */}
            <StaggerItem className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">High Friction Areas</h2>
                <span className="text-xs text-muted-foreground">Top 5 bottlenecks</span>
              </div>
              <div className="divide-y divide-border">
                {DUMMY_HIGH_FRICTION_STEPS.map((metric) => {
                  const level = getFrictionLevel(metric.frictionScore);
                  return (
                    <div key={metric.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-foreground">{metric.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Score:</span>
                          <span className="text-sm font-bold" style={{ color: level.color }}>
                            {(metric.frictionScore * 100).toFixed(0)}
                          </span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full h-1.5 rounded-full bg-secondary mb-3">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${metric.frictionScore * 100}%`, background: level.color }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        {[
                          { label: 'Avg Time', value: `${metric.avgTime.toFixed(1)}s` },
                          { label: 'Retries', value: metric.retries },
                          { label: 'Drop-off', value: `${(metric.dropOffRate * 100).toFixed(0)}%` },
                        ].map((s) => (
                          <div key={s.label} className="px-2 py-1.5 bg-background rounded border border-border text-center">
                            <span className="block text-muted-foreground mb-0.5">{s.label}</span>
                            <span className="font-semibold text-foreground">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </StaggerItem>
          </div>

        </StaggerContainer>
      </main>
    </div>
    </DashboardWithIntro>
  );
}
