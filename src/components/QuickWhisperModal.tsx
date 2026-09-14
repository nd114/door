import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic, Send, Volume2, Play, Check, Sparkles, Clock } from 'lucide-react';
import { Friend, QuickWhisper } from '../types';
import { soundEngine } from '../services/audioHaptics';
import { nativeBridge } from '../services/nativeBridge';
import { voiceEngine } from '../services/voiceEngine';
import { liveDoorService } from '../services/liveDoorService';

interface QuickWhisperModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: Friend;
  onSendWhisper: (whisper: QuickWhisper) => void;
  theme: 'light' | 'dark';
}

export const QuickWhisperModal: React.FC<QuickWhisperModalProps> = ({
  isOpen,
  onClose,
  friend,
  onSendWhisper,
  theme,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(5.0);
  const [recordedClip, setRecordedClip] = useState<{
    transcript: string;
    duration: number;
    audioBase64?: string | null;
  } | null>(null);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startWhisperRecording = async () => {
    soundEngine.unlockAudio();
    soundEngine.playWhisperChime();
    nativeBridge.haptic('medium');

    setIsRecording(true);
    setRecordedClip(null);
    setCountdown(5.0);
    startTimeRef.current = Date.now();

    await voiceEngine.startMicrophoneCapture(() => {});

    // High resolution 100ms countdown timer for smooth progress
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, 5.0 - elapsed);
      setCountdown(Number(remaining.toFixed(1)));

      if (remaining <= 0) {
        finishWhisperRecording();
      }
    }, 100);
  };

  const finishWhisperRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    const { audioBase64, duration: measuredDuration } = await voiceEngine.stopMicrophoneCapture();
    soundEngine.playWhisperChime();
    nativeBridge.haptic('selection');

    const duration = Math.min(5, Math.max(0.5, measuredDuration || (Date.now() - startTimeRef.current) / 1000));

    setRecordedClip({
      transcript: 'Real voice whisper',
      duration: Number(duration.toFixed(1)),
      audioBase64,
    });
  };

  const handleSend = () => {
    if (!recordedClip) return;

    const newWhisper: QuickWhisper = {
      id: `whisper-${Date.now()}`,
      friendId: friend.id,
      friendName: friend.name,
      avatar: friend.avatar,
      transcript: recordedClip.transcript,
      duration: recordedClip.duration,
      audioBlobUrl: recordedClip.audioBase64 || undefined,
      timestamp: new Date(),
      isPlayed: false,
    };

    soundEngine.playPttStart();
    nativeBridge.haptic('heavy');
    onSendWhisper(newWhisper);

    onClose();
  };

  const playPreview = () => {
    if (!recordedClip || !recordedClip.audioBase64) return;
    setIsPlayingBack(true);
    soundEngine.playWhisperChime();
    liveDoorService.playAudioBase64(recordedClip.audioBase64);
    setTimeout(() => {
      setIsPlayingBack(false);
    }, (recordedClip.duration + 0.5) * 1000);
  };

  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      setRecordedClip(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isLight = theme === 'light';
  const progressPercent = ((5.0 - countdown) / 5.0) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        className={`w-full max-w-sm rounded-3xl border p-5 shadow-2xl flex flex-col items-center relative overflow-hidden transition-colors ${
          isLight
            ? 'bg-[#faf9f6] border-[#e2ded6] text-[#1c1917]'
            : 'bg-neutral-900 border-neutral-800 text-neutral-100'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            nativeBridge.haptic('light');
            onClose();
          }}
          className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition ${
            isLight
              ? 'bg-neutral-200/80 hover:bg-neutral-300 text-neutral-600'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex flex-col items-center text-center mb-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Quick Whisper</span>
          </div>
          <p className="text-xs text-neutral-400">
            Send a private, 5-second audio pulse to <strong className={isLight ? 'text-neutral-900' : 'text-neutral-100'}>{friend.name}</strong>
          </p>
        </div>

        {/* Circular Audio Recorder Ring */}
        <div className="relative w-44 h-44 flex items-center justify-center my-3">
          {/* Progress Ring Background */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="88"
              cy="88"
              r="78"
              stroke={isLight ? '#e5e2db' : '#262626'}
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="88"
              cy="88"
              r="78"
              stroke="#f59e0b"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 78}
              strokeDashoffset={2 * Math.PI * 78 * (1 - progressPercent / 100)}
              strokeLinecap="round"
              className="transition-all duration-100"
            />
          </svg>

          {/* Core Recording Trigger Button */}
          <button
            onPointerDown={startWhisperRecording}
            onPointerUp={finishWhisperRecording}
            onPointerLeave={() => isRecording && finishWhisperRecording()}
            className={`relative w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all select-none touch-none shadow-xl ${
              isRecording
                ? 'bg-amber-500 text-neutral-950 scale-105 shadow-[0_0_25px_rgba(245,158,11,0.5)]'
                : recordedClip
                ? 'bg-emerald-600 text-white'
                : isLight
                ? 'bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800'
                : 'bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-100'
            }`}
          >
            {isRecording ? (
              <>
                <Mic className="w-7 h-7 animate-pulse mb-1" />
                <span className="font-mono font-bold text-xl">{countdown}s</span>
                <span className="text-[10px] tracking-wide uppercase font-semibold">Recording...</span>
              </>
            ) : recordedClip ? (
              <>
                <Check className="w-8 h-8 mb-1 stroke-[3]" />
                <span className="font-bold text-sm">Recorded!</span>
                <span className="text-[10px] opacity-90">{recordedClip.duration}s clip</span>
              </>
            ) : (
              <>
                <Mic className="w-7 h-7 mb-1 text-amber-500" />
                <span className="font-bold text-xs">HOLD TO WHISPER</span>
                <span className="text-[9px] text-neutral-400">Max 5 seconds</span>
              </>
            )}
          </button>
        </div>

        {/* Status / Instructions */}
        {!recordedClip ? (
          <p className="text-[11px] text-neutral-400 text-center max-w-xs px-2">
            Press & hold the center circle to record. Releasing sends directly without starting a continuous call.
          </p>
        ) : (
          <div className="w-full flex flex-col items-center gap-2 mt-2">
            {/* Recorded Transcript Preview */}
            <div
              className={`w-full p-2.5 rounded-2xl border text-xs flex items-center justify-between ${
                isLight ? 'bg-white border-neutral-200' : 'bg-neutral-950/80 border-neutral-800'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Volume2 className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate italic text-neutral-400">"{recordedClip.transcript}"</span>
              </div>

              <button
                onClick={playPreview}
                className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[10px] font-semibold text-neutral-200 shrink-0 flex items-center gap-1"
              >
                <Play className="w-3 h-3" />
                <span>{isPlayingBack ? 'Playing...' : 'Preview'}</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full mt-1">
              <button
                onClick={startWhisperRecording}
                className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition ${
                  isLight
                    ? 'border-neutral-300 text-neutral-700 hover:bg-neutral-200'
                    : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                Re-record
              </button>

              <button
                onClick={handleSend}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Whisper</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
