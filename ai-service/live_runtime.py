from __future__ import annotations

import asyncio
import copy
import json
import math
import os
import random
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Deque

import numpy as np

try:
    from redis.asyncio import Redis
except Exception:  # pragma: no cover - optional fallback for local dev
    Redis = None

from models.anomaly_detector import AnomalyDetector
from models.friction_predictor import FrictionPredictor
from models.insight_generator import InsightGenerator

QUEUE_NAME = "hfme:analysis_queue"
RAW_CHANNEL = "hfme:events:raw"
SNAPSHOT_CHANNEL = "hfme:events:snapshot"
LATEST_SNAPSHOT_KEY = "hfme:latest_snapshot"
RUNTIME_FILE = Path(__file__).resolve().parent.parent / "data" / "live-runtime.json"


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def clamp(value: float, minimum: float, maximum: float):
    return max(minimum, min(maximum, value))


def friction_level(score: float):
    if score >= 0.75:
        return "critical"
    if score >= 0.5:
        return "high"
    if score >= 0.3:
        return "medium"
    return "low"


def calculate_friction_score(metrics: dict[str, float], expected_time: float):
    weights = {
        "timeOverrun": 0.25,
        "retries": 0.20,
        "idle": 0.20,
        "backNav": 0.15,
        "dropOff": 0.20,
    }

    time_overrun = max(0.0, (metrics["avgTime"] - expected_time) / max(expected_time, 1))
    normalized_retries = min(metrics["retries"] / 10.0, 1.0)
    normalized_idle = min(metrics["idleTime"] / 60.0, 1.0)
    normalized_back_nav = min(metrics["backNav"] / 5.0, 1.0)
    normalized_drop_off = min(metrics["dropOffRate"], 1.0)

    score = (
        time_overrun * weights["timeOverrun"]
        + normalized_retries * weights["retries"]
        + normalized_idle * weights["idle"]
        + normalized_back_nav * weights["backNav"]
        + normalized_drop_off * weights["dropOff"]
    )

    return min(score, 1.0)


def default_runtime():
    return {
        "generatedAt": now_iso(),
        "workflows": [
            {
                "id": "wf-demo-checkout",
                "name": "E-commerce Checkout Flow",
                "description": "Standard checkout process with cart, shipping, and payment",
                "profile": {"mode": "stable", "activeUsers": 18, "volatility": 0.06},
                "steps": [
                    {
                        "id": "step-cart-review",
                        "name": "Cart Review",
                        "order": 0,
                        "expectedTimeSeconds": 30,
                        "baseline": {
                            "avgTime": 28,
                            "retries": 0.6,
                            "idleTime": 4,
                            "backNav": 0.2,
                            "dropOffRate": 0.05,
                        },
                    },
                    {
                        "id": "step-shipping-information",
                        "name": "Shipping Information",
                        "order": 1,
                        "expectedTimeSeconds": 45,
                        "baseline": {
                            "avgTime": 42,
                            "retries": 1.2,
                            "idleTime": 8,
                            "backNav": 0.3,
                            "dropOffRate": 0.08,
                        },
                    },
                    {
                        "id": "step-payment-method",
                        "name": "Payment Method",
                        "order": 2,
                        "expectedTimeSeconds": 40,
                        "baseline": {
                            "avgTime": 44,
                            "retries": 2.1,
                            "idleTime": 12,
                            "backNav": 0.5,
                            "dropOffRate": 0.12,
                        },
                    },
                ],
            },
            {
                "id": "wf-demo-onboarding",
                "name": "SaaS User Onboarding",
                "description": "New user signup and configuration process",
                "profile": {"mode": "rising", "activeUsers": 26, "volatility": 0.09},
                "steps": [
                    {
                        "id": "step-account-creation",
                        "name": "Account Creation",
                        "order": 0,
                        "expectedTimeSeconds": 40,
                        "baseline": {
                            "avgTime": 38,
                            "retries": 0.9,
                            "idleTime": 7,
                            "backNav": 0.2,
                            "dropOffRate": 0.07,
                        },
                    },
                    {
                        "id": "step-email-verification",
                        "name": "Email Verification",
                        "order": 1,
                        "expectedTimeSeconds": 60,
                        "baseline": {
                            "avgTime": 58,
                            "retries": 1.4,
                            "idleTime": 16,
                            "backNav": 0.4,
                            "dropOffRate": 0.12,
                        },
                    },
                    {
                        "id": "step-integration-setup",
                        "name": "Integration Setup",
                        "order": 2,
                        "expectedTimeSeconds": 90,
                        "baseline": {
                            "avgTime": 85,
                            "retries": 2.5,
                            "idleTime": 24,
                            "backNav": 0.9,
                            "dropOffRate": 0.18,
                        },
                    },
                ],
            },
            {
                "id": "wf-demo-upload",
                "name": "Document Upload & Processing",
                "description": "Upload, validate, and process documents",
                "profile": {
                    "mode": "anomaly",
                    "activeUsers": 14,
                    "volatility": 0.12,
                    "anomalyStepOrder": 1,
                },
                "steps": [
                    {
                        "id": "step-file-selection",
                        "name": "File Selection",
                        "order": 0,
                        "expectedTimeSeconds": 25,
                        "baseline": {
                            "avgTime": 23,
                            "retries": 0.5,
                            "idleTime": 3,
                            "backNav": 0.1,
                            "dropOffRate": 0.04,
                        },
                    },
                    {
                        "id": "step-document-upload",
                        "name": "Document Upload",
                        "order": 1,
                        "expectedTimeSeconds": 35,
                        "baseline": {
                            "avgTime": 34,
                            "retries": 1.8,
                            "idleTime": 11,
                            "backNav": 0.6,
                            "dropOffRate": 0.11,
                        },
                    },
                    {
                        "id": "step-final-review",
                        "name": "Final Review",
                        "order": 2,
                        "expectedTimeSeconds": 30,
                        "baseline": {
                            "avgTime": 31,
                            "retries": 1.3,
                            "idleTime": 9,
                            "backNav": 0.4,
                            "dropOffRate": 0.09,
                        },
                    },
                ],
            },
        ],
    }


