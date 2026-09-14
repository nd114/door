/**
 * Audio and Haptics Synthesis Engine for Door
 * Uses Web Audio API for zero-latency, realistic acoustic feedback
 * and navigator.vibrate for mobile physical feedback.
 * Features Web Speech API integration so audio drop-ins & whispers are heard aloud on laptops.
 */

import { KnockHapticPattern, ActivePttHapticPattern } from '../types';

class SoundHapticsEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private speechSynthEnabled: boolean = true;
  private knockPattern: KnockHapticPattern = 'standard';
  private transmissionPattern: ActivePttHapticPattern = 'tick';

  public setSettings(knock: KnockHapticPattern, transmission: ActivePttHapticPattern, speechEnabled: boolean) {
    this.knockPattern = knock;
    this.transmissionPattern = transmission;
    this.speechSynthEnabled = speechEnabled;
  }

  public unlockAudio() {
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch (e) {
      console.warn('Audio unlock warning:', e);
    }
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
  }

  public triggerHaptic(pattern: number | number[] = 15) {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Vibration not permitted or supported
    }
  }

  /**
   * Spoken Voice has been completely disabled in favor of real microphone audio recordings.
   * Kept as a safe no-op for backward compatibility so no synthetic robot voice ever speaks.
   */
  public speakVoice(_text: string, _friendName?: string) {
    // Disabled: Never play synthetic TTS robot speech. Door uses authentic recorded microphone voice.
    return;
  }

  /**
   * Sound 1: Realistic 3-beat physical wooden door knock
   * Tuned with dual-layer transient + resonance so it is clearly audible on thin laptop speakers!
   */
  public playDoorKnock() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Trigger chosen haptic pattern
      switch (this.knockPattern) {
        case 'wood_rattle':
          this.triggerHaptic([40, 20, 50, 20, 60]);
          break;
        case 'heartbeat':
          this.triggerHaptic([35, 75, 35, 120]);
          break;
        case 'minimal':
          this.triggerHaptic(20);
          break;
        default:
          this.triggerHaptic([25, 40, 25, 40, 30]);
      }

      // Three realistic rhythmic knocks
      [0, 0.12, 0.25].forEach((offset) => {
        // High-frequency wood click transient (essential for laptop speakers)
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(1150, now + offset);
        clickOsc.frequency.exponentialRampToValueAtTime(320, now + offset + 0.03);

        clickGain.gain.setValueAtTime(0.85, now + offset);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.04);

        clickOsc.connect(clickGain);
        clickGain.connect(ctx.destination);
        clickOsc.start(now + offset);
        clickOsc.stop(now + offset + 0.05);

        // Low-mid wooden body resonance
        const bodyOsc = ctx.createOscillator();
        const bodyGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        bodyOsc.type = 'sine';
        bodyOsc.frequency.setValueAtTime(220, now + offset);
        bodyOsc.frequency.exponentialRampToValueAtTime(75, now + offset + 0.09);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, now + offset);

        bodyGain.gain.setValueAtTime(0.9, now + offset);
        bodyGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);

        bodyOsc.connect(filter);
        filter.connect(bodyGain);
        bodyGain.connect(ctx.destination);

        bodyOsc.start(now + offset);
        bodyOsc.stop(now + offset + 0.11);
      });
    } catch (e) {
      console.warn('Audio synthesis failed', e);
    }
  }

  /**
   * Sound 2: Heavy mechanical deadbolt click (Door Locked)
   */
  public playDoorLock() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      this.triggerHaptic([40, 20, 50]);

      // Metallic clack 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(320, now);
      osc1.frequency.exponentialRampToValueAtTime(110, now + 0.05);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.07);

      // Heavy bolt latch snap at 0.06s
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(450, now + 0.06);
      osc2.frequency.exponentialRampToValueAtTime(80, now + 0.14);
      gain2.gain.setValueAtTime(0.7, now + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.16);
    } catch (e) {
      console.warn('Audio synthesis failed', e);
    }
  }

  /**
   * Sound 3: Smooth spring latch release (Door Unlocked / Open)
   */
  public playDoorUnlock() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      this.triggerHaptic(20);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.09);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    } catch (e) {
      console.warn('Audio synthesis failed', e);
    }
  }

  public playDoorOpen() {
    this.playDoorUnlock();
  }

  public playLatchClick() {
    this.playDoorUnlock();
  }

  /**
   * Mechanical Latch / Deadbolt Throw (The bolt sliding into the strike plate)
   */
  public playLatchThrow(isLocking: boolean) {
    if (isLocking) {
      this.playDoorLock();
    } else {
      this.playDoorUnlock();
    }
  }

  /**
   * Sound 4: Push-to-Talk "Chirp-In" (PTT pressed)
   */
  public playPttStart() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Haptic according to pattern
      if (this.transmissionPattern === 'tick') {
        this.triggerHaptic(30);
      } else if (this.transmissionPattern === 'continuous') {
        this.triggerHaptic([20, 15, 20]);
      } else if (this.transmissionPattern === 'double_chime') {
        this.triggerHaptic([20, 30, 20]);
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.04); // A5

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.setValueAtTime(0.35, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn('Audio synthesis failed', e);
    }
  }

  /**
   * Sound 5: Push-to-Talk "Chirp-Out" (PTT released)
   */
  public playPttEnd() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      if (this.transmissionPattern !== 'silent') {
        this.triggerHaptic(15);
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(587.33, now + 0.04);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.setValueAtTime(0.28, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn('Audio synthesis failed', e);
    }
  }

  /**
   * Sound 6: Incoming Friend Drop-In Chime
   */
  public playIncomingChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      this.triggerHaptic([35, 30, 45]);

      const notes = [659.25, 783.99, 987.77]; // E5, G5, B5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);

        gain.gain.setValueAtTime(0.35, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.22);
      });
    } catch (e) {
      console.warn('Audio synthesis failed', e);
    }
  }

  /**
   * Sound 7: Quick Whisper 5s audio chime (Gentle breath / air chime)
   */
  public playWhisperChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      this.triggerHaptic([15, 20, 15]);

      const notes = [1046.5, 1318.51]; // C6, E6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.25, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.26);
      });
    } catch (e) {
      console.warn('Whisper chime synthesis failed', e);
    }
  }

  /**
   * Sound 9: Optical Lens Beam / Show & Tell Aperture Open
   */
  public playBeamChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      this.triggerHaptic([20, 20, 30]);

      // Optical aperture sound: high crystalline shimmer
      const notes = [659.25, 880.0, 1174.66, 1760.0];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);

        gain.gain.setValueAtTime(0.2, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.36);
      });
    } catch (e) {
      console.warn('Beam chime synthesis failed', e);
    }
  }

  /**
   * Sound 8: Instant Slam / Panic Mute Thud
   */
  public playPanicMute() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      this.triggerHaptic([60, 40]);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      console.warn('Audio synthesis failed', e);
    }
  }
}

export const soundEngine = new SoundHapticsEngine();
