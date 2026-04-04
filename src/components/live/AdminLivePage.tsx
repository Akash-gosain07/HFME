'use client';

import { useEffect, useState, useTransition } from 'react';
import { Activity, BrainCircuit, RefreshCcw, ShieldCheck, SlidersHorizontal } from 'lucide-react';

import { AppShell } from '@/components/AppShell';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';
import { LoadingPanel } from '@/components/live/LoadingPanel';
import { useLiveSnapshot } from '@/hooks/use-live-snapshot';
import type { LiveSnapshot, MonitoringConfig } from '@/lib/live-types';

export function AdminLivePage({
  initialSnapshot = null,
}: {
  initialSnapshot?: LiveSnapshot | null;
}) {
  const { data, error, isLoading, connectionStatus, refetch } = useLiveSnapshot(initialSnapshot);
  const [config, setConfig] = useState<MonitoringConfig | null>(null);
  const [notice, setNotice] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (data?.admin.config) {
      setConfig(data.admin.config);
    }
  }, [data?.admin.config]);

  function updateConfigField<K extends keyof MonitoringConfig>(key: K, value: MonitoringConfig[K]) {
    setConfig((current) => (current ? { ...current, [key]: value } : current));
  }

  function saveConfig() {
    if (!config) {
      return;
    }

    startTransition(async () => {
      const response = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const payload = (await response.json()) as { error?: string };
      setNotice(response.ok ? 'AI monitoring config updated.' : payload.error || 'Update failed.');
    });
  }

  function retrainModels() {
    startTransition(async () => {
      const response = await fetch('/api/ai/retrain', { method: 'POST' });
      const payload = (await response.json()) as { error?: string; retrainedAt?: string };
      setNotice(
        response.ok
          ? `Realtime AI retrained at ${payload.retrainedAt || 'the latest tick'}.`
          : payload.error || 'Retraining failed.'
      );
    });
  }

  return (
    <AppShell connectionStatus={connectionStatus}>
      <ClientErrorBoundary>
        {isLoading || !data || !config ? (
          <LoadingPanel label="Loading admin AI controls..." />
        ) : error ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-red-100">
            <p className="mb-4 text-base font-semibold">Admin telemetry could not be loaded.</p>
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
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">Admin AI cockpit</p>
              <h1 className="mt-4 text-4xl font-semibold text-white">
                Model status, sensitivity control, and live decision logs in one place.
              </h1>
              <p className="mt-3 max-w-3xl text-base text-slate-300">
                This page is wired directly into the streaming backend so sensitivity changes,
                retraining actions, and operational logs reflect the same realtime AI state used by
                the dashboard and workflow pages.
              </p>
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-6">
                <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
                  <div className="flex items-center gap-2 text-slate-300">
                    <ShieldCheck className="h-4 w-4" />
                    <p className="text-sm uppercase tracking-[0.22em]">Model status</p>
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <AdminStat
                      label="Anomaly detector"
                      value={data.admin.modelStatus.anomalyDetectorTrained ? 'Trained' : 'Warmup'}
                    />
                    <AdminStat
                      label="Predictor"
                      value={data.admin.modelStatus.frictionPredictorTrained ? 'Trained' : 'Warmup'}
                    />
                    <AdminStat
                      label="Queue depth"
                      value={`${data.admin.modelStatus.queueDepth}`}
                    />
                    <AdminStat
                      label="Redis"
                      value={data.admin.modelStatus.redisConnected ? 'Connected' : 'Fallback'}
                    />
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
                  <div className="flex items-center gap-2 text-slate-300">
                    <BrainCircuit className="h-4 w-4" />
                    <p className="text-sm uppercase tracking-[0.22em]">AI actions</p>
                  </div>
                  <div className="mt-5 space-y-4">
                    <button
                      className="flex w-full items-center justify-between rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 text-left text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
                      disabled={isPending}
                      onClick={retrainModels}
                      type="button"
                    >
                      <span>
                        <span className="block text-base font-semibold">Retrain anomaly + predictor</span>
                        <span className="mt-1 block text-sm text-cyan-100/80">
                          Force a fresh model fit on the current live behavioral history.
                        </span>
                      </span>
                      {isPending ? <RefreshCcw className="h-5 w-5 animate-spin" /> : <Activity className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
                <div className="flex items-center gap-2 text-slate-300">
                  <SlidersHorizontal className="h-4 w-4" />
                  <p className="text-sm uppercase tracking-[0.22em]">Sensitivity controls</p>
                </div>

                <div className="mt-6 grid gap-5">
                  <ToggleRow
                    checked={config.enabled}
                    description="Turn the per-second AI pipeline on or off."
                    label="Realtime monitoring"
                    onChange={(checked) => updateConfigField('enabled', checked)}
                  />
                  <ToggleRow
                    checked={config.predictionEnabled}
                    description="Enable trend forecasting on every live step."
                    label="Prediction engine"
                    onChange={(checked) => updateConfigField('predictionEnabled', checked)}
                  />
                  <ToggleRow
                    checked={config.explanationEnabled}
                    description="Keep natural-language AI guidance active on the stream."
                    label="Explanation engine"
                    onChange={(checked) => updateConfigField('explanationEnabled', checked)}
                  />

                  <SliderRow
                    label="Anomaly sensitivity"
                    value={config.anomalySensitivity}
                    min={0.05}
                    max={0.4}
                    step={0.01}
                    onChange={(value) => updateConfigField('anomalySensitivity', value)}
                  />
                  <SliderRow
                    label="Alert threshold"
                    value={config.alertThreshold}
                    min={0.3}
                    max={0.95}
                    step={0.01}
                    onChange={(value) => updateConfigField('alertThreshold', value)}
                  />
                  <SliderRow
                    label="Monitoring interval"
                    value={config.monitoringInterval}
                    min={1}
                    max={5}
                    step={1}
                    onChange={(value) => updateConfigField('monitoringInterval', value)}
                    formatValue={(value) => `${value}s`}
                  />

                  <button
                    className="rounded-full bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
                    disabled={isPending}
                    onClick={saveConfig}
                    type="button"
                  >
                    {isPending ? 'Saving...' : 'Save live AI config'}
                  </button>

                  {notice ? (
                    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
                      {notice}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6">
              <p className="text-sm uppercase tracking-[0.22em] text-slate-300">Realtime AI decision log</p>
              <div className="mt-5 space-y-3">
                {data.admin.logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{log.message}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">{log.level}</p>
                    </div>
                    <p className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </ClientErrorBoundary>
    </AppShell>
  );
}

function AdminStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
      <input
        checked={checked}
        className="h-5 w-5 rounded border-white/20 bg-slate-900 text-cyan-300"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{label}</p>
        <span className="text-sm text-cyan-100">{formatValue ? formatValue(value) : value.toFixed(2)}</span>
      </div>
      <input
        className="mt-4 w-full accent-cyan-300"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </div>
  );
}
