'use client';

export function HeatmapGrid({
  items,
}: {
  items: Array<{
    id: string;
    label: string;
    value: number;
    sublabel?: string;
  }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const color =
          item.value >= 0.75
            ? 'from-rose-500/70 to-rose-950'
            : item.value >= 0.5
              ? 'from-orange-400/70 to-orange-950'
              : item.value >= 0.3
                ? 'from-amber-300/70 to-amber-950'
                : 'from-emerald-400/70 to-emerald-950';

        return (
          <div
            key={item.id}
            className={`rounded-2xl border border-white/10 bg-gradient-to-br ${color} p-4 text-white shadow-lg shadow-black/10 transition-transform duration-300 hover:-translate-y-0.5`}
          >
            <p className="text-xs uppercase tracking-[0.22em] text-white/60">{item.sublabel || 'Live'}</p>
            <h3 className="mt-2 text-sm font-semibold">{item.label}</h3>
            <p className="mt-3 text-3xl font-semibold">{Math.round(item.value * 100)}</p>
          </div>
        );
      })}
    </div>
  );
}
