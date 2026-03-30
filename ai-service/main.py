from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
from datetime import datetime
import os
from dotenv import load_dotenv

from models.anomaly_detector import AnomalyDetector
from models.friction_predictor import FrictionPredictor
from models.insight_generator import InsightGenerator

load_dotenv()

app = FastAPI(title="HFME AI Service", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI models
anomaly_detector = AnomalyDetector()
friction_predictor = FrictionPredictor()
insight_generator = InsightGenerator()

# Request/Response Models
class MetricData(BaseModel):
    timestamp: str
    frictionScore: float
    avgTime: float
    retries: int
    idleTime: float
    backNav: int
    dropOffRate: float

class AnomalyRequest(BaseModel):
    workflowId: str
    stepId: str
    metrics: List[MetricData]
    sensitivity: float = 0.1

class PredictionRequest(BaseModel):
    workflowId: str
    stepId: str
    historicalMetrics: List[MetricData]
    horizon: int = 5

class ExplanationRequest(BaseModel):
    workflowId: str
    stepId: str
    stepName: str
    currentMetrics: MetricData
    anomalyDetected: bool
    trend: str

class TrainingRequest(BaseModel):
    workflowId: str
    stepId: str
    trainingData: List[MetricData]

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "HFME AI Service",
        "version": "2.0.0",
        "models": {
            "anomaly_detector": anomaly_detector.is_trained,
            "friction_predictor": friction_predictor.is_trained
        }
    }

# Anomaly detection endpoint
@app.post("/analyze/anomaly")
async def detect_anomalies(request: AnomalyRequest):
    try:
        if len(request.metrics) < 5:
            return {
                "workflowId": request.workflowId,
                "stepId": request.stepId,
                "anomalies": [],
                "anomalyScore": 0.0,
                "hasAnomaly": False,
                "message": "Insufficient data for anomaly detection"
            }
        
        # Prepare features
        features = np.array([[
            m.frictionScore,
            m.avgTime,
            m.retries,
            m.idleTime,
            m.backNav,
            m.dropOffRate
        ] for m in request.metrics])
        
        # Detect anomalies
        result = anomaly_detector.detect(features, sensitivity=request.sensitivity)
        
        # Map anomalies to timestamps
        anomalies = []
        for idx, is_anomaly in enumerate(result['anomalies']):
            if is_anomaly:
                anomalies.append({
                    "timestamp": request.metrics[idx].timestamp,
                    "frictionScore": request.metrics[idx].frictionScore,
                    "score": float(result['scores'][idx])
                })
        
        return {
            "workflowId": request.workflowId,
            "stepId": request.stepId,
            "anomalies": anomalies,
            "anomalyScore": float(result['anomaly_score']),
            "hasAnomaly": result['has_anomaly'],
            "threshold": float(result['threshold'])
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Friction prediction endpoint
@app.post("/analyze/predict")
async def predict_friction(request: PredictionRequest):
    try:
        if len(request.historicalMetrics) < 10:
            return {
                "workflowId": request.workflowId,
                "stepId": request.stepId,
                "predictions": [],
                "trend": "stable",
                "confidence": 0.0,
                "message": "Insufficient historical data for prediction"
            }
        
        # Prepare features
        features = np.array([[
            m.frictionScore,
            m.avgTime,
            m.retries,
            m.idleTime,
            m.backNav,
            m.dropOffRate
        ] for m in request.historicalMetrics])
        
        # Predict future friction
        result = friction_predictor.predict(features, horizon=request.horizon)
        
        return {
            "workflowId": request.workflowId,
            "stepId": request.stepId,
            "predictions": result['predictions'],
            "trend": result['trend'],
            "confidence": result['confidence'],
            "riskLevel": result['risk_level']
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# LLM-based explanation endpoint
@app.post("/analyze/explain")
async def generate_explanation(request: ExplanationRequest):
    try:
        result = await insight_generator.generate(
            step_name=request.stepName,
            current_metrics=request.currentMetrics.dict(),
            anomaly_detected=request.anomalyDetected,
            trend=request.trend
        )
        
        return {
            "workflowId": request.workflowId,
            "stepId": request.stepId,
            "detectedIssue": result['detected_issue'],
            "impactScore": result['impact_score'],
            "recommendation": result['recommendation'],
            "confidenceLevel": result['confidence_level'],
            "reasoning": result['reasoning']
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Training endpoint
@app.post("/train/anomaly")
async def train_anomaly_detector(request: TrainingRequest):
    try:
        features = np.array([[
            m.frictionScore,
            m.avgTime,
            m.retries,
            m.idleTime,
            m.backNav,
            m.dropOffRate
        ] for m in request.trainingData])
        
        anomaly_detector.train(features)
        
        return {
            "workflowId": request.workflowId,
            "stepId": request.stepId,
            "status": "trained",
            "samples": len(features)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train/predictor")
async def train_friction_predictor(request: TrainingRequest):
    try:
        features = np.array([[
            m.frictionScore,
            m.avgTime,
            m.retries,
            m.idleTime,
            m.backNav,
            m.dropOffRate
        ] for m in request.trainingData])
        
        friction_predictor.train(features)
        
        return {
            "workflowId": request.workflowId,
            "stepId": request.stepId,
            "status": "trained",
            "samples": len(features)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
