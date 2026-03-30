'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Load the intro lazily so it doesn't affect SSR
const IntroAnimation = dynamic(() => import('./IntroAnimation'), { ssr: false });

export default function DashboardWithIntro({ children }: { children: React.ReactNode }) {
  const [showIntro, setShowIntro] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Skip intro if user already visited this session
    const seen = sessionStorage.getItem('hfme-intro-seen');
    if (seen) setShowIntro(false);
  }, []);

  const handleIntroComplete = () => {
    setShowIntro(false);
    sessionStorage.setItem('hfme-intro-seen', '1');
  };

  if (!mounted) return <>{children}</>;

  return (
    <>
      {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}
      {children}
    </>
  );
}
