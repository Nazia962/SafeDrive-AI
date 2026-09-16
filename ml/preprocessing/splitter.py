"""
SafeDrive AI — Subject-Independent Dataset Splitter
Version: 1.0.0

Implements driver-independent train/val/test partitioning using GroupKFold.

Academic Justification:
Standard random train/test splitting causes severe identity leakage: consecutive video
frames or facial samples from the same driver appear in both training and test sets.
The model overfits to specific individuals' baseline facial geometry (e.g. naturally small eyes
or baseline mouth width) rather than learning actual temporal fatigue dynamics.
Subject-independent splitting guarantees that a subject in the training set NEVER
appears in the validation or test set.
"""

from typing import Tuple, List, Dict
import numpy as np
from sklearn.model_selection import GroupKFold, GroupShuffleSplit


class SubjectIndependentSplitter:
    """
    Performs GroupKFold splitting by subject ID.
    """

    def __init__(self, n_splits: int = 5, random_seed: int = 42):
        self.n_splits = n_splits
        self.random_seed = random_seed

    def split(
        self, X: np.ndarray, y: np.ndarray, groups: List[str]
    ) -> List[Tuple[np.ndarray, np.ndarray]]:
        """
        Generates indices to split data into training and test sets based on subject groups.
        
        Args:
            X: Feature matrix of shape (N, 10)
            y: Target array of shape (N,)
            groups: Subject ID string for each sample of shape (N,)
            
        Returns:
            List of (train_idx, test_idx) index arrays.
        """
        groups_arr = np.array(groups)
        gkf = GroupKFold(n_splits=self.n_splits)
        splits = []
        for train_idx, test_idx in gkf.split(X, y, groups=groups_arr):
            # Verify no subject leakage
            train_subjects = set(groups_arr[train_idx])
            test_subjects = set(groups_arr[test_idx])
            assert train_subjects.isdisjoint(test_subjects), "Subject leakage detected in GroupKFold split!"
            splits.append((train_idx, test_idx))
        return splits

    def train_val_test_split(
        self, X: np.ndarray, y: np.ndarray, groups: List[str], val_ratio: float = 0.15, test_ratio: float = 0.15
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Performs a 3-way subject-independent split into Train, Validation, and Test sets.
        """
        groups_arr = np.array(groups)
        
        # 1. First split out the Test set
        gss_test = GroupShuffleSplit(n_splits=1, test_size=test_ratio, random_state=self.random_seed)
        train_val_idx, test_idx = next(gss_test.split(X, y, groups=groups_arr))
        
        # 2. Second split out Val from Train
        adjusted_val_ratio = val_ratio / (1.0 - test_ratio)
        gss_val = GroupShuffleSplit(n_splits=1, test_size=adjusted_val_ratio, random_state=self.random_seed)
        train_sub_idx, val_sub_idx = next(gss_val.split(X[train_val_idx], y[train_val_idx], groups=groups_arr[train_val_idx]))
        
        train_idx = train_val_idx[train_sub_idx]
        val_idx = train_val_idx[val_sub_idx]
        
        # Assert complete disjointness
        train_subs = set(groups_arr[train_idx])
        val_subs = set(groups_arr[val_idx])
        test_subs = set(groups_arr[test_idx])
        
        assert train_subs.isdisjoint(val_subs), "Subject leakage between Train and Val sets!"
        assert train_subs.isdisjoint(test_subs), "Subject leakage between Train and Test sets!"
        assert val_subs.isdisjoint(test_subs), "Subject leakage between Val and Test sets!"
        
        return (
            X[train_idx], y[train_idx],
            X[val_idx], y[val_idx],
            X[test_idx], y[test_idx]
        )
