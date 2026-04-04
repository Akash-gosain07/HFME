'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Clock3,
  Layers,
  TrendingUp,
  Users,
} from 'lucide-react';

import { AIInsightCard } from '@/components/AIInsightCard';
import { AppShell } from '@/components/AppShell';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import DashboardWithIntro from '@/components/DashboardWithIntro';
import { FrictionChart3D } from '@/components/FrictionChart3D';
import { HeatmapGrid } from '@/components/live/HeatmapGrid';
import { LoadingPanel } from '@/components/live/LoadingPanel';
import { Sparkline } from '@/components/live/Sparkline';
import { useLiveSnapshot } from '@/hooks/use-live-snapshot';
import type { LiveSnapshot } from '@/lib/live-types';
import { getFrictionLevel } from '@/lib/utils';

export function DashboardLivePage({ initialSnapshot = null }: { initialSnapshot?: LiveSnapshot | null }) {
  const { data, error, isLoading, connectionStatus, refetch } = useLiveSnapshot(initialSnapshot);

  return (
    <DashboardWithIntro>
      <AppShell connectionStatus={connectionStatus} connectionTimestamp={data?.generatedAt}>
        <ClientErrorBoundary>
          {isLoading || !data ? (
            <LoadingPanel />
          ) : error ? (
            <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-sm text-red-100">
              <p className="mb-4 text-base font-semibold">Live AI data could not be loaded.</p>
              <button
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950"
                onClick={() => refetch()}
                type="button"
              >
                Retry live sync
              </button>
            </div>
          ) : (
            <DashboardContent snapshot={data} />
          )}
        </ClientErrorBoundary>
      </AppShell>
    </DashboardWithIntro>
  );
}

function DashboardContent({ snapshot }: { snapshot: LiveSnapshot }) {
  const level = getFrictionLevel(snapshot.dashboard.averageFriction);
  const topHeat = [...snapshot.dashboard.heatmap]
    .sort((left, right) => right.frictionScore - left.frictionScore)
    .slice(0, 8);
  const topWorkflows = [...snapshot.workflows]
    .sort((left, right) => right.overallFriction - left.overallFriction)
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/70">Live Operations</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Per-second AI monitoring for every workflow, anomaly, and friction hotspot.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-300">
            HFME is ingesting live behavioral signals, recalculating friction, scoring anomalies,
            forecasting risk, and refreshing natural-language recommendations in real time.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <MetricCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Average friction"
              value={`${Math.round(snapshot.dashboard.averageFriction * 100)}`}
              meta={level.label}
              accent={level.color}
            />
            <MetricCard
              icon={<Users className="h-5 w-5" />}
              label="Total sessions"
              value={snapshot.dashboard.totalSessions.toLocaleString()}
              meta="Streaming"
              accent="#38bdf8"
            />
            <MetricCard
              icon={<AlertTriangle className="h-5 w-5" />}
              label="Active alerts"
              value={`${snapshot.dashboard.alerts.length}`}
              meta="AI anomaly watch"
              accent="#fb7185"
            />
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Live KPIs</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SimpleStat label="Active workflows" value={snapshot.dashboard.activeWorkflows} />
              <SimpleStat
                label="Average drop-off"
                value={`${Math.round(snapshot.dashboard.averageDropOffRate * 100)}%`}
              />
              <SimpleStat label="AI anomalies" value={snapshot.dashboard.anomalyCount} />
              <SimpleStat label="Last tick" value={`#${snapshot.tick}`} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-400/15 via-slate-950 to-slate-950 p-6">
            <div className="flex items-center gap-2 text-cyan-100">
              <Bot className="h-4 w-4" />
              <p className="text-xs uppercase tracking-[0.28em]">Fresh AI guidance</p>
            </div>
            <p className="mt-4 text-xl font-semibold text-white">
              {snapshot.dashboard.insights[0]?.detectedIssue || 'Realtime insight warming up'}
            </p>
            <p className="mt-3 text-sm text-slate-300">
              {snapshot.dashboard.insights[0]?.recommendation ||
                'Waiting for the next live pass across the monitored workflows.'}
            </p>
            <p className="mt-4 text-xs text-slate-400">
              Suggested fix: {snapshot.dashboard.insights[0]?.suggestedFix || 'Stand by for AI recommendation.'}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Live friction heatmap</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Workflow hotspots updating every second</h2>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
            {snapshot.dashboard.heatmap.length} monitored step surfaces
          </div>
        </div>
        <HeatmapGrid
          items={snapshot.dashboard.heatmap.map((item) => ({
            id: `${item.workflowId}-${item.stepId}`,
            label: item.stepName,
            value: item.frictionScore,
            sublabel: item.workflowName,
          }))}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Landscape</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Realtime friction topology</h2>
              <p className="mt-2 text-sm text-slate-400">
                Live step-by-step friction scores updated at{' '}
                {new Date(snapshot.generatedAt).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
              <Activity className="h-3.5 w-3.5" />
              Live 3D surface
            </div>
          </div>
          <div className="h-[360px] rounded-[1.5rem] bg-[linear-gradient(135deg,#020617_0%,#111827_50%,#0f172a_100%)] p-4">
            <FrictionChart3D
              data={topHeat.map((item) => ({
                label: item.stepName,
                frictionScore: item.frictionScore,
                avgTime: 0,
                dropOff: 0,
                color: '#38bdf8',
              }))}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">AI anomaly alerts</p>
            <div className="mt-4 space-y-4">
              {snapshot.dashboard.alerts.slice(0, 4).map((alert) => (
                <div key={`${alert.workflowId}-${alert.stepId}`} className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{alert.issue}</p>
                      <p className="mt-1 text-xs text-slate-300">
                        {alert.workflowName} / {alert.stepName}
                      </p>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                      {(alert.score * 100).toFixed(0)}
                    </div>
                  </div>
                </div>
              ))}
              {!snapshot.dashboard.alerts.length ? (
                <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  No active anomaly alerts on this tick.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Watchlist</p>
            <div className="mt-4 space-y-4">
              {topWorkflows.map((workflow) => (
                <Link
                  key={workflow.id}
                  href={`/workflows/${workflow.id}`}
                  className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan-300/30 hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-white">{workflow.name}</p>
                      <p className="text-xs text-slate-400">
                        {workflow.activeUsers} active users • {workflow.sessionCount} sessions
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-3xl font-semibold text-white">
                        {Math.round(workflow.overallFriction * 100)}
                      </p>
                      <p className="text-xs text-slate-400">{workflow.trend} trend</p>
                    </div>
                    <div className="w-40">
                      <Sparkline
                        values={workflow.timeline.map((point) => point.frictionScore)}
                        stroke="#67e8f9"
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-center gap-3">
          <Layers className="h-5 w-5 text-cyan-200" />
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Latest AI insights</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Actionable recommendations from the live stream</h2>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {snapshot.dashboard.insights.slice(0, 3).map((insight) => (
            <AIInsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  meta,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  meta: string;
  accent: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5 transition hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <div className="rounded-2xl p-3" style={{ backgroundColor: `${accent}20`, color: accent }}>
          {icon}
        </div>
        <span className="text-xs text-slate-400">{meta}</span>
      </div>
      <p className="mt-4 text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-4xl font-semibold text-white">{value}</p>
    </div>
  );
}

function SimpleStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
