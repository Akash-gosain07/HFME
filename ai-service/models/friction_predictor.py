import numpy as np
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
import joblib
from pathlib import Path

class FrictionPredictor:
    def __init__(self):
        self.model = Ridge(alpha=1.0)
        self.scaler = StandardScaler()
        self.is_trained = False
        self.model_path = Path(__file__).parent.parent / "trained_models"
        self.model_path.mkdir(exist_ok=True)
        self.window_size = 5
    
    def train(self, features: np.ndarray):
        """Train the friction prediction model"""
        if len(features) < self.window_size + 1:
            raise ValueError(f"Need at least {self.window_size + 1} samples to train")
        
        # Create windowed dataset
        X, y = self._create_sequences(features)
        
        # Normalize features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train model
        self.model.fit(X_scaled, y)
        self.is_trained = True
        
        # Save model
        joblib.dump(self.model, self.model_path / "friction_predictor.pkl")
        joblib.dump(self.scaler, self.model_path / "friction_scaler.pkl")
    
    def _create_sequences(self, data: np.ndarray):
        """Create windowed sequences for time series prediction"""
        X, y = [], []
        for i in range(len(data) - self.window_size):
            X.append(data[i:i + self.window_size].flatten())
            y.append(data[i + self.window_size, 0])  # Predict friction score
        return np.array(X), np.array(y)
    
    def predict(self, features: np.ndarray, horizon: int = 5):
        """
        Predict future friction scores
        
        Returns:
            dict with predictions, trend, confidence, and risk level
        """
        if not self.is_trained:
            # Try to load pretrained model
            try:
                self.model = joblib.load(self.model_path / "friction_predictor.pkl")
                self.scaler = joblib.load(self.model_path / "friction_scaler.pkl")
                self.is_trained = True
            except:
                # Fallback to simple trend analysis
                return self._simple_trend_prediction(features, horizon)
        
        predictions = []
        current_window = features[-self.window_size:].copy()
        
        for _ in range(horizon):
            # Prepare input
            X = current_window.flatten().reshape(1, -1)
            X_scaled = self.scaler.transform(X)
            
            # Predict next value
            pred = self.model.predict(X_scaled)[0]
            predictions.append(float(pred))
            
            # Update window (shift and append prediction)
            new_row = current_window[-1].copy()
            new_row[0] = pred  # Update friction score
            current_window = np.vstack([current_window[1:], new_row])
        
        # Analyze trend
        current_avg = float(np.mean(features[-5:, 0]))
        predicted_avg = float(np.mean(predictions))
        
        if predicted_avg > current_avg * 1.2:
            trend = "increasing"
            risk_level = "high"
        elif predicted_avg > current_avg * 1.1:
            trend = "rising"
            risk_level = "medium"
        elif predicted_avg < current_avg * 0.9:
            trend = "decreasing"
            risk_level = "low"
        else:
            trend = "stable"
            risk_level = "low"
        
        # Calculate confidence (inverse of prediction variance)
        confidence = float(1.0 / (1.0 + np.std(predictions)))
        
        return {
            "predictions": predictions,
            "trend": trend,
            "confidence": min(confidence, 0.95),
            "risk_level": risk_level,
            "current_avg": current_avg,
            "predicted_avg": predicted_avg
        }
    
    def _simple_trend_prediction(self, features: np.ndarray, horizon: int):
        """Fallback simple trend-based prediction"""
        friction_scores = features[:, 0]
        
        # Linear trend
        x = np.arange(len(friction_scores))
        slope = np.polyfit(x, friction_scores, 1)[0]
        
        # Predict
        last_value = friction_scores[-1]
        predictions = [float(last_value + slope * (i + 1)) for i in range(horizon)]
        
        # Analyze trend
        if slope > 0.1:
            trend = "increasing"
            risk_level = "high"
        elif slope > 0.05:
            trend = "rising"
            risk_level = "medium"
        elif slope < -0.05:
            trend = "decreasing"
            risk_level = "low"
        else:
            trend = "stable"
            risk_level = "low"
        
        return {
            "predictions": predictions,
            "trend": trend,
            "confidence": 0.6,
            "risk_level": risk_level,
            "current_avg": float(np.mean(friction_scores[-5:])),
            "predicted_avg": float(np.mean(predictions))
        }
    
    def load_model(self):
        """Load pretrained model"""
        try:
            self.model = joblib.load(self.model_path / "friction_predictor.pkl")
            self.scaler = joblib.load(self.model_path / "friction_scaler.pkl")
            self.is_trained = True
            return True
        except:
            return False
