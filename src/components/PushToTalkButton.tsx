import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Lock, Eye, Sparkles, Glasses, FileText, Bell, UserPlus } from 'lucide-react';
import { soundEngine } from '../services/audioHaptics';
import { nativeBridge } from '../services/nativeBridge';
import { voiceEngine } from '../services/voiceEngine';
import { Friend, AccentColor } from '../types';
import { THEME_PALETTES } from '../utils/themeStyles';

interface PushToTalkButtonProps {
  targetFriend?: Friend | null;
  isTransmitting: boolean;
  setIsTransmitting: (active: boolean) => void;
  onLeaveNoteRequest?: () => void;
  onOpenVideoPeek?: () => void;
  onTriggerWhisper?: () => void;
  onOpenShowAndTell?: () => void;
  onTransmitAudio?: (audioBase64: string | null, duration: number) => void;
  onKnockFriend?: () => void;
  onPairFriend?: () => void;
  theme?: 'light' | 'dark';
  accentColor?: AccentColor;
}

export const PushToTalkButton: React.FC<PushToTalkButtonProps> = ({
  targetFriend,
  isTransmitting,
  setIsTransmitting,
  onLeaveNoteRequest,
  onOpenVideoPeek,
  onTriggerWhisper,
  onOpenShowAndTell,
  onTransmitAudio,
  onKnockFriend,
  onPairFriend,
  theme = 'dark',
  accentColor = 'emerald',
}) => {
  const isLight = theme === 'light';
  const palette = THEME_PALETTES[accentColor] || THEME_PALETTES.emerald;
  const [audioFrequencies, setAudioFrequencies] = useState<number[]>([12, 28, 45, 18, 32]);
  const [micLockedOpen, setMicLockedOpen] = useState(false);
  const isPressingRef = useRef(false);

  // If no friend is paired yet, render clean prompt to connect
  if (!targetFriend) {
    return (
      <div id="push-to-talk-container" className="flex flex-col items-center w-full px-4 mt-auto mb-1 select-none">
        <button
          id="pair-friend-prompt-btn"
          onClick={() => {
            soundEngine.unlockAudio();
            nativeBridge.haptic('selection');
            if (onPairFriend) onPairFriend();
          }}
          className={`w-full max-w-xs py-3.5 px-5 rounded-3xl border flex items-center justify-center gap-3 transition-all duration-150 active:scale-[0.98] shadow-lg ${
            isLight
              ? 'bg-white hover:bg-neutral-50 border-neutral-300 text-neutral-900'
              : 'bg-neutral-850 hover:bg-neutral-800 border-neutral-700 text-neutral-100'
          }`}
        >
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${palette.badge} text-neutral-950`}>
            <UserPlus className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-start text-left">
            <span className="font-bold text-sm tracking-tight">CONNECT FRIEND TO TALK</span>
            <span className="text-[11px] text-neutral-400">
              Share door code to knock & talk live
            </span>
          </div>
        </button>
      </div>
    );
  }

  const isTargetLocked = targetFriend.doorState === 'locked';

  const startTransmitting = async () => {
    soundEngine.unlockAudio();
    if (isTargetLocked) {
      soundEngine.playDoorKnock();
      nativeBridge.haptic('error');
      if (onLeaveNoteRequest) onLeaveNoteRequest();
      return;
    }

    soundEngine.playPttStart();
    nativeBridge.haptic('medium');
    setIsTransmitting(true);

    try {
      await voiceEngine.startMicrophoneCapture((freq) => {
        setAudioFrequencies(freq);
      });
    } catch {
      console.warn('Microphone permission fallback');
    }
  };

  const stopTransmitting = async () => {
    if (micLockedOpen) return;
    soundEngine.playPttEnd();
    nativeBridge.haptic('light');
    setIsTransmitting(false);
    const result = await voiceEngine.stopMicrophoneCapture();
    if (onTransmitAudio) {
      onTransmitAudio(result.audioBase64, result.duration);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    isPressingRef.current = true;
    startTransmitting();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    isPressingRef.current = false;
    stopTransmitting();
  };

  const toggleMicLock = () => {
    soundEngine.unlockAudio();
    if (micLockedOpen) {
      setMicLockedOpen(false);
      stopTransmitting();
    } else {
      setMicLockedOpen(true);
      startTransmitting();
    }
  };

  useEffect(() => {
    return () => {
      voiceEngine.stopMicrophoneCapture();
    };
  }, []);

  const getTransmitGradient = () => {
    if (accentColor === 'blue') {
      return 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 border-blue-300 shadow-[0_0_30px_rgba(59,130,246,0.4)]';
    }
    if (accentColor === 'purple') {
      return 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 border-purple-300 shadow-[0_0_30px_rgba(168,85,247,0.4)]';
    }
    return 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 border-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.4)]';
  };

  return (
    <div id="push-to-talk-container" className="flex flex-col items-center w-full px-4 mt-auto mb-1 select-none">
      {/* Innovative Quick Action Dock (Knock, Whisper, Show & Tell, Peephole, and Mic Lock) */}
      <div
        className={`flex items-center justify-between p-1 rounded-2xl border shadow-sm mb-2.5 w-full max-w-xs transition-colors ${
          isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900/90 border-neutral-800'
        }`}
      >
        {onKnockFriend && (
          <button
            id="dock-knock-friend-btn"
            onClick={() => {
              soundEngine.unlockAudio();
              nativeBridge.haptic('medium');
              onKnockFriend();
            }}
            className={`flex-1 py-1.5 px-1.5 rounded-xl flex items-center justify-center gap-1 text-[11px] font-semibold transition ${
              isLight
                ? 'hover:bg-neutral-100 text-neutral-800'
                : 'hover:bg-neutral-800 text-neutral-200'
            }`}
            title={`Knock on ${targetFriend.name}'s door`}
          >
            <Bell className={`w-3.5 h-3.5 ${palette.iconColor}`} />
            <span>Knock</span>
          </button>
        )}

        {onTriggerWhisper && (
          <button
            onClick={() => {
              soundEngine.unlockAudio();
              nativeBridge.haptic('selection');
              onTriggerWhisper();
            }}
            className={`flex-1 py-1.5 px-1.5 rounded-xl flex items-center justify-center gap-1 text-[11px] font-semibold transition ${
              isLight
                ? `${palette.lightBg} text-neutral-800 hover:brightness-95`
                : `${palette.darkBg} ${palette.darkText} hover:brightness-110`
            }`}
            title="Send 5-second voice clip"
          >
            <Sparkles className={`w-3.5 h-3.5 ${palette.iconColor}`} />
            <span>Whisper</span>
          </button>
        )}

        {onOpenShowAndTell && (
          <button
            id="open-show-and-tell-btn"
            onClick={() => {
              soundEngine.unlockAudio();
              nativeBridge.haptic('selection');
              onOpenShowAndTell();
            }}
            className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-semibold transition ${
              isLight
                ? 'hover:bg-neutral-100 text-neutral-700'
                : 'hover:bg-neutral-800 text-neutral-300'
            }`}
            title="Beam camera view into their peephole"
          >
            <Glasses className={`w-3.5 h-3.5 ${palette.iconColor}`} />
            <span>Show & Tell</span>
          </button>
        )}

        {onOpenVideoPeek && (
          <button
            onClick={() => {
              soundEngine.unlockAudio();
              nativeBridge.haptic('selection');
              onOpenVideoPeek();
            }}
            className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-semibold transition ${
              isLight
                ? 'hover:bg-neutral-100 text-neutral-700'
                : 'hover:bg-neutral-800 text-neutral-300'
            }`}
            title="Look out the optical peephole"
          >
            <Eye className="w-3.5 h-3.5 text-neutral-400" />
            <span>Peephole</span>
          </button>
        )}

        {!isTargetLocked ? (
          <button
            id="toggle-hands-free-mic"
            onClick={toggleMicLock}
            className={`py-1.5 px-2.5 rounded-xl flex items-center justify-center gap-1 text-[11px] font-semibold transition ${
              micLockedOpen
                ? `${palette.badge} text-neutral-950 shadow-sm font-bold`
                : isLight
                ? 'hover:bg-neutral-100 text-neutral-600'
                : 'hover:bg-neutral-800 text-neutral-400'
            }`}
            title="Keep microphone open hands-free"
          >
            {micLockedOpen ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            <span>{micLockedOpen ? 'Locked' : 'Hands-Free'}</span>
          </button>
        ) : (
          <button
            onClick={() => {
              nativeBridge.haptic('selection');
              if (onLeaveNoteRequest) onLeaveNoteRequest();
            }}
            className="py-1.5 px-2.5 rounded-xl flex items-center justify-center gap-1 text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Leave Slip</span>
          </button>
        )}
      </div>

      {/* Main Tactile Push-to-Talk Slab */}
      <div className="relative flex items-center justify-center w-full max-w-xs">
        {/* Soft glow pulse when transmitting */}
        {isTransmitting && (
          <motion.div
            className={`absolute inset-0 rounded-3xl ${palette.bgGlow} blur-xl pointer-events-none`}
            animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0.9, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
        )}

        <button
          id="ptt-action-button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative w-full py-4 px-6 rounded-3xl border flex items-center justify-center gap-3 transition-all duration-150 active:scale-[0.98] shadow-xl touch-none select-none ${
            isTargetLocked
              ? isLight
                ? 'bg-white border-neutral-200 text-neutral-500 shadow-sm'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 shadow-sm'
              : isTransmitting
              ? `${getTransmitGradient()} text-white`
              : isLight
              ? 'bg-white hover:bg-neutral-50 border-neutral-300 text-neutral-900 shadow-md'
              : 'bg-neutral-850 hover:bg-neutral-800 border-neutral-700 text-neutral-100 shadow-lg'
          }`}
        >
          {isTargetLocked ? (
            <>
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
                <Lock className="w-5 h-5" />
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="font-bold text-sm text-rose-500">
                  {targetFriend.name}'s Door is Locked
                </span>
                <span className="text-[11px] text-neutral-400">
                  Tap to slide a note under their door
                </span>
              </div>
            </>
          ) : isTransmitting ? (
            <>
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                <Mic className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="font-bold text-sm tracking-tight text-white">
                  TRANSMITTING TO {targetFriend.name.toUpperCase()}...
                </span>
                <span className="text-[11px] text-white/90">
                  Release when done speaking
                </span>
              </div>
            </>
          ) : (
            <>
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition ${
                  isLight ? `${palette.lightBg} ${palette.iconColor}` : `${palette.darkBg} ${palette.iconColor}`
                }`}
              >
                <Mic className="w-5 h-5" />
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="font-bold text-sm tracking-tight">HOLD TO TALK</span>
                <span className="text-[11px] text-neutral-400">
                  {targetFriend.doorState === 'knock'
                    ? `Chimes gently at ${targetFriend.name}'s door, then connects`
                    : `Instant live voice into ${targetFriend.name}'s device`}
                </span>
              </div>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
