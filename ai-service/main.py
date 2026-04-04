import asyncio
import json
import os
from contextlib import asynccontextmanager
from typing import Any, List, Optional

import numpy as np
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from live_runtime import LiveRuntime, now_iso
from models.anomaly_detector import AnomalyDetector
from models.friction_predictor import FrictionPredictor
from models.insight_generator import InsightGenerator

load_dotenv()

anomaly_detector = AnomalyDetector()
friction_predictor = FrictionPredictor()
insight_generator = InsightGenerator()
live_runtime = LiveRuntime(anomaly_detector, friction_predictor, insight_generator)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await live_runtime.start()
    yield
    await live_runtime.stop()


app = FastAPI(title="HFME AI Service", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def require_internal_key(x_hfme_ai_key: Optional[str] = Header(default=None)):
    expected_key = os.getenv("AI_INTERNAL_API_KEY", "hfme-internal-key")
    if x_hfme_ai_key != expected_key:
        raise HTTPException(status_code=401, detail="Unauthorized AI access.")


class MetricData(BaseModel):
    timestamp: str
    frictionScore: float
    avgTime: float
    retries: float
    idleTime: float
    backNav: float
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


class ConfigUpdateRequest(BaseModel):
    enabled: Optional[bool] = None
    anomalySensitivity: Optional[float] = None
    predictionEnabled: Optional[bool] = None
    explanationEnabled: Optional[bool] = None
    monitoringInterval: Optional[int] = None
    alertThreshold: Optional[float] = None


def metric_rows(metrics: List[MetricData]):
    return np.array(
        [
            [
                metric.frictionScore,
                metric.avgTime,
                metric.retries,
                metric.idleTime,
                metric.backNav,
                metric.dropOffRate,
            ]
            for metric in metrics
        ]
    )


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "HFME AI Service",
        "version": "2.0.0",
        "models": {
            "anomaly_detector": anomaly_detector.is_trained,
            "friction_predictor": friction_predictor.is_trained,
        },
        "realtime": {
            "tick": live_runtime.tick,
            "redis_connected": live_runtime.redis_connected,
        },
    }


@app.get("/live/snapshot")
async def get_live_snapshot(_: None = Depends(require_internal_key)):
    return await live_runtime.get_snapshot()


@app.get("/models/status")
async def get_model_status(_: None = Depends(require_internal_key)):
    return await live_runtime.get_model_status()


@app.get("/config")
async def get_config(_: None = Depends(require_internal_key)):
    snapshot = await live_runtime.get_snapshot()
    return snapshot["admin"]["config"]


@app.put("/config")
async def update_config(request: ConfigUpdateRequest, _: None = Depends(require_internal_key)):
    return await live_runtime.update_config(request.model_dump(exclude_none=True))


@app.post("/train/realtime")
async def retrain_realtime_models(_: None = Depends(require_internal_key)):
    return await live_runtime.retrain_models(force=False)


@app.get("/events/stream")
async def stream_events(_: None = Depends(require_internal_key)):
    async def event_generator():
        queue = await live_runtime.subscribe()

        try:
            while True:
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=15)
                    yield f"event: snapshot\ndata: {payload}\n\n"
                except asyncio.TimeoutError:
                    yield f"event: ping\ndata: {json.dumps({'timestamp': now_iso()})}\n\n"
        finally:
            await live_runtime.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/analyze/anomaly")
async def detect_anomalies(request: AnomalyRequest, _: None = Depends(require_internal_key)):
    try:
        if len(request.metrics) < 5:
            return {
                "workflowId": request.workflowId,
                "stepId": request.stepId,
                "anomalies": [],
                "anomalyScore": 0.0,
                "hasAnomaly": False,
                "threshold": 0.0,
                "shapContributions": [],
                "summary": "Insufficient data for anomaly detection",
            }

        features = metric_rows(request.metrics)
        result = anomaly_detector.detect(features, sensitivity=request.sensitivity)
        explanations = anomaly_detector.explain(features)
        latest_explanation = explanations[-1] if explanations else []

        anomalies = []
        for index, is_anomaly in enumerate(result["anomalies"]):
            if is_anomaly:
                anomalies.append(
                    {
                        "timestamp": request.metrics[index].timestamp,
                        "frictionScore": request.metrics[index].frictionScore,
                        "score": float(result["scores"][index]),
                    }
                )

        return {
            "workflowId": request.workflowId,
            "stepId": request.stepId,
            "anomalies": anomalies,
            "anomalyScore": float(result["anomaly_score"]),
            "hasAnomaly": result["has_anomaly"],
            "threshold": float(result["threshold"]),
            "shapContributions": latest_explanation,
            "summary": "Realtime anomaly explanation generated from the latest live sample.",
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.post("/analyze/predict")
async def predict_friction(request: PredictionRequest, _: None = Depends(require_internal_key)):
    try:
        if len(request.historicalMetrics) < 6:
            return {
                "workflowId": request.workflowId,
                "stepId": request.stepId,
                "predictions": [],
                "trend": "stable",
                "confidence": 0.0,
                "riskLevel": "low",
                "predictedAverage": 0.0,
                "message": "Insufficient historical data for prediction",
            }

        features = metric_rows(request.historicalMetrics)
        result = friction_predictor.predict(features, horizon=request.horizon)

        return {
            "workflowId": request.workflowId,
            "stepId": request.stepId,
            "predictions": result["predictions"],
            "trend": result["trend"],
            "confidence": result["confidence"],
            "riskLevel": result.get("risk_level", result.get("riskLevel", "low")),
            "predictedAverage": result.get("predicted_avg", result.get("predictedAverage", 0.0)),
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.post("/analyze/explain")
async def generate_explanation(request: ExplanationRequest, _: None = Depends(require_internal_key)):
    try:
        result = await insight_generator.generate(
            step_name=request.stepName,
            current_metrics=request.currentMetrics.model_dump(),
            anomaly_detected=request.anomalyDetected,
            trend=request.trend,
        )

        return {
            "workflowId": request.workflowId,
            "stepId": request.stepId,
            "detectedIssue": result["detected_issue"],
            "impactScore": result["impact_score"],
            "recommendation": result["recommendation"],
            "confidenceLevel": result["confidence_level"],
            "reasoning": result["reasoning"],
            "suggestedFix": result.get("suggested_fix", result["recommendation"]),
            "refreshedAt": now_iso(),
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.post("/train/anomaly")
async def train_anomaly_detector(request: TrainingRequest, _: None = Depends(require_internal_key)):
    try:
        features = metric_rows(request.trainingData)
        anomaly_detector.train(features)
        return {
            "workflowId": request.workflowId,
            "stepId": request.stepId,
            "status": "trained",
            "samples": len(features),
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


@app.post("/train/predictor")
async def train_friction_predictor(request: TrainingRequest, _: None = Depends(require_internal_key)):
    try:
        features = metric_rows(request.trainingData)
        friction_predictor.train(features)
        return {
            "workflowId": request.workflowId,
            "stepId": request.stepId,
            "status": "trained",
            "samples": len(features),
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
