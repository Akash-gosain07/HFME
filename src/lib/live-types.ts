export interface MetricData {
  timestamp: string;
  frictionScore: number;
  avgTime: number;
  retries: number;
  idleTime: number;
  backNav: number;
  dropOffRate: number;
}

export interface FeatureContribution {
  feature: keyof Omit<MetricData, 'timestamp'>;
  impact: number;
  direction: 'increase' | 'decrease';
  value: number;
}

export interface AnomalyPoint {
  timestamp: string;
  frictionScore: number;
  score: number;
}

export interface AnomalyResult {
  workflowId: string;
  stepId: string;
  anomalies: AnomalyPoint[];
  anomalyScore: number;
  hasAnomaly: boolean;
  threshold: number;
  shapContributions?: FeatureContribution[];
  summary?: string;
}

export interface PredictionResult {
  workflowId: string;
  stepId: string;
  predictions: number[];
  trend: string;
  confidence: number;
  riskLevel: string;
  predictedAverage?: number;
}

export interface ExplanationResult {
  workflowId: string;
  stepId: string;
  detectedIssue: string;
  impactScore: number;
  recommendation: string;
  confidenceLevel: number;
  reasoning: string;
  suggestedFix?: string;
  refreshedAt?: string;
}

export interface MonitoringConfig {
  enabled: boolean;
  anomalySensitivity: number;
  predictionEnabled: boolean;
  explanationEnabled: boolean;
  monitoringInterval: number;
  alertThreshold: number;
}

export interface LiveEvent {
  id: string;
  sessionId: string;
  workflowId: string;
  workflowName: string;
  stepId: string;
  stepName: string;
  type: string;
  timestamp: string;
  frictionScore: number;
  details: string;
}

export interface TimelinePoint {
  timestamp: string;
  frictionScore: number;
}

export interface LiveStep {
  id: string;
  workflowId: string;
  name: string;
  order: number;
  expectedTimeSeconds: number;
  current: MetricData;
  history: MetricData[];
  anomaly: AnomalyResult;
  prediction: PredictionResult;
  insight: ExplanationResult & { insightType: string };
  status: 'stable' | 'watch' | 'critical';
}

export interface LiveWorkflow {
  id: string;
  name: string;
  description: string;
  sessionCount: number;
  activeUsers: number;
  overallFriction: number;
  avgDropOffRate: number;
  trend: string;
  anomalyCount: number;
  latestInsight: (ExplanationResult & { insightType: string }) | null;
  timeline: TimelinePoint[];
  steps: LiveStep[];
}

export interface DashboardSnapshot {
  totalSessions: number;
  activeWorkflows: number;
  averageFriction: number;
  averageDropOffRate: number;
  anomalyCount: number;
  heatmap: Array<{
    workflowId: string;
    workflowName: string;
    stepId: string;
    stepName: string;
    frictionScore: number;
    level: 'low' | 'medium' | 'high' | 'critical';
  }>;
  alerts: Array<{
    workflowId: string;
    workflowName: string;
    stepId: string;
    stepName: string;
    score: number;
    timestamp: string;
    issue: string;
  }>;
  insights: Array<ExplanationResult & { id: string; insightType: string }>;
}

export interface ModelStatus {
  anomalyDetectorTrained: boolean;
  frictionPredictorTrained: boolean;
  queueDepth: number;
  redisConnected: boolean;
  lastRetrainedAt: string | null;
  lastTickAt: string | null;
}

export interface AdminLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'success';
  message: string;
}

export interface AdminSnapshot {
  config: MonitoringConfig;
  modelStatus: ModelStatus;
  logs: AdminLogEntry[];
}

export interface LiveSnapshot {
  tick: number;
  generatedAt: string;
  events: LiveEvent[];
  dashboard: DashboardSnapshot;
  workflows: LiveWorkflow[];
  admin: AdminSnapshot;
}

export interface AuthSession {
  userId: string;
  email: string;
  role: string;
  name: string;
  exp: number;
}
