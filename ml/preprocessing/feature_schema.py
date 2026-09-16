"""
SafeDrive AI — Canonical Feature Schema Definition
Version: 1.0.0

This module defines the 10-dimensional canonical feature vector used across
training, evaluation, model export, and runtime inference.
"""

from typing import Dict, List, Any
import numpy as np

# Canonical feature list in strict ordering
CANONICAL_FEATURE_ORDER: List[str] = [
    "current_ear",
    "mar",
    "eye_closed_duration_sec",
    "perclos",
    "blink_rate",
    "yawn_duration_sec",
    "head_pitch",
    "head_yaw",
    "head_roll",
    "phone_confidence"
]

# Standard default values when face detection fails or feature is missing
FEATURE_DEFAULTS: Dict[str, float] = {
    "current_ear": 0.32,
    "mar": 0.20,
    "eye_closed_duration_sec": 0.0,
    "perclos": 0.0,
    "blink_rate": 15.0,
    "yawn_duration_sec": 0.0,
    "head_pitch": 0.0,
    "head_yaw": 0.0,
    "head_roll": 0.0,
    "phone_confidence": 0.0
}

# Physical bounds for validation & clipping
FEATURE_BOUNDS: Dict[str, tuple] = {
    "current_ear": (0.0, 1.0),
    "mar": (0.0, 2.0),
    "eye_closed_duration_sec": (0.0, 60.0),
    "perclos": (0.0, 100.0),
    "blink_rate": (0.0, 120.0),
    "yawn_duration_sec": (0.0, 30.0),
    "head_pitch": (-90.0, 90.0),
    "head_yaw": (-90.0, 90.0),
    "head_roll": (-90.0, 90.0),
    "phone_confidence": (0.0, 1.0)
}

# Class label mapping
CLASS_MAP: Dict[int, str] = {
    0: "ALERT",
    1: "MILD_FATIGUE",
    2: "SEVERE_FATIGUE",
    3: "DISTRACTED"
}

CLASS_NAME_TO_INDEX: Dict[str, int] = {v: k for k, v in CLASS_MAP.items()}


def dict_to_feature_vector(data: Dict[str, Any]) -> np.ndarray:
    """
    Converts an input dictionary of feature values into a canonical 10D NumPy array (float32).
    Applies default imputation for missing keys and boundary clipping.
    """
    vector = np.zeros(len(CANONICAL_FEATURE_ORDER), dtype=np.float32)
    
    for i, feature_name in enumerate(CANONICAL_FEATURE_ORDER):
        val = data.get(feature_name, FEATURE_DEFAULTS[feature_name])
        if val is None or np.isnan(val):
            val = FEATURE_DEFAULTS[feature_name]
        
        # Clip to bounds
        min_b, max_b = FEATURE_BOUNDS[feature_name]
        val = float(np.clip(val, min_b, max_b))
        vector[i] = val
        
    return vector


def validate_feature_vector(vector: np.ndarray) -> bool:
    """
    Validates that a feature vector is 1D with shape (10,) or 2D with shape (N, 10)
    and contains no NaN or Infinite values.
    """
    if not isinstance(vector, np.ndarray):
        return False
    if vector.ndim == 1 and vector.shape[0] != len(CANONICAL_FEATURE_ORDER):
        return False
    if vector.ndim == 2 and vector.shape[1] != len(CANONICAL_FEATURE_ORDER):
        return False
    if np.isnan(vector).any() or np.isinf(vector).any():
        return False
    return True
