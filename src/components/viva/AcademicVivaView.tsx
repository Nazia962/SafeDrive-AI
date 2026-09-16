/**
 * SafeDrive AI - B.Tech Capstone & Academic Viva Defense Hub
 * Comprehensive Project Assessment, Architecture, 4-Member Task Matrix,
 * Mathematical Formulations, ML Benchmarks, and Evaluation Roadmap
 */

import React, { useState } from 'react';
import {
  GraduationCap,
  Users,
  Code2,
  Cpu,
  Calculator,
  CheckCircle2,
  FileText,
  Award,
  BookOpen,
  Layers,
  ArrowRight,
  Database,
  ShieldAlert,
  Download,
  FileJson
} from 'lucide-react';
import type { MLBenchmark } from '../../types';

interface AcademicVivaViewProps {
  benchmarks: MLBenchmark[];
}

export const AcademicVivaView: React.FC<AcademicVivaViewProps> = ({ benchmarks }) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'team' | 'math' | 'benchmarks' | 'testing' | 'roadmap'>('architecture');

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>B.Tech Final Year Capstone Project Defense</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Academic Research & Viva Evaluation Hub
          </h1>
          <p className="mt-1 text-xs text-gray-600 max-w-2xl">
            Formal architectural assessment, biometric mathematical formulations, 4-member task distribution,
            model benchmarks, and academic defense documentation.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            Project Stage: Defense Ready
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'architecture', label: '1. Architecture & Pipeline', icon: Layers },
          { id: 'team', label: '2. 4-Member Team Distribution', icon: Users },
          { id: 'math', label: '3. Mathematical Formulations', icon: Calculator },
          { id: 'benchmarks', label: '4. Model Benchmark Suite', icon: Cpu },
          { id: 'testing', label: '5. Testing & Validation Plan', icon: CheckCircle2 },
          { id: 'roadmap', label: '6. Development Roadmap', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Architecture & Pipeline */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
            <h2 className="text-base font-bold text-gray-900 mb-2">End-to-End System Architecture</h2>
            <p className="text-xs text-gray-600 leading-relaxed mb-6">
              SafeDrive AI is structured as a full-stack, edge-first distributed pipeline. Real-time video frames
              from an in-cabin RGB camera are processed client-side at ~30 FPS using WebGL-accelerated neural networks,
              ensuring 100% driver biometric privacy without video streaming to remote servers.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="font-bold text-blue-900 uppercase tracking-wider mb-1">Layer 1: Edge Acquisition</div>
                <p className="text-blue-800 leading-relaxed">
                  WebRTC / HTML5 MediaDevices API capturing 640x480 @ 30 FPS. Canvas rendering pipeline with hardware acceleration.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                <div className="font-bold text-purple-900 uppercase tracking-wider mb-1">Layer 2: Vision & TF.js</div>
                <p className="text-purple-800 leading-relaxed">
                  Dual-stream computer vision: 468-point 3D facial landmark mesh + MobileNet v2 COCO-SSD object detection for mobile phones.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="font-bold text-amber-900 uppercase tracking-wider mb-1">Layer 3: Risk Fusion</div>
                <p className="text-amber-800 leading-relaxed">
                  Mathematical EAR, MAR, PERCLOS (P80), and head orientation combined with temporal persistence filters to calculate real-time Safety Score (0-100).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="font-bold text-emerald-900 uppercase tracking-wider mb-1">Layer 4: Telematics & Alerts</div>
                <p className="text-emerald-800 leading-relaxed">
                  Web Audio acoustic synthesis, Web Speech voice warnings, and Express/TypeScript persistence layer with atomic JSON database.
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-200">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                Real Functionality vs Simulated Distinctions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
                <div className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-gray-900">Real in this App:</strong> Real in-app webcam stream, real 468-point mesh geometry, real EAR/MAR calculation, real TF.js COCO-SSD phone detection, real acoustic & voice alerts, real database persistence.
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-gray-900">Simulated / Demonstration:</strong> The "Academic Simulation Suite" allows evaluators to simulate fatigue states (microsleep, severe fatigue, yawns) on demand for immediate grading without waiting 2 hours for natural driver drowsiness.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 4-Member Team Distribution */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
            <h2 className="text-base font-bold text-gray-900 mb-2">Team-Wise Task Distribution (4 Members)</h2>
            <p className="text-xs text-gray-600 mb-6">
              Standard B.Tech Capstone division of responsibilities across computer vision, machine learning, safety algorithms, and full-stack software engineering.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Member 1 */}
              <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">
                    Member 1: Lead Computer Vision Engineer
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Facial Landmark Pipeline & Eye Dynamics</h3>
                <ul className="space-y-2 text-xs text-gray-700">
                  <li>• Implementation of 468-point 3D facial landmark mesh rendering on HTML5 Canvas.</li>
                  <li>• Eye Aspect Ratio (EAR) mathematical computation using Euclidean landmark distances.</li>
                  <li>• Mouth Aspect Ratio (MAR) formulation for yawn event detection.</li>
                  <li>• Head pose estimation (Yaw, Pitch, Roll) via Perspective-n-Point (PnP) 3D coordinate mapping.</li>
                  <li>• Camera permission handling, error states, and WebGL hardware acceleration.</li>
                </ul>
              </div>

              {/* Member 2 */}
              <div className="p-5 rounded-2xl border border-purple-200 bg-purple-50/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-600 text-white">
                    Member 2: Deep Learning & Object Detection
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Phone Distraction & CNN-LSTM Modeling</h3>
                <ul className="space-y-2 text-xs text-gray-700">
                  <li>• MobileNet v2 COCO-SSD object detection pipeline in TensorFlow.js.</li>
                  <li>• Driver visual cone bounding box filtering (restricting detection to driver quadrant).</li>
                  <li>• Temporal confirmation buffer (5-frame persistence) to eliminate phone false positives.</li>
                  <li>• CNN-LSTM sequential model research for multi-frame temporal fatigue classification.</li>
                  <li>• Benchmark evaluation suite comparing Random Forest, XGBoost, and MobileNet.</li>
                </ul>
              </div>

              {/* Member 3 */}
              <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-600 text-white">
                    Member 3: Multimodal Risk Engine & Audio
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Risk Fusion, PERCLOS & Acoustic Warnings</h3>
                <ul className="space-y-2 text-xs text-gray-700">
                  <li>• PERCLOS (P80 standard) rolling 60-second window fatigue accumulation algorithm.</li>
                  <li>• Multimodal risk fusion matrix combining biometrics into a unified 0-100 Safety Score.</li>
                  <li>• Web Audio API dual-tone synthesized acoustic sirens (980Hz/780Hz square waves).</li>
                  <li>• Web Speech API synthesized spoken voice warnings with anti-spam cooldown logic.</li>
                  <li>• Configurable driver safety thresholds and sensitivity calibration.</li>
                </ul>
              </div>

              {/* Member 4 */}
              <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">
                    Member 4: Full-Stack Systems & Telematics
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Backend Architecture, Database & UI</h3>
                <ul className="space-y-2 text-xs text-gray-700">
                  <li>• Express.js REST API server with typed schemas and request validation.</li>
                  <li>• File-backed atomic JSON database with concurrency locks and crash recovery.</li>
                  <li>• Real-time trip logging, telemetry appending, and driver profile management.</li>
                  <li>• Responsive telemetry dashboards, incident history inspection, and Pure SVG analytics.</li>
                  <li>• Automated notification center and system settings synchronization.</li>
                </ul>
                <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center space-x-2">
                  <a
                    href="/safedrive.json"
                    download="safedrive.json"
                    id="viva-download-db-btn"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-2xs transition-colors"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Live Database (safedrive.json)</span>
                  </a>
                  <a
                    href="/safadrive.json"
                    download="safadrive.json"
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium hover:bg-emerald-100"
                    title="Alternative spelling download link"
                  >
                    <span>(as safadrive.json)</span>
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Mathematical Formulations */}
      {activeTab === 'math' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-gray-900">Biometric Mathematical Formulations</h2>
              <p className="text-xs text-gray-600 mt-1">
                Formal mathematical equations used for real-time inference in SafeDrive AI.
              </p>
            </div>

            {/* Formula 1: EAR */}
            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-900">1. Eye Aspect Ratio (EAR)</h3>
                <span className="text-xs font-mono font-bold text-blue-600">Soukupová & Čech (2016)</span>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Calculates ratio of vertical eyelid distances to horizontal eye length using 6 facial landmarks per eye:
              </p>
              <div className="p-4 rounded-xl bg-white border border-gray-300 font-mono text-xs text-center text-gray-900 font-bold overflow-x-auto">
                EAR = ( ||p2 - p6|| + ||p3 - p5|| ) / ( 2 · ||p1 - p4|| )
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                Normal open eye: EAR ≈ 0.28 – 0.38. Closed eye: EAR &lt; 0.22. Prolonged closure (&gt; 1.2s) triggers microsleep classification.
              </p>
            </div>

            {/* Formula 2: MAR */}
            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-900">2. Mouth Aspect Ratio (MAR)</h3>
                <span className="text-xs font-mono font-bold text-amber-600">Yawn Dynamics</span>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Calculates vertical mouth aperture relative to lip corner width:
              </p>
              <div className="p-4 rounded-xl bg-white border border-gray-300 font-mono text-xs text-center text-gray-900 font-bold overflow-x-auto">
                MAR = ( ||m2 - m8|| + ||m3 - m7|| + ||m4 - m6|| ) / ( 3 · ||m1 - m5|| )
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                Normal speech/closed mouth: MAR ≈ 0.15 – 0.35. Yawning threshold: MAR &gt; 0.58 sustained for &gt; 1.8 seconds.
              </p>
            </div>

            {/* Formula 3: PERCLOS */}
            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-900">3. PERCLOS (P80 Standard)</h3>
                <span className="text-xs font-mono font-bold text-purple-600">NHTSA Standard</span>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Percentage of time the driver's eyes are at least 80% closed within a rolling 60-second time window (t_w):
              </p>
              <div className="p-4 rounded-xl bg-white border border-gray-300 font-mono text-xs text-center text-gray-900 font-bold overflow-x-auto">
                PERCLOS = ( ∑ t_closed ) / t_window × 100%
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                PERCLOS &lt; 15%: Normal wakefulness. 15% – 25%: Borderline fatigue. &gt; 30%: High accident risk.
              </p>
            </div>

            {/* Formula 4: Multimodal Risk Score */}
            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-900">4. Multimodal Fusion Function</h3>
                <span className="text-xs font-mono font-bold text-emerald-600">SafeDrive Core</span>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Calculates composite real-time risk score R(t) ∈ [0, 100]:
              </p>
              <div className="p-4 rounded-xl bg-white border border-gray-300 font-mono text-xs text-center text-gray-900 font-bold overflow-x-auto">
                R(t) = w_fatigue · (0.6·F_EAR + 0.4·F_PERCLOS) + w_yawn · F_MAR + w_pose · F_POSE + w_phone · F_PHONE
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                With weights: w_fatigue = 0.40, w_phone = 0.35, w_pose = 0.15, w_yawn = 0.10. Safety Score = 100 - R(t).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Model Benchmark Suite */}
      {activeTab === 'benchmarks' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
            <h2 className="text-base font-bold text-gray-900 mb-2">Academic Model Benchmark Suite</h2>
            <p className="text-xs text-gray-600 mb-6">
              Comparative analysis of classification models evaluated on the NTHU Driver Drowsiness and State Farm Distracted Driving datasets.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Architecture</th>
                    <th className="py-3 px-4">Accuracy</th>
                    <th className="py-3 px-4">Precision</th>
                    <th className="py-3 px-4">Recall</th>
                    <th className="py-3 px-4">F1 Score</th>
                    <th className="py-3 px-4">Inference Latency</th>
                    <th className="py-3 px-4">Memory Footprint</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {benchmarks.map((m, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-bold text-gray-900">{m.modelName}</td>
                      <td className="py-3 px-4 text-emerald-600 font-semibold">{m.accuracy}%</td>
                      <td className="py-3 px-4 text-gray-700">{m.precision}%</td>
                      <td className="py-3 px-4 text-gray-700">{m.recall}%</td>
                      <td className="py-3 px-4 text-blue-600 font-bold">{m.f1Score}</td>
                      <td className="py-3 px-4 font-mono">{m.latencyMs} ms</td>
                      <td className="py-3 px-4 font-mono text-gray-500">{m.modelSizeMb} MB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
              <strong>Academic Defense Finding:</strong> While CNN + Bi-LSTM achieves the highest F1-score (0.942),
              MobileNet v2 + EAR Geometry offers the optimal trade-off for in-cabin edge deployment with only 26ms latency and a 14MB footprint.
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Testing & Validation Plan */}
      {activeTab === 'testing' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
            <h2 className="text-base font-bold text-gray-900 mb-2">Testing & Validation Protocol</h2>
            <p className="text-xs text-gray-600 mb-6">
              Multi-tiered validation framework covering unit tests, integration stress testing, and real-world edge cases.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div className="font-bold text-gray-900 mb-2 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>1. Biometric Unit Tests</span>
                </div>
                <ul className="space-y-1.5 text-gray-600">
                  <li>• EAR calculation against pre-labeled open/closed eye synthetic image matrix.</li>
                  <li>• MAR response to speech vs extreme yawning mouth shapes.</li>
                  <li>• PnP head pose accuracy under roll angles (-40° to +40°).</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div className="font-bold text-gray-900 mb-2 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  <span>2. False Positive Resistance</span>
                </div>
                <ul className="space-y-1.5 text-gray-600">
                  <li>• Normal rapid blinking (&lt; 0.3s) must NOT trigger fatigue alerts.</li>
                  <li>• Driver singing or talking must NOT trigger false yawning alerts.</li>
                  <li>• Driver holding coffee cup or wallet must NOT trigger phone alert.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div className="font-bold text-gray-900 mb-2 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>3. Real-Time Performance</span>
                </div>
                <ul className="space-y-1.5 text-gray-600">
                  <li>• Consistent frame rate &gt;= 25 FPS maintained on standard consumer webcams.</li>
                  <li>• Alert latency from event onset to audible alarm &lt; 350 ms.</li>
                  <li>• Zero memory leaks over continuous 2-hour monitoring sessions.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Development Roadmap */}
      {activeTab === 'roadmap' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
            <h2 className="text-base font-bold text-gray-900 mb-2">Step-by-Step Development Roadmap</h2>
            <p className="text-xs text-gray-600 mb-6">
              Lifecycle of SafeDrive AI from conceptual research to operational deployment.
            </p>

            <div className="space-y-4">
              {[
                { phase: 'Phase 1: Literature Review & Problem Formulation', status: 'Completed', desc: 'Analyzed NHTSA fatigue statistics, reviewed EAR/MAR papers, selected NTHU & State Farm datasets.' },
                { phase: 'Phase 2: Edge Vision Pipeline Prototyping', status: 'Completed', desc: 'Constructed 468-point mesh geometry, calculated real-time EAR, and calibrated microsleep timing.' },
                { phase: 'Phase 3: Deep Object Detection Integration', status: 'Completed', desc: 'Implemented TensorFlow.js COCO-SSD for in-cabin mobile phone detection with temporal confirmation.' },
                { phase: 'Phase 4: Multimodal Risk Fusion & Acoustic Engine', status: 'Completed', desc: 'Designed multimodal fusion algorithm, synthetic Web Audio dual-tone sirens, and Web Speech.' },
                { phase: 'Phase 5: Telematics Backend & Trip Database', status: 'Completed', desc: 'Built full-stack Express persistence layer with atomic file storage, trip recording, and analytics.' },
                { phase: 'Phase 6: Academic Defense & Benchmarking', status: 'Completed', desc: 'Authored comparative ML benchmark suite, viva defense documentation, and simulated stress suite.' }
              ].map((step, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-gray-900">{step.phase}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {step.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
