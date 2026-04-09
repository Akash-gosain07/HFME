'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { LiveSnapshot } from '@/lib/live-types';

async function fetchLiveSnapshot() {
  const response = await fetch('/api/ai/live', {
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || 'Unable to load live AI data.');
  }

  return (await response.json()) as LiveSnapshot;
}

export function useLiveSnapshot(initialSnapshot: LiveSnapshot | null = null) {
  const [streamSnapshot, setStreamSnapshot] = useState<LiveSnapshot | null>(initialSnapshot);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'live' | 'reconnecting' | 'error'
  >('connecting');

  // Use refs for values needed inside the effect to avoid stale closures
  // without causing the effect to re-run on every render.
  const streamSnapshotRef = useRef<LiveSnapshot | null>(initialSnapshot);
  const hasAnyDataRef = useRef<boolean>(Boolean(initialSnapshot));

  // Fallback polling — only used when SSE is unavailable. Fixed 15s interval.
  const query = useQuery({
    queryKey: ['live-snapshot'],
    queryFn: fetchLiveSnapshot,
    staleTime: 5_000,
    refetchOnWindowFocus: false,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    initialData: initialSnapshot || undefined,
  });

  // Keep the ref updated to the latest query data too.
  useEffect(() => {
    if (query.data) {
      hasAnyDataRef.current = true;
    }
  }, [query.data]);

  // SSE connection — runs once on mount, implements exponential backoff reconnect.
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 1_000; // start at 1s
    let isMounted = true;

    function connect() {
      if (!isMounted) return;

      eventSource = new EventSource('/api/ai/stream');

      eventSource.addEventListener('open', () => {
        if (!isMounted) return;
        setConnectionStatus('live');
        reconnectDelay = 1_000; // reset backoff on success
      });

      eventSource.addEventListener('snapshot', (rawEvent: Event) => {
        if (!isMounted) return;
        try {
          const next = JSON.parse((rawEvent as MessageEvent).data) as LiveSnapshot;
          streamSnapshotRef.current = next;
          hasAnyDataRef.current = true;
          setStreamSnapshot(next);
          setConnectionStatus('live');
        } catch (err) {
          console.error('[SSE] Failed to parse snapshot:', err);
        }
      });

      eventSource.addEventListener('ping', () => {
        if (!isMounted) return;
        setConnectionStatus('live');
      });

      eventSource.addEventListener('error', () => {
        if (!isMounted) return;

        // Close old connection
        eventSource?.close();
        eventSource = null;

        const hasData = hasAnyDataRef.current;
        setConnectionStatus(hasData ? 'reconnecting' : 'error');

        // Exponential backoff reconnect (max 30s)
        const delay = reconnectDelay;
        reconnectDelay = Math.min(reconnectDelay * 1.5, 30_000);

        reconnectTimer = setTimeout(() => {
          if (isMounted) connect();
        }, delay);
      });
    }

    connect();

    return () => {
      isMounted = false;
      eventSource?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []); // Empty deps: connect once on mount only

  const data = useMemo(() => {
    const candidates = [streamSnapshot, query.data].filter(
      (s): s is LiveSnapshot => Boolean(s)
    );

    if (!candidates.length) return null;

    return candidates.reduce((latest, current) => {
      const latestTime = Number.isNaN(Date.parse(latest.generatedAt))
        ? latest.tick
        : Date.parse(latest.generatedAt);
      const currentTime = Number.isNaN(Date.parse(current.generatedAt))
        ? current.tick
        : Date.parse(current.generatedAt);
      return currentTime >= latestTime ? current : latest;
    });
  }, [query.data, streamSnapshot]);

  return {
    data,
    isLoading: query.isLoading && !data,
    error: data ? null : query.error,
    connectionStatus,
    refetch: query.refetch,
  };
}
