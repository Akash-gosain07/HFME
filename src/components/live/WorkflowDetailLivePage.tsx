'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Clock3,
  Gauge,
  RefreshCcw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import { AppShell } from '@/components/AppShell';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { HeatmapGrid } from '@/components/live/HeatmapGrid';
import { LoadingPanel } from '@/components/live/LoadingPanel';
import { Sparkline } from '@/components/live/Sparkline';
import { useLiveSnapshot } from '@/hooks/use-live-snapshot';
import type { ExplanationResult, LiveSnapshot } from '@/lib/live-types';
import { getFrictionLevel } from '@/lib/utils';

export function WorkflowDetailLivePage({
  workflowId,
  initialSnapshot = null,
}: {
  workflowId: string;
  initialSnapshot?: LiveSnapshot | null;
}) {
  const { data, error, isLoading, connectionStatus, refetch } = useLiveSnapshot(initialSnapshot);
  const [manualInsights, setManualInsights] = useState<Record<string, ExplanationResult>>({});
  const [insightErrors, setInsightErrors] = useState<Record<string, string>>({});
  const [pendingStepId, setPendingStepId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const workflow = data?.workflows.find((item) => item.id === workflowId);

  function requestInsight(stepId: string) {
    setPendingStepId(stepId);
    setInsightErrors((current) => ({ ...current, [stepId]: '' }));

    startTransition(async () => {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, stepId }),
      });

      const payload = (await response.json()) as {
        error?: string;
        explanation?: ExplanationResult;
      };

      if (!response.ok || !payload.explanation) {
        setInsightErrors((current) => ({
          ...current,
          [stepId]: payload.error || 'Unable to fetch a fresh AI insight.',
        }));
        setPendingStepId(null);
        return;
      }

      setManualInsights((current) => ({ ...current, [stepId]: payload.explanation! }));
      setPendingStepId(null);
    });
  }

  return (
    <AppShell connectionStatus={connectionStatus}>
      <ClientErrorBoundary>
        {isLoading || !data ? (
          <LoadingPanel label="Streaming workflow detail..." />
        ) : error ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-red-100">
            <p className="mb-4 text-base font-semibold">This workflow could not connect to the live AI backend.</p>
            <button
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950"
              onClick={() => refetch()}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : !workflow ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-200">
            <p className="text-lg font-semibold">Workflow not found in the live snapshot.</p>
            <p className="mt-2 text-sm text-slate-400">
              The backend stream is up, but this workflow ID has not appeared in the current runtime map.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
              <Link
                href="/workflows"
                className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to workflows
              </Link>

              <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">Live workflow view</p>
                  <h1 className="mt-3 text-4xl font-semibold text-white">{workflow.name}</h1>
                  <p className="mt-3 text-base text-slate-300">{workflow.description}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  <DetailStat label="Friction" value={`${Math.round(workflow.overallFriction * 100)}`} />
                  <DetailStat label="Sessions" value={`${workflow.sessionCount}`} />
                  <DetailStat label="Active" value={`${workflow.activeUsers}`} />
                  <DetailStat label="Anomalies" value={`${workflow.anomalyCount}`} />
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
                <div className="flex items-center gap-2 text-slate-300">
                  <TrendingUp className="h-4 w-4" />
                  <p className="text-sm uppercase tracking-[0.22em]">Workflow timeline</p>
                </div>
                <div className="mt-6">
                  <Sparkline
                    values={workflow.timeline.map((point) => point.frictionScore)}
                    stroke="#22d3ee"
                  />
                </div>
                <p className="mt-4 text-sm text-slate-300">
                  Trend: <span className="font-semibold text-white">{workflow.trend}</span>
                </p>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
                <div className="flex items-center gap-2 text-slate-300">
                  <Gauge className="h-4 w-4" />
                  <p className="text-sm uppercase tracking-[0.22em]">Step heatmap</p>
                </div>
                <div className="mt-5">
                  <HeatmapGrid
                    items={workflow.steps.map((step) => ({
                      id: step.id,
                      label: step.name,
                      value: step.current.frictionScore,
                      sublabel: step.status,
                    }))}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              {workflow.steps.map((step) => {
                const level = getFrictionLevel(step.current.frictionScore);
                const manualInsight = manualInsights[step.id];
                const displayedInsight = manualInsight || step.insight;
                const isStepPending = isPending && pendingStepId === step.id;

                return (
                  <div
                    key={step.id}
                    className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                            Step {step.order + 1}
                          </span>
                          <span
                            className="rounded-full px-3 py-1 text-xs font-medium"
                            style={{
                              backgroundColor: `${level.color}20`,
                              color: level.color,
                            }}
                          >
                            {level.label}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                            {step.status}
                          </span>
                        </div>
                        <h2 className="mt-4 text-2xl font-semibold text-white">{step.name}</h2>
                        <p className="mt-2 text-sm text-slate-400">
                          Expected completion window: {step.expectedTimeSeconds}s
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-4">
                        <DetailStat label="Friction" value={`${Math.round(step.current.frictionScore * 100)}`} />
                        <DetailStat label="Avg time" value={`${Math.round(step.current.avgTime)}s`} />
                        <DetailStat label="Retries" value={`${Math.round(step.current.retries)}`} />
                        <DetailStat label="Drop-off" value={`${Math.round(step.current.dropOffRate * 100)}%`} />
                      </div>
                    </div>

                    <div className="mt-6 grid gap-6 xl:grid-cols-[0.7fr_0.7fr_1fr]">
                      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Clock3 className="h-4 w-4" />
                          <p className="text-sm">Step timeline</p>
                        </div>
                        <div className="mt-4">
                          <Sparkline
                            values={step.history.map((item) => item.frictionScore)}
                            stroke="#67e8f9"
                          />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
                          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                            Idle time
                            <p className="mt-2 text-xl font-semibold text-white">
                              {Math.round(step.current.idleTime)}s
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                            Back nav
                            <p className="mt-2 text-xl font-semibold text-white">
                              {Math.round(step.current.backNav)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-slate-300">
                          <AlertTriangle className="h-4 w-4" />
                          <p className="text-sm">Anomaly + prediction</p>
                        </div>
                        <div className="mt-4 space-y-3 text-sm text-slate-300">
                          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Anomaly score</p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                              {(step.anomaly.anomalyScore * 100).toFixed(0)}
                            </p>
                            <p className="mt-2 text-xs text-slate-400">{step.anomaly.summary}</p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Prediction</p>
                            <p className="mt-2 text-lg font-semibold text-white">
                              {step.prediction.trend} / {step.prediction.riskLevel}
                            </p>
                            <p className="mt-2 text-xs text-slate-400">
                              Confidence {Math.round(step.prediction.confidence * 100)}% • Next average{' '}
                              {Math.round((step.prediction.predictedAverage || 0) * 100)}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">SHAP drivers</p>
                            <div className="mt-3 space-y-2">
                              {step.anomaly.shapContributions?.slice(0, 3).map((item) => (
                                <div
                                  key={`${step.id}-${item.feature}`}
                                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
                                >
                                  <span className="text-sm text-white">{item.feature}</span>
                                  <span className="text-xs text-slate-300">
                                    {item.direction} {item.impact.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 text-slate-300">
                            <Sparkles className="h-4 w-4" />
                            <p className="text-sm">Live AI insight</p>
                          </div>
                          <button
                            className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
                            disabled={isStepPending}
                            onClick={() => requestInsight(step.id)}
                            type="button"
                          >
                            {isStepPending ? (
                              <>
                                <RefreshCcw className="h-4 w-4 animate-spin" />
                                Thinking
                              </>
                            ) : (
                              <>
                                <Bot className="h-4 w-4" />
                                Get AI Insights
                              </>
                            )}
                          </button>
                        </div>

                        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5">
                          <p className="text-xl font-semibold text-white">{displayedInsight.detectedIssue}</p>
                          <p className="mt-3 text-sm text-slate-300">{displayedInsight.recommendation}</p>
                          <p className="mt-3 text-sm text-cyan-100">
                            Suggested fix: {displayedInsight.suggestedFix || displayedInsight.recommendation}
                          </p>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Confidence</p>
                              <p className="mt-2 text-xl font-semibold text-white">
                                {Math.round(displayedInsight.confidenceLevel * 100)}%
                              </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Impact</p>
                              <p className="mt-2 text-xl font-semibold text-white">
                                {Math.round(displayedInsight.impactScore * 100)}
                              </p>
                            </div>
                          </div>
                          <p className="mt-4 text-xs text-slate-400">{displayedInsight.reasoning}</p>
                        </div>

                        {insightErrors[step.id] ? (
                          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                            {insightErrors[step.id]}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          </div>
        )}
      </ClientErrorBoundary>
    </AppShell>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/70 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
