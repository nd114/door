import React from 'react';
import { motion } from 'motion/react';
import {
  X,
  Key,
  Palette,
  Smartphone,
  Moon,
  Sun,
  Volume2,
  Clock,
  Radio,
  FileText,
  Sparkles,
  ChevronRight,
  Disc,
  Lock,
  DoorOpen,
  Bell,
  Eye,
  Check,
} from 'lucide-react';
import { AppSettings, DoorState, AccentColor } from '../types';
import { BrandName } from './BrandSelectorModal';
import { soundEngine } from '../services/audioHaptics';
import { nativeBridge } from '../services/nativeBridge';
import { LatchBoltQuickAction } from './LatchBoltQuickAction';
import { THEME_PALETTES } from '../utils/themeStyles';

interface QuickHubDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  doorState: DoorState;
  onDoorStateChange: (state: DoorState) => void;
  onOpenKeyholders: () => void;
  onOpenBrandSelector: () => void;
  onOpenNativeGuide: () => void;
  selectedBrand: BrandName;
  friendsCount: number;
  doorNotesCount: number;
  onOpenShowAndTell?: () => void;
  onOpenVideoPeek?: () => void;
  onOpenDoorHistory?: () => void;
  interactionsCount?: number;
  missedKnocksCount?: number;
}

