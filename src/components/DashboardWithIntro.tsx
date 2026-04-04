'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

// Load lazily — avoids SSR issues with canvas / window refs
const IntroAnimation = dynamic(() => import('./IntroAnimation'), { ssr: false });

export default function DashboardWithIntro({ children }: { children: React.ReactNode }) {
  const [showIntro, setShowIntro] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Skip intro on subsequent visits within same session
    const seen = sessionStorage.getItem('hfme-intro-seen');
    if (seen) {
      setShowIntro(false);
      setShowDashboard(true);
    }
  }, []);

  const handleIntroComplete = () => {
    setShowIntro(false);
    setShowDashboard(true);
    sessionStorage.setItem('hfme-intro-seen', '1');
  };

  // SSR guard — render nothing until mounted
  if (!mounted) return null;

  return (
    <>
      {/* Intro overlay (renders above everything) */}
      <AnimatePresence>
        {showIntro && (
          <IntroAnimation onComplete={handleIntroComplete} />
        )}
      </AnimatePresence>

      {/* Dashboard fades in after intro exits */}
      <AnimatePresence>
        {showDashboard && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
