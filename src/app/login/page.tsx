'use client';

import { Suspense, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Activity, Lock, Mail, Sparkles } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('admin@hfme.io');
  const [password, setPassword] = useState('hfme_admin_2024');
  const [error, setError] = useState('');
  const autoTriggered = useRef(false);

  const nextUrl = searchParams.get('next') || '/';
  const shouldAutoLogin = searchParams.get('auto') === '1';

  async function performLogin() {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error || 'Unable to sign in.');
      return;
    }

    window.location.href = nextUrl;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    startTransition(async () => {
      await performLogin();
    });
  }

  useEffect(() => {
    if (!shouldAutoLogin || autoTriggered.current) {
      return;
    }

    autoTriggered.current = true;
    startTransition(async () => {
      await performLogin();
    });
  }, [nextUrl, password, shouldAutoLogin, email, router]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1f2937_0%,#0f172a_50%,#020617_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              <Sparkles className="h-4 w-4" />
              HFME 2.0 realtime AI control room
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
                Live friction monitoring with per-second AI updates across every page.
              </h1>
              <p className="max-w-2xl text-lg text-slate-300">
                Sign in to the dashboard, workflows, and admin cockpit to inspect behavioral
                events, anomalies, predictions, and fresh AI guidance as they stream in.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                'Live behavioral events and friction shifts every second',
                'Streaming anomaly detection, prediction, and explainability',
                'Protected admin controls for retraining and sensitivity tuning',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 backdrop-blur"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-cyan-500/10 backdrop-blur">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/70">Secure Access</p>
                <h2 className="text-2xl font-semibold">HFME Control Plane</h2>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Admin email</span>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <input
                    className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@hfme.io"
                    type="email"
                    autoComplete="email"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Password</span>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="hfme_admin_2024"
                    type="password"
                    autoComplete="current-password"
                  />
                </div>
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              ) : null}

              <button
                className="w-full rounded-2xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={isPending}
              >
                {isPending ? 'Signing in...' : 'Enter HFME'}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Default seeded credentials are prefilled so local verification is fast.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
