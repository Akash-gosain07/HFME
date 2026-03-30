import os
from typing import Dict, Any
import httpx

class InsightGenerator:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        self.use_llm = bool(self.api_key and self.api_key != "your-openai-api-key-here")
    
    async def generate(
        self,
        step_name: str,
        current_metrics: Dict[str, Any],
        anomaly_detected: bool,
        trend: str
    ) -> Dict[str, Any]:
        """Generate human-readable insights about friction"""
        
        if self.use_llm:
            return await self._generate_with_llm(step_name, current_metrics, anomaly_detected, trend)
        else:
            return self._generate_rule_based(step_name, current_metrics, anomaly_detected, trend)
    
    async def _generate_with_llm(
        self,
        step_name: str,
        current_metrics: Dict[str, Any],
        anomaly_detected: bool,
        trend: str
    ) -> Dict[str, Any]:
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

Provide:
1. Detected Issue (brief, specific)
2. Impact on Users (2-3 sentences)
3. Recommendation (actionable, specific)

Format as JSON with keys: detected_issue, impact, recommendation"""

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-3.5-turbo",
                        "messages": [
                            {"role": "system", "content": "You are an expert in user experience and workflow optimization."},
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
                    
                    # Try to parse as JSON, fallback to text parsing
                    try:
                        import json
                        parsed = json.loads(content)
                        return {
                            "detected_issue": parsed.get("detected_issue", "Friction detected"),
                            "impact_score": self._calculate_impact(current_metrics),
                            "recommendation": parsed.get("recommendation", "Review and optimize this step"),
                            "confidence_level": 0.85,
                            "reasoning": parsed.get("impact", "User experience may be degraded")
                        }
                    except:
                        # Fallback to rule-based if parsing fails
                        return self._generate_rule_based(step_name, current_metrics, anomaly_detected, trend)
        except:
            pass
        
        # Fallback to rule-based
        return self._generate_rule_based(step_name, current_metrics, anomaly_detected, trend)
    
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
        
        # Identify primary issue
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
            # Sort by severity
            primary_issue = max(issues, key=lambda x: x[1])
            issue_type, value = primary_issue
            
            if issue_type == "high_dropout":
                detected_issue = f"High drop-off rate ({value:.1%}) at '{step_name}'"
                impact = "Users are abandoning the workflow at this step, indicating a critical usability issue or unclear requirements."
                recommendation = "Review step clarity, reduce required fields, and consider adding contextual help or examples."
            
            elif issue_type == "excessive_retries":
                detected_issue = f"Frequent validation failures ({int(value)} retries) at '{step_name}'"
                impact = "Users are struggling to provide correct input, leading to frustration and time waste."
                recommendation = "Improve input validation feedback, add format examples, and consider inline validation hints."
            
            elif issue_type == "long_hesitation":
                detected_issue = f"Extended idle time ({value:.0f}s) indicating confusion at '{step_name}'"
                impact = "Users are pausing significantly, suggesting unclear instructions or decision paralysis."
                recommendation = "Simplify step description, add tooltips or guidance, and review information architecture."
            
            elif issue_type == "navigation_confusion":
                detected_issue = f"Repeated back navigation ({int(value)} times) at '{step_name}'"
                impact = "Users are going back to previous steps, indicating missing information or unclear flow."
                recommendation = "Ensure all required information is presented upfront and review step dependencies."
            
            else:  # slow_completion
                detected_issue = f"Slow task completion ({value:.0f}s average) at '{step_name}'"
                impact = "Users are taking longer than expected, potentially due to complexity or technical issues."
                recommendation = "Optimize step performance, reduce complexity, or break into smaller sub-steps."
        
        # Add anomaly context
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
        """Calculate impact score (0-1)"""
        weights = {
            'frictionScore': 0.3,
            'dropOffRate': 0.25,
            'retries': 0.15,
            'idleTime': 0.15,
            'backNav': 0.1,
            'avgTime': 0.05
        }
        
        # Normalize metrics
        normalized = {
            'frictionScore': min(metrics['frictionScore'], 1.0),
            'dropOffRate': min(metrics['dropOffRate'], 1.0),
            'retries': min(metrics['retries'] / 10.0, 1.0),
            'idleTime': min(metrics['idleTime'] / 60.0, 1.0),
            'backNav': min(metrics['backNav'] / 5.0, 1.0),
            'avgTime': min(metrics['avgTime'] / 120.0, 1.0)
        }
        
        impact = sum(normalized[k] * weights[k] for k in weights)
        return min(impact, 1.0)
