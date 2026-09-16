import { TemporalFeatureEngine } from './src/services/vision/temporalEngine';
import { riskEngine } from './src/services/riskEngine';

const engine = new TemporalFeatureEngine({
  earClosureThreshold: 0.22,
  marYawnThreshold: 0.58,
  minYawnDurationMs: 800,
  maxBlinkDurationMs: 400
});

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failCount++;
  }
}

function simFrames(engine: TemporalFeatureEngine, ear: number, mar: number, durationMs: number, startT: number) {
  let t = startT;
  let state;
  for (let step = 0; step < durationMs; step += 33) { // 30 FPS ~ 33ms
    state = engine.processObservation(ear, mar, 0, 0, 0, t);
    t += 33;
  }
  return { state, nextT: t };
}

console.log('--- Temporal Feature Engine Tests ---');

let t = 1000;
engine.reset();
// Baseline open
let res = simFrames(engine, 0.35, 0.2, 500, t);
t = res.nextT;

// 1. Normal Blink
res = simFrames(engine, 0.10, 0.2, 100, t); // closed ~100ms
t = res.nextT;
res = simFrames(engine, 0.35, 0.2, 200, t); // open
t = res.nextT;
assert(res.state.blinkCount === 1, 'Normal blink correctly registered');

// 2. Prolonged Eye Closure
res = simFrames(engine, 0.10, 0.2, 1500, t); // closed 1.5s
t = res.nextT;
assert(res.state.eyeClosedDurationSec >= 1.4, 'Prolonged eye closure tracks duration correctly');
res = simFrames(engine, 0.35, 0.2, 500, t); // open
t = res.nextT;
assert(res.state.blinkCount === 1, 'Prolonged closure does NOT count as a blink');

// 3. Repeated Blinking (PERCLOS accumulation)
for (let i = 0; i < 10; i++) {
  res = simFrames(engine, 0.10, 0.2, 150, t); // closed 150ms
  t = res.nextT;
  res = simFrames(engine, 0.35, 0.2, 350, t); // open 350ms
  t = res.nextT;
}
assert(res.state.blinkCount > 5, 'Repeated blinks registered');
assert(res.state.perclos > 0, 'PERCLOS accumulates correctly');

// 4. Normal Mouth Movement (Not Yawn)
res = simFrames(engine, 0.35, 0.65, 300, t); // open mouth <800ms
t = res.nextT;
res = simFrames(engine, 0.35, 0.20, 300, t); // close mouth
t = res.nextT;
assert(res.state.yawnCount === 0, 'Short mouth opening does NOT count as yawn');

// 5. Sustained Yawn & Repeated Yawn Prevention
res = simFrames(engine, 0.35, 0.65, 1200, t); // yawn 1.2s
t = res.nextT;
assert(res.state.yawnState === true, 'Sustained opening triggers yawn state');
assert(res.state.yawnCount === 1, 'Yawn count incremented');
res = simFrames(engine, 0.35, 0.65, 500, t); // still yawning
t = res.nextT;
assert(res.state.yawnCount === 1, 'Double counting of continuous yawn prevented');
res = simFrames(engine, 0.35, 0.20, 500, t); // close mouth
t = res.nextT;
assert(res.state.yawnState === false, 'Yawn state correctly recovered');

// 6. No-Face Period / Invalid Landmarks
const state9 = engine.handleNoFace(t);
assert(state9.facePresent === false, 'facePresent becomes false during no-face');
assert(state9.eyeClosedDurationSec === 0, 'eyeClosedDurationSec safely zeroes on no-face');

// 7. Head Pose Smoothing
engine.processObservation(0.35, 0.2, 50, 0, 0, t);
t += 33;
const state10 = engine.processObservation(0.35, 0.2, 50, 0, 0, t);
assert(state10.headPitch > 0 && state10.headPitch < 50, 'Head pose smoothed correctly (no instantaneous jumps)');

// 8. Risk Engine Integration
console.log('\n--- Risk Engine Integration Tests ---');
riskEngine.reset();
const risk1 = riskEngine.evaluateRisk({
  ear: 0.35, mar: 0.2, perclos: 5, pitch: 0, yaw: 0, roll: 0,
  phoneDetected: false, phoneConfidence: 0, phoneConfirmed: false,
  roadAttention: 'FOCUSED_ON_ROAD',
  earThreshold: 0.22, marThreshold: 0.58, perclosThreshold: 30,
  eyeClosedDurationSec: 1.5, // Prolonged closure!
  yawnState: false, yawnDurationSec: 0
});
assert(risk1.contributingFactors.some(f => f.includes('Prolonged eye closure')), 'Risk engine explains prolonged eye closure');
assert(risk1.drowsinessScore > 50, 'Risk engine scores prolonged closure highly');

const risk2 = riskEngine.evaluateRisk({
  ear: 0.35, mar: 0.65, perclos: 5, pitch: 0, yaw: 0, roll: 0,
  phoneDetected: false, phoneConfidence: 0, phoneConfirmed: false,
  roadAttention: 'FOCUSED_ON_ROAD',
  earThreshold: 0.22, marThreshold: 0.58, perclosThreshold: 30,
  eyeClosedDurationSec: 0,
  yawnState: true, yawnDurationSec: 1.0 // Sustained yawn!
});
assert(risk2.contributingFactors.some(f => f.includes('Sustained yawning')), 'Risk engine explains sustained yawning');

// 9. ONNX & ML Fusion Integration Test
const risk3 = riskEngine.evaluateRisk({
  ear: 0.35, mar: 0.2, perclos: 5, pitch: 0, yaw: 0, roll: 0,
  phoneDetected: false, phoneConfidence: 0, phoneConfirmed: false,
  roadAttention: 'FOCUSED_ON_ROAD',
  earThreshold: 0.22, marThreshold: 0.58, perclosThreshold: 30,
  eyeClosedDurationSec: 0,
  mlPrediction: {
    isMLModelActive: true,
    predictedClass: 'SEVERE_FATIGUE',
    confidence: 0.88,
    probabilities: [0.05, 0.07, 0.88, 0.0]
  }
});
assert(risk3.isMLModelActive === true, 'ML model active flag correctly propagated');
assert(risk3.contributingFactors.some(f => f.includes('ML Model: High Severe Fatigue Probability')), 'ML model evidence correctly fused into risk calculation');

console.log(`\nTests Completed: ${passCount} Passed, ${failCount} Failed.`);
if (failCount > 0) process.exit(1);
