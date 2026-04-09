'use client';

import React from 'react';

export class ClientErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Live UI error boundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-100">
            A live rendering error occurred. Refresh the page to reconnect to the AI stream.
          </div>
        )
      );
    }

    return this.props.children;
  }
}
