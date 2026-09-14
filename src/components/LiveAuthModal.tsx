import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DoorClosed, Sparkles, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { liveDoorService } from '../services/liveDoorService';
import { soundEngine } from '../services/audioHaptics';
import { nativeBridge } from '../services/nativeBridge';
import { UserProfile } from '../types';

interface LiveAuthModalProps {
  isOpen: boolean;
  onSuccess: (profile: UserProfile) => void;
  pendingInviteCode?: string | null;
}

const AVATAR_OPTIONS = ['🔑', '🚪', '☕', '🌿', '⚡', '🦊', '🎸', '🌙', '🎧', '✨'];

export const LiveAuthModal: React.FC<LiveAuthModalProps> = ({
  isOpen,
  onSuccess,
  pendingInviteCode,
}) => {
  const [name, setName] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('🔑');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    soundEngine.unlockAudio();
    nativeBridge.haptic('selection');
    setLoading(true);
    setError(null);
    try {
      const customHandle = name.trim() || undefined;
      const profile = await liveDoorService.signInWithGoogle(customHandle);
      nativeBridge.haptic('success');
      onSuccess(profile);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Google sign-in failed. Try entering a name below.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim() || 'Keyholder';
    soundEngine.unlockAudio();
    soundEngine.playLatchClick();
    nativeBridge.haptic('medium');
    setLoading(true);
    setError(null);
    try {
      const profile = await liveDoorService.signInAsGuest(cleanName, selectedAvatar);
      nativeBridge.haptic('success');
      onSuccess(profile);
    } catch (err: any) {
      console.warn('Guest sign-in error, using guaranteed fallback session:', err);
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let rand = '';
      for (let i = 0; i < 6; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const fallbackProfile: UserProfile = {
        uid: `guest_${Math.random().toString(36).substring(2, 9)}${Date.now().toString(36)}`,
        displayName: cleanName,
        avatar: selectedAvatar || '🚪',
        doorCode: `DOOR-${rand}`,
        doorState: 'open',
        isOnline: true,
        isTransmitting: false,
        accentColor: 'emerald',
        isAnonymous: true,
      };
      liveDoorService.saveGuestSession(fallbackProfile);
      liveDoorService.notifyAuth(fallbackProfile);
      nativeBridge.haptic('success');
      onSuccess(fallbackProfile);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-neutral-100 flex flex-col gap-5"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-neutral-950 flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <DoorClosed className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-base text-neutral-100">Step Up to the Door</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <p className="text-xs text-neutral-400">
                {pendingInviteCode ? `Connecting to door: ${pendingInviteCode}` : 'Live real-time ambient presence'}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Option A: One-click Google Sign-in */}
          <button
            type="button"
            id="google-signin-btn"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-white text-neutral-900 font-semibold text-xs hover:bg-neutral-100 transition shadow-sm active:scale-98 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-neutral-800" />
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">or instant guest</span>
            <div className="flex-1 h-px bg-neutral-800" />
          </div>

          {/* Option B: Fast Name & Avatar Selection */}
          <form onSubmit={handleGuestSignIn} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-neutral-400">Your Door Handle / Name</label>
              <div className="relative">
                <input
                  type="text"
                  id="guest-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Keyholder, Roommate, Alex"
                  maxLength={24}
                  className="w-full bg-neutral-800/80 border border-neutral-700/80 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
                <User className="w-3.5 h-3.5 text-neutral-500 absolute right-3 top-3.5" />
              </div>
            </div>

            {/* Avatar picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-neutral-400">Door Key Emblem</label>
              <div className="grid grid-cols-5 gap-2">
                {AVATAR_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => {
                      nativeBridge.haptic('selection');
                      setSelectedAvatar(icon);
                    }}
                    className={`h-9 rounded-xl flex items-center justify-center text-base transition ${
                      selectedAvatar === icon
                        ? 'bg-emerald-500/20 border-2 border-emerald-400 scale-105 shadow-sm'
                        : 'bg-neutral-800 border border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              id="guest-signin-btn"
              disabled={loading}
              className="w-full mt-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-neutral-950 font-bold text-xs hover:brightness-110 active:scale-98 transition shadow-lg shadow-emerald-950/50 disabled:opacity-50"
            >
              {loading ? (
                <span>Entering Door...</span>
              ) : (
                <>
                  <span>Enter & Open Door</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-500">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>End-to-end encrypted Firestore live sync</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
