'use client';

import { motion } from 'framer-motion';
import { Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';

interface AIInsightCardProps {
    insight: {
        id: string;
        insightType: string;
        detectedIssue: string;
        recommendation: string;
        confidenceLevel: number;
        impactScore: number;
    };
}

export function AIInsightCard({ insight }: AIInsightCardProps) {
    const isAnomaly = insight.insightType === 'anomaly';

    return (
        <motion.div
            whileHover={{ y: -5 }}
            className={`relative overflow-hidden rounded-xl border p-6 transition-colors ${isAnomaly
                    ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                    : 'bg-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/40'
                }`}
        >
            {/* Glowing background effect */}
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-20 ${isAnomaly ? 'bg-red-500' : 'bg-indigo-500'
                }`} />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${isAnomaly
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}>
                        {isAnomaly ? <AlertTriangle className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                        {insight.insightType.toUpperCase()}
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {(insight.confidenceLevel * 100).toFixed(0)}% Confidence
                    </span>
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2">
                    {insight.detectedIssue}
                </h3>

                <p className="text-sm text-muted-foreground mb-4">
                    {insight.recommendation}
                </p>

                <div className="flex items-center justify-between mt-auto">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Impact Score</span>
                        <span className="text-xl font-bold text-foreground">{insight.impactScore.toFixed(1)}</span>
                    </div>

                    <button className={`p-2 rounded-full transition-colors ${isAnomaly
                            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500'
                            : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500'
                        }`}>
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
