import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Bell,
  BellOff,
  Sparkles,
  Mic,
  FileText,
  Glasses,
  Play,
  Volume2,
  Lock,
  Unlock,
  Clock,
  Filter,
  CheckCircle2,
  Trash2,
  Eye,
  Plus,
} from 'lucide-react';
import { DoorInteraction, InteractionType, AccentColor } from '../types';
import { soundEngine } from '../services/audioHaptics';
import { nativeBridge } from '../services/nativeBridge';
import { liveDoorService } from '../services/liveDoorService';
import { THEME_PALETTES } from '../utils/themeStyles';

interface DoorHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  interactions: DoorInteraction[];
  onClearHistory?: () => void;
  accentColor?: AccentColor;
  theme?: 'light' | 'dark';
}

type FilterCategory = 'all' | 'missed_knocks' | 'whispers' | 'voice_drops' | 'notes_beams';

export const DoorHistoryDrawer: React.FC<DoorHistoryDrawerProps> = ({
  isOpen,
  onClose,
  interactions,
  onClearHistory,
  accentColor = 'emerald',
  theme = 'dark',
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [playingInteractionId, setPlayingInteractionId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isLight = theme === 'light';
  const palette = THEME_PALETTES[accentColor] || THEME_PALETTES.emerald;

  // Filter interactions
  const filteredInteractions = interactions.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'missed_knocks') {
      return item.type === 'missed_knock' || item.wasMissed;
    }
    if (activeFilter === 'whispers') {
      return item.type === 'whisper_received';
    }
    if (activeFilter === 'voice_drops') {
      return item.type === 'voice_dropin';
    }
    if (activeFilter === 'notes_beams') {
      return item.type === 'note_slipped' || item.type === 'beam_shared';
    }
    return true;
  });

  // Calculate stats
  const totalCount = interactions.length;
  const missedKnocksCount = interactions.filter((i) => i.type === 'missed_knock' || i.wasMissed).length;
  const whispersCount = interactions.filter((i) => i.type === 'whisper_received').length;
  const voiceDropsCount = interactions.filter((i) => i.type === 'voice_dropin').length;

  const handlePlayVoice = (interaction: DoorInteraction) => {
    soundEngine.unlockAudio();
    soundEngine.playWhisperChime();
    nativeBridge.haptic('selection');
    setPlayingInteractionId(interaction.id);

    if (interaction.audioBlobUrl) {
      liveDoorService.playAudioBase64(interaction.audioBlobUrl);
    }

    const durationMs = (interaction.audioDuration || 3) * 1000;
    setTimeout(() => {
      setPlayingInteractionId((curr) => (curr === interaction.id ? null : curr));
    }, durationMs);
  };

  const formatRelativeTime = (date: Date) => {
    const diffMs = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return 'Yesterday';
  };

  const getInteractionIcon = (interaction: DoorInteraction) => {
    switch (interaction.type) {
      case 'missed_knock':
        return <BellOff className="w-4 h-4 text-rose-500" />;
      case 'answered_knock':
        return <Bell className="w-4 h-4 text-amber-400" />;
      case 'whisper_received':
        return <Sparkles className={`w-4 h-4 ${palette.iconColor}`} />;
      case 'voice_dropin':
        return <Mic className={`w-4 h-4 ${palette.iconColor}`} />;
      case 'note_slipped':
        return <FileText className="w-4 h-4 text-amber-500" />;
      case 'beam_shared':
        return <Glasses className="w-4 h-4 text-cyan-400" />;
      case 'latch_toggled':
        return <Lock className="w-4 h-4 text-neutral-400" />;
      default:
        return <Clock className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getBadgeStyle = (interaction: DoorInteraction) => {
    if (interaction.type === 'missed_knock') {
      return 'bg-rose-500/15 text-rose-500 border-rose-500/30';
    }
    if (interaction.type === 'whisper_received') {
      return `${palette.darkBg} ${palette.darkText} border ${palette.darkBorder}`;
    }
    if (interaction.type === 'voice_dropin') {
      return `${palette.darkBg} ${palette.darkText} border ${palette.darkBorder}`;
    }
    if (interaction.type === 'note_slipped') {
      return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
    }
    if (interaction.type === 'beam_shared') {
      return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    }
    return 'bg-neutral-800 text-neutral-300 border-neutral-700';
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className={`w-full max-w-md h-full flex flex-col p-5 shadow-2xl border-l overflow-hidden ${
          isLight
            ? 'bg-[#fcfbf9] border-neutral-200 text-neutral-900'
            : 'bg-neutral-900 border-neutral-800 text-white'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${palette.badge} text-neutral-950 font-bold shadow-md`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold tracking-tight">Door History</h2>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${palette.badge} text-neutral-950`}>
                  {totalCount} Today
                </span>
              </div>
              <span className="text-[11px] text-neutral-400">Past knocks, whispers, slips & drop-ins</span>
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

        {/* Day's Quick Metrics Strip */}
        <div className="grid grid-cols-3 gap-2 my-3">
          {/* Missed Knocks */}
          <button
            onClick={() => {
              nativeBridge.haptic('selection');
              setActiveFilter('missed_knocks');
            }}
            className={`p-2 rounded-xl border flex flex-col items-center gap-0.5 transition ${
              activeFilter === 'missed_knocks'
                ? 'bg-rose-500/20 border-rose-500 text-rose-500 ring-1 ring-rose-500'
                : isLight
                ? 'bg-white border-neutral-200 hover:bg-neutral-100 text-neutral-700'
                : 'bg-neutral-850 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
            }`}
          >
            <div className="flex items-center gap-1">
              <BellOff className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-xs font-bold font-mono">{missedKnocksCount}</span>
            </div>
            <span className="text-[10px] text-neutral-400 font-medium">Missed Knocks</span>
          </button>

          {/* Whispers Received */}
          <button
            onClick={() => {
              nativeBridge.haptic('selection');
              setActiveFilter('whispers');
            }}
            className={`p-2 rounded-xl border flex flex-col items-center gap-0.5 transition ${
              activeFilter === 'whispers'
                ? `${palette.darkBg} ${palette.darkBorder} ${palette.darkText} ring-1 ${palette.ringColor}`
                : isLight
                ? 'bg-white border-neutral-200 hover:bg-neutral-100 text-neutral-700'
                : 'bg-neutral-850 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
            }`}
          >
            <div className="flex items-center gap-1">
              <Sparkles className={`w-3.5 h-3.5 ${palette.iconColor}`} />
              <span className="text-xs font-bold font-mono">{whispersCount}</span>
            </div>
            <span className="text-[10px] text-neutral-400 font-medium">Whispers</span>
          </button>

          {/* Voice Drops */}
          <button
            onClick={() => {
              nativeBridge.haptic('selection');
              setActiveFilter('voice_drops');
            }}
            className={`p-2 rounded-xl border flex flex-col items-center gap-0.5 transition ${
              activeFilter === 'voice_drops'
                ? `${palette.darkBg} ${palette.darkBorder} ${palette.darkText} ring-1 ${palette.ringColor}`
                : isLight
                ? 'bg-white border-neutral-200 hover:bg-neutral-100 text-neutral-700'
                : 'bg-neutral-850 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
            }`}
          >
            <div className="flex items-center gap-1">
              <Mic className={`w-3.5 h-3.5 ${palette.iconColor}`} />
              <span className="text-xs font-bold font-mono">{voiceDropsCount}</span>
            </div>
            <span className="text-[10px] text-neutral-400 font-medium">Voice Drops</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 pb-2 overflow-x-auto no-scrollbar border-b border-neutral-200 dark:border-neutral-800 mb-2">
          <button
            onClick={() => {
              nativeBridge.haptic('selection');
              setActiveFilter('all');
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeFilter === 'all'
                ? `${palette.badge} text-neutral-950 font-bold shadow-sm`
                : isLight
                ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-750'
            }`}
          >
            All Logs ({totalCount})
          </button>

          <button
            onClick={() => {
              nativeBridge.haptic('selection');
              setActiveFilter('missed_knocks');
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeFilter === 'missed_knocks'
                ? 'bg-rose-500 text-white font-bold shadow-sm'
                : isLight
                ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-750'
            }`}
          >
            Missed Knocks
          </button>

          <button
            onClick={() => {
              nativeBridge.haptic('selection');
              setActiveFilter('whispers');
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeFilter === 'whispers'
                ? `${palette.badge} text-neutral-950 font-bold shadow-sm`
                : isLight
                ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-750'
            }`}
          >
            Whispers ({whispersCount})
          </button>

          <button
            onClick={() => {
              nativeBridge.haptic('selection');
              setActiveFilter('notes_beams');
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeFilter === 'notes_beams'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : isLight
                ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-750'
            }`}
          >
            Slips & Beams
          </button>
        </div>

        {/* Scrollable Interaction Feed */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
          {filteredInteractions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-neutral-800/40 border border-neutral-700 flex items-center justify-center text-neutral-500 mb-2">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-neutral-300">No interactions recorded</span>
              <p className="text-xs text-neutral-500 max-w-xs mt-1">
                When friends knock, send 5-second whispers, or drop in, they will be logged here.
              </p>
            </div>
          ) : (
            filteredInteractions.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-2xl border transition-all ${
                  item.type === 'missed_knock'
                    ? isLight
                      ? 'bg-rose-50/70 border-rose-200'
                      : 'bg-rose-950/20 border-rose-500/25'
                    : isLight
                    ? 'bg-white border-neutral-200 shadow-sm'
                    : 'bg-neutral-850 border-neutral-800'
                }`}
              >
                {/* Top row: Avatar, Friend, Status Tag, Timestamp */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <img
                      src={item.friendAvatar}
                      alt={item.friendName}
                      className="w-7 h-7 rounded-full object-cover border border-neutral-600"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold leading-none">{item.friendName}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono border ${getBadgeStyle(item)}`}>
                          {item.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {getInteractionIcon(item)}
                  </div>
                </div>

                {/* Summary / Transcript */}
                <div className="pl-9">
                  <p className="text-xs font-medium text-neutral-300 dark:text-neutral-200 leading-snug">
                    {item.summary}
                  </p>
                  {item.details && (
                    <p className="text-[11px] text-neutral-400 mt-0.5 leading-tight">
                      {item.details}
                    </p>
                  )}

                  {/* If Whisper or Audio Note, show playable transcript bubble */}
                  {item.voiceTranscript && (
                    <div
                      className={`mt-2 p-2 rounded-xl border flex items-center justify-between gap-2 ${
                        isLight ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-900 border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Volume2 className={`w-3.5 h-3.5 shrink-0 ${palette.iconColor}`} />
                        <span className="text-xs italic text-neutral-300 dark:text-neutral-200 truncate">
                          "{item.voiceTranscript}"
                        </span>
                      </div>

                      <button
                        onClick={() => handlePlayVoice(item)}
                        className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                          playingInteractionId === item.id
                            ? `${palette.badge} text-neutral-950 animate-pulse`
                            : isLight
                            ? 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                        }`}
                        title="Replay Voice Audio"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>{playingInteractionId === item.id ? 'Playing...' : 'Replay'}</span>
                      </button>
                    </div>
                  )}

                  {/* If Optical Beam Image, show interactive thumbnail */}
                  {item.imageUrl && (
                    <div className="mt-2">
                      <button
                        onClick={() => setSelectedImage(item.imageUrl || null)}
                        className="relative rounded-xl overflow-hidden border border-neutral-700 group hover:opacity-90 transition block"
                      >
                        <img
                          src={item.imageUrl}
                          alt="Beamed camera view"
                          className="w-full h-28 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Footer Real-Time Status & Clear Controls */}
        <div className="pt-3 mt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-neutral-400 font-mono">Live Door Event Log</span>
          </div>

          {onClearHistory && totalCount > 0 && (
            <button
              onClick={() => {
                nativeBridge.haptic('light');
                onClearHistory();
              }}
              className="text-[11px] text-neutral-500 hover:text-rose-400 flex items-center gap-1 transition"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Expanded Image Modal */}
        <AnimatePresence>
          {selectedImage && (
            <div
              onClick={() => setSelectedImage(null)}
              className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
            >
              <div className="relative max-w-sm w-full rounded-2xl overflow-hidden border border-neutral-700">
                <img src={selectedImage} alt="Expanded Optical Peek" className="w-full object-cover" />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-neutral-900/80 text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
