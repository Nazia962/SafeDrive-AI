"""
SafeDrive AI — Feature Preprocessor & Standardizer
Version: 1.0.0

Handles scaling, missing value imputation, and sequence construction.
Ensures zero data leakage by fitting scaling parameters strictly on training splits.
"""

from typing import Dict, Tuple, Optional
import numpy as np
from sklearn.preprocessing import StandardScaler

from ml.preprocessing.feature_schema import (
    CANONICAL_FEATURE_ORDER,
    FEATURE_DEFAULTS,
    dict_to_feature_vector,
    validate_feature_vector
)


class FeaturePreprocessor:
    """
    Normalizes canonical 10D feature vectors using StandardScaler.
    Fit MUST be called only on the training set.
    """

    def __init__(self):
        self.scaler = StandardScaler()
        self.is_fitted = False

    def fit(self, X_train: np.ndarray) -> "FeaturePreprocessor":
        """Fits StandardScaler strictly on training samples."""
        assert validate_feature_vector(X_train), "Invalid X_train input array"
        self.scaler.fit(X_train)
        self.is_fitted = True
        return self

    def transform(self, X: np.ndarray) -> np.ndarray:
        """Transforms input array using fitted scaler."""
        if not self.is_fitted:
            raise RuntimeError("Preprocessor must be fitted on training data before calling transform().")
        assert validate_feature_vector(X), "Invalid X input array"
        return self.scaler.transform(X).astype(np.float32)

    def fit_transform(self, X_train: np.ndarray) -> np.ndarray:
        """Fits scaler on training set and transforms it in one step."""
        return self.fit(X_train).transform(X_train)

    def get_normalization_params(self) -> Dict[str, list]:
        """
        Exports mean and scale (std) arrays for client-side JavaScript / ONNX runtime.
        """
        if not self.is_fitted:
            raise RuntimeError("Scaler is not fitted yet.")
        return {
            "feature_order": CANONICAL_FEATURE_ORDER,
            "mean": self.scaler.mean_.tolist(),
            "std": np.sqrt(self.scaler.var_).tolist()
        }