def load_runtime_config():
    if RUNTIME_FILE.exists():
        with RUNTIME_FILE.open("r", encoding="utf-8") as runtime_file:
            return json.load(runtime_file)
    return default_runtime()


def contribution_summary(contributions: list[dict[str, Any]]):
    if not contributions:
        return "No dominant contributors were isolated on the latest sample."

    summary_parts = []
    for item in contributions[:2]:
        direction = "up" if item["direction"] == "increase" else "down"
        summary_parts.append(f"{item['feature']} pushed {direction} ({item['impact']:.2f})")
    return ", ".join(summary_parts)


class LiveRuntime:
    def __init__(
        self,
        anomaly_detector: AnomalyDetector,
        friction_predictor: FrictionPredictor,
        insight_generator: InsightGenerator,
    ):
        self.anomaly_detector = anomaly_detector
        self.friction_predictor = friction_predictor
        self.insight_generator = insight_generator
        self.runtime = load_runtime_config()
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis = None
        self.redis_connected = False
        self._running = False
        self._tasks: list[asyncio.Task] = []
        self._analysis_queue: asyncio.Queue[str] = asyncio.Queue()
        self._subscribers: set[asyncio.Queue[str]] = set()
        self._lock = asyncio.Lock()
        self._latest_snapshot: dict[str, Any] | None = None
        self._last_retrained_at: str | None = None
        self._last_tick_at: str | None = None
        self._events: Deque[dict[str, Any]] = deque(maxlen=18)
        self._logs: Deque[dict[str, Any]] = deque(maxlen=60)
        self._workflow_state: dict[str, Any] = {}
        self.tick = 0
        self.config = {
            "enabled": True,
            "anomalySensitivity": 0.1,
            "predictionEnabled": True,
            "explanationEnabled": True,
            "monitoringInterval": 1,
            "alertThreshold": 0.7,
        }
        self._bootstrap_state()

    def _bootstrap_state(self):
        for workflow in self.runtime["workflows"]:
            step_state = {}
            timeline = deque(maxlen=30)

            for step in workflow["steps"]:
                history = deque(maxlen=60)
                for boot_tick in range(18):
                    history.append(self._simulate_metric(workflow, step, boot_tick, warmup=True))

                current = history[-1]
                step_state[step["id"]] = {
                    "step": step,
                    "history": history,
                    "current": current,
                    "anomaly": {
                        "workflowId": workflow["id"],
                        "stepId": step["id"],
                        "anomalies": [],
                        "anomalyScore": current["frictionScore"],
                        "hasAnomaly": False,
                        "threshold": 0.0,
                        "shapContributions": [],
                        "summary": "Monitoring live activity.",
                    },
                    "prediction": {
                        "workflowId": workflow["id"],
                        "stepId": step["id"],
                        "predictions": [current["frictionScore"]] * 5,
                        "trend": "stable",
                        "confidence": 0.0,
                        "riskLevel": "low",
                        "predictedAverage": current["frictionScore"],
                    },
                    "insight": {
                        "workflowId": workflow["id"],
                        "stepId": step["id"],
                        "detectedIssue": f"Monitoring {step['name']}",
                        "impactScore": current["frictionScore"],
                        "recommendation": "Gathering fresh behavioral context from the live stream.",
                        "confidenceLevel": 0.5,
                        "reasoning": "Realtime analysis will refresh as new events arrive.",
                        "suggestedFix": "Watch the next few live events before intervening.",
                        "refreshedAt": now_iso(),
                        "insightType": "recommendation",
                    },
                    "status": "stable",
                }

            for index in range(18):
                step_points = [
                    list(step_state[step["id"]]["history"])[index]["frictionScore"]
                    for step in workflow["steps"]
                ]
                timeline.append(
                    {
                        "timestamp": list(step_state[workflow["steps"][0]["id"]]["history"])[index][
                            "timestamp"
                        ],
                        "frictionScore": round(float(np.mean(step_points)), 4),
                    }
                )

            self._workflow_state[workflow["id"]] = {
                "workflow": workflow,
                "sessionCount": random.randint(80, 220),
                "activeUsers": workflow.get("profile", {}).get("activeUsers", 10),
                "timeline": timeline,
                "steps": step_state,
            }

        self._log("success", "Live runtime bootstrapped with warmup metrics.")

    async def start(self):
        self._running = True
        await self._connect_redis()
        await self.retrain_models(force=True)
        await self._publish_snapshot(await self._build_snapshot())
        self._tasks = [
            asyncio.create_task(self._simulation_loop()),
            asyncio.create_task(self._analysis_loop()),
        ]

    async def stop(self):
        self._running = False
        for task in self._tasks:
            task.cancel()

        await asyncio.gather(*self._tasks, return_exceptions=True)

        if self.redis is not None:
            await self.redis.close()

    async def _connect_redis(self):
        if Redis is None:
            self._log("warning", "redis package unavailable; using in-process queue fallback.")
            return

        try:
            self.redis = Redis.from_url(self.redis_url, decode_responses=True)
            await self.redis.ping()
            self.redis_connected = True
            self._log("success", "Redis connected for realtime queue + pub/sub.")
        except Exception as error:
            self.redis_connected = False
            self.redis = None
            self._log("warning", f"Redis unavailable, continuing in fallback mode: {error}")

    def _log(self, level: str, message: str):
        self._logs.appendleft(
            {
                "id": f"log-{len(self._logs) + 1}-{int(datetime.now().timestamp() * 1000)}",
                "timestamp": now_iso(),
                "level": level,
                "message": message,
            }
        )

    def _simulate_metric(self, workflow: dict[str, Any], step: dict[str, Any], tick: int, warmup=False):
        profile = workflow.get("profile", {})
        baseline = step.get("baseline", {})
        mode = profile.get("mode", "stable")
        volatility = profile.get("volatility", 0.08)
        step_order = step.get("order", 0)
        expected_time = step.get("expectedTimeSeconds", 30)

        harmonic = math.sin((tick + step_order) / 4.0) * volatility
        trend = 0.0
        anomaly_boost = 0.0

        if mode == "rising":
            trend = min(0.45, tick * 0.004)
        elif mode == "anomaly":
            anomaly_target = profile.get("anomalyStepOrder", 0)
            pulse = 0.65 if step_order == anomaly_target and tick % 12 in (0, 1, 2) else 0.0
            anomaly_boost = pulse

        jitter = random.uniform(-volatility, volatility) if not warmup else 0.0
        factor = 1 + harmonic + trend + anomaly_boost + jitter + (step_order * 0.02)

        avg_time = clamp(baseline.get("avgTime", expected_time) * factor, 5, expected_time * 4)
        retries = clamp(baseline.get("retries", 1) * (0.9 + factor), 0, 8)
        idle_time = clamp(baseline.get("idleTime", 5) * (0.85 + factor), 0, 75)
        back_nav = clamp(baseline.get("backNav", 0.2) * (0.8 + factor), 0, 5)
        drop_off = clamp(baseline.get("dropOffRate", 0.08) * (0.85 + factor), 0.01, 0.8)

        metric = {
            "timestamp": now_iso(),
            "avgTime": round(avg_time, 2),
            "retries": round(retries, 2),
            "idleTime": round(idle_time, 2),
            "backNav": round(back_nav, 2),
            "dropOffRate": round(drop_off, 4),
        }
        metric["frictionScore"] = round(
            calculate_friction_score(metric, float(expected_time)),
            4,
        )
        return metric

    def _event_type_for_metric(self, metric: dict[str, Any]):
        if metric["dropOffRate"] >= 0.28:
            return "session_abandoned"
        if metric["retries"] >= 2.5:
            return "validation_error"
        if metric["backNav"] >= 1.5:
            return "back_navigation"
        return "step_completed"

    async def _enqueue_batch(self, payload: dict[str, Any]):
        serialized = json.dumps(payload)
        if self.redis_connected and self.redis is not None:
            await self.redis.lpush(QUEUE_NAME, serialized)
            await self.redis.publish(RAW_CHANNEL, serialized)
        else:
            await self._analysis_queue.put(serialized)

    async def _simulation_loop(self):
        while self._running:
            if self.config["enabled"]:
                self.tick += 1
                batch_events = []

                for workflow in self.runtime["workflows"]:
                    state = self._workflow_state[workflow["id"]]
                    profile = workflow.get("profile", {})
                    active_users = max(
                        3,
                        int(profile.get("activeUsers", 10) + random.randint(-2, 3)),
                    )
                    state["activeUsers"] = active_users
                    state["sessionCount"] += max(1, active_users // 4)

                    for step in workflow["steps"]:
                        metric = self._simulate_metric(workflow, step, self.tick)
                        event_type = self._event_type_for_metric(metric)
                        event = {
                            "id": f"evt-{self.tick}-{workflow['id']}-{step['id']}",
                            "sessionId": f"sess-{workflow['id']}-{self.tick}-{step['id']}",
                            "workflowId": workflow["id"],
                            "workflowName": workflow["name"],
                            "stepId": step["id"],
                            "stepName": step["name"],
                            "type": event_type,
                            "timestamp": metric["timestamp"],
                            "frictionScore": metric["frictionScore"],
                            "details": f"{step['name']} friction {metric['frictionScore']:.2f}",
                            "metric": metric,
                        }
                        batch_events.append(event)

                await self._enqueue_batch(
                    {"tick": self.tick, "generatedAt": now_iso(), "events": batch_events}
                )

            await asyncio.sleep(max(self.config["monitoringInterval"], 1))

    async def _analysis_loop(self):
        while self._running:
            if self.redis_connected and self.redis is not None:
                result = await self.redis.brpop(QUEUE_NAME, timeout=1)
                if not result:
                    continue
                _, payload = result
            else:
                payload = await self._analysis_queue.get()

            try:
                batch = json.loads(payload)
                await self._process_batch(batch)
            except Exception as error:
                self._log("warning", f"Failed to process live batch: {error}")

    def _collect_training_rows(self):
        rows = []
        for workflow_state in self._workflow_state.values():
            for step_state in workflow_state["steps"].values():
                for item in step_state["history"]:
                    rows.append(
                        [
                            item["frictionScore"],
                            item["avgTime"],
                            item["retries"],
                            item["idleTime"],
                            item["backNav"],
                            item["dropOffRate"],
                        ]
                    )
        return np.array(rows)

    async def retrain_models(self, force=False):
        rows = self._collect_training_rows()
        if len(rows) < 10:
            return {"status": "skipped", "samples": int(len(rows))}

        try:
            self.anomaly_detector.train(rows)
        except Exception as error:
            self._log("warning", f"Anomaly detector retrain skipped: {error}")

        try:
            self.friction_predictor.train(rows)
        except Exception as error:
            self._log("warning", f"Friction predictor retrain skipped: {error}")

        self._last_retrained_at = now_iso()
        if force:
            self._log("success", f"Realtime models primed with {len(rows)} samples.")
        else:
            self._log("success", f"Realtime models retrained with {len(rows)} samples.")

        return {
            "status": "trained",
            "samples": int(len(rows)),
            "retrainedAt": self._last_retrained_at,
        }

    async def _process_batch(self, batch: dict[str, Any]):
        async with self._lock:
            self._last_tick_at = batch["generatedAt"]

            for event in batch["events"]:
                workflow_state = self._workflow_state[event["workflowId"]]
                step_state = workflow_state["steps"][event["stepId"]]
                metric = copy.deepcopy(event["metric"])
                step_state["current"] = metric
                step_state["history"].append(metric)
                self._events.appendleft(
                    {
                        key: event[key]
                        for key in [
                            "id",
                            "sessionId",
                            "workflowId",
                            "workflowName",
                            "stepId",
                            "stepName",
                            "type",
                            "timestamp",
                            "frictionScore",
                            "details",
                        ]
                    }
                )

            if self.tick % 45 == 0:
                await self.retrain_models()

            for workflow_id, workflow_state in self._workflow_state.items():
                workflow = workflow_state["workflow"]
                step_points = []

                for step in workflow["steps"]:
                    step_state = workflow_state["steps"][step["id"]]
                    history = list(step_state["history"])
                    features = np.array(
                        [
                            [
                                item["frictionScore"],
                                item["avgTime"],
                                item["retries"],
                                item["idleTime"],
                                item["backNav"],
                                item["dropOffRate"],
                            ]
                            for item in history
                        ]
                    )

                    anomaly = self.anomaly_detector.detect(
                        features,
                        sensitivity=float(self.config["anomalySensitivity"]),
                    )
                    contributions = self.anomaly_detector.explain(features)
                    latest_contributions = contributions[-1] if contributions else []
                    anomaly["workflowId"] = workflow_id
                    anomaly["stepId"] = step["id"]
                    anomaly["shapContributions"] = latest_contributions
                    anomaly["summary"] = contribution_summary(latest_contributions)

                    prediction = self.friction_predictor.predict(features, horizon=5)
                    prediction["workflowId"] = workflow_id
                    prediction["stepId"] = step["id"]
                    prediction["predictedAverage"] = prediction.get(
                        "predicted_avg",
                        float(np.mean(prediction.get("predictions", [history[-1]["frictionScore"]]))),
                    )
                    prediction["riskLevel"] = prediction.get("risk_level", prediction.get("riskLevel", "low"))

                    insight = await self.insight_generator.generate(
                        step_name=step["name"],
                        current_metrics=step_state["current"],
                        anomaly_detected=anomaly["has_anomaly"],
                        trend=prediction["trend"],
                    )

                    if anomaly["has_anomaly"]:
                        insight_type = "anomaly"
                        self._log(
                            "warning",
                            f"Anomaly detected on {workflow['name']} / {step['name']} ({anomaly.get('anomaly_score', anomaly.get('anomalyScore', 0)):.2f}).",
                        )
                    elif prediction["riskLevel"] in ("medium", "high"):
                        insight_type = "prediction"
                    else:
                        insight_type = "recommendation"

                    suggestion = insight.get("suggested_fix")
                    if latest_contributions:
                        top_feature = latest_contributions[0]["feature"]
                        suggestion = suggestion or f"Review the latest shift in {top_feature}."

                    step_state["anomaly"] = {
                        "workflowId": workflow_id,
                        "stepId": step["id"],
                        "anomalies": anomaly.get("anomalies", []),
                        "anomalyScore": float(anomaly.get("anomaly_score", anomaly.get("anomalyScore", 0))),
                        "hasAnomaly": bool(anomaly.get("has_anomaly", anomaly.get("hasAnomaly", False))),
                        "threshold": float(anomaly.get("threshold", 0)),
                        "shapContributions": latest_contributions,
                        "summary": anomaly.get("summary", ""),
                    }
                    step_state["prediction"] = {
                        "workflowId": workflow_id,
                        "stepId": step["id"],
                        "predictions": prediction.get("predictions", []),
                        "trend": prediction.get("trend", "stable"),
                        "confidence": float(prediction.get("confidence", 0)),
                        "riskLevel": prediction.get("riskLevel", "low"),
                        "predictedAverage": float(prediction.get("predictedAverage", 0)),
                    }
                    step_state["insight"] = {
                        "workflowId": workflow_id,
                        "stepId": step["id"],
                        "detectedIssue": insight["detected_issue"],
                        "impactScore": float(insight["impact_score"]),
                        "recommendation": insight["recommendation"],
                        "confidenceLevel": float(insight["confidence_level"]),
                        "reasoning": insight["reasoning"],
                        "suggestedFix": suggestion or insight["recommendation"],
                        "refreshedAt": now_iso(),
                        "insightType": insight_type,
                    }

                    current_score = step_state["current"]["frictionScore"]
                    if step_state["anomaly"]["hasAnomaly"] or current_score >= 0.72:
                        step_state["status"] = "critical"
                    elif current_score >= 0.4 or step_state["prediction"]["riskLevel"] in ("medium", "high"):
                        step_state["status"] = "watch"
                    else:
                        step_state["status"] = "stable"

                    step_points.append(current_score)

                workflow_state["timeline"].append(
                    {
                        "timestamp": batch["generatedAt"],
                        "frictionScore": round(float(np.mean(step_points)), 4),
                    }
                )

            await self._publish_snapshot(await self._build_snapshot())

    async def _publish_snapshot(self, snapshot: dict[str, Any]):
        self._latest_snapshot = snapshot
        serialized = json.dumps(snapshot)

        if self.redis_connected and self.redis is not None:
            await self.redis.set(LATEST_SNAPSHOT_KEY, serialized)
            await self.redis.publish(SNAPSHOT_CHANNEL, serialized)

        for subscriber in list(self._subscribers):
            await subscriber.put(serialized)

    async def _build_snapshot(self):
        workflows_payload = []
        heatmap = []
        alerts = []

        for workflow_state in self._workflow_state.values():
            workflow = workflow_state["workflow"]
            steps_payload = []

            for step in workflow["steps"]:
                state = workflow_state["steps"][step["id"]]
                current = state["current"]
                anomaly = state["anomaly"]
                prediction = state["prediction"]
                insight = state["insight"]

                steps_payload.append(
                    {
                        "id": step["id"],
                        "workflowId": workflow["id"],
                        "name": step["name"],
                        "order": step["order"],
                        "expectedTimeSeconds": step["expectedTimeSeconds"],
                        "current": current,
                        "history": list(state["history"])[-20:],
                        "anomaly": anomaly,
                        "prediction": prediction,
                        "insight": insight,
                        "status": state["status"],
                    }
                )

                level = friction_level(current["frictionScore"])
                heatmap.append(
                    {
                        "workflowId": workflow["id"],
                        "workflowName": workflow["name"],
                        "stepId": step["id"],
                        "stepName": step["name"],
                        "frictionScore": current["frictionScore"],
                        "level": level,
                    }
                )

                if anomaly["hasAnomaly"] or current["frictionScore"] >= self.config["alertThreshold"]:
                    alerts.append(
                        {
                            "workflowId": workflow["id"],
                            "workflowName": workflow["name"],
                            "stepId": step["id"],
                            "stepName": step["name"],
                            "score": anomaly["anomalyScore"] or current["frictionScore"],
                            "timestamp": current["timestamp"],
                            "issue": insight["detectedIssue"],
                        }
                    )

            latest_insight = None
            if steps_payload:
                latest_insight = max(steps_payload, key=lambda item: item["insight"]["impactScore"])[
                    "insight"
                ]

            workflows_payload.append(
                {
                    "id": workflow["id"],
                    "name": workflow["name"],
                    "description": workflow.get("description", ""),
                    "sessionCount": workflow_state["sessionCount"],
                    "activeUsers": workflow_state["activeUsers"],
                    "overallFriction": round(
                        float(np.mean([step["current"]["frictionScore"] for step in steps_payload])),
                        4,
                    ),
                    "avgDropOffRate": round(
                        float(np.mean([step["current"]["dropOffRate"] for step in steps_payload])),
                        4,
                    ),
                    "trend": max(steps_payload, key=lambda item: item["prediction"]["predictedAverage"])[
                        "prediction"
                    ]["trend"]
                    if steps_payload
                    else "stable",
                    "anomalyCount": len([step for step in steps_payload if step["anomaly"]["hasAnomaly"]]),
                    "latestInsight": latest_insight,
                    "timeline": list(workflow_state["timeline"]),
                    "steps": steps_payload,
                }
            )

        total_sessions = sum(workflow["sessionCount"] for workflow in workflows_payload)
        dashboard_insights = []

        for workflow in workflows_payload:
            for step in workflow["steps"]:
                dashboard_insights.append(
                    {
                        "id": f"ins-{workflow['id']}-{step['id']}",
                        "insightType": step["insight"]["insightType"],
                        **{
                            key: value
                            for key, value in step["insight"].items()
                            if key not in {"workflowId", "stepId", "refreshedAt"}
                        },
                    }
                )

        dashboard_insights.sort(key=lambda item: item["impactScore"], reverse=True)
        alerts.sort(key=lambda item: item["score"], reverse=True)

        queue_depth = self._analysis_queue.qsize()

        if self.redis_connected and self.redis is not None:
            try:
                queue_depth = max(queue_depth, int(await self.redis.llen(QUEUE_NAME)))
            except Exception:
                pass

        return {
            "tick": self.tick,
            "generatedAt": now_iso(),
            "events": list(self._events),
            "dashboard": {
                "totalSessions": total_sessions,
                "activeWorkflows": len(workflows_payload),
                "averageFriction": round(
                    float(np.mean([workflow["overallFriction"] for workflow in workflows_payload]))
                    if workflows_payload
                    else 0,
                    4,
                ),
                "averageDropOffRate": round(
                    float(np.mean([workflow["avgDropOffRate"] for workflow in workflows_payload]))
                    if workflows_payload
                    else 0,
                    4,
                ),
                "anomalyCount": len([item for item in alerts if item["score"] >= self.config["alertThreshold"]]),
                "heatmap": heatmap,
                "alerts": alerts[:6],
                "insights": dashboard_insights[:6],
            },
            "workflows": workflows_payload,
            "admin": {
                "config": self.config,
                "modelStatus": {
                    "anomalyDetectorTrained": bool(self.anomaly_detector.is_trained),
                    "frictionPredictorTrained": bool(self.friction_predictor.is_trained),
                    "queueDepth": queue_depth,
                    "redisConnected": self.redis_connected,
                    "lastRetrainedAt": self._last_retrained_at,
                    "lastTickAt": self._last_tick_at,
                },
                "logs": list(self._logs),
            },
        }

    async def get_snapshot(self):
        if self._latest_snapshot is None:
            self._latest_snapshot = await self._build_snapshot()
        return self._latest_snapshot

    async def subscribe(self):
        queue: asyncio.Queue[str] = asyncio.Queue()
        self._subscribers.add(queue)

        if self._latest_snapshot is not None:
            await queue.put(json.dumps(self._latest_snapshot))

        return queue

    async def unsubscribe(self, queue: asyncio.Queue[str]):
        if queue in self._subscribers:
            self._subscribers.remove(queue)

    async def get_model_status(self):
        snapshot = await self.get_snapshot()
        return snapshot["admin"]["modelStatus"]

    async def update_config(self, updates: dict[str, Any]):
        for key, value in updates.items():
            if key in self.config and value is not None:
                self.config[key] = value

        self._log(
            "info",
            "Monitoring config updated: "
            + ", ".join(f"{key}={value}" for key, value in updates.items() if value is not None),
        )

        snapshot = await self._build_snapshot()
        await self._publish_snapshot(snapshot)
        return self.config
