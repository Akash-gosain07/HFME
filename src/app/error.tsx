'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12">
        <div className="w-full rounded-[2rem] border border-red-500/20 bg-red-500/10 p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-red-100/70">HFME error boundary</p>
          <h1 className="mt-4 text-3xl font-semibold">A runtime error interrupted the live dashboard.</h1>
          <p className="mt-3 text-sm text-red-100/80">
            Reset the route to reconnect to the stream and reload the latest AI state.
          </p>
          <button
            className="mt-6 rounded-full bg-white px-5 py-3 font-semibold text-slate-950"
            onClick={() => reset()}
            type="button"
          >
            Reset route
          </button>
        </div>
      </div>
    </div>
  );
}
