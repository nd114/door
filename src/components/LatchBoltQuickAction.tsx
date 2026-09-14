import React from 'react';
import { motion } from 'motion/react';
import { Lock, Unlock, Shield } from 'lucide-react';
import { DoorState, AccentColor } from '../types';
import { soundEngine } from '../services/audioHaptics';
import { nativeBridge } from '../services/nativeBridge';
import { THEME_PALETTES } from '../utils/themeStyles';

interface LatchBoltQuickActionProps {
  doorState: DoorState;
  onToggleLatch: () => void;
  accentColor?: AccentColor;
  theme?: 'light' | 'dark';
  compact?: boolean;
}

/**
 * The "Little thingy that keeps the door in place" — The Mechanical Latch & Deadbolt!
 * The bolt extends into the strike plate to lock, or retracts into the lockset to open.
 */
export const LatchBoltQuickAction: React.FC<LatchBoltQuickActionProps> = ({
  doorState,
  onToggleLatch,
  accentColor = 'emerald',
  theme = 'dark',
  compact = false,
}) => {
  const isLight = theme === 'light';
  const palette = THEME_PALETTES[accentColor] || THEME_PALETTES.emerald;
  const isLocked = doorState === 'locked';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.unlockAudio();
    soundEngine.playLatchThrow(!isLocked);
    nativeBridge.haptic(isLocked ? 'success' : 'heavy');
    onToggleLatch();
  };

  if (compact) {
    return (
      <button
        id="latch-bolt-compact-btn"
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition group ${
          isLocked
            ? 'bg-rose-500/15 border-rose-500/30 text-rose-500 hover:bg-rose-500/25'
            : isLight
            ? `${palette.lightBg} ${palette.lightBorder} ${palette.lightText} hover:bg-neutral-100`
            : `${palette.darkBg} ${palette.darkBorder} ${palette.darkText} hover:bg-neutral-800`
        }`}
        title={isLocked ? "Deadbolt thrown into strike plate. Click to retract latch." : "Latch retracted. Click to throw deadbolt into strike plate."}
      >
        {/* Animated mechanical bolt tongue */}
        <div className="relative w-4 h-3 flex items-center">
          <div className="w-1.5 h-3 rounded-l-sm bg-neutral-400 border-r border-neutral-600" />
          <motion.div
            className={`h-2 rounded-r-sm transition-colors ${isLocked ? 'bg-rose-400 w-2.5' : 'bg-neutral-500 w-1'}`}
            animate={{ width: isLocked ? 10 : 3 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          />
        </div>
        <span>{isLocked ? 'Latch Locked' : 'Latch Free'}</span>
      </button>
    );
  }

  return (
    <div
      onClick={handleClick}
      id="mechanical-latch-quick-action"
      className={`p-3 rounded-2xl border cursor-pointer select-none transition-all shadow-md group ${
        isLocked
          ? isLight
            ? 'bg-rose-50 border-rose-300 text-rose-950 hover:bg-rose-100'
            : 'bg-rose-950/40 border-rose-500/40 text-rose-100 hover:bg-rose-950/60'
          : isLight
          ? `${palette.lightBg} ${palette.lightBorder} ${palette.lightText} hover:brightness-95`
          : `${palette.darkBg} ${palette.darkBorder} ${palette.darkText} hover:brightness-110`
      }`}
      title="Door Latch Bolt & Strike Plate (Click to throw/retract bolt)"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* Mechanical Strike Plate & Throwing Bolt Cross-Section */}
          <div className="relative w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center p-1 overflow-hidden shadow-inner">
            {/* Strike plate jamb */}
            <div className="absolute right-0 top-1 bottom-1 w-1.5 bg-amber-400/80 rounded-l-sm" />
            
            {/* Sliding deadbolt / spring latch tongue */}
            <motion.div
              className={`h-3 rounded-r-md border border-neutral-300 shadow-md ${
                isLocked ? 'bg-gradient-to-r from-neutral-300 to-rose-400' : 'bg-gradient-to-r from-neutral-300 to-neutral-400'
              }`}
              animate={{
                x: isLocked ? 5 : -4,
                width: isLocked ? 20 : 12,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 26 }}
            />
            
            {/* Status dot */}
            <div
              className={`absolute top-1 left-1 w-1.5 h-1.5 rounded-full ${
                isLocked ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]' : `${palette.badge} shadow-[0_0_6px_${palette.hex}]`
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs tracking-tight">
                {isLocked ? 'Deadbolt Thrown' : 'Latch Disengaged'}
              </span>
              <span
                className={`text-[9px] uppercase px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                  isLocked
                    ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                    : `${palette.darkBg} ${palette.darkText} border ${palette.darkBorder}`
                }`}
              >
                {isLocked ? 'Keeps Door Shut' : 'Free To Swing'}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 leading-tight">
              {isLocked
                ? 'Metal bolt is seated inside the strike plate.'
                : 'Bolt retracted — instant voice can enter.'}
            </p>
          </div>
        </div>

        {/* 1-Tap Trigger Action Button */}
        <button
          onClick={handleClick}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm ${
            isLocked
              ? 'bg-rose-500 text-white hover:bg-rose-600'
              : `${palette.btnPrimary}`
          }`}
        >
          {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          <span>{isLocked ? 'Retract' : 'Throw'}</span>
        </button>
      </div>
    </div>
  );
};
