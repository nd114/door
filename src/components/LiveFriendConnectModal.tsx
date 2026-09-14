import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, UserPlus, Share2, KeyRound, Radio, Shield, Sparkles } from 'lucide-react';
import { UserProfile, Friend } from '../types';
import { liveDoorService } from '../services/liveDoorService';
import { soundEngine } from '../services/audioHaptics';
import { nativeBridge } from '../services/nativeBridge';

interface LiveFriendConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  liveFriends: Friend[];
  onFriendConnected: (friend: Friend) => void;
  theme?: 'light' | 'dark';
}

export const LiveFriendConnectModal: React.FC<LiveFriendConnectModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  liveFriends,
  onFriendConnected,
  theme = 'dark',
}) => {
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const isLight = theme === 'light';

  // Build shareable link
  const currentUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const shareableInviteUrl = `${currentUrl}?door=${currentUser.doorCode}`;

  const handleCopyInviteLink = async () => {
    soundEngine.unlockAudio();
    nativeBridge.haptic('selection');
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareableInviteUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareableInviteUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      nativeBridge.haptic('success');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Could not copy link', err);
    }
  };

  const handleConnectByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = friendCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    if (cleanCode === currentUser.doorCode.toUpperCase()) {
      setFeedback({ type: 'error', message: "That's your own Door code! Share it with your friend." });
      return;
    }

    soundEngine.unlockAudio();
    nativeBridge.haptic('medium');
    setIsConnecting(true);
    setFeedback(null);

    try {
      const friend = await liveDoorService.connectByDoorCode(currentUser, cleanCode);
      if (friend) {
        soundEngine.playDoorOpen();
        nativeBridge.haptic('success');
        setFeedback({ type: 'success', message: `Connected to ${friend.name}'s door! You can now knock & talk live.` });
        setFriendCodeInput('');
        onFriendConnected(friend);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setFeedback({
          type: 'error',
          message: 'Door code not found. Make sure your friend has opened the app and shared their code.',
        });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Connection failed. Please check network and retry.' });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className={`w-full max-w-sm rounded-3xl border p-5 shadow-2xl flex flex-col gap-5 ${
            isLight
              ? 'bg-neutral-50 border-neutral-200 text-neutral-900'
              : 'bg-neutral-900 border-neutral-800 text-neutral-100'
          }`}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Pair with a Friend</h3>
                <p className="text-[11px] text-neutral-400">Live 1-on-1 knocking & instant voice</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-neutral-800/50 text-neutral-400 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User's Shareable Code */}
          <div
            className={`p-4 rounded-2xl border flex flex-col gap-3 ${
              isLight ? 'bg-white border-neutral-200 shadow-sm' : 'bg-neutral-850 border-neutral-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Your Door Code
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ready to connect
              </span>
            </div>

            <div className="flex items-center justify-between bg-neutral-900/40 p-2.5 rounded-xl border border-neutral-700/50">
              <span className="font-mono text-base font-extrabold tracking-wider text-emerald-400">
                {currentUser.doorCode}
              </span>
              <button
                type="button"
                id="copy-door-code-btn"
                onClick={handleCopyInviteLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-neutral-950 text-xs font-bold hover:bg-emerald-400 transition shadow-sm active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Invite Link</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Send this link to your friend. When they tap it on their phone or browser, your doors will instantly pair!
            </p>
          </div>

          {/* Enter Friend's Code */}
          <form onSubmit={handleConnectByCode} className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Have your friend's code?
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                id="friend-code-input"
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. DOOR-XYZ9"
                className={`flex-1 px-3.5 py-2 rounded-xl text-xs font-mono uppercase tracking-wider border focus:outline-none focus:border-emerald-500 transition ${
                  isLight
                    ? 'bg-white border-neutral-300 text-neutral-900'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-100 placeholder-neutral-500'
                }`}
              />
              <button
                type="submit"
                id="connect-friend-btn"
                disabled={!friendCodeInput.trim() || isConnecting}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-white text-neutral-950 text-xs font-bold transition disabled:opacity-40 active:scale-95"
              >
                {isConnecting ? 'Pairing...' : 'Connect'}
              </button>
            </div>
          </form>

          {/* Feedback messages */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/60 border border-rose-800 text-rose-300'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Currently Connected Live Friends */}
          {liveFriends.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-neutral-800 pt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Live Doorstep Keyholders ({liveFriends.length})
              </span>
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
                {liveFriends.map((f) => (
                  <div
                    key={f.id}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs ${
                      isLight ? 'bg-white border-neutral-200' : 'bg-neutral-850 border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{f.avatar}</span>
                      <div className="flex flex-col">
                        <span className="font-bold">{f.name}</span>
                        <span className="text-[10px] text-neutral-400">
                          Door is{' '}
                          <span
                            className={
                              f.doorState === 'open'
                                ? 'text-emerald-400'
                                : f.doorState === 'knock'
                                ? 'text-amber-400'
                                : 'text-neutral-400'
                            }
                          >
                            {f.doorState}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
