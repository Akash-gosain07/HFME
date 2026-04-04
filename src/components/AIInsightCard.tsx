'use client';

import { motion } from 'framer-motion';
import { Sparkles, AlertTriangle, ArrowRight, TrendingUp, Cpu } from 'lucide-react';

interface AIInsightCardProps {
  insight: {
    id: string;
    insightType: string;
    detectedIssue: string;
    recommendation: string;
    confidenceLevel: number;
    impactScore: number;
    generatedBy?: 'gemini' | 'rule-based';
    reasoning?: string;
  };
}

export function AIInsightCard({ insight }: AIInsightCardProps) {
  const isAnomaly = insight.insightType === 'anomaly';
  const isPrediction = insight.insightType === 'prediction';
  const isGemini = insight.generatedBy === 'gemini';

  const typeConfig = {
    anomaly: {
      bg: 'bg-red-500/5',
      border: 'border-red-500/20',
      hoverBorder: 'hover:border-red-500/40',
      glow: 'bg-red-500',
      badge: 'bg-red-500/10 text-red-400 border-red-500/20',
      btn: 'bg-red-500/10 hover:bg-red-500/20 text-red-500',
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    prediction: {
      bg: 'bg-blue-500/5',
      border: 'border-blue-500/20',
      hoverBorder: 'hover:border-blue-500/40',
      glow: 'bg-blue-500',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      btn: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-500',
      icon: <TrendingUp className="h-3 w-3" />,
    },
    recommendation: {
      bg: 'bg-indigo-500/5',
      border: 'border-indigo-500/20',
      hoverBorder: 'hover:border-indigo-500/40',
      glow: 'bg-indigo-500',
      badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      btn: 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500',
      icon: <Sparkles className="h-3 w-3" />,
    },
  };

  const cfg = typeConfig[insight.insightType as keyof typeof typeConfig] ?? typeConfig.recommendation;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={`relative overflow-hidden rounded-xl border p-6 transition-colors ${cfg.bg} ${cfg.border} ${cfg.hoverBorder}`}
    >
      {/* Glowing background effect */}
      <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-20 ${cfg.glow}`} />

      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${cfg.badge}`}>
            {cfg.icon}
            {insight.insightType.toUpperCase()}
          </div>
          <span className="text-xs text-muted-foreground">
            {(insight.confidenceLevel * 100).toFixed(0)}% Confidence
          </span>
        </div>

        {/* Issue title */}
        <h3 className="text-lg font-semibold text-foreground mb-2 leading-snug">
          {insight.detectedIssue}
        </h3>

        {/* Recommendation */}
        <p className="text-sm text-muted-foreground mb-4">
          {insight.recommendation}
        </p>

        {/* Reasoning (if available from Gemini) */}
        {insight.reasoning && (
          <p className="text-xs text-muted-foreground/70 mb-4 italic border-l-2 border-border pl-3">
            {insight.reasoning}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Impact Score
            </span>
            <span className="text-xl font-bold text-foreground">
              {Number(insight.impactScore).toFixed(1)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Gemini badge */}
            {isGemini && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                <Cpu className="h-2.5 w-2.5" />
                Gemini
              </span>
            )}
            <button className={`p-2 rounded-full transition-colors ${cfg.btn}`}>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
