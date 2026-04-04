'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Helpers ───────────────────────────────────────────────── */
const rand = (min: number, max: number) => Math.random() * (max - min) + min;

interface Node { x: number; y: number; radius: number; speed: number; angle: number; }
interface Particle { id: number; x: number; y: number; size: number; duration: number; delay: number; color: string; }
interface LiveMetric { label: string; value: string; color: string; }

/* ─── Neural Network Canvas ─────────────────────────────────── */
function NeuralCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const NUM = 60;
    const nodes: Node[] = Array.from({ length: NUM }, () => ({
      x: rand(0, window.innerWidth), y: rand(0, window.innerHeight),
      radius: rand(1.5, 3.5), speed: rand(0.12, 0.4), angle: rand(0, Math.PI * 2),
    }));
    const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#06b6d4', '#3b82f6'];
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      nodes.forEach(n => {
        n.x += Math.cos(n.angle) * n.speed; n.y += Math.sin(n.angle) * n.speed;
        if (n.x < 0 || n.x > canvas.width) n.angle = Math.PI - n.angle;
        if (n.y < 0 || n.y > canvas.height) n.angle = -n.angle;
      });
      for (let i = 0; i < NUM; i++) for (let j = i + 1; j < NUM; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160) {
          const alpha = (1 - dist / 160) * 0.4;
          ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(99,102,241,${alpha})`; ctx.lineWidth = 0.8; ctx.stroke();
        }
      }
      nodes.forEach((n, i) => {
        const color = COLORS[i % COLORS.length];
        ctx.beginPath(); ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full opacity-50" style={{ mixBlendMode: 'screen' }} />;
}

/* ─── Floating Orbs ─────────────────────────────────────────── */
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {[
        { top: '15%', left: '10%', size: 320, color: '#6366f1', opacity: 0.12, blur: 100 },
        { top: '60%', right: '8%', size: 260, color: '#a855f7', opacity: 0.10, blur: 90 },
        { top: '40%', left: '45%', size: 500, color: '#06b6d4', opacity: 0.07, blur: 140 },
        { bottom: '10%', left: '20%', size: 200, color: '#3b82f6', opacity: 0.09, blur: 80 },
      ].map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            top: orb.top, left: 'left' in orb ? orb.left : undefined,
            right: 'right' in orb ? (orb as any).right : undefined,
            bottom: 'bottom' in orb ? (orb as any).bottom : undefined,
            width: orb.size, height: orb.size,
            background: `radial-gradient(circle, ${orb.color}, transparent)`,
            opacity: orb.opacity, filter: `blur(${orb.blur}px)`,
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [orb.opacity, orb.opacity * 1.6, orb.opacity] }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.7 }}
        />
      ))}
    </div>
  );
}

/* ─── Floating Particles ────────────────────────────────────── */
function FloatingParticles() {
  const particles: Particle[] = Array.from({ length: 35 }, (_, i) => ({
    id: i, x: rand(0, 100), y: rand(0, 100), size: rand(2, 5),
    duration: rand(4, 10), delay: rand(0, 5),
    color: ['#6366f1', '#8b5cf6', '#06b6d4', '#a855f7', '#f59e0b'][i % 5],
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div key={p.id} className="absolute rounded-full"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: p.color, boxShadow: `0 0 ${p.size * 4}px ${p.color}` }}
          animate={{ y: [0, -40, 0], opacity: [0.15, 0.85, 0.15], scale: [1, 1.4, 1] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* ─── Scan Line ─────────────────────────────────────────────── */
function ScanLine() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #6366f1 30%, #a855f7 50%, #06b6d4 70%, transparent)', boxShadow: '0 0 20px 3px #6366f199' }}
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatDelay: 0.8 }}
      />
    </div>
  );
}

/* ─── HUD Corner Brackets ───────────────────────────────────── */
function HudBrackets() {
  const positions = ['top-6 left-6', 'top-6 right-6', 'bottom-6 right-6', 'bottom-6 left-6'];
  const paths = ['M2 20 L2 2 L20 2', 'M20 2 L38 2 L38 20', 'M38 20 L38 38 L20 38', 'M20 38 L2 38 L2 20'];
  return (
    <>
      {positions.map((pos, i) => (
        <motion.div key={i} className={`absolute w-10 h-10 ${pos}`}
          initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 + i * 0.1, duration: 0.5, ease: 'backOut' }}>
          <svg viewBox="0 0 40 40" fill="none">
            <path d={paths[i]} stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </motion.div>
      ))}
    </>
  );
}

/* ─── Typewriter ────────────────────────────────────────────── */
function Typewriter({ text, delay = 0, speed = 35 }: { text: string; delay?: number; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setStarted(true), delay * 1000); return () => clearTimeout(t); }, [delay]);
  useEffect(() => {
    if (!started) return;
    let i = 0;
    const iv = setInterval(() => { setDisplayed(text.slice(0, i + 1)); i++; if (i >= text.length) clearInterval(iv); }, speed);
    return () => clearInterval(iv);
  }, [started, text, speed]);
  return (
    <span>
      {displayed}
      {displayed.length < text.length && started && (
        <motion.span className="inline-block w-0.5 h-5 ml-0.5 bg-indigo-400 align-middle"
          animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} />
      )}
    </span>
  );
}

/* ─── Spinning Logo ─────────────────────────────────────────── */
function SpinningLogo() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ duration: 1.0, ease: [0.34, 1.56, 0.64, 1] }}
      className="mb-8 relative"
    >
      {/* Ring 1 */}
      <motion.div className="absolute -inset-6 rounded-full"
        style={{ border: '1px solid rgba(99,102,241,0.25)' }}
        animate={{ rotate: 360 }} transition={{ duration: 14, repeat: Infinity, ease: 'linear' }} />
      {/* Ring 2 */}
      <motion.div className="absolute -inset-3 rounded-full"
        style={{ border: '1px solid rgba(168,85,247,0.18)' }}
        animate={{ rotate: -360 }} transition={{ duration: 9, repeat: Infinity, ease: 'linear' }} />
      {/* Orbiting dot */}
      <motion.div className="absolute" style={{ top: -16, left: '50%', marginLeft: -4 }}
        animate={{ rotate: 360 }} transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '4px 52px' }}>
        <div className="w-2 h-2 rounded-full bg-indigo-400" style={{ boxShadow: '0 0 8px #6366f1' }} />
      </motion.div>

      {/* Logo box */}
      <div className="w-28 h-28 rounded-3xl flex items-center justify-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #3730a3 0%, #5b21b6 40%, #6366f1 70%, #7c3aed 100%)',
          boxShadow: '0 0 50px rgba(99,102,241,0.65), 0 0 90px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}>
        {/* Inner shimmer */}
        <motion.div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)' }}
          animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 2.5, repeat: Infinity }} />
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="20" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <motion.circle cx="28" cy="28" r="20" stroke="white" strokeWidth="1.5"
            strokeDasharray="32 94" strokeLinecap="round"
            animate={{ rotate: 360 }} transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '28px 28px' }} />
          {/* Layered circuit paths */}
          <path d="M28 12 L28 20 M28 36 L28 44 M12 28 L20 28 M36 28 L44 28" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="28" cy="12" r="2" fill="rgba(255,255,255,0.5)" />
          <circle cx="28" cy="44" r="2" fill="rgba(255,255,255,0.5)" />
          <circle cx="12" cy="28" r="2" fill="rgba(255,255,255,0.5)" />
          <circle cx="44" cy="28" r="2" fill="rgba(255,255,255,0.5)" />
          <text x="28" y="33" textAnchor="middle" fill="white" fontSize="11" fontWeight="800" fontFamily="monospace" letterSpacing="-0.5">HFME</text>
        </svg>
      </div>
    </motion.div>
  );
}

/* ─── Live Metric Card ──────────────────────────────────────── */
function MetricCard({ label, value, color, index }: LiveMetric & { index: number }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, scale: 0.6, y: 24 }, show: { opacity: 1, scale: 1, y: 0 } }}
      transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
      className="flex flex-col items-center py-3.5 px-3 rounded-2xl relative overflow-hidden"
      style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(12px)' }}
    >
      <motion.div className="absolute inset-0 opacity-0"
        style={{ background: `radial-gradient(circle at 50% 50%, ${color}22, transparent)` }}
        animate={{ opacity: [0, 0.6, 0] }} transition={{ delay: index * 0.15 + 0.2, duration: 1.5 }} />
      <span className="text-2xl font-black relative z-10"
        style={{ background: `linear-gradient(135deg, ${color}, #c4b5fd)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        {value}
      </span>
      <span className="text-xs mt-1 font-medium text-center relative z-10" style={{ color: '#94a3b8' }}>{label}</span>
    </motion.div>
  );
}

