import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
from pathlib import Path

FEATURE_NAMES = [
    "frictionScore",
    "avgTime",
    "retries",
    "idleTime",
    "backNav",
    "dropOffRate",
]

class AnomalyDetector:
    def __init__(self):
        self.model = IsolationForest(
            contamination=0.1,
            random_state=42,
            n_estimators=100
        )
        self.scaler = StandardScaler()
        self.is_trained = False
        self.model_path = Path(__file__).parent.parent / "trained_models"
        self.model_path.mkdir(exist_ok=True)
    
    def train(self, features: np.ndarray):
        """Train the anomaly detection model"""
        if len(features) < 10:
            raise ValueError("Need at least 10 samples to train")
        
        # Normalize features
        scaled_features = self.scaler.fit_transform(features)
        
        # Train model
        self.model.fit(scaled_features)
        self.is_trained = True
        
        # Save model
        joblib.dump(self.model, self.model_path / "anomaly_detector.pkl")
        joblib.dump(self.scaler, self.model_path / "anomaly_scaler.pkl")
    
    def detect(self, features: np.ndarray, sensitivity: float = 0.1):
        """
        Detect anomalies in friction metrics
        
        Returns:
            dict with anomalies, scores, and summary
        """
        if not self.is_trained:
            # Try to load pretrained model
            try:
                self.model = joblib.load(self.model_path / "anomaly_detector.pkl")
                self.scaler = joblib.load(self.model_path / "anomaly_scaler.pkl")
                self.is_trained = True
            except:
                # Use default detection without training
                pass
        
        # Normalize features
        try:
            scaled_features = self.scaler.transform(features)
        except:
            # If scaler not fitted, fit and transform
            scaled_features = self.scaler.fit_transform(features)
        
        # Get anomaly scores (lower is more anomalous)
        scores = self.model.score_samples(scaled_features)
        predictions = self.model.predict(scaled_features)
        
        # Convert predictions (-1 for anomaly, 1 for normal)
        anomalies = (predictions == -1)
        
        # Calculate anomaly score (0-1, higher means more anomalous)
        normalized_scores = 1 / (1 + np.exp(scores))  # Sigmoid normalization
        
        # Adjust threshold based on sensitivity
        threshold = np.percentile(normalized_scores, (1 - sensitivity) * 100)
        
        # Determine if there's a significant anomaly
        has_anomaly = np.any(normalized_scores > threshold)
        anomaly_score = float(np.max(normalized_scores))
        
        return {
            "anomalies": anomalies.tolist(),
            "scores": normalized_scores.tolist(),
            "anomaly_score": anomaly_score,
            "has_anomaly": has_anomaly,
            "threshold": threshold
        }

    def explain(self, features: np.ndarray):
        """Return feature contributions for the latest samples."""
        if len(features) == 0:
            return []

        try:
            scaled_features = self.scaler.transform(features)
        except:
            scaled_features = self.scaler.fit_transform(features)

        try:
            import shap

            explainer = shap.TreeExplainer(self.model)
            shap_values = explainer.shap_values(scaled_features)

            if isinstance(shap_values, list):
                shap_values = shap_values[0]

            explanations = []
            for row_index, row in enumerate(shap_values):
                contributions = []
                for feature_index, impact in enumerate(row):
                    contributions.append({
                        "feature": FEATURE_NAMES[feature_index],
                        "impact": float(abs(impact)),
                        "direction": "increase" if impact >= 0 else "decrease",
                        "value": float(features[row_index][feature_index]),
                    })

                contributions.sort(key=lambda item: item["impact"], reverse=True)
                explanations.append(contributions[:3])

            return explanations
        except:
            means = np.mean(features, axis=0)
            stds = np.std(features, axis=0) + 1e-6
            explanations = []

            for row in features:
                z_scores = np.abs((row - means) / stds)
                ranked = np.argsort(z_scores)[::-1][:3]
                contributions = []
                for feature_index in ranked:
                    value = float(row[feature_index])
                    baseline = float(means[feature_index])
                    contributions.append({
                        "feature": FEATURE_NAMES[feature_index],
                        "impact": float(z_scores[feature_index]),
                        "direction": "increase" if value >= baseline else "decrease",
                        "value": value,
                    })
                explanations.append(contributions)

            return explanations
    
    def load_model(self):
        """Load pretrained model"""
        try:
            self.model = joblib.load(self.model_path / "anomaly_detector.pkl")
            self.scaler = joblib.load(self.model_path / "anomaly_scaler.pkl")
            self.is_trained = True
            return True
        except:
            return False
