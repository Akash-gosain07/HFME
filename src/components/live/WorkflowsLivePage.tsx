'use client';

import Link from 'next/link';
import { ArrowUpRight, Clock3, Sparkles, Users } from 'lucide-react';

import { AppShell } from '@/components/AppShell';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { LoadingPanel } from '@/components/live/LoadingPanel';
import { Sparkline } from '@/components/live/Sparkline';
import { useLiveSnapshot } from '@/hooks/use-live-snapshot';
import type { LiveSnapshot } from '@/lib/live-types';
import { getFrictionLevel } from '@/lib/utils';

export function WorkflowsLivePage({
  initialSnapshot = null,
}: {
  initialSnapshot?: LiveSnapshot | null;
}) {
  const { data, error, isLoading, connectionStatus, refetch } = useLiveSnapshot(initialSnapshot);

  return (
    <AppShell connectionStatus={connectionStatus} connectionTimestamp={data?.generatedAt}>
      <ClientErrorBoundary>
        {isLoading || !data ? (
          <LoadingPanel label="Loading live workflows..." />
        ) : error ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-red-100">
            <p className="mb-4 text-base font-semibold">Live workflow data is unavailable.</p>
            <button
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950"
              onClick={() => refetch()}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">Workflow Control</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
                Every workflow is now running on the same live AI backbone.
              </h1>
              <p className="mt-3 max-w-3xl text-base text-slate-300">
                These cards update every second with fresh friction metrics, AI predictions, anomaly
                counts, and natural-language recommendations from the backend stream.
              </p>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              {data.workflows.map((workflow) => {
                const level = getFrictionLevel(workflow.overallFriction);
                return (
                  <Link
                    key={workflow.id}
                    href={`/workflows/${workflow.id}`}
                    className="group rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 transition hover:-translate-y-1 hover:border-cyan-300/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Workflow</p>
                        <h2 className="mt-2 text-2xl font-semibold text-white">{workflow.name}</h2>
                        <p className="mt-2 text-sm text-slate-300">{workflow.description}</p>
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-slate-400 transition group-hover:text-cyan-200" />
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-4">
                      <StatBlock label="Friction" value={`${Math.round(workflow.overallFriction * 100)}`} accent={level.color} />
                      <StatBlock label="Sessions" value={`${workflow.sessionCount}`} />
                      <StatBlock label="Active users" value={`${workflow.activeUsers}`} />
                      <StatBlock label="Anomalies" value={`${workflow.anomalyCount}`} />
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Clock3 className="h-4 w-4" />
                          <p className="text-sm">Realtime trend</p>
                        </div>
                        <div className="mt-4">
                          <Sparkline
                            values={workflow.timeline.map((point) => point.frictionScore)}
                            stroke="#22d3ee"
                          />
                        </div>
                        <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                          {workflow.trend}
                        </p>
                      </div>

                      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Sparkles className="h-4 w-4" />
                          <p className="text-sm">Latest AI insight</p>
                        </div>
                        <p className="mt-4 text-lg font-semibold text-white">
                          {workflow.latestInsight?.detectedIssue || 'AI insight warming up'}
                        </p>
                        <p className="mt-2 text-sm text-slate-300">
                          {workflow.latestInsight?.recommendation ||
                            'Insight content will appear after the next analysis cycle.'}
                        </p>
                        <p className="mt-3 text-xs text-slate-400">
                          Suggested fix: {workflow.latestInsight?.suggestedFix || 'Pending'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {workflow.steps.map((step) => {
                        const stepLevel = getFrictionLevel(step.current.frictionScore);
                        return (
                          <div
                            key={step.id}
                            className="rounded-[1.25rem] border border-white/10 bg-slate-950/70 p-4"
                          >
                            <p className="text-sm font-semibold text-white">{step.name}</p>
                            <div className="mt-3 flex items-end justify-between gap-3">
                              <div>
                                <p className="text-3xl font-semibold text-white">
                                  {Math.round(step.current.frictionScore * 100)}
                                </p>
                                <p className="text-xs text-slate-400">{step.status}</p>
                              </div>
                              <span
                                className="rounded-full px-3 py-1 text-xs font-medium"
                                style={{
                                  backgroundColor: `${stepLevel.color}20`,
                                  color: stepLevel.color,
                                }}
                              >
                                {stepLevel.label}
                              </span>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                              <Users className="h-3.5 w-3.5" />
                              {Math.round(step.current.dropOffRate * 100)}% drop-off
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Link>
                );
              })}
            </section>
          </div>
        )}
      </ClientErrorBoundary>
    </AppShell>
  );
}

function StatBlock({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold" style={{ color: accent || '#ffffff' }}>
        {value}
      </p>
    </div>
  );
}
