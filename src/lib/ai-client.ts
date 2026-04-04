import type {
  AnomalyResult,
  ExplanationResult,
  LiveSnapshot,
  MetricData,
  ModelStatus,
  MonitoringConfig,
  PredictionResult,
} from '@/lib/live-types';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_INTERNAL_API_KEY = process.env.AI_INTERNAL_API_KEY || 'hfme-internal-key';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  cache?: RequestCache;
}

class AIClient {
  private baseUrl: string;

  constructor(baseUrl: string = AI_SERVICE_URL) {
    this.baseUrl = baseUrl;
  }

  private async requestJson<T>(path: string, options: RequestOptions = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-HFME-AI-Key': AI_INTERNAL_API_KEY,
      },
      cache: options.cache || 'no-store',
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`AI service error ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  getStreamUrl() {
    return `${this.baseUrl}/events/stream`;
  }

  async getLiveSnapshot(): Promise<LiveSnapshot> {
    return this.requestJson<LiveSnapshot>('/live/snapshot');
  }

  async getModelStatus(): Promise<ModelStatus> {
    return this.requestJson<ModelStatus>('/models/status');
  }

  async updateMonitoringConfig(config: Partial<MonitoringConfig>): Promise<MonitoringConfig> {
    return this.requestJson<MonitoringConfig>('/config', {
      method: 'PUT',
      body: config,
    });
  }

  async detectAnomalies(
    workflowId: string,
    stepId: string,
    metrics: MetricData[],
    sensitivity: number = 0.1
  ): Promise<AnomalyResult> {
    try {
      return await this.requestJson<AnomalyResult>('/analyze/anomaly', {
        method: 'POST',
        body: { workflowId, stepId, metrics, sensitivity },
      });
    } catch (error) {
      console.error('Anomaly detection failed:', error);
      return {
        workflowId,
        stepId,
        anomalies: [],
        anomalyScore: 0,
        hasAnomaly: false,
        threshold: 0,
        shapContributions: [],
        summary: 'Live anomaly analysis unavailable',
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
      return await this.requestJson<PredictionResult>('/analyze/predict', {
        method: 'POST',
        body: { workflowId, stepId, historicalMetrics, horizon },
      });
    } catch (error) {
      console.error('Friction prediction failed:', error);
      return {
        workflowId,
        stepId,
        predictions: [],
        trend: 'stable',
        confidence: 0,
        riskLevel: 'low',
        predictedAverage: 0,
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
      return await this.requestJson<ExplanationResult>('/analyze/explain', {
        method: 'POST',
        body: {
          workflowId,
          stepId,
          stepName,
          currentMetrics,
          anomalyDetected,
          trend,
        },
      });
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
        suggestedFix: 'Retry once the AI service is healthy.',
      };
    }
  }

  async trainAnomalyDetector(
    workflowId: string,
    stepId: string,
    trainingData: MetricData[]
  ): Promise<{ status: string; samples: number }> {
    try {
      return await this.requestJson<{ status: string; samples: number }>('/train/anomaly', {
        method: 'POST',
        body: { workflowId, stepId, trainingData },
      });
    } catch (error) {
      console.error('Anomaly training failed:', error);
      return { status: 'failed', samples: 0 };
    }
  }

  async trainFrictionPredictor(
    workflowId: string,
    stepId: string,
    trainingData: MetricData[]
  ): Promise<{ status: string; samples: number }> {
    try {
      return await this.requestJson<{ status: string; samples: number }>('/train/predictor', {
        method: 'POST',
        body: { workflowId, stepId, trainingData },
      });
    } catch (error) {
      console.error('Predictor training failed:', error);
      return { status: 'failed', samples: 0 };
    }
  }

  async retrainLiveModels() {
    return this.requestJson<{ status: string; samples: number; retrainedAt: string }>(
      '/train/realtime',
      {
        method: 'POST',
      }
    );
  }

  async healthCheck(): Promise<{ status: string; service: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`AI service error ${response.status}`);
      }

      return (await response.json()) as { status: string; service: string };
    } catch {
      return { status: 'unhealthy', service: 'HFME AI Service' };
    }
  }
}

export const aiClient = new AIClient();
