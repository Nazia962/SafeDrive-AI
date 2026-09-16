/**
 * SafeDrive AI - Acoustic & Spoken Voice Alert Synthesizer
 * Web Audio API (Dual-tone frequency oscillator) + Web Speech API
 */

class AudioAlertService {
  private audioCtx: AudioContext | null = null;
  private lastAlertTime: number = 0;
  private isMuted: boolean = false;
  private volume: number = 0.8;
  private cooldownMs: number = 4000;

  constructor() {
    // Lazy AudioContext initialization on first user interaction
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public setVolume(volPercent: number) {
    this.volume = Math.max(0, Math.min(1, volPercent / 100));
  }

  public setCooldown(seconds: number) {
    this.cooldownMs = seconds * 1000;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public canTrigger(): boolean {
    return Date.now() - this.lastAlertTime >= this.cooldownMs;
  }

  /**
   * Plays a dual-tone synthetic acoustic warning chime
   */
  public playAcousticAlert(type: 'DROWSINESS' | 'PHONE' | 'CRITICAL') {
    if (this.isMuted) return;
    const now = Date.now();
    if (now - this.lastAlertTime < this.cooldownMs) {
      return; // Respect cooldown
    }
    this.lastAlertTime = now;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);
      masterGain.connect(ctx.destination);

      if (type === 'PHONE') {
        // High alert rapid dual pulse: 980Hz and 780Hz
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(980, ctx.currentTime);
        osc2.frequency.setValueAtTime(780, ctx.currentTime);

        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(0.15, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc1.connect(gain1);
        osc2.connect(gain1);
        gain1.connect(masterGain);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.35);
        osc2.stop(ctx.currentTime + 0.35);

        // Second pulse after 180ms
        setTimeout(() => {
          if (!this.audioCtx) return;
          const osc3 = this.audioCtx.createOscillator();
          osc3.type = 'sawtooth';
          osc3.frequency.setValueAtTime(1180, this.audioCtx.currentTime);
          const g3 = this.audioCtx.createGain();
          g3.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
          g3.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);
          osc3.connect(g3);
          g3.connect(masterGain);
          osc3.start(this.audioCtx.currentTime);
          osc3.stop(this.audioCtx.currentTime + 0.35);
        }, 180);
      } else if (type === 'CRITICAL') {
        // Siren warble: 800Hz to 1200Hz sweep
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.3);
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.6);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.7);
      } else {
        // Drowsiness: mellow 587Hz (D5) -> 880Hz (A5) alert chime
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.15);

        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(0.25, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

        osc1.connect(gain1);
        gain1.connect(masterGain);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.6);
      }
    } catch (err) {
      console.warn('[AudioAlert] Web Audio playback failed:', err);
    }
  }

  /**
   * Spoken voice alert using Web Speech API
   */
  public speakWarning(text: string) {
    if (this.isMuted) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = this.volume;

      // Select natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const engVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
      if (engVoice) {
        utterance.voice = engVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[AudioAlert] SpeechSynthesis failed:', err);
    }
  }
}

export const audioAlerts = new AudioAlertService();