export const QuickHubDrawer: React.FC<QuickHubDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  doorState,
  onDoorStateChange,
  onOpenKeyholders,
  onOpenBrandSelector,
  onOpenNativeGuide,
  selectedBrand,
  friendsCount,
  doorNotesCount,
  onOpenShowAndTell,
  onOpenVideoPeek,
  onOpenDoorHistory,
  interactionsCount = 0,
  missedKnocksCount = 0,
}) => {
  if (!isOpen) return null;

  const isLight = settings.theme === 'light';
  const currentAccent = settings.accentColor || 'emerald';
  const palette = THEME_PALETTES[currentAccent] || THEME_PALETTES.emerald;

  const handleSelectAccent = (color: AccentColor) => {
    soundEngine.unlockAudio();
    soundEngine.playPttStart();
    nativeBridge.haptic('selection');
    onUpdateSettings({
      ...settings,
      accentColor: color,
    });
  };

  const handleTurnKnob = () => {
    soundEngine.unlockAudio();
    soundEngine.playDoorUnlock();
    nativeBridge.haptic('medium');
    if (doorState === 'locked') {
      onDoorStateChange('knock');
    } else if (doorState === 'knock') {
      onDoorStateChange('open');
    } else {
      onDoorStateChange('locked');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className={`w-full max-w-sm h-full flex flex-col p-5 shadow-2xl border-l overflow-y-auto ${
          isLight
            ? 'bg-[#fcfbf9] border-neutral-200 text-neutral-900'
            : 'bg-neutral-900 border-neutral-800 text-white'
        }`}
      >
        {/* Header with Rotary Door Knob Visual */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800 mb-3">
          <div className="flex items-center gap-2.5">
            {/* Tactile Brass / Steel Knob */}
            <button
              onClick={handleTurnKnob}
              id="header-knob-turn-btn"
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-700 via-amber-400 to-amber-200 border-2 border-amber-300 flex items-center justify-center text-neutral-950 shadow-md hover:scale-110 active:rotate-45 transition-transform"
              title="Click to turn the door knob"
            >
              <div className="w-4 h-4 rounded-full bg-amber-600 border border-amber-200 flex items-center justify-center">
                <Disc className="w-2.5 h-2.5 text-amber-100" />
              </div>
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold tracking-tight">The Knob</h2>
                <span className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded-full font-bold ${palette.badge} text-neutral-950`}>
                  Quick Actions
                </span>
              </div>
              <span className="text-[11px] text-neutral-400">Door hardware & communication hub</span>
            </div>
          </div>

          <button
            onClick={() => {
              nativeBridge.haptic('light');
              onClose();
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              isLight ? 'bg-neutral-200/80 hover:bg-neutral-300 text-neutral-700' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation & Action Items */}
        <div className="flex flex-col gap-3.5 flex-1">
          {/* 1. The Latch / Deadbolt Action: "The little thingy that keeps the door in place" */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Door Latch & Deadbolt
              </span>
              <span className="text-[10px] text-neutral-500">1-Tap Hardware Lock</span>
            </div>

            <LatchBoltQuickAction
              doorState={doorState}
              onToggleLatch={() => {
                onDoorStateChange(doorState === 'locked' ? 'open' : 'locked');
              }}
              accentColor={currentAccent}
              theme={settings.theme}
            />
          </div>

          {/* 2. Communication Theme Palette (Green, Blue, Purple) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">
              Communication Hue & Frequency
            </span>
            <div
              className={`p-2.5 rounded-2xl border flex flex-col gap-2 ${
                isLight ? 'bg-white border-neutral-200 shadow-sm' : 'bg-neutral-850 border-neutral-800'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold px-1">
                <span>Active Frequency:</span>
                <span className="capitalize font-bold flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${palette.badge}`} />
                  {palette.name}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Emerald Green */}
                <button
                  onClick={() => handleSelectAccent('emerald')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${
                    currentAccent === 'emerald'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-300 ring-2 ring-emerald-400/40'
                      : isLight
                      ? 'bg-neutral-100 border-neutral-200 hover:bg-neutral-200/70 text-neutral-700'
                      : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-750 text-neutral-300'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-neutral-950">
                    {currentAccent === 'emerald' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="text-[11px] font-bold">Green</span>
                  <span className="text-[9px] text-neutral-400">Walkie Talkie</span>
                </button>

                {/* Ocean Blue */}
                <button
                  onClick={() => handleSelectAccent('blue')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${
                    currentAccent === 'blue'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-300 ring-2 ring-blue-400/40'
                      : isLight
                      ? 'bg-neutral-100 border-neutral-200 hover:bg-neutral-200/70 text-neutral-700'
                      : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-750 text-neutral-300'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    {currentAccent === 'blue' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="text-[11px] font-bold">Blue</span>
                  <span className="text-[9px] text-neutral-400">Signal / Chat</span>
                </button>

                {/* Velvet Purple */}
                <button
                  onClick={() => handleSelectAccent('purple')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition ${
                    currentAccent === 'purple'
                      ? 'bg-purple-500/20 border-purple-500 text-purple-600 dark:text-purple-300 ring-2 ring-purple-400/40'
                      : isLight
                      ? 'bg-neutral-100 border-neutral-200 hover:bg-neutral-200/70 text-neutral-700'
                      : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-750 text-neutral-300'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white">
                    {currentAccent === 'purple' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="text-[11px] font-bold">Purple</span>
                  <span className="text-[9px] text-neutral-400">Ambient Vibe</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Door Hardware Metaphors */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">
              Door Hardware & Interactions
            </span>

            {/* The Door Log: Missed Knocks, Whispers & Activity */}
            {onOpenDoorHistory && (
              <button
                id="knob-history-btn"
                onClick={() => {
                  nativeBridge.haptic('selection');
                  onClose();
                  onOpenDoorHistory();
                }}
                className={`flex items-center justify-between p-3 rounded-2xl border transition text-left ${
                  isLight
                    ? 'bg-white border-neutral-200 hover:border-amber-400 shadow-sm'
                    : 'bg-neutral-850 border-neutral-800 hover:border-amber-500/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-neutral-950 flex items-center justify-center font-bold shadow-sm">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>The Door Log (History)</span>
                      {missedKnocksCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono font-bold">
                          {missedKnocksCount} Missed
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-neutral-400">
                      {interactionsCount} logged today • Whispers & knocks
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </button>
            )}

            {/* Keyhole: Manage Door Keys */}
            <button
              id="knob-keyholders-btn"
              onClick={() => {
                nativeBridge.haptic('selection');
                onClose();
                onOpenKeyholders();
              }}
              className={`flex items-center justify-between p-3 rounded-2xl border transition text-left ${
                isLight
                  ? 'bg-white border-neutral-200 hover:border-emerald-400 shadow-sm'
                  : 'bg-neutral-850 border-neutral-800 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${palette.badge} text-neutral-950 font-bold`}>
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>The Keyhole & Keys</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${palette.darkBg} ${palette.darkText} font-mono`}>
                      {friendsCount} Keyholders
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400">Issue or revoke instant audio keys</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            {/* Mail Slot: Door Notes */}
            <button
              onClick={() => {
                nativeBridge.haptic('selection');
                onClose();
                onOpenKeyholders();
              }}
              className={`flex items-center justify-between p-3 rounded-2xl border transition text-left ${
                isLight
                  ? 'bg-white border-neutral-200 hover:border-neutral-300 shadow-sm'
                  : 'bg-neutral-850 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>The Mail Slot</span>
                    <span className="text-[10px] text-neutral-400">({doorNotesCount} slips)</span>
                  </div>
                  <span className="text-[11px] text-neutral-400">Notes & voice memos left under door</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            {/* The Peephole: Optical viewer */}
            {onOpenVideoPeek && (
              <button
                onClick={() => {
                  nativeBridge.haptic('selection');
                  onClose();
                  onOpenVideoPeek();
                }}
                className={`flex items-center justify-between p-3 rounded-2xl border transition text-left ${
                  isLight
                    ? 'bg-white border-neutral-200 hover:border-blue-400 shadow-sm'
                    : 'bg-neutral-850 border-neutral-800 hover:border-blue-500/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">The Peephole</div>
                    <span className="text-[11px] text-neutral-400">Optical camera peek & Show and Tell</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </button>
            )}

            {/* Door Material & Brand */}
            <button
              id="knob-brand-btn"
              onClick={() => {
                nativeBridge.haptic('selection');
                onClose();
                onOpenBrandSelector();
              }}
              className={`flex items-center justify-between p-3 rounded-2xl border transition text-left ${
                isLight
                  ? 'bg-white border-neutral-200 hover:border-neutral-300 shadow-sm'
                  : 'bg-neutral-850 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>Door Material & Brand</span>
                    <span className="text-[10px] text-neutral-400 font-normal">({selectedBrand})</span>
                  </div>
                  <span className="text-[11px] text-neutral-400">Oak, Frosted Glass, Metal, Brass</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>
          </div>

          {/* 4. Audio, Voice & Quiet Hours */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">
              Audio Engine
            </span>

            {/* Spoken Voice */}
            <div
              className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                isLight ? 'bg-white border-neutral-200 shadow-sm' : 'bg-neutral-850 border-neutral-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${palette.lightBg} ${palette.iconColor}`}>
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Laptop Voice Speech</div>
                  <span className="text-[11px] text-neutral-400">Speaks friend audio aloud</span>
                </div>
              </div>
              <button
                onClick={() => {
                  soundEngine.unlockAudio();
                  nativeBridge.haptic('selection');
                  onUpdateSettings({
                    ...settings,
                    audioSpeechVoice: !settings.audioSpeechVoice,
                  });
                }}
                className={`w-10 h-6 rounded-full transition-colors relative p-0.5 ${
                  settings.audioSpeechVoice ? palette.badge : 'bg-neutral-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.audioSpeechVoice ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Scheduled DND */}
            <div
              className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                isLight ? 'bg-white border-neutral-200 shadow-sm' : 'bg-neutral-850 border-neutral-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Scheduled DND</div>
                  <span className="text-[11px] text-neutral-400">
                    {settings.dndSchedule.enabled ? `${settings.dndSchedule.startTime} – ${settings.dndSchedule.endTime}` : 'Off'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  soundEngine.unlockAudio();
                  nativeBridge.haptic('selection');
                  onUpdateSettings({
                    ...settings,
                    dndSchedule: {
                      ...settings.dndSchedule,
                      enabled: !settings.dndSchedule.enabled,
                    },
                  });
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition ${
                  settings.dndSchedule.enabled
                    ? 'bg-rose-500/20 text-rose-500 border-rose-500/40'
                    : isLight
                    ? 'bg-neutral-100 text-neutral-600 border-neutral-300'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                }`}
              >
                {settings.dndSchedule.enabled ? 'Active' : 'Off'}
              </button>
            </div>

            {/* Native Mobile Conversion Guide */}
            <button
              id="knob-native-btn"
              onClick={() => {
                nativeBridge.haptic('selection');
                onClose();
                onOpenNativeGuide();
              }}
              className={`flex items-center justify-between p-3 rounded-2xl border transition text-left ${
                isLight
                  ? 'bg-white border-neutral-200 hover:border-neutral-300 shadow-sm'
                  : 'bg-neutral-850 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Native Store Guide</div>
                  <span className="text-[11px] text-neutral-400">1-Button iOS & Android Capacitor</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 text-center flex items-center justify-between">
          <span className="text-[10px] text-neutral-400 font-mono">The Knob • Door Hardware v1.5</span>
          <span className="text-[10px] text-emerald-400 font-medium">● Live Door Key</span>
        </div>
      </motion.div>
    </div>
  );
};
