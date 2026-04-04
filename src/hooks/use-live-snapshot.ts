'use client';

import { useEffect, useEffectEvent, useState } from 'react';
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

  useEffect(() => {
    const eventSource = new EventSource('/api/ai/stream');

    eventSource.addEventListener('open', () => {
      setConnectionStatus('live');
    });

    eventSource.addEventListener('snapshot', (event) => {
      onSnapshot(event as MessageEvent);
    });

    eventSource.addEventListener('error', () => {
      onError();
    });

    return () => {
      eventSource.close();
    };
  }, [onError, onSnapshot]);

  return {
    data: streamSnapshot ?? query.data ?? null,
    isLoading: query.isLoading && !streamSnapshot,
    error: query.error,
    connectionStatus,
    refetch: query.refetch,
  };
}
