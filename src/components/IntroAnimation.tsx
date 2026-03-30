'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

/* ─── tiny helpers ─────────────────────────────────────────── */
const rand = (min: number, max: number) => Math.random() * (max - min) + min;

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

interface Node {
  x: number;
  y: number;
  radius: number;
  speed: number;
  angle: number;
}

/* ─── Canvas Neural Net ────────────────────────────────────── */
function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    let raf: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const NUM = 55;
    const nodes: Node[] = Array.from({ length: NUM }, () => ({
      x: rand(0, window.innerWidth),
      y: rand(0, window.innerHeight),
      radius: rand(1.5, 3.5),
      speed: rand(0.15, 0.45),
      angle: rand(0, Math.PI * 2),
    }));

    const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#06b6d4', '#3b82f6'];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // move
      nodes.forEach((n) => {
        n.x += Math.cos(n.angle) * n.speed;
        n.y += Math.sin(n.angle) * n.speed;
        if (n.x < 0 || n.x > canvas.width) n.angle = Math.PI - n.angle;
        if (n.y < 0 || n.y > canvas.height) n.angle = -n.angle;
      });

      // edges
      for (let i = 0; i < NUM; i++) {
        for (let j = i + 1; j < NUM; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            const alpha = (1 - dist / 160) * 0.45;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(99,102,241,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // dots
      nodes.forEach((n, i) => {
        const color = COLORS[i % COLORS.length];
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-60"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}

/* ─── Floating particles ───────────────────────────────────── */
function FloatingParticles() {
  const particles: Particle[] = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: rand(0, 100),
    y: rand(0, 100),
    size: rand(2, 6),
    duration: rand(4, 9),
    delay: rand(0, 4),
    color: ['#6366f1', '#8b5cf6', '#06b6d4', '#a855f7', '#f59e0b'][i % 5],
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.9, 0.2],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Typewriter ───────────────────────────────────────────── */
function Typewriter({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay * 1000);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 38);
    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && started && (
        <motion.span
          className="inline-block w-0.5 h-5 ml-0.5 bg-indigo-400 align-middle"
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.55 }}
        />
      )}
    </span>
  );
}

/* ─── Scan line HUD decoration ─────────────────────────────── */
function ScanLine() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.4 }}
    >
      <motion.div
        className="absolute left-0 right-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, #6366f1 30%, #a855f7 50%, #6366f1 70%, transparent)',
          boxShadow: '0 0 16px 2px #6366f1',
        }}
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
      />
    </motion.div>
  );
}

/* ─── Corner HUD brackets ──────────────────────────────────── */
function HudBrackets() {
  const corner = (pos: string) => (
    <motion.div
      className={`absolute w-10 h-10 ${pos}`}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6, duration: 0.5, ease: 'backOut' }}
    >
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d={pos.includes('top') && pos.includes('left')
            ? 'M2 20 L2 2 L20 2'
            : pos.includes('top') && pos.includes('right')
            ? 'M20 2 L38 2 L38 20'
            : pos.includes('bottom') && pos.includes('right')
            ? 'M38 20 L38 38 L20 38'
            : 'M20 38 L2 38 L2 20'}
          stroke="#6366f1"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );

  return (
    <>
      {corner('top-6 left-6')}
      {corner('top-6 right-6')}
      {corner('bottom-6 right-6')}
      {corner('bottom-6 left-6')}
    </>
  );
}

/* ─── MAIN INTRO ───────────────────────────────────────────── */
interface IntroAnimationProps {
  onComplete: () => void;
}

