import { GoogleGenerativeAI } from '@google/generative-ai';

export interface FrictionMetricInput {
  stepName: string;
  frictionScore: number;
  avgTime: number;
  retries: number;
  idleTime: number;
  backNav: number;
  dropOffRate: number;
  sessionCount: number;
}

export interface GeminiInsight {
  id: string;
  insightType: 'anomaly' | 'recommendation' | 'prediction';
  detectedIssue: string;
  recommendation: string;
  confidenceLevel: number;
  impactScore: number;
  generatedBy: 'gemini' | 'rule-based';
  reasoning?: string;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';

function calculateImpact(m: FrictionMetricInput): number {
  const weights = { frictionScore: 0.3, dropOffRate: 0.25, retries: 0.15, idleTime: 0.15, backNav: 0.1, avgTime: 0.05 };
  const norm = {
    frictionScore: Math.min(m.frictionScore, 1),
    dropOffRate: Math.min(m.dropOffRate, 1),
    retries: Math.min(m.retries / 10, 1),
    idleTime: Math.min(m.idleTime / 60, 1),
    backNav: Math.min(m.backNav / 5, 1),
    avgTime: Math.min(m.avgTime / 120, 1),
  };
  return Math.min(
    Object.keys(weights).reduce((s, k) => s + norm[k as keyof typeof norm] * weights[k as keyof typeof weights], 0) * 10,
    10
  );
}

function ruleBasedInsight(m: FrictionMetricInput, idx: number): GeminiInsight {
  let detectedIssue = `Elevated friction at "${m.stepName}"`;
  let recommendation = 'Monitor this step closely for emerging patterns.';
  let insightType: GeminiInsight['insightType'] = 'recommendation';

  if (m.dropOffRate > 0.25) {
    insightType = 'anomaly';
    detectedIssue = `High drop-off (${(m.dropOffRate * 100).toFixed(0)}%) at "${m.stepName}"`;
    recommendation = 'Simplify the step, reduce required fields, or add inline contextual help.';
  } else if (m.retries > 4) {
    insightType = 'anomaly';
    detectedIssue = `Excessive retries (${m.retries}×) detected at "${m.stepName}"`;
    recommendation = 'Improve validation feedback and add format hints or real-time inline errors.';
  } else if (m.idleTime > 35) {
    insightType = 'recommendation';
    detectedIssue = `High idle time (${m.idleTime.toFixed(0)}s) at "${m.stepName}" — user confusion likely`;
    recommendation = 'Add tooltip overlays, simplify copy, or introduce a guided walkthrough.';
  } else if (m.frictionScore > 0.65) {
    insightType = 'anomaly';
    detectedIssue = `Friction spike (${(m.frictionScore * 100).toFixed(0)}/100) at "${m.stepName}"`;
    recommendation = 'Break this step into smaller sub-tasks and analyze timing per micro-interaction.';
  } else if (m.backNav > 3) {
    insightType = 'recommendation';
    detectedIssue = `Repeated back-navigation (${m.backNav}×) at "${m.stepName}"`;
    recommendation = 'Present required context earlier in the flow. Check step dependency ordering.';
  }

  return {
    id: `rule-${idx}`,
    insightType,
    detectedIssue,
    recommendation,
    confidenceLevel: m.frictionScore > 0.5 ? 0.74 : 0.61,
    impactScore: parseFloat(calculateImpact(m).toFixed(1)),
    generatedBy: 'rule-based',
  };
}

export async function generateFrictionInsights(
  metrics: FrictionMetricInput[]
): Promise<GeminiInsight[]> {
  const hasKey = GEMINI_API_KEY && GEMINI_API_KEY !== 'your-gemini-api-key-here';

  if (!hasKey) {
    return metrics.map((m, i) => ruleBasedInsight(m, i));
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
    });

    const prompt = `You are an expert UX analyst specializing in user friction and workflow optimization.
Analyze the following workflow friction metrics and return a JSON array of insights.

Metrics:
${JSON.stringify(metrics, null, 2)}

For each metric entry, produce exactly one insight object with these fields:
- id: string (e.g. "insight-0")
- insightType: "anomaly" | "recommendation" | "prediction"
- detectedIssue: string (concise, ≤12 words, includes step name)
- recommendation: string (actionable, specific, ≤25 words)
- confidenceLevel: number (0.0–1.0)
- impactScore: number (0.0–10.0)
- reasoning: string (1 sentence explaining root cause)

Rules:
- frictionScore > 0.65 → insightType = "anomaly"
- dropOffRate > 0.25 → insightType = "anomaly"
- retries > 4 and frictionScore is rising → insightType = "anomaly"  
- Otherwise → "recommendation" or "prediction"
- impactScore must reflect severity realistically
- Be specific to the step name and actual metric values

Return ONLY a valid JSON array, no markdown, no explanation.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const parsed: GeminiInsight[] = JSON.parse(text);
    return parsed.map((ins, i) => ({
      ...ins,
      id: ins.id ?? `gemini-${i}`,
      impactScore: parseFloat(Number(ins.impactScore).toFixed(1)),
      confidenceLevel: parseFloat(Number(ins.confidenceLevel).toFixed(2)),
      generatedBy: 'gemini' as const,
    }));
  } catch (err) {
    console.error('[gemini-client] Insight generation failed, using rule-based fallback:', err);
    return metrics.map((m, i) => ruleBasedInsight(m, i));
  }
}
