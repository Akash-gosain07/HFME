'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity, TrendingUp, AlertTriangle, BarChart3, Layers, Zap,
  Sparkles, Users, Clock, ArrowUpRight, RefreshCw,
} from 'lucide-react';
import { getFrictionLevel } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { StaggerContainer, StaggerItem } from '@/components/MotionComponents';
import { AIInsightCard } from '@/components/AIInsightCard';
import { FrictionChart3D } from '@/components/FrictionChart3D';
import DashboardWithIntro from '@/components/DashboardWithIntro';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Workflow {
  id: string;
  name: string;
  _count: { steps: number; sessions: number };
  avgFriction: number;
}

interface HighFrictionStep {
  id: string;
  name: string;
  frictionScore: number;
  avgTime: number;
  retries: number;
  dropOffRate: number;
}

interface ChartPoint {
  label: string;
  frictionScore: number;
  avgTime: number;
  dropOff: number;
  color: string;
}

interface AiInsight {
  id: string;
  insightType: string;
  detectedIssue: string;
  recommendation: string;
  confidenceLevel: number;
  impactScore: number;
  generatedBy?: 'gemini' | 'rule-based';
}

interface RealtimeData {
  workflows: Workflow[];
  highFrictionSteps: HighFrictionStep[];
  chartData: ChartPoint[];
  kpis: {
    totalSessions: number;
    avgFriction: number;
    avgDropOff: number;
    dropOffChange: number;
  };
  generatedAt: string;
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-muted/50 ${className}`}
    />
  );
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-card p-6 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

function InsightSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-border p-6 space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-12 w-full" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Animated Number ─────────────────────────────────────────────────────────

function AnimatedNumber({ value, formatter }: { value: number; formatter: (v: number) => string }) {
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    let raf: number;
    const start = displayed;
    const end = value;
    const duration = 600;
    const startTime = performance.now();
    function step(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(start + (end - start) * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{formatter(displayed)}</>;
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [insightsSource, setInsightsSource] = useState<'gemini' | 'rule-based' | null>(null);

  // ── Fetch realtime data ────────────────────────────────────────
  const fetchRealtime = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    try {
      const res = await fetch('/api/gemini/realtime', { cache: 'no-store' });
      if (!res.ok) throw new Error('realtime fetch failed');
      const data: RealtimeData = await res.json();
      setRealtimeData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[dashboard] realtime fetch failed:', err);
    } finally {
      setLoadingData(false);
      setIsRefreshing(false);
    }
  }, []);

  // ── Fetch Gemini AI insights ───────────────────────────────────
  const fetchInsights = useCallback(async () => {
    try {
      const res = await fetch('/api/gemini/insights', { cache: 'no-store' });
      if (!res.ok) throw new Error('insights fetch failed');
      const data = await res.json();
      setInsights(data.insights ?? []);
      if (data.insights?.[0]) {
        setInsightsSource(data.insights[0].generatedBy ?? 'rule-based');
      }
    } catch (err) {
      console.error('[dashboard] insights fetch failed:', err);
    } finally {
      setLoadingInsights(false);
    }
  }, []);

  // ── Initial load ───────────────────────────────────────────────
  useEffect(() => {
    fetchRealtime();
    fetchInsights();
  }, [fetchRealtime, fetchInsights]);

  // ── 1-second realtime polling ─────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRealtime(false);
    }, 1_000);
    return () => clearInterval(interval);
  }, [fetchRealtime]);

  // ── Refresh insights every 30s (Gemini API) ───────────────────
  useEffect(() => {
    const interval = setInterval(fetchInsights, 30_000);
    return () => clearInterval(interval);
  }, [fetchInsights]);

  const avgFriction = realtimeData?.kpis.avgFriction ?? 0;
  const frictionLevel = getFrictionLevel(avgFriction);
  const dropOffChange = realtimeData?.kpis.dropOffChange ?? -3.2;
  const anomalyCount = insights.filter(i => i.insightType === 'anomaly').length;

  return (
    <DashboardWithIntro>
      <div className="min-h-screen bg-background transition-colors duration-300">

        {/* ── Header ──────────────────────────────────────────── */}
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

              <nav className="flex items-center gap-4 sm:gap-6">
                {/* Live indicator */}
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                  {isRefreshing ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                  )}
                  {lastUpdated ? (
                    <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                  ) : (
                    <span>Loading…</span>
                  )}
                </div>

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



            {/* ── Hero / KPI ────────────────────────────────── */}
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
                    {loadingData ? (
                      <Skeleton className="h-10 w-20" />
                    ) : (
                      <>
                        <span className="text-4xl font-bold" style={{ color: frictionLevel.color }}>
                          <AnimatedNumber value={avgFriction * 100} formatter={(v) => v.toFixed(0)} />
                        </span>
                        <span className="text-sm font-medium mb-1.5" style={{ color: frictionLevel.color }}>
                          {frictionLevel.label}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
                  <p className="text-sm text-primary mb-2">AI Status</p>
                  <div className="flex items-center gap-2">
                    <Zap className="h-8 w-8 text-primary" />
                    <span className="text-xl font-bold text-primary">Active</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Monitoring {realtimeData?.workflows.length ?? 5} workflows
                  </p>
                </div>
              </div>
            </StaggerItem>

            {/* ── Key Metrics ──────────────────────────────── */}
            <StaggerItem>
              {loadingData ? (
                <KpiSkeleton />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                  {[
                    {
                      icon: <BarChart3 className="h-5 w-5 text-secondary-foreground" />,
                      bg: 'bg-secondary',
                      value: realtimeData!.kpis.totalSessions,
                      label: 'Total Sessions',
                      badge: 'Live',
                      badgeColor: 'bg-secondary text-secondary-foreground',
                      formatter: (v: number) => Math.round(v).toLocaleString(),
                    },
                    {
                      icon: <AlertTriangle className="h-5 w-5 text-purple-400" />,
                      bg: 'bg-purple-500/10',
                      value: anomalyCount,
                      label: 'Detected Anomalies',
                      badge: 'Live',
                      badgeColor: 'bg-purple-500/20 text-purple-400',
                      pulse: true,
                      formatter: (v: number) => Math.round(v).toString(),
                    },
                    {
                      icon: <TrendingUp className="h-5 w-5 text-blue-400" />,
                      bg: 'bg-blue-500/10',
                      value: realtimeData!.workflows.length,
                      label: 'Active Workflows',
                      badge: 'Running',
                      badgeColor: 'bg-blue-500/20 text-blue-400',
                      formatter: (v: number) => Math.round(v).toString(),
                    },
                    {
                      icon: <Users className="h-5 w-5 text-emerald-400" />,
                      bg: 'bg-emerald-500/10',
                      value: realtimeData!.kpis.avgDropOff * 100,
                      label: 'Avg Drop-off Rate',
                      badge: dropOffChange < 0 ? `↓ ${Math.abs(dropOffChange).toFixed(1)}%` : `↑ ${dropOffChange.toFixed(1)}%`,
                      badgeColor: dropOffChange < 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400',
                      formatter: (v: number) => `${v.toFixed(1)}%`,
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
                      <p className="text-3xl font-bold text-foreground">
                        <AnimatedNumber value={m.value} formatter={m.formatter} />
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{m.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </StaggerItem>

            {/* ── 3D Friction Graph ──────────────────────────── */}
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
                      <p className="text-xs text-white/40">
                        {loadingData ? 'Loading real-time data…' : 'Live step-by-step friction scores — updates every 30s'}
                      </p>
                    </div>
                  </div>
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
                  {loadingData ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3 text-white/40">
                        <RefreshCw className="h-8 w-8 animate-spin" />
                        <span className="text-sm">Fetching live data…</span>
                      </div>
                    </div>
                  ) : (
                    <FrictionChart3D data={realtimeData!.chartData} />
                  )}
                </div>

                <div className="grid grid-cols-3 divide-x divide-white/5 border-t border-white/5">
                  {[
                    {
                      label: 'Peak Friction Step',
                      value: realtimeData
                        ? realtimeData.chartData.reduce((a, b) => a.frictionScore > b.frictionScore ? a : b).label
                        : '—',
                      sub: realtimeData
                        ? `${(realtimeData.chartData.reduce((a, b) => a.frictionScore > b.frictionScore ? a : b).frictionScore * 100).toFixed(0)} / 100`
                        : '—',
                    },
                    {
                      label: 'Avg Friction Score',
                      value: realtimeData ? `${(realtimeData.kpis.avgFriction * 100).toFixed(0)} / 100` : '—',
                      sub: frictionLevel.label,
                    },
                    {
                      label: 'Steps Monitored',
                      value: realtimeData?.chartData.length ?? '—',
                      sub: 'Across all workflows',
                    },
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

            {/* ── AI Insights ──────────────────────────────── */}
            <StaggerItem>
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">
                  {insightsSource === 'gemini' ? 'Gemini AI Insights' : 'AI Insights'}
                </h2>
                {insightsSource === 'gemini' && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                    Gemini 1.5 Flash
                  </span>
                )}
                {insightsSource === 'rule-based' && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-medium">
                    Rule-based Engine
                  </span>
                )}
              </div>
              {loadingInsights ? (
                <InsightSkeleton />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {insights.slice(0, 3).map((insight) => (
                    <AIInsightCard key={insight.id} insight={insight} />
                  ))}
                </div>
              )}
            </StaggerItem>

            {/* ── Main Grid: Workflows + High Friction ────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Workflows list */}
              <StaggerItem className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Active Workflows</h2>
                  <span className="text-xs text-muted-foreground">
                    {realtimeData ? `${realtimeData.workflows.length} workflows` : <Skeleton className="h-4 w-16 inline-block" />}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {loadingData
                    ? [0, 1, 2, 3, 4].map(i => (
                      <div key={i} className="p-4 flex items-center justify-between">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </div>
                    ))
                    : realtimeData!.workflows.map((workflow) => {
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
                  {loadingData
                    ? [0, 1, 2, 3, 4].map(i => (
                      <div key={i} className="p-4 space-y-3">
                        <div className="flex justify-between">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-5 w-12" />
                        </div>
                        <Skeleton className="h-1.5 w-full rounded-full" />
                        <div className="grid grid-cols-3 gap-3">
                          {[0, 1, 2].map(j => <Skeleton key={j} className="h-10 rounded" />)}
                        </div>
                      </div>
                    ))
                    : realtimeData!.highFrictionSteps.map((metric) => {
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
                          <div className="w-full h-1.5 rounded-full bg-secondary mb-3">
                            <div
                              className="h-1.5 rounded-full transition-all duration-700"
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
