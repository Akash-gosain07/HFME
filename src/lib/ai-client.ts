const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export interface MetricData {
  timestamp: string;
  frictionScore: number;
  avgTime: number;
  retries: number;
  idleTime: number;
  backNav: number;
  dropOffRate: number;
}

export interface AnomalyResult {
  workflowId: string;
  stepId: string;
  anomalies: Array<{
    timestamp: string;
    frictionScore: number;
    score: number;
  }>;
  anomalyScore: number;
  hasAnomaly: boolean;
  threshold: number;
}

export interface PredictionResult {
  workflowId: string;
  stepId: string;
  predictions: number[];
  trend: string;
  confidence: number;
  riskLevel: string;
}

export interface ExplanationResult {
  workflowId: string;
  stepId: string;
  detectedIssue: string;
  impactScore: number;
  recommendation: string;
  confidenceLevel: number;
  reasoning: string;
}

class AIClient {
  private baseUrl: string;

  constructor(baseUrl: string = AI_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  async detectAnomalies(
    workflowId: string,
    stepId: string,
    metrics: MetricData[],
    sensitivity: number = 0.1
  ): Promise<AnomalyResult> {
    try {
      const response = await fetch(`${this.baseUrl}/analyze/anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, stepId, metrics, sensitivity }),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Anomaly detection failed:', error);
      return {
        workflowId,
        stepId,
        anomalies: [],
        anomalyScore: 0,
        hasAnomaly: false,
        threshold: 0,
      };
    }
  }

  async predictFriction(
    workflowId: string,
    stepId: string,
    historicalMetrics: MetricData[],
    horizon: number = 5
  ): Promise<PredictionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/analyze/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, stepId, historicalMetrics, horizon }),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Friction prediction failed:', error);
      return {
        workflowId,
        stepId,
        predictions: [],
        trend: 'stable',
        confidence: 0,
        riskLevel: 'low',
      };
    }
  }

  async generateExplanation(
    workflowId: string,
    stepId: string,
    stepName: string,
    currentMetrics: MetricData,
    anomalyDetected: boolean,
    trend: string
  ): Promise<ExplanationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/analyze/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          stepId,
          stepName,
          currentMetrics,
          anomalyDetected,
          trend,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Explanation generation failed:', error);
      return {
        workflowId,
        stepId,
        detectedIssue: 'Unable to generate explanation',
        impactScore: 0,
        recommendation: 'Please try again later',
        confidenceLevel: 0,
        reasoning: '',
      };
    }
  }

  async trainAnomalyDetector(
    workflowId: string,
    stepId: string,
    trainingData: MetricData[]
  ): Promise<{ status: string; samples: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/train/anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, stepId, trainingData }),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Training failed:', error);
      return { status: 'failed', samples: 0 };
    }
  }

  async trainFrictionPredictor(
    workflowId: string,
    stepId: string,
    trainingData: MetricData[]
  ): Promise<{ status: string; samples: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/train/predictor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, stepId, trainingData }),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Training failed:', error);
      return { status: 'failed', samples: 0 };
    }
  }

  async healthCheck(): Promise<{ status: string; service: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return await response.json();
    } catch (error) {
      return { status: 'unhealthy', service: 'HFME AI Service' };
    }
  }
}

export const aiClient = new AIClient();
