import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Eye,
  EyeOff,
  VideoOff,
  Sparkles,
  Glasses,
  Radio,
  Volume2,
  Share2,
  Maximize2,
  RotateCw,
} from 'lucide-react';
import { Friend, ShowAndTellBeam } from '../types';
import { soundEngine } from '../services/audioHaptics';
import { nativeBridge } from '../services/nativeBridge';

interface VideoPeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: Friend;
  isTransmittingAudio: boolean;
  activeBeam?: ShowAndTellBeam | null;
  onOpenShowAndTell?: () => void;
  theme?: 'light' | 'dark';
}

export const VideoPeekModal: React.FC<VideoPeekModalProps> = ({
  isOpen,
  onClose,
  friend,
  isTransmittingAudio,
  activeBeam,
  onOpenShowAndTell,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [cameraActive, setCameraActive] = useState(false);
  const [isShutterClosed, setIsShutterClosed] = useState(false);
  const [viewMode, setViewMode] = useState<'peephole' | 'fullvr'>('peephole');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
      return;
    }

    // Play optical lens sound when opening peephole
    soundEngine.playBeamChime();

    // If there's an active incoming beam from friend, prioritize displaying friend's perspective
    if (activeBeam) {
      return;
    }

    // Try starting camera for peephole
    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraActive(false);
          return;
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 480 }, height: { ideal: 480 }, facingMode: 'user' },
            audio: false,
          });
        } catch {
          // Fallback to any camera for laptops/desktops
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
      } catch (e) {
        console.log('Webcam not permitted or unavailable', e);
        setCameraActive(false);
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, activeBeam]);

  if (!isOpen) return null;

  const isBeamFromFriend = Boolean(activeBeam && activeBeam.senderId !== 'self');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`w-full max-w-sm rounded-3xl p-5 flex flex-col items-center shadow-2xl relative border ${
          isLight ? 'bg-white border-neutral-200 text-neutral-900' : 'bg-neutral-900 border-neutral-800 text-white'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            soundEngine.playDoorLock();
            nativeBridge.haptic('light');
            onClose();
          }}
          className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition z-20 ${
            isLight ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title Header */}
        <div className="flex flex-col items-center text-center mb-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-bold mb-1.5">
            <Glasses className="w-3.5 h-3.5" />
            <span>
              {activeBeam ? `Virtual Reality Perspective (${activeBeam.senderName})` : 'Optical Door Peephole'}
            </span>
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {activeBeam
              ? `You are seeing through ${activeBeam.senderName}'s camera right now`
              : `Peeking outside your door at ${friend.name}`}
          </span>
        </div>

        {/* Circular Fish-eye Optical Peephole Display */}
        <div
          className={`relative transition-all duration-300 p-2 bg-gradient-to-b from-neutral-700 via-neutral-900 to-neutral-950 border-[6px] border-neutral-800 shadow-[0_0_35px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center overflow-hidden my-2 ${
            viewMode === 'fullvr' ? 'w-full h-64 rounded-2xl' : 'w-60 h-60 rounded-full'
          }`}
        >
          {/* Outer Brass/Chrome Optical Bezel Ring */}
          <div className="absolute inset-0 rounded-full border border-neutral-600/30 pointer-events-none z-10" />

          {/* Shutter Covering */}
          <AnimatePresence>
            {isShutterClosed ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full rounded-full bg-neutral-950 flex flex-col items-center justify-center text-neutral-500 gap-2 z-20"
              >
                <EyeOff className="w-8 h-8 text-neutral-600" />
                <span className="text-[11px] font-semibold text-neutral-400">Shutter Closed</span>
              </motion.div>
            ) : activeBeam ? (
              /* Virtual Reality Beam Perspective From Other Person's Phone */
              <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-neutral-950 group">
                <img
                  src={activeBeam.imageUrl}
                  alt={activeBeam.caption || "Friend's perspective"}
                  className="w-full h-full object-cover filter contrast-120 brightness-105 scale-110"
                />

                {/* Optical Peephole Fish-eye distortion Vignette */}
                <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/85 pointer-events-none" />

                {/* Sender Overlay Stamp */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-amber-500/40 text-[10px] text-amber-300 font-bold z-20 shadow-md">
                  <img
                    src={activeBeam.senderAvatar}
                    alt={activeBeam.senderName}
                    className="w-4 h-4 rounded-full object-cover border border-amber-400"
                  />
                  <span>Live Lens: {activeBeam.senderName}</span>
                </div>

                {/* Active Caption if provided */}
                {activeBeam.caption && (
                  <div className="absolute bottom-3 left-3 right-3 p-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-center text-[11px] text-neutral-200 italic z-20 line-clamp-2">
                    "{activeBeam.caption}"
                  </div>
                )}
              </div>
            ) : cameraActive ? (
              /* Real User Camera Stream */
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover rounded-full filter contrast-110"
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              /* Optical Peephole View of Doorstep */
              <div className="relative w-full h-full rounded-full overflow-hidden flex flex-col items-center justify-center bg-gradient-to-b from-neutral-800 to-neutral-950 p-4 text-center">
                {friend.avatar?.startsWith('http') || friend.avatar?.startsWith('data:') ? (
                  <img
                    src={friend.avatar}
                    alt={friend.name}
                    className="w-full h-full object-cover filter contrast-125 brightness-90 scale-125"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 z-10">
                    <span className="text-5xl">{friend.avatar || '🚪'}</span>
                    <span className="text-xs font-semibold text-neutral-300">{friend.name}'s Door</span>
                    <span className="text-[10px] text-neutral-500">Camera shutter standby</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/70 pointer-events-none" />
              </div>
            )}
          </AnimatePresence>

          {/* Optical Glass Distortion & Glare Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none z-15" />

          {/* Audio Activity Halo Indicator */}
          {isTransmittingAudio && (
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="absolute inset-0 rounded-full border-4 border-emerald-400 pointer-events-none z-20"
            />
          )}
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>
            {activeBeam ? 'Live VR perspective beamed to your door' : 'Optical connection synced'}
          </span>
        </div>

        {/* Secondary Beam Action / Controls */}
        <div className="flex flex-col gap-2 mt-3 w-full">
          {onOpenShowAndTell && (
            <button
              id="beam-back-camera-btn"
              onClick={() => {
                soundEngine.unlockAudio();
                nativeBridge.haptic('selection');
                onClose();
                onOpenShowAndTell();
              }}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/40 text-amber-500 dark:text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition flex items-center justify-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-amber-500" />
              <span>Beam YOUR camera view to {friend.name}</span>
            </button>
          )}

          <div className="flex items-center gap-2 w-full justify-center">
            <button
              onClick={() => {
                nativeBridge.haptic('selection');
                setIsShutterClosed(!isShutterClosed);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                isShutterClosed
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-600 dark:text-rose-300'
                  : isLight
                  ? 'bg-neutral-100 border-neutral-300 text-neutral-800 hover:bg-neutral-200'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
              }`}
            >
              {isShutterClosed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{isShutterClosed ? 'Open Shutter' : 'Close Shutter'}</span>
            </button>

            <button
              onClick={() => {
                soundEngine.playDoorLock();
                nativeBridge.haptic('light');
                onClose();
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                isLight
                  ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
              }`}
            >
              <VideoOff className="w-3.5 h-3.5 text-neutral-400" />
              <span>Close Lens</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
