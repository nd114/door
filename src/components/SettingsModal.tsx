import React from 'react';
import { motion } from 'motion/react';
import {
  X,
  Sliders,
  Vibrate,
  Clock,
  Volume2,
  Sun,
  Moon,
  Check,
  Play,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import {
  AppSettings,
  KnockHapticPattern,
  ActivePttHapticPattern,
} from '../types';
import { soundEngine } from '../services/audioHaptics';
import { nativeBridge } from '../services/nativeBridge';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onOpenDoorHistory?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onOpenDoorHistory,
}) => {
  if (!isOpen) return null;

  const isLight = settings.theme === 'light';

  const KNOCK_PATTERNS: { id: KnockHapticPattern; label: string; desc: string }[] = [
    {
      id: 'standard',
      label: 'Subtle Double Tap',
      desc: 'Gentle, balanced 2-beat tap for everyday presence',
    },
    {
      id: 'wood_rattle',
      label: 'Heavy Wood Rattle',
      desc: 'Firm, multi-pulse tactile knock with high feedback',
    },
    {
      id: 'heartbeat',
      label: 'Heartbeat Pulse',
      desc: 'Warm, rhythmic double thud like an intimate heartbeat',
    },
    {
      id: 'minimal',
      label: 'Minimalist Click',
      desc: 'Single light vibration tick for quiet environments',
    },
  ];

  const TRANSMISSION_PATTERNS: {
    id: ActivePttHapticPattern;
    label: string;
    desc: string;
  }[] = [
    {
      id: 'tick',
      label: 'Crisp Beginning Tick',
      desc: 'A single sharp mechanical click when transmission starts',
    },
    {
      id: 'continuous',
      label: 'Continuous Micro-Pulse',
      desc: 'Subtle periodic pulse confirming your mic is active',
    },
    {
      id: 'double_chime',
      label: 'Soft Double Pulse',
      desc: 'Warm start/stop indicators',
    },
    {
      id: 'silent',
      label: 'Silent (Audio Only)',
      desc: 'No vibration, only the walkie-talkie audio chirp',
    },
  ];

  const handleTestKnock = (pattern: KnockHapticPattern) => {
    soundEngine.unlockAudio();
    soundEngine.setSettings(pattern, settings.transmissionHaptic, settings.audioSpeechVoice);
    soundEngine.playDoorKnock();
  };

  const handleTestTransmission = (pattern: ActivePttHapticPattern) => {
    soundEngine.unlockAudio();
    soundEngine.setSettings(settings.knockHaptic, pattern, settings.audioSpeechVoice);
    soundEngine.playPttStart();
    setTimeout(() => {
      soundEngine.playPttEnd();
    }, 400);
  };

  const handleTestSpeakerVoice = () => {
    soundEngine.unlockAudio();
    soundEngine.playDoorKnock();
    setTimeout(() => {
      soundEngine.playWhisperChime();
    }, 400);
    setTimeout(() => {
      soundEngine.playBeamChime();
    }, 850);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`w-full max-w-md rounded-3xl border shadow-2xl max-h-[88vh] flex flex-col overflow-hidden transition-colors ${
          isLight
            ? 'bg-[#faf9f6] border-[#e2ded6] text-[#1c1917]'
            : 'bg-neutral-900 border-neutral-800 text-neutral-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isLight ? 'border-neutral-200 bg-white/70' : 'border-neutral-800 bg-neutral-950/60'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-500" />
            <div>
              <h3 className="text-sm font-bold">Preferences & Hardware</h3>
              <p className="text-[11px] text-neutral-400">Haptics, DND schedule, and audio</p>
            </div>
          </div>

          <button
            onClick={() => {
              nativeBridge.haptic('light');
              onClose();
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
              isLight
                ? 'bg-neutral-200 hover:bg-neutral-300 text-neutral-700'
                : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-300'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto max-h-[72vh] flex flex-col gap-6 no-scrollbar">
          {/* Door History Section */}
          {onOpenDoorHistory && (
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Door History & Interaction Log
                </label>
                <span className="text-[10px] text-amber-500 font-semibold">Today's Activity</span>
              </div>
              <div
                onClick={() => {
                  nativeBridge.haptic('selection');
                  onClose();
                  onOpenDoorHistory();
                }}
                className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition group ${
                  isLight
                    ? 'bg-amber-50/50 hover:bg-amber-100/50 border-amber-200'
                    : 'bg-neutral-850 hover:bg-neutral-800 border-neutral-750'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-neutral-950 flex items-center justify-center font-bold shadow-md group-hover:scale-105 transition-transform">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold flex items-center gap-1.5">
                      <span>View Daily Door Log</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 font-mono">
                        NEW
                      </span>
                    </h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Scroll through missed knocks, whispers received, notes & voice drops.
                    </p>
                  </div>
                </div>

                <div className={`p-2 rounded-xl border transition ${
                  isLight ? 'bg-white border-neutral-200 text-neutral-700' : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                }`}>
                  <Play className="w-3.5 h-3.5 fill-current" />
                </div>
              </div>
            </section>
          )}

          {/* Appearance Theme Selector */}
          <section className="flex flex-col gap-2">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Visual Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  nativeBridge.haptic('selection');
                  onUpdateSettings({ ...settings, theme: 'light' });
                }}
                className={`p-3 rounded-2xl border flex items-center justify-between transition ${
                  isLight
                    ? 'bg-white border-amber-500 shadow-md text-neutral-900 font-bold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-xs">Light Mode</span>
                </div>
                {isLight && <Check className="w-4 h-4 text-amber-500 stroke-[3]" />}
              </button>

              <button
                onClick={() => {
                  nativeBridge.haptic('selection');
                  onUpdateSettings({ ...settings, theme: 'dark' });
                }}
                className={`p-3 rounded-2xl border flex items-center justify-between transition ${
                  !isLight
                    ? 'bg-neutral-800 border-amber-500 text-white font-bold shadow-md'
                    : 'bg-white/60 border-neutral-200 text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs">Dark Mode</span>
                </div>
                {!isLight && <Check className="w-4 h-4 text-amber-500 stroke-[3]" />}
              </button>
            </div>
          </section>

          {/* Time-Based Do Not Disturb Schedule */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-400" />
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Scheduled 'Locked Door' (DND)
                </label>
              </div>

              <input
                type="checkbox"
                id="dnd-enable-toggle"
                checked={settings.dndSchedule.enabled}
                onChange={(e) => {
                  nativeBridge.haptic('selection');
                  onUpdateSettings({
                    ...settings,
                    dndSchedule: {
                      ...settings.dndSchedule,
                      enabled: e.target.checked,
                    },
                  });
                }}
                className="w-4 h-4 rounded accent-rose-500 cursor-pointer"
              />
            </div>

            <p className="text-[11px] text-neutral-400">
              Automatically latches your deadbolt so friends cannot spontaneous drop-in during sleep or focus hours.
            </p>

            <div
              className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                isLight ? 'bg-white border-neutral-200' : 'bg-neutral-950 border-neutral-850'
              } ${!settings.dndSchedule.enabled ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 font-medium">Lock from:</span>
                <input
                  type="time"
                  value={settings.dndSchedule.startTime}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      dndSchedule: {
                        ...settings.dndSchedule,
                        startTime: e.target.value,
                      },
                    })
                  }
                  className={`px-2 py-1 rounded-xl border text-xs font-mono font-bold ${
                    isLight
                      ? 'bg-neutral-100 border-neutral-300 text-neutral-900'
                      : 'bg-neutral-900 border-neutral-700 text-neutral-100'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 font-medium">Until:</span>
                <input
                  type="time"
                  value={settings.dndSchedule.endTime}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      dndSchedule: {
                        ...settings.dndSchedule,
                        endTime: e.target.value,
                      },
                    })
                  }
                  className={`px-2 py-1 rounded-xl border text-xs font-mono font-bold ${
                    isLight
                      ? 'bg-neutral-100 border-neutral-300 text-neutral-900'
                      : 'bg-neutral-900 border-neutral-700 text-neutral-100'
                  }`}
                />
              </div>
            </div>
          </section>

          {/* Audio & Laptop Speaker Output Test */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Audio & Voice Output (Laptop Speaker)
                </label>
              </div>

              <input
                type="checkbox"
                id="voice-enable-toggle"
                checked={settings.audioSpeechVoice}
                onChange={(e) => {
                  nativeBridge.haptic('selection');
                  onUpdateSettings({
                    ...settings,
                    audioSpeechVoice: e.target.checked,
                  });
                }}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />
            </div>

            <p className="text-[11px] text-neutral-400">
              When friends talk or knock, play the actual acoustic chime and synthesize their spoken message aloud on your device.
            </p>

            <button
              onClick={handleTestSpeakerVoice}
              className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs font-semibold transition ${
                isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-emerald-950/40 border-emerald-700/40 text-emerald-300 hover:bg-emerald-900/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5" />
                <span>Test Knock Sound & Spoken Friend Voice</span>
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider font-bold">Play Sample</span>
            </button>
          </section>

          {/* Knock Haptic Alert Pattern */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5">
              <Vibrate className="w-4 h-4 text-amber-500" />
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Knock Alert Haptic Pattern
              </label>
            </div>
            <p className="text-[11px] text-neutral-400">
              Vibrations felt when a friend knocks or asks to enter your door.
            </p>

            <div className="flex flex-col gap-1.5">
              {KNOCK_PATTERNS.map((p) => {
                const isSelected = settings.knockHaptic === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onUpdateSettings({ ...settings, knockHaptic: p.id });
                      handleTestKnock(p.id);
                    }}
                    className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10'
                        : isLight
                        ? 'bg-white border-neutral-200 hover:border-neutral-300'
                        : 'bg-neutral-950 border-neutral-850 hover:border-neutral-750'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{p.label}</span>
                        {isSelected && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500 text-neutral-950 font-bold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">{p.desc}</p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestKnock(p.id);
                      }}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] flex items-center gap-1"
                      title="Test vibration & sound"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Active Transmission Haptic Pattern */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-400" />
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Active Transmission (PTT) Signal
              </label>
            </div>
            <p className="text-[11px] text-neutral-400">
              Tactile cues that confirm you are actively holding the open mic.
            </p>

            <div className="flex flex-col gap-1.5">
              {TRANSMISSION_PATTERNS.map((p) => {
                const isSelected = settings.transmissionHaptic === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onUpdateSettings({ ...settings, transmissionHaptic: p.id });
                      handleTestTransmission(p.id);
                    }}
                    className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : isLight
                        ? 'bg-white border-neutral-200 hover:border-neutral-300'
                        : 'bg-neutral-950 border-neutral-850 hover:border-neutral-750'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{p.label}</span>
                        {isSelected && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-neutral-950 font-bold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">{p.desc}</p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestTransmission(p.id);
                      }}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] flex items-center gap-1"
                      title="Test vibration & sound"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
};