/* ─── Loading Progress ──────────────────────────────────────── */
function LoadingBar({ phase }: { phase: string }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing…');

  const steps = [
    { at: 0, pct: 0, text: 'Initializing analytics engine…' },
    { at: 200, pct: 15, text: 'Connecting to Gemini AI…' },
    { at: 600, pct: 35, text: 'Loading workflow data…' },
    { at: 1100, pct: 55, text: 'Training friction models…' },
    { at: 1700, pct: 72, text: 'Generating AI insights…' },
    { at: 2300, pct: 88, text: 'Calibrating real-time sensors…' },
    { at: 2900, pct: 100, text: 'Ready.' },
  ];

  useEffect(() => {
    if (phase !== 'holding') return;
    const timers = steps.map(s =>
      setTimeout(() => { setProgress(s.pct); setStatusText(s.text); }, s.at)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  return (
    <motion.div className="mt-10 w-72 flex flex-col items-center gap-2"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6, duration: 0.5 }}>
      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.15)' }}>
        <motion.div className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7, #06b6d4)', boxShadow: '0 0 12px rgba(99,102,241,0.8)' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }} />
      </div>
      <div className="flex items-center justify-between w-full">
        <span className="text-[11px] font-mono tracking-widest" style={{ color: '#334155' }}>
          {statusText}
        </span>
        <span className="text-[11px] font-mono font-bold" style={{ color: '#6366f1' }}>
          {progress}%
        </span>
      </div>
    </motion.div>
  );
}

