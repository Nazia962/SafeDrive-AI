# SafeDrive AI: Academic ML Pipeline Plan

This document outlines the architecture, data strategy, and evaluation pipeline for transitioning SafeDrive AI from a heuristic-based rule engine to a robust, data-driven Machine Learning system. 

## 1. ML Objective
The objective of the model is to accurately classify the driver's cognitive and physical state into predefined safety categories using temporal facial geometry and object detection features, minimizing false negatives (missing a fatigued driver) while maintaining a low false positive rate (annoying an alert driver).

## 2. Input Features
The model will consume the following temporal features engineered by the `TemporalFeatureEngine` and `FacialGeometryEngine`:
- **Continuous numeric**: `currentEar`, `averageEar`, `mar`, `perclos`, `headPitch`, `headYaw`, `headRoll`, `blinkRate`
- **Temporal durations**: `eyeClosedDurationSec`, `yawnDurationSec`
- **Categorical/Boolean**: `facePresent`, `yawnState`
- **Distraction signals**: `phoneConfidence` (from COCO-SSD)

## 3. Target Labels
The dataset will be mapped to the following discrete target classes (predictive states):
1. `ALERT`: Driver is focused, eyes open, head oriented forward.
2. `MILD_FATIGUE`: Elevated blink rate, frequent yawning, minor head drooping.
3. `SEVERE_FATIGUE`: Prolonged eye closure (microsleeps), severe head drooping (nodding off).
4. `DISTRACTED`: Head oriented significantly off-road for prolonged periods, or mobile device detected.

## 4. Dataset Strategy
To train a robust model without fabricating data, the following publicly available academic datasets are proposed for extracting relevant facial features:
- **NTHU Drowsy Driver Dataset (NTHU-DDD)**: Contains various scenarios (bare face, glasses, sunglasses, night/IR) with labeled drowsiness states.
- **YawDD (Yawning Detection Dataset)**: Contains videos of drivers yawning and talking, useful for calibrating the MAR and yawn states.
- **Drowsiness Dataset (by UTA Real-Life Drowsiness Dataset)**: Real-life scenarios of driver fatigue.

*Note: The actual video frames from these datasets will be processed through our existing MediaPipe `FacialGeometryEngine` pipeline to extract the structured numerical features (EAR, MAR, Pitch, Yaw, Roll), which will then form the tabular dataset for training.*

## 5. Dataset Licensing
- **NTHU-DDD**: Typically available for non-commercial research purposes upon request. (Must verify specific terms).
- **YawDD**: Publicly available for academic research.
- **Constraint**: SafeDrive AI must not redistribute the raw video files. Only the extracted numerical landmarks/features may be stored in our repository if permitted, otherwise feature extraction must run locally on the downloaded dataset.

## 6. Subject-Independent Splitting
To prevent the model from memorizing specific driver faces (identity leakage):
- **GroupKFold Split**: Data will be partitioned based on `Subject_ID`. 
- A driver present in the Training set will *never* appear in the Validation or Test sets.
- Recommended split: 70% Train (Subjects A-M), 15% Validation (Subjects N-Q), 15% Test (Subjects R-U).

## 7. Preprocessing
- **Missing Values**: Frames where `facePresent === false` will be dropped or imputed using forward-fill if the gap is < 500ms.
- **Normalization**: Standard scaling (zero mean, unit variance) applied to continuous features (`ear`, `mar`, `pitch`, etc.). The scaler will be fit *only* on the training set and applied to validation/test sets to prevent data leakage.
- **Sequence Construction**: Instead of single-frame classification, data will be grouped into sliding overlapping windows (e.g., 5-second windows at 10Hz = 50 steps per sequence) to capture temporal context.

## 8. Data Augmentation
*Applied only to the Training set during sequence generation:*
- **Noise Injection**: Add minor Gaussian noise to EAR/MAR values to simulate webcam jitter.
- **Temporal Shifting**: Randomly crop the start/end of the sliding windows.
- **Class Balancing**: Use SMOTE or random oversampling on the minority classes (e.g., `SEVERE_FATIGUE`) to prevent bias toward the majority `ALERT` class.

## 9. Model Candidates
Since inference must run entirely in the browser (client-side), lightweight architectures are required:
- **Logistic Regression / SVM**: Baseline linear/non-linear models on flattened temporal windows.
- **Random Forest / XGBoost**: Tabular classifiers running via a WASM-compiled inference engine.
- **1D CNN (Convolutional Neural Network)**: A lightweight TensorFlow.js model applying 1D convolutions over the temporal sequence of features.

## 10. Temporal Model (Future Scope)
Once the baseline frame/window classifiers are established, the architecture will evolve to sequence models capable of maintaining internal state:
- **LSTM (Long Short-Term Memory)** or **GRU (Gated Recurrent Unit)**.
- These will ingest the frame-by-frame `[EAR, MAR, Pitch, Yaw]` vectors directly and output a continuous risk probability, replacing the engineering approximations (like PERCLOS rolling windows) with learned temporal dependencies.
*Do not implement this yet.*

## 11. Evaluation Metrics
- **Accuracy**: Overall correctness (less useful due to class imbalance).
- **Precision**: How many predicted fatigue events were real?
- **Recall**: How many real fatigue events did we successfully detect? (Critical for safety).
- **F1-Score**: Harmonic mean of Precision and Recall.
- **ROC-AUC**: Ability to discriminate between Alert and Fatigued states across different probability thresholds.
- **Confusion Matrix**: Required to analyze misclassifications between adjacent states (e.g., Alert vs. Mild Fatigue).

## 12. Safety-Oriented Evaluation
The model must be penalized heavily for:
- **False Negatives**: Missing a `SEVERE_FATIGUE` event is catastrophic. The decision threshold will be tuned to favor high Recall over Precision.
- **Robustness Checks**: The test set must be stratified to report metrics specifically for:
  - Drivers with glasses/sunglasses.
  - Low lighting conditions.
  - Extreme head angles (profile views).

## 13. Real-Time Evaluation
Before deployment, the TFJS model must be benchmarked in-browser for:
- **Inference Latency**: Must be < 10ms per frame to avoid blocking the main UI thread.
- **Throughput**: Must comfortably support 30 FPS processing.
- **Resource Usage**: Track Memory/Heap usage over a 1-hour session to ensure no memory leaks, and monitor CPU usage to prevent thermal throttling on mobile devices.

## 14. Model Export
- If trained in Python (TensorFlow/Keras or PyTorch), the model will be converted to **TensorFlow.js Layers Model** format (`model.json` + binary weight shards).
- Inference will run using `@tensorflow/tfjs` directly in `LiveMonitoringView`.

## 15. Reproducibility
- **Random Seeds**: Fixed seeds (e.g., `RANDOM_STATE=42`) used for train/test splits and weight initialization.
- **Dataset Versioning**: Store the exact SHA-256 hash of the dataset archive used.
- **Configuration**: Hyperparameters (learning rate, window size, batch size) will be stored in a declarative `config.json`.
- **Pipeline Scripts**: Entire pipeline from raw dataset to exported TFJS model must be executable via a single `train.py` script.

## 16. Academic Integrity
- **No Fabricated Metrics**: All reported accuracies, F1 scores, and ROC curves will be generated exclusively from actual test-set predictions.
- **No Fabricated Benchmarks**: The current `server/ml_engine.ts` will be deprecated, as it currently contains fabricated benchmark results and acts as a heuristic rule engine rather than a trained model.
- **Real Baselines**: We will establish a genuine baseline using the current `riskEngine.ts` heuristics evaluated against the test set, before claiming any ML superiority.
