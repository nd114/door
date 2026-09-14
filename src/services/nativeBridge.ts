/**
 * Native Bridge Architecture for Door
 * 
 * This module establishes the abstraction layer between web/PWA and native
 * iOS (Apple PTTChannelManager) / Android (Telecom ConnectionService / Foreground).
 * 
 * When exporting to Capacitor / native iOS & Android, this bridge communicates
 * directly with native plugins without touching the UI component layer.
 */

import { soundEngine } from './audioHaptics';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

export interface NativeBridgeCapabilities {
  isCapacitor: boolean;
  platform: 'ios' | 'android' | 'web';
  supportsApplePTT: boolean;
  supportsHaptics: boolean;
}

class NativeBridgeService {
  private isCapacitorEnv: boolean = false;
  private currentPlatform: 'ios' | 'android' | 'web' = 'web';

  constructor() {
    this.detectEnvironment();
  }

  private detectEnvironment() {
    if (typeof window !== 'undefined') {
      const cap = (window as unknown as { Capacitor?: { isNativePlatform: () => boolean; getPlatform: () => string } }).Capacitor;
      if (cap && cap.isNativePlatform()) {
        this.isCapacitorEnv = true;
        const p = cap.getPlatform();
        this.currentPlatform = p === 'ios' ? 'ios' : p === 'android' ? 'android' : 'web';
      } else {
        // Web detection with user agent heuristics for preview
        const ua = navigator.userAgent || '';
        if (/iPad|iPhone|iPod/.test(ua)) {
          this.currentPlatform = 'ios';
        } else if (/Android/.test(ua)) {
          this.currentPlatform = 'android';
        } else {
          this.currentPlatform = 'web';
        }
      }
    }
  }

  public getCapabilities(): NativeBridgeCapabilities {
    return {
      isCapacitor: this.isCapacitorEnv,
      platform: this.currentPlatform,
      supportsApplePTT: this.currentPlatform === 'ios',
      supportsHaptics: typeof navigator !== 'undefined' && 'vibrate' in navigator,
    };
  }

  /**
   * Universal Haptic Trigger
   * When Capacitor is installed, delegates to @capacitor/haptics.
   * On Web/PWA, uses navigator.vibrate with tuned millisecond impulses.
   */
  public haptic(style: HapticStyle = 'light') {
    if (this.isCapacitorEnv) {
      // In native app: window.Capacitor.Plugins.Haptics.impact({ style })
      const haptics = (window as unknown as { Capacitor?: { Plugins?: { Haptics?: { impact: (opts: { style: string }) => void } } } }).Capacitor?.Plugins?.Haptics;
      if (haptics) {
        haptics.impact({ style: style.toUpperCase() });
        return;
      }
    }

    // Web vibration fallback
    const vibrationMap: Record<HapticStyle, number | number[]> = {
      light: 12,
      medium: 25,
      heavy: 45,
      selection: 8,
      success: [15, 30, 20],
      warning: [30, 40, 30],
      error: [40, 30, 40, 30, 50],
    };

    soundEngine.triggerHaptic(vibrationMap[style] || 15);
  }

  /**
   * Request Microphone Permission with graceful status handling
   */
  public async requestMicrophone(): Promise<boolean> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release immediate test stream
        stream.getTracks().forEach((track) => track.stop());
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Microphone permission not granted:', e);
      return false;
    }
  }

  /**
   * Apple Push-to-Talk (PTTChannelManager) Channel State Registration
   * On iOS, this registers the channel descriptor so iOS can wake the app
   * when incoming audio packets arrive via Apple Push Notification Service (APNs).
   */
  public registerPttChannel(channelName: string, participantName: string): boolean {
    console.log(`[Door Native Bridge] Registering Apple PTT Channel: ${channelName} for ${participantName}`);
    // Native stub: When compiled to iOS, bridges to Swift PTTChannelManager.requestBeginTransmitting()
    return true;
  }

  /**
   * Detect whether user has connected headphones (AirPods / wired / bluetooth)
   * On Web, uses AudioDestinationNode or MediaDevices enumeration
   */
  public async checkAudioOutputRoute(): Promise<{ isHeadphones: boolean; deviceLabel: string }> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');
        const headphoneMatch = audioOutputs.find((d) =>
          /headphone|airpod|earbud|bluetooth|headset|earphones/i.test(d.label)
        );
        if (headphoneMatch) {
          return { isHeadphones: true, deviceLabel: headphoneMatch.label };
        }
      }
    } catch {
      // ignore
    }
    return { isHeadphones: false, deviceLabel: 'Device Speaker' };
  }
}

export const nativeBridge = new NativeBridgeService();
