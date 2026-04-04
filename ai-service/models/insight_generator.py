import os
import json
from typing import Dict, Any
import httpx

class InsightGenerator:
    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY", "")
        self.openai_key = os.getenv("OPENAI_API_KEY", "")
        self.use_gemini = bool(self.gemini_key and self.gemini_key != "your-gemini-api-key-here")
        self.use_openai = bool(self.openai_key and self.openai_key != "your-openai-api-key-here")

    async def generate(
        self,
        step_name: str,
        current_metrics: Dict[str, Any],
        anomaly_detected: bool,
        trend: str
    ) -> Dict[str, Any]:
        """Generate human-readable insights about friction — Gemini → OpenAI → rule-based"""

        if self.use_gemini:
            result = await self._generate_with_gemini(step_name, current_metrics, anomaly_detected, trend)
            if result:
                return result

        if self.use_openai:
            result = await self._generate_with_openai(step_name, current_metrics, anomaly_detected, trend)
            if result:
                return result

        return self._generate_rule_based(step_name, current_metrics, anomaly_detected, trend)

    async def _generate_with_gemini(
        self,
        step_name: str,
        current_metrics: Dict[str, Any],
        anomaly_detected: bool,
        trend: str
    ) -> Dict[str, Any] | None:
        """Generate insights using Google Gemini API"""

        prompt = f"""Analyze this workflow friction data and return a JSON object.

Step: {step_name}
Metrics:
- Friction Score: {current_metrics['frictionScore']:.2f}
- Average Time: {current_metrics['avgTime']:.1f}s
- Retries: {current_metrics['retries']}
- Idle Time: {current_metrics['idleTime']:.1f}s
- Back Navigation: {current_metrics['backNav']}
- Drop-off Rate: {current_metrics['dropOffRate']:.1%}

Anomaly Detected: {anomaly_detected}
Trend: {trend}

Return ONLY valid JSON (no markdown) with these exact keys:
{{
  "detected_issue": "<concise issue title, ≤12 words>",
  "recommendation": "<actionable fix, ≤25 words>",
  "impact": "<1 sentence explaining user impact>",
  "confidence_level": <float 0.0-1.0>
}}"""

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_key}",
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.6,
                            "maxOutputTokens": 300,
                            "responseMimeType": "application/json"
                        }
                    },
                    timeout=12.0
                )

                if response.status_code == 200:
                    data = response.json()
                    content = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(content)
                    return {
                        "detected_issue": parsed.get("detected_issue", "Friction detected"),
                        "impact_score": self._calculate_impact(current_metrics),
                        "recommendation": parsed.get("recommendation", "Optimize this step"),
                        "confidence_level": float(parsed.get("confidence_level", 0.82)),
                        "reasoning": parsed.get("impact", ""),
                    }
        except Exception as e:
            print(f"[InsightGenerator] Gemini error: {e}")
        return None

    async def _generate_with_openai(
        self,
        step_name: str,
        current_metrics: Dict[str, Any],
        anomaly_detected: bool,
        trend: str
    ) -> Dict[str, Any] | None:
        """Generate insights using OpenAI API"""

        prompt = f"""Analyze this workflow step friction data and provide insights:

Step: {step_name}
Metrics:
- Friction Score: {current_metrics['frictionScore']:.2f}
- Average Time: {current_metrics['avgTime']:.1f}s
- Retries: {current_metrics['retries']}
- Idle Time: {current_metrics['idleTime']:.1f}s
- Back Navigation: {current_metrics['backNav']}
- Drop-off Rate: {current_metrics['dropOffRate']:.1%}

Anomaly Detected: {anomaly_detected}
Trend: {trend}

Return JSON with keys: detected_issue, recommendation, impact"""

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openai_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-3.5-turbo",
                        "messages": [
                            {"role": "system", "content": "You are a UX expert. Return only valid JSON."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 300
                    },
                    timeout=10.0
                )

                if response.status_code == 200:
                    result = response.json()
                    content = result['choices'][0]['message']['content']
                    parsed = json.loads(content)
                    return {
                        "detected_issue": parsed.get("detected_issue", "Friction detected"),
                        "impact_score": self._calculate_impact(current_metrics),
                        "recommendation": parsed.get("recommendation", "Review and optimize this step"),
                        "confidence_level": 0.85,
                        "reasoning": parsed.get("impact", "User experience may be degraded"),
                    }
        except Exception as e:
            print(f"[InsightGenerator] OpenAI error: {e}")
        return None

    def _generate_rule_based(
        self,
        step_name: str,
        current_metrics: Dict[str, Any],
        anomaly_detected: bool,
        trend: str
    ) -> Dict[str, Any]:
        """Generate insights using rule-based logic"""

        friction_score = current_metrics['frictionScore']
        avg_time = current_metrics['avgTime']
        retries = current_metrics['retries']
        idle_time = current_metrics['idleTime']
        back_nav = current_metrics['backNav']
        drop_off = current_metrics['dropOffRate']

        issues = []
        if drop_off > 0.2:
            issues.append(("high_dropout", drop_off))
        if retries > 5:
            issues.append(("excessive_retries", retries))
        if idle_time > 30:
            issues.append(("long_hesitation", idle_time))
        if back_nav > 3:
            issues.append(("navigation_confusion", back_nav))
        if avg_time > 60:
            issues.append(("slow_completion", avg_time))

        if not issues:
            detected_issue = f"Elevated friction detected in '{step_name}'"
            impact = "Users are experiencing mild difficulty completing this step."
            recommendation = "Monitor this step closely for emerging patterns."
        else:
            primary_issue = max(issues, key=lambda x: x[1])
            issue_type, value = primary_issue

            if issue_type == "high_dropout":
                detected_issue = f"High drop-off rate ({value:.1%}) at '{step_name}'"
                impact = "Users are abandoning the workflow at this step."
                recommendation = "Review step clarity, reduce required fields, add contextual help."
            elif issue_type == "excessive_retries":
                detected_issue = f"Frequent validation failures ({int(value)} retries) at '{step_name}'"
                impact = "Users are struggling to provide correct input."
                recommendation = "Improve validation feedback, add format examples and inline hints."
            elif issue_type == "long_hesitation":
                detected_issue = f"Extended idle time ({value:.0f}s) at '{step_name}'"
                impact = "Users are pausing significantly, suggesting confusion."
                recommendation = "Simplify step description and add tooltips or guidance."
            elif issue_type == "navigation_confusion":
                detected_issue = f"Repeated back navigation ({int(value)} times) at '{step_name}'"
                impact = "Users are going back to previous steps."
                recommendation = "Ensure all required information is presented upfront."
            else:
                detected_issue = f"Slow task completion ({value:.0f}s average) at '{step_name}'"
                impact = "Users are taking longer than expected."
                recommendation = "Optimize step performance or break into smaller sub-steps."

        if anomaly_detected:
            detected_issue = f"[ANOMALY] {detected_issue}"
        if trend == "increasing":
            detected_issue = f"{detected_issue} (worsening)"

        impact_score = self._calculate_impact(current_metrics)
        confidence = 0.75 if len(issues) > 0 else 0.6

        return {
            "detected_issue": detected_issue,
            "impact_score": impact_score,
            "recommendation": recommendation,
            "confidence_level": confidence,
            "reasoning": impact
        }

    def _calculate_impact(self, metrics: Dict[str, Any]) -> float:
        """Calculate impact score (0-10)"""
        weights = {
            'frictionScore': 0.3,
            'dropOffRate': 0.25,
            'retries': 0.15,
            'idleTime': 0.15,
            'backNav': 0.1,
            'avgTime': 0.05
        }
        normalized = {
            'frictionScore': min(metrics['frictionScore'], 1.0),
            'dropOffRate': min(metrics['dropOffRate'], 1.0),
            'retries': min(metrics['retries'] / 10.0, 1.0),
            'idleTime': min(metrics['idleTime'] / 60.0, 1.0),
            'backNav': min(metrics['backNav'] / 5.0, 1.0),
            'avgTime': min(metrics['avgTime'] / 120.0, 1.0)
        }
        impact = sum(normalized[k] * weights[k] for k in weights)
        return round(min(impact * 10, 10.0), 1)