/* ─── HUD Data Rows ─────────────────────────────────────────── */
function HudDataRow({ label, value, delay }: { label: string; value: string; delay: number }) {
  return (
    <motion.div className="flex items-center gap-3 font-mono text-[11px]"
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}>
      <span style={{ color: '#334155' }}>{label}</span>
      <motion.span style={{ color: '#6366f1' }}
        animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, delay: delay + 0.5, repeat: Infinity }}>
        {value}
      </motion.span>
    </motion.div>
  );
}

/* ─── Main Intro Component ──────────────────────────────────── */
interface IntroAnimationProps { onComplete: () => void; }

export default function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const [phase, setPhase] = useState<'boot' | 'intro' | 'holding' | 'exit'>('boot');
  const [liveMetrics, setLiveMetrics] = useState<LiveMetric[]>([
    { label: 'Sessions Tracked', value: '…', color: '#6366f1' },
    { label: 'Active Workflows', value: '…', color: '#a855f7' },
    { label: 'AI Confidence', value: '…', color: '#06b6d4' },
    { label: 'Avg Friction ↓', value: '…', color: '#f59e0b' },
  ]);

  // Fetch live metrics from the realtime API
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/gemini/realtime');
      if (!res.ok) return;
      const data = await res.json();
      setLiveMetrics([
        { label: 'Sessions Tracked', value: data.kpis.totalSessions.toLocaleString(), color: '#6366f1' },
        { label: 'Active Workflows', value: `${data.workflows.length}`, color: '#a855f7' },
        { label: 'AI Confidence', value: '94%', color: '#06b6d4' },
        { label: 'Avg Friction ↓', value: `${(data.kpis.avgFriction * 100).toFixed(0)}`, color: '#f59e0b' },
      ]);
    } catch { /* keep defaults */ }
  }, []);

  // Phase timeline
  useEffect(() => {
    fetchMetrics();
    const t0 = setTimeout(() => setPhase('intro'), 200);
    const t1 = setTimeout(() => setPhase('holding'), 1400);
    const t2 = setTimeout(() => setPhase('exit'), 5600);
    const t3 = setTimeout(() => onComplete(), 6800);
    return () => [t0, t1, t2, t3].forEach(clearTimeout);
  }, [onComplete, fetchMetrics]);

  return (
    <AnimatePresence>
      {phase !== 'exit' && (
        <motion.div
          key="intro-screen"
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden select-none"
          style={{ background: 'linear-gradient(135deg, #020010 0%, #060618 35%, #09091f 65%, #020010 100%)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.06,
            filter: 'blur(12px)',
            transition: { duration: 1.1, ease: [0.4, 0, 0.2, 1] },
          }}
        >
          {/* Background layers */}
          <NeuralCanvas />
          <FloatingOrbs />
          <FloatingParticles />
          <ScanLine />
          <HudBrackets />

          {/* HUD side data — left */}
          <motion.div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col gap-2 hidden lg:flex"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>
            <HudDataRow label="SYS.STATUS" value="ONLINE" delay={1.8} />
            <HudDataRow label="AI.ENGINE" value="GEMINI-1.5" delay={2.0} />
            <HudDataRow label="REALTIME" value="ACTIVE" delay={2.2} />
            <HudDataRow label="LATENCY" value="12ms" delay={2.4} />
          </motion.div>

          {/* HUD side data — right */}
          <motion.div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-2 items-end hidden lg:flex"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.9 }}>
            <HudDataRow label="v2.0.0" value="STABLE" delay={1.9} />
            <HudDataRow label="MODELS" value="TRAINED" delay={2.1} />
            <HudDataRow label="ANOMALY" value="SCANNING" delay={2.3} />
            <HudDataRow label="UPTIME" value="99.97%" delay={2.5} />
          </motion.div>

          {/* ── Center Content ─────────────────────────────────── */}
          <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-3xl mx-auto">

            {/* Logo */}
            <SpinningLogo />

            {/* Version badge */}
            <motion.div
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mb-4 px-4 py-1 rounded-full text-xs font-mono font-semibold tracking-[0.2em] uppercase"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
              v2.0 · Enterprise Grade · Gemini AI
            </motion.div>

            {/* Title lines */}
            <motion.h1
              initial={{ opacity: 0, y: 36, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.75, duration: 0.75, ease: 'easeOut' }}
              className="text-5xl md:text-7xl font-black tracking-tight mb-1 leading-none"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #c7d2fe 45%, #a78bfa 75%, #818cf8 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
              Human Friction
            </motion.h1>

            <motion.h1
              initial={{ opacity: 0, y: 36, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.92, duration: 0.75, ease: 'easeOut' }}
              className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none"
              style={{
                background: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 35%, #c7d2fe 70%, #ffffff 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
              Mapping Engine
            </motion.h1>

            {/* Typewriter tagline */}
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.5 }}
              className="text-sm md:text-base font-mono mb-8"
              style={{ color: '#64748b', letterSpacing: '0.06em' }}>
              <Typewriter
                text="Real-time Friction Detection  ·  Gemini AI Insights  ·  Workflow Analytics"
                delay={1.2} speed={32}
              />
            </motion.p>

            {/* Live metric cards */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-xl"
              initial="hidden" animate={phase === 'holding' || phase === 'exit' ? 'show' : 'hidden'}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.11, delayChildren: 0.1 } } }}>
              {liveMetrics.map((m, i) => (
                <MetricCard key={m.label} {...m} index={i} />
              ))}
            </motion.div>

            {/* Loading bar */}
            <LoadingBar phase={phase} />
          </div>

          {/* Bottom brand bar */}
          <motion.div
            className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.5 }}>
            <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4))' }} />
            <span className="text-[10px] font-mono tracking-[0.25em] uppercase" style={{ color: '#1e293b' }}>
              Powered by Google Gemini · Built for Enterprise
            </span>
            <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.4), transparent)' }} />
          </motion.div>

          {/* Top-right skip hint */}
          <motion.button
            className="absolute top-5 right-20 text-[11px] font-mono tracking-wider px-3 py-1 rounded-full cursor-pointer"
            style={{ color: '#1e293b', border: '1px solid rgba(99,102,241,0.15)', background: 'rgba(99,102,241,0.06)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}
            onClick={() => { setPhase('exit'); setTimeout(onComplete, 1100); }}
            whileHover={{ color: '#6366f1', borderColor: 'rgba(99,102,241,0.5)' }}>
            skip →
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