export default function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const [phase, setPhase] = useState<'intro' | 'holding' | 'exit'>('intro');
  const controls = useAnimation();

  // Timeline: intro → holding (2s) → exit → onComplete
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('holding'), 1200);
    const t2 = setTimeout(() => setPhase('exit'), 4800);
    const t3 = setTimeout(() => onComplete(), 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  const metrics = [
    { label: 'Sessions Tracked', value: '320+' },
    { label: 'Workflows', value: '3' },
    { label: 'AI Confidence', value: '94%' },
    { label: 'Friction Score ↓', value: '0.18' },
  ];

  return (
    <AnimatePresence>
      {phase !== 'exit' ? (
        <motion.div
          key="intro-screen"
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #020010 0%, #080820 40%, #0a0a25 70%, #020010 100%)',
          }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Neural network canvas */}
          <NeuralCanvas />

          {/* Ambient glow blobs */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-[120px]"
              style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }}
            />
            <div
              className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-[100px]"
              style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }}
            />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-[150px]"
              style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }}
            />
          </div>

          {/* Floating particles */}
          <FloatingParticles />

          {/* HUD scan line */}
          <ScanLine />

          {/* Corner brackets */}
          <HudBrackets />

          {/* Center content */}
          <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-4xl mx-auto">

            {/* Logo mark */}
            <motion.div
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
              className="mb-8 relative"
            >
              {/* Outer ring */}
              <motion.div
                className="absolute -inset-4 rounded-full border border-indigo-500/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              />
              {/* Mid ring */}
              <motion.div
                className="absolute -inset-2 rounded-full border border-purple-500/20"
                animate={{ rotate: -360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              />

              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center relative"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)',
                  boxShadow:
                    '0 0 40px rgba(99,102,241,0.6), 0 0 80px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                {/* Hex/brain icon */}
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                  {/* Brain-like circuit rings */}
                  <circle cx="26" cy="26" r="18" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                  <motion.circle
                    cx="26" cy="26" r="18"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeDasharray="30 83"
                    strokeLinecap="round"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    style={{ transformOrigin: '26px 26px' }}
                  />
                  {/* HFME letters */}
                  <text x="26" y="30" textAnchor="middle" fill="white" fontSize="10" fontWeight="700" fontFamily="monospace" letterSpacing="-0.5">
                    HFME
                  </text>
                </svg>
              </div>
            </motion.div>

            {/* Version badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mb-3 px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-widest uppercase"
              style={{
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.35)',
                color: '#a5b4fc',
              }}
            >
              v2.0 — Enterprise Grade
            </motion.div>

            {/* Main Title */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.7, ease: 'easeOut' }}
              className="text-5xl md:text-7xl font-black tracking-tight mb-2 leading-none"
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                background: 'linear-gradient(135deg, #ffffff 0%, #c7d2fe 40%, #a78bfa 70%, #818cf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Human Friction
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.7, ease: 'easeOut' }}
              className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none"
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 30%, #c7d2fe 70%, #ffffff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Mapping Engine
            </motion.h1>

            {/* Tagline typewriter */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.5 }}
              className="text-base md:text-lg font-mono mb-10"
              style={{ color: '#94a3b8', letterSpacing: '0.05em' }}
            >
              <Typewriter
                text="AI-Powered Behavioral Analytics · Workflow Friction Detection · Real-time Insights"
                delay={1.2}
              />
            </motion.p>

            {/* Metric cards */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.12, delayChildren: 2.0 } },
              }}
            >
              {metrics.map((m) => (
                <motion.div
                  key={m.label}
                  variants={{
                    hidden: { opacity: 0, scale: 0.7, y: 20 },
                    show: { opacity: 1, scale: 1, y: 0 },
                  }}
                  transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                  className="flex flex-col items-center py-3 px-2 rounded-xl"
                  style={{
                    background: 'rgba(99,102,241,0.08)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <span
                    className="text-2xl font-black"
                    style={{
                      background: 'linear-gradient(135deg, #a5b4fc, #c4b5fd)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {m.value}
                  </span>
                  <span className="text-xs mt-0.5 text-slate-400 font-medium text-center">
                    {m.label}
                  </span>
                </motion.div>
              ))}
            </motion.div>

            {/* Loading bar */}
            <motion.div
              className="mt-10 w-64 h-px rounded-full overflow-hidden"
              style={{ background: 'rgba(99,102,241,0.2)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.8, duration: 0.4 }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #6366f1, #a855f7, #06b6d4)',
                  boxShadow: '0 0 10px rgba(99,102,241,0.8)',
                }}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ delay: 3.0, duration: 1.5, ease: 'easeInOut' }}
              />
            </motion.div>

            <motion.p
              className="mt-2 text-xs font-mono"
              style={{ color: '#475569', letterSpacing: '0.15em' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.0 }}
            >
              INITIALIZING ANALYTICS ENGINE...
            </motion.p>
          </div>

          {/* Bottom brand bar */}
          <motion.div
            className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.5 }}
          >
            <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5))' }} />
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: '#334155' }}>
              Built for enterprise · Powered by AI
            </span>
            <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.5), transparent)' }} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
