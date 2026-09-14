import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Bell, DoorOpen, Headphones, Timer, Moon, Disc } from 'lucide-react';
import { DoorState, ShowAndTellBeam, AccentColor } from '../types';
import { soundEngine } from '../services/audioHaptics';
import { nativeBridge } from '../services/nativeBridge';
import { LatchBoltQuickAction } from './LatchBoltQuickAction';
import { THEME_PALETTES } from '../utils/themeStyles';

interface DoorHeroProps {
  doorState: DoorState;
  onStateChange: (state: DoorState) => void;
  earbudsActive: boolean;
  onToggleEarbuds: () => void;
  activeSpeakerName?: string | null;
  onOpenVideoPeek?: () => void;
  timedLockMinutes?: number | null;
  onSetTimedLock?: (minutes: number | null) => void;
  theme?: 'light' | 'dark';
  dndScheduleActive?: boolean;
  activeBeam?: ShowAndTellBeam | null;
  accentColor?: AccentColor;
  onOpenKnobDrawer?: () => void;
}

export const DoorHero: React.FC<DoorHeroProps> = ({
  doorState,
  onStateChange,
  earbudsActive,
  onToggleEarbuds,
  activeSpeakerName,
  onOpenVideoPeek,
  timedLockMinutes,
  onSetTimedLock,
  theme = 'dark',
  dndScheduleActive = false,
  activeBeam,
  accentColor = 'emerald',
  onOpenKnobDrawer,
}) => {
  const isLight = theme === 'light';
  const palette = THEME_PALETTES[accentColor] || THEME_PALETTES.emerald;

  const handleSelectState = (nextState: DoorState) => {
    soundEngine.unlockAudio();
    if (nextState === doorState) return;

    if (nextState === 'locked') {
      soundEngine.playLatchThrow(true);
      nativeBridge.haptic('heavy');
    } else if (nextState === 'open') {
      soundEngine.playLatchThrow(false);
      nativeBridge.haptic('medium');
    } else {
      soundEngine.playDoorKnock();
      nativeBridge.haptic('light');
    }
    onStateChange(nextState);
  };

  const handleToggleLatch = () => {
    if (doorState === 'locked') {
      handleSelectState('open');
    } else {
      handleSelectState('locked');
    }
  };

  const handleTurnKnob = () => {
    soundEngine.unlockAudio();
    soundEngine.playDoorUnlock();
    nativeBridge.haptic('medium');
    if (doorState === 'locked') {
      handleSelectState('knock');
    } else if (doorState === 'knock') {
      handleSelectState('open');
    } else {
      handleSelectState('locked');
    }
  };

  return (
    <div id="door-hero-section" className="flex flex-col items-center justify-center px-4 py-2 w-full">
      {/* Top Status Capsule */}
      <div className="flex items-center justify-between w-full px-2 mb-2">
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-colors border ${
            isLight
              ? 'bg-white border-neutral-200 text-neutral-800 shadow-sm'
              : 'bg-neutral-900/80 border-neutral-800 text-neutral-300'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              doorState === 'locked'
                ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                : doorState === 'knock'
                ? `${palette.badge} shadow-[0_0_8px_${palette.hex}]`
                : `${palette.badge} shadow-[0_0_8px_${palette.hex}] animate-pulse`
            }`}
          />
          <span className="font-semibold capitalize tracking-tight text-[11px]">
            {doorState === 'locked'
              ? dndScheduleActive
                ? 'Locked (DND Schedule)'
                : 'Door Locked (Deadbolted)'
              : doorState === 'knock'
              ? 'Cracked (Knock First)'
              : 'Wide Open (Instant Audio)'}
          </span>
        </div>

        {/* Earbud Filter Toggle */}
        <button
          id="toggle-earbuds-filter"
          onClick={() => {
            soundEngine.unlockAudio();
            nativeBridge.haptic('selection');
            onToggleEarbuds();
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition border ${
            earbudsActive
              ? 'bg-blue-950/70 border-blue-600/60 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
              : isLight
              ? 'bg-white border-neutral-200 text-neutral-600 hover:text-neutral-900 shadow-sm'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-300'
          }`}
          title="When enabled, audio only auto-plays through headphones/AirPods"
        >
          <Headphones className="w-3 h-3 text-blue-500" />
          <span>{earbudsActive ? 'Earbuds Guard ON' : 'Speaker ON'}</span>
        </button>
      </div>

      {/* Interactive 3D Tactile Door Visual */}
      <div className="relative w-48 h-56 flex items-center justify-center my-1 select-none">
        {/* Ambient Halo Behind Door matching selected communication palette */}
        <div
          className={`absolute inset-0 rounded-3xl blur-2xl transition-all duration-700 pointer-events-none ${
            doorState === 'locked'
              ? 'bg-rose-950/20'
              : doorState === 'knock'
              ? `${palette.bgGlow}`
              : `${palette.bgGlow} scale-110`
          }`}
        />

        {/* Door Frame */}
        <div
          className={`relative w-40 h-52 rounded-2xl border-[3px] p-2 shadow-2xl flex flex-col justify-between overflow-hidden transition-colors duration-300 ${
            isLight
              ? 'bg-[#e5e1d8] border-[#c8c2b5]'
              : 'bg-neutral-900/90 border-neutral-700/80'
          }`}
        >
          {/* Inner Door Slab */}
          <motion.div
            className={`relative w-full h-full rounded-xl border flex flex-col items-center justify-between p-3 transition-colors duration-500 cursor-pointer ${
              doorState === 'locked'
                ? isLight
                  ? 'bg-gradient-to-b from-[#dfd9ce] to-[#cfc8bc] border-[#b8b0a2]'
                  : 'bg-gradient-to-b from-neutral-800 to-neutral-900 border-neutral-700'
                : doorState === 'knock'
                ? isLight
                  ? `${palette.lightBg} ${palette.lightBorder}`
                  : `bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-900 ${palette.darkBorder}`
                : isLight
                ? `${palette.lightBg} ${palette.lightBorder}`
                : `bg-gradient-to-b from-neutral-900 to-neutral-900 ${palette.darkBorder}`
            }`}
            animate={{
              rotateY: doorState === 'locked' ? 0 : doorState === 'knock' ? -18 : -55,
              x: doorState === 'open' ? 14 : 0,
            }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            onClick={() => {
              if (doorState === 'locked') handleSelectState('knock');
              else if (doorState === 'knock') handleSelectState('open');
              else handleSelectState('locked');
            }}
          >
            {/* Top Door Grain & Peephole */}
            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                id="door-peephole-lens-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenVideoPeek) {
                    nativeBridge.haptic('selection');
                    onOpenVideoPeek();
                  }
                }}
                className={`w-6 h-6 rounded-full border flex items-center justify-center shadow-inner hover:scale-125 transition-transform group relative ${
                  activeBeam
                    ? 'bg-amber-950 border-amber-400 ring-2 ring-amber-400/60 ring-offset-1 ring-offset-neutral-900 animate-pulse'
                    : 'bg-neutral-950 border-neutral-600'
                }`}
                title={activeBeam ? `Live VR Beam active from ${activeBeam.senderName} (Tap to look through)` : "Peephole: Tap to peek video/beam"}
              >
                {activeBeam ? (
                  <div className="w-3 h-3 rounded-full overflow-hidden border border-amber-300">
                    <img
                      src={activeBeam.imageUrl}
                      alt="Peephole preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className={`w-2 h-2 rounded-full ${palette.badge} animate-pulse`} />
                )}
                <span className="sr-only">Peephole Optical Peek</span>
              </button>

              <div className="flex items-center gap-1.5">
                {timedLockMinutes && doorState === 'locked' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/50 font-mono">
                    {timedLockMinutes}m Left
                  </span>
                )}
                {dndScheduleActive && doorState === 'locked' && !timedLockMinutes && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 font-mono flex items-center gap-0.5">
                    <Moon className="w-2.5 h-2.5" /> DND
                  </span>
                )}
                <span className={`text-[9px] font-mono tracking-widest uppercase ${isLight ? 'text-neutral-600' : 'text-neutral-500'}`}>
                  {doorState}
                </span>
              </div>
            </div>

            {/* Center State Icon / Deadbolt */}
            <div className="relative flex flex-col items-center">
              <AnimatePresence mode="wait">
                {doorState === 'locked' && (
                  <motion.div
                    key="locked-icon"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                      <Lock className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-semibold text-rose-300">LATCHED SHUT</span>
                  </motion.div>
                )}

                {doorState === 'knock' && (
                  <motion.div
                    key="knock-icon"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className={`w-12 h-12 rounded-2xl ${palette.darkBg} border ${palette.darkBorder} flex items-center justify-center ${palette.iconColor} shadow-[0_0_15px_${palette.hex}40]`}>
                      <Bell className="w-6 h-6 animate-bounce" />
                    </div>
                    <span className={`text-[10px] font-semibold ${palette.darkText}`}>DOOR CRACKED</span>
                  </motion.div>
                )}

                {doorState === 'open' && (
                  <motion.div
                    key="open-icon"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className={`w-12 h-12 rounded-2xl ${palette.darkBg} border ${palette.darkBorder} flex items-center justify-center ${palette.iconColor} shadow-[0_0_15px_${palette.hex}60]`}>
                      <DoorOpen className="w-6 h-6" />
                    </div>
                    <span className={`text-[10px] font-semibold ${palette.darkText}`}>WIDE OPEN</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* The Mechanical Latch Bolt & Strike Plate on the Door Edge */}
            <div className="w-full flex items-center justify-end pr-1 gap-1">
              {/* Latch tongue that physically extends into the strike plate */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleLatch();
                }}
                className="relative flex items-center cursor-pointer group"
                title="Spring Latch Bolt (Click to throw/retract bolt)"
              >
                {/* Brass strike plate on jamb */}
                <div className="w-1.5 h-6 rounded-sm bg-amber-400/80 border border-amber-500 shadow-sm" />
                {/* Sliding steel bolt tongue */}
                <motion.div
                  className={`h-2.5 rounded-l-sm border transition-colors ${
                    doorState === 'locked' ? 'bg-rose-400 border-rose-500' : 'bg-neutral-300 border-neutral-400'
                  }`}
                  animate={{
                    width: doorState === 'locked' ? 9 : 2,
                    x: doorState === 'locked' ? -1 : -5,
                  }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              </div>

              {/* Brass / Metallic Door Knob */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTurnKnob();
                }}
                className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 border border-amber-300 shadow-sm flex items-center justify-center hover:scale-110 active:rotate-45 transition-transform"
                title="Door Knob (Turn to open/close)"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-800" />
              </button>
            </div>
          </motion.div>

          {/* Active Audio Wave rings coming through door if friend is talking */}
          {activeSpeakerName && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1.1 }}
              transition={{ repeat: Infinity, duration: 0.8, repeatType: 'reverse' }}
              className={`absolute -top-2 -bottom-2 -left-2 -right-2 border-2 ${palette.pillBorder} rounded-2xl pointer-events-none`}
            />
          )}
        </div>
      </div>

      {/* Door Hardware Quick Action Bar: Latch & Knob Direct Triggers */}
      <div className="flex items-center justify-center gap-2 mb-2 w-full max-w-xs">
        <LatchBoltQuickAction
          doorState={doorState}
          onToggleLatch={handleToggleLatch}
          accentColor={accentColor}
          theme={theme}
          compact
        />

        <button
          id="door-knob-quick-trigger"
          onClick={() => {
            soundEngine.unlockAudio();
            nativeBridge.haptic('selection');
            if (onOpenKnobDrawer) onOpenKnobDrawer();
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
            isLight
              ? 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-800 shadow-sm'
              : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-200'
          }`}
          title="Open The Knob (Quick Actions & Hardware)"
        >
          <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-600 to-amber-300 border border-amber-400 flex items-center justify-center text-neutral-950">
            <Disc className="w-2 h-2" />
          </div>
          <span>The Knob</span>
        </button>
      </div>

      {/* Explanatory Caption */}
      <div className="text-center px-4 min-h-[34px] flex items-center justify-center mb-1.5">
        <p className="text-xs text-neutral-400 font-normal max-w-xs leading-tight">
          {doorState === 'locked' && (
            <span>Latch engaged in strike plate. No spontaneous audio. Friends can leave a note.</span>
          )}
          {doorState === 'knock' && (
            <span>Door cracked open. When a friend taps to speak, chimes for 2s before audio plays.</span>
          )}
          {doorState === 'open' && (
            <span>Door unlatched wide open. Friends with your key speak directly through immediately.</span>
          )}
        </p>
      </div>

      {/* 3-State Tactile Switcher */}
      <div
        className={`w-full max-w-xs p-1 rounded-2xl border flex items-center justify-between shadow-lg transition-colors ${
          isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900/90 border-neutral-800'
        }`}
      >
        <button
          id="door-state-locked-btn"
          onClick={() => handleSelectState('locked')}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all ${
            doorState === 'locked'
              ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30 shadow-sm'
              : isLight
              ? 'text-neutral-500 hover:text-neutral-900'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Locked</span>
        </button>

        <button
          id="door-state-knock-btn"
          onClick={() => handleSelectState('knock')}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all ${
            doorState === 'knock'
              ? `${palette.darkBg} ${palette.iconColor} border ${palette.darkBorder} shadow-sm`
              : isLight
              ? 'text-neutral-500 hover:text-neutral-900'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Knock</span>
        </button>

        <button
          id="door-state-open-btn"
          onClick={() => handleSelectState('open')}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all ${
            doorState === 'open'
              ? `${palette.darkBg} ${palette.iconColor} border ${palette.darkBorder} shadow-sm`
              : isLight
              ? 'text-neutral-500 hover:text-neutral-900'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <DoorOpen className="w-3.5 h-3.5" />
          <span>Open</span>
        </button>
      </div>

      {/* Timed Lock Options when Door is Locked */}
      {doorState === 'locked' && (
        <div className="mt-2 flex items-center justify-center">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] transition-colors ${
              isLight
                ? 'bg-white border-neutral-200 text-neutral-600 shadow-sm'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-400'
            }`}
          >
            <Timer className="w-3 h-3 text-amber-500" />
            <span>Auto-unlock:</span>
            <button
              onClick={() => onSetTimedLock && onSetTimedLock(30)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                timedLockMinutes === 30
                  ? `${palette.darkBg} ${palette.iconColor} font-bold`
                  : isLight
                  ? 'hover:text-neutral-900'
                  : 'hover:text-neutral-200'
              }`}
            >
              30m
            </button>
            <span>•</span>
            <button
              onClick={() => onSetTimedLock && onSetTimedLock(60)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                timedLockMinutes === 60
                  ? `${palette.darkBg} ${palette.iconColor} font-bold`
                  : isLight
                  ? 'hover:text-neutral-900'
                  : 'hover:text-neutral-200'
              }`}
            >
              1h
            </button>
            <span>•</span>
            <button
              onClick={() => onSetTimedLock && onSetTimedLock(null)}
              className={`px-1.5 py-0.5 rounded text-[10px] transition ${
                !timedLockMinutes ? 'text-rose-500 font-bold' : isLight ? 'hover:text-neutral-900' : 'hover:text-neutral-200'
              }`}
            >
              Manual
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
