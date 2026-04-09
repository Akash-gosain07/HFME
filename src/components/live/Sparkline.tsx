'use client';

export function Sparkline({
  values,
  stroke = '#38bdf8',
}: {
  values: number[];
  stroke?: string;
}) {
  const points = values.length > 1 ? values : [...values, ...(values.length ? [values[0]] : [0, 0])];
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const width = 180;
  const height = 56;

  const path = points
    .map((value, index) => {
      const x = (index / (points.length - 1 || 1)) * width;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg className="h-14 w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
