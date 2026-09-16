"""
SafeDrive AI — Baseline Multi-Layer Perceptron (MLP) Classifier
Version: 1.0.0

A lightweight PyTorch neural network for multi-class driver state classification.
Processes canonical 10-dimensional feature vectors into 4 driver state probabilities:
[ALERT, MILD_FATIGUE, SEVERE_FATIGUE, DISTRACTED]
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class BaselineMLP(nn.Module):
    """
    Lightweight Tabular MLP Classifier for real-time browser inference.
    """

    def __init__(self, input_dim: int = 10, num_classes: int = 4, hidden_dims: list = None, dropout_rate: float = 0.2):
        super(BaselineMLP, self).__init__()
        
        if hidden_dims is None:
            hidden_dims = [64, 32]

        layers = []
        in_dim = input_dim

        for h_dim in hidden_dims:
            layers.append(nn.Linear(in_dim, h_dim))
            layers.append(nn.BatchNorm1d(h_dim))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(dropout_rate))
            in_dim = h_dim

        layers.append(nn.Linear(in_dim, num_classes))
        self.network = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Returns unnormalized logits for CrossEntropyLoss.
        Shape: (batch_size, num_classes)
        """
        return self.network(x)

    def predict_proba(self, x: torch.Tensor) -> torch.Tensor:
        """
        Returns class probability distributions (Softmax).
        Shape: (batch_size, num_classes)
        """
        self.eval()
        with torch.no_grad():
            logits = self.forward(x)
            return F.softmax(logits, dim=-1)
