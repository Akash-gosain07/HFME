'use client';

export function LoadingPanel({ label = 'Connecting to live AI stream...' }: { label?: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-8 text-center text-sm text-slate-300">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
      {label}
    </div>
  );
}
