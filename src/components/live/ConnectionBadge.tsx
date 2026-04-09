'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, RefreshCcw } from 'lucide-react';

export function ConnectionBadge({
  status,
  timestamp,
}: {
  status: 'connecting' | 'live' | 'reconnecting' | 'error';
  timestamp?: string | null;
}) {
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClock(new Date());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const config = {
    connecting: {
      label: 'Connecting',
      className: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100',
      icon: <RefreshCcw className="h-3.5 w-3.5 animate-spin" />,
    },
    live: {
      label: 'Live SSE connected',
      className: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
      icon: <Activity className="h-3.5 w-3.5" />,
    },
    reconnecting: {
      label: 'Reconnecting',
      className: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
      icon: <RefreshCcw className="h-3.5 w-3.5 animate-spin" />,
    },
    error: {
      label: 'Offline',
      className: 'border-red-400/20 bg-red-400/10 text-red-100',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    },
  }[status];

  const timeSource = timestamp ? new Date(timestamp) : status === 'live' ? clock : null;
  const timeLabel =
    timeSource && !Number.isNaN(timeSource.getTime())
      ? timeSource.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
        })
      : null;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${config.className}`}
    >
      {config.icon}
      {config.label}
      {timeLabel ? <span className="text-[11px] opacity-80">{timeLabel}</span> : null}
    </div>
  );
}
