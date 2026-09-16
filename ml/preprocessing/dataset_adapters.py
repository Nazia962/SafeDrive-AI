"""
SafeDrive AI — Dataset Adapters Specification & Ingestion Interface
Version: 1.0.0

Provides adapter interfaces for NTHU-DDD, YawDD, and RLDD datasets.
Raises clear FileNotFoundError if the raw dataset has not been acquired.
DOES NOT fabricate sample data or invent unverified directory structures.
"""

import os
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import numpy as np

from ml.preprocessing.feature_schema import CANONICAL_FEATURE_ORDER, FEATURE_DEFAULTS


class BaseDatasetAdapter:
    """Abstract Base Class for Academic Drowsiness Dataset Adapters."""
    
    def __init__(self, raw_dir: str):
        self.raw_dir = Path(raw_dir)

    def verify_dataset_exists(self) -> bool:
        """Checks if the dataset exists locally."""
        return self.raw_dir.exists() and len(list(self.raw_dir.glob("*"))) > 0

    def load_dataset(self) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """
        Extracts features, labels, and subject IDs.
        Returns:
            X: np.ndarray of shape (N, 10)
            y: np.ndarray of shape (N,) containing class indices [0..3]
            subject_ids: List[str] of subject identifiers for GroupKFold splitting
        """
        raise NotImplementedError("Subclasses must implement load_dataset()")


class NTHUDDDAdapter(BaseDatasetAdapter):
    """
    Adapter for NTHU Drowsy Driver Dataset.
    Expected structure:
    raw_dir / "Training_Evaluation_Dataset" / "Subject_XX" / ...
    """
    
    def load_dataset(self) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        if not self.verify_dataset_exists():
            raise FileNotFoundError(
                f"NTHU-DDD dataset not found at '{self.raw_dir}'. "
                "Please acquire NTHU-DDD legally from National Tsing Hua University "
                "and place raw files in ml/data/raw/NTHU-DDD/. Refer to ml/data/README.md."
            )
        # Placeholder for actual feature extraction pipeline on real frames
        raise NotImplementedError("Feature extraction requires local raw NTHU-DDD video files.")


class YawDDAdapter(BaseDatasetAdapter):
    """
    Adapter for YawDD (Yawning Detection Dataset).
    Expected structure:
    raw_dir / "Dash" / ...
    raw_dir / "Mirror" / ...
    """

    def load_dataset(self) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        if not self.verify_dataset_exists():
            raise FileNotFoundError(
                f"YawDD dataset not found at '{self.raw_dir}'. "
                "Please download YawDD from University of Ottawa "
                "and place raw files in ml/data/raw/YawDD/. Refer to ml/data/README.md."
            )
        raise NotImplementedError("Feature extraction requires local raw YawDD video files.")


class RLDDAdapter(BaseDatasetAdapter):
    """
    Adapter for UTA Real-Life Drowsiness Dataset (RLDD).
    Expected structure:
    raw_dir / "Participant_1" / ...
    """

    def load_dataset(self) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        if not self.verify_dataset_exists():
            raise FileNotFoundError(
                f"RLDD dataset not found at '{self.raw_dir}'. "
                "Please request RLDD from UTA "
                "and place raw files in ml/data/raw/RLDD/. Refer to ml/data/README.md."
            )
        raise NotImplementedError("Feature extraction requires local raw RLDD video files.")


def get_dataset_adapter(dataset_name: str, raw_dir: str) -> BaseDatasetAdapter:
    """Factory function to retrieve the appropriate dataset adapter."""
    adapters = {
        "NTHU-DDD": NTHUDDDAdapter,
        "YawDD": YawDDAdapter,
        "RLDD": RLDDAdapter
    }
    if dataset_name not in adapters:
        raise ValueError(f"Unknown dataset '{dataset_name}'. Supported datasets: {list(adapters.keys())}")
    return adapters[dataset_name](raw_dir)
