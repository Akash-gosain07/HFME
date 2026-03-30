import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateFrictionScore(metrics: {
  avgTime: number;
  expectedTime: number;
  retries: number;
  idleTime: number;
  backNav: number;
  dropOffRate: number;
}): number {
  const weights = {
    timeOverrun: 0.25,
    retries: 0.20,
    idle: 0.20,
    backNav: 0.15,
    dropOff: 0.20,
  };

  const timeOverrun = Math.max(0, (metrics.avgTime - metrics.expectedTime) / metrics.expectedTime);
  const normalizedRetries = Math.min(metrics.retries / 10, 1);
  const normalizedIdle = Math.min(metrics.idleTime / 60, 1);
  const normalizedBackNav = Math.min(metrics.backNav / 5, 1);
  const normalizedDropOff = Math.min(metrics.dropOffRate, 1);

  const score =
    timeOverrun * weights.timeOverrun +
    normalizedRetries * weights.retries +
    normalizedIdle * weights.idle +
    normalizedBackNav * weights.backNav +
    normalizedDropOff * weights.dropOff;

  return Math.min(score, 1);
}

export function getFrictionLevel(score: number): {
  level: 'low' | 'medium' | 'high' | 'critical';
  color: string;
  label: string;
} {
  if (score >= 0.75) {
    return { level: 'critical', color: '#991b1b', label: 'Critical' };
  } else if (score >= 0.5) {
    return { level: 'high', color: '#ef4444', label: 'High' };
  } else if (score >= 0.3) {
    return { level: 'medium', color: '#f59e0b', label: 'Medium' };
  } else {
    return { level: 'low', color: '#10b981', label: 'Low' };
  }
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatTimestamp(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
