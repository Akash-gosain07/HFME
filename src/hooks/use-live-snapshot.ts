'use client';

import { useEffect, useEffectEvent, useMemo, useState } from 'react';
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
  const query = useQuery({
    queryKey: ['live-snapshot'],
    queryFn: fetchLiveSnapshot,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
    initialData: initialSnapshot || undefined,
  });
  const [streamSnapshot, setStreamSnapshot] = useState<LiveSnapshot | null>(initialSnapshot);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'live' | 'reconnecting' | 'error'
  >('connecting');

  const onSnapshot = useEffectEvent((event: MessageEvent) => {
    try {
      const nextSnapshot = JSON.parse(event.data) as LiveSnapshot;
      setStreamSnapshot(nextSnapshot);
      setConnectionStatus('live');
    } catch (error) {
      console.error('Failed to parse live snapshot:', error);
    }
  });

  const onError = useEffectEvent(() => {
    setConnectionStatus(streamSnapshot || query.data ? 'reconnecting' : 'error');
  });

  const onPing = useEffectEvent(() => {
    setConnectionStatus('live');
  });

  useEffect(() => {
    const eventSource = new EventSource('/api/ai/stream');

    eventSource.addEventListener('open', () => {
      setConnectionStatus('live');
    });

    eventSource.addEventListener('snapshot', (event) => {
      onSnapshot(event as MessageEvent);
    });

    eventSource.addEventListener('ping', () => {
      onPing();
    });

    eventSource.addEventListener('error', () => {
      onError();
    });

    return () => {
      eventSource.close();
    };
  }, [onError, onSnapshot]);

  const data = useMemo(() => {
    const snapshots = [streamSnapshot, query.data].filter(
      (snapshot): snapshot is LiveSnapshot => Boolean(snapshot)
    );

    if (!snapshots.length) {
      return null;
    }

    return snapshots.reduce((latest, current) => {
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
