import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
from pathlib import Path

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
    
    def load_model(self):
        """Load pretrained model"""
        try:
            self.model = joblib.load(self.model_path / "anomaly_detector.pkl")
            self.scaler = joblib.load(self.model_path / "anomaly_scaler.pkl")
            self.is_trained = True
            return True
        except:
            return False
