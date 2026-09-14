import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Key,
  Smartphone,
  Sparkles,
  Volume2,
  ShieldCheck,
  ChevronDown,
  Check,
  Palette,
  Eye,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Mic,
  Sliders,
  Disc,
  Clock,
  Share2,
  UserPlus,
  Radio,
  Users,
} from 'lucide-react';
import { DoorState, Friend, AccessLevel, DoorNote, AppSettings, QuickWhisper, ShowAndTellBeam, AccentColor, DoorInteraction, InteractionType, UserProfile } from './types';
import { PhoneChassis } from './components/PhoneChassis';
import { DoorHero } from './components/DoorHero';
import { PushToTalkButton } from './components/PushToTalkButton';
import { KeyholdersSheet } from './components/KeyholdersSheet';
import { NativeConversionGuide } from './components/NativeConversionGuide';
import { BrandSelectorModal, BrandName } from './components/BrandSelectorModal';
import { VideoPeekModal } from './components/VideoPeekModal';
import { SettingsModal } from './components/SettingsModal';
import { QuickWhisperModal } from './components/QuickWhisperModal';
import { ShowAndTellModal } from './components/ShowAndTellModal';
import { QuickHubDrawer } from './components/QuickHubDrawer';
import { DoorHistoryDrawer } from './components/DoorHistoryDrawer';
import { LiveAuthModal } from './components/LiveAuthModal';
import { LiveFriendConnectModal } from './components/LiveFriendConnectModal';
import { liveDoorService } from './services/liveDoorService';
import { soundEngine } from './services/audioHaptics';
import { nativeBridge } from './services/nativeBridge';
import { THEME_PALETTES } from './utils/themeStyles';

export default function App() {
  // App Core State
  const [selectedBrand, setSelectedBrand] = useState<BrandName>('Door');
  const [doorState, setDoorState] = useState<DoorState>('knock');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string>('');
  const [doorNotes, setDoorNotes] = useState<DoorNote[]>([]);
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [earbudsActive, setEarbudsActive] = useState<boolean>(false);
  const [timedLockMinutes, setTimedLockMinutes] = useState<number | null>(null);
  const [dndScheduleActive, setDndScheduleActive] = useState<boolean>(false);

  // App Settings State (Theme, Haptics, DND, Speech Output)
  const [settings, setSettings] = useState<AppSettings>({
    knockHaptic: 'standard',
    transmissionHaptic: 'tick',
    dndSchedule: {
      enabled: false,
      startTime: '22:00',
      endTime: '07:00',
    },
    audioSpeechVoice: true,
    theme: 'dark',
    accentColor: 'emerald',
  });

  // UI / View Modals State
  const [isPhoneFrameEnabled, setIsPhoneFrameEnabled] = useState<boolean>(true);
  const [isQuickHubOpen, setIsQuickHubOpen] = useState<boolean>(false);
  const [isKeyholdersOpen, setIsKeyholdersOpen] = useState<boolean>(false);
  const [isNativeGuideOpen, setIsNativeGuideOpen] = useState<boolean>(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState<boolean>(false);
  const [isVideoPeekOpen, setIsVideoPeekOpen] = useState<boolean>(false);
  const [isShowAndTellOpen, setIsShowAndTellOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isQuickWhisperOpen, setIsQuickWhisperOpen] = useState<boolean>(false);
  const [whisperTargetFriend, setWhisperTargetFriend] = useState<Friend | null>(null);
  const [isFriendDropdownOpen, setIsFriendDropdownOpen] = useState<boolean>(false);
  const [activeBeam, setActiveBeam] = useState<ShowAndTellBeam | null>(null);

  // Live Firebase User & Peer State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [liveFriends, setLiveFriends] = useState<Friend[]>([]);
  const [pendingDoorCode, setPendingDoorCode] = useState<string | null>(null);

  // Door History Interaction Log State
  const [interactions, setInteractions] = useState<DoorInteraction[]>([]);
  const [isDoorHistoryOpen, setIsDoorHistoryOpen] = useState<boolean>(false);

  // Incoming Drop-in Alert (From real-time friend knocks/voice)
  const [incomingAlert, setIncomingAlert] = useState<{
    active: boolean;
    friendName: string;
    message: string;
    countdown: number;
  } | null>(null);

  // Incoming Quick Whisper Alert
  const [receivedWhisperAlert, setReceivedWhisperAlert] = useState<QuickWhisper | null>(null);

  const selectedFriend = friends.find((f) => f.id === selectedFriendId) || (friends.length > 0 ? friends[0] : null);

  // Parse invite URL door code on initial load (?door=CODE or ?code=CODE)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('door') || params.get('friend') || params.get('code');
      if (code) {
        setPendingDoorCode(code.trim().toUpperCase());
      }
    }
  }, []);

  // Subscribe to Firebase Auth
  useEffect(() => {
    const unsubscribeAuth = liveDoorService.onAuth(async (profile) => {
      setCurrentUser(profile);
      if (!profile) {
        setIsAuthModalOpen(true);
      } else {
        setIsAuthModalOpen(false);
        // If there is an invite code in URL, automatically connect friend!
        if (pendingDoorCode && pendingDoorCode !== profile.doorCode) {
          try {
            const paired = await liveDoorService.connectByDoorCode(profile, pendingDoorCode);
            if (paired) {
              setSelectedFriendId(paired.id);
            }
          } catch (e) {
            console.warn('Auto pair door code error', e);
          }
        }
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, [pendingDoorCode]);

  // Subscribe to real-time Firestore collections when user is authenticated
  useEffect(() => {
    if (!currentUser) return;

    // 1. Real-time keyholder friends list
    const unsubKeyholders = liveDoorService.subscribeToKeyholders(currentUser.uid, (syncedFriends) => {
      setLiveFriends(syncedFriends);
      setFriends(syncedFriends);
      if (syncedFriends.length > 0) {
        setSelectedFriendId((currentId) => {
          const isLiveInList = syncedFriends.some((sf) => sf.id === currentId);
          return isLiveInList ? currentId : syncedFriends[0].id;
        });
      } else {
        setSelectedFriendId('');
      }
    });

    // 2. Real-time incoming events (knocks, voice drop-ins, whispers, beams)
    const unsubEvents = liveDoorService.subscribeToIncomingEvents(currentUser.uid, (event) => {
      soundEngine.unlockAudio();

      if (event.type === 'knock') {
        soundEngine.playDoorKnock();
        nativeBridge.haptic('heavy');
        setIncomingAlert({
          active: true,
          friendName: event.fromName,
          message: doorState === 'locked' ? 'Knocked 3 times (Your door is locked)' : (event.payload || 'Knocked at your door'),
          countdown: 3,
        });
      } else if (event.type === 'whisper') {
        soundEngine.playWhisperChime();
        nativeBridge.haptic('medium');
        if (event.audioBase64) {
          liveDoorService.playAudioBase64(event.audioBase64);
        }
        setReceivedWhisperAlert({
          id: event.id,
          friendId: event.fromUserId,
          friendName: event.fromName,
          avatar: event.fromAvatar,
          transcript: event.audioDuration ? `Live voice whisper (${event.audioDuration.toFixed(1)}s)` : 'Received quick whisper',
          duration: event.audioDuration || 4,
          audioBlobUrl: event.audioBase64,
          timestamp: event.timestamp,
          isPlayed: true,
        });
      } else if (event.type === 'voice_dropin') {
        soundEngine.playDoorOpen();
        nativeBridge.haptic('medium');
        if (event.audioBase64) {
          liveDoorService.playAudioBase64(event.audioBase64);
        }
        setIncomingAlert({
          active: true,
          friendName: event.fromName,
          message: event.audioDuration ? `Voice drop-in (${event.audioDuration.toFixed(1)}s)` : 'Voice connected live through door...',
          countdown: 4,
        });
      } else if (event.type === 'beam') {
        soundEngine.playBeamChime();
        nativeBridge.haptic('success');
        setActiveBeam({
          id: event.id,
          senderId: event.fromUserId,
          senderName: event.fromName,
          senderAvatar: event.fromAvatar,
          imageUrl: event.imageUrl || '',
          caption: event.payload,
          timestamp: event.timestamp,
          active: true,
        });
        setIsVideoPeekOpen(true);
      } else if (event.type === 'note') {
        soundEngine.playWhisperChime();
        nativeBridge.haptic('selection');
      }
    });

    // 3. Real-time Door Notes
    const unsubNotes = liveDoorService.subscribeToDoorNotes(currentUser.uid, (notes) => {
      if (notes.length > 0) {
        setDoorNotes(notes);
      }
    });

    // 4. Real-time Door History
    const unsubHistory = liveDoorService.subscribeToHistory(currentUser.uid, (hist) => {
      if (hist.length > 0) {
        setInteractions(hist);
      }
    });

    return () => {
      unsubKeyholders();
      unsubEvents();
      unsubNotes();
      unsubHistory();
    };
  }, [currentUser, doorState]);

  // 5. Subscribe to real-time state of the currently selected friend
  useEffect(() => {
    if (!selectedFriendId) return;
    const unsub = liveDoorService.subscribeToFriendLiveState(selectedFriendId, (data) => {
      setFriends((prev) =>
        prev.map((f) => {
          if (f.id === selectedFriendId) {
            return {
              ...f,
              doorState: data.doorState || f.doorState,
              isOnline: data.isOnline !== undefined ? data.isOnline : f.isOnline,
              isSpeaking: data.isTransmitting !== undefined ? data.isTransmitting : f.isSpeaking,
              name: data.displayName || f.name,
              avatar: data.avatar || f.avatar,
            };
          }
          return f;
        })
      );
    });
    return () => unsub();
  }, [selectedFriendId]);

  // Sync settings with audio/haptics engine
  useEffect(() => {
    soundEngine.setSettings(
      settings.knockHaptic,
      settings.transmissionHaptic,
      settings.audioSpeechVoice
    );
  }, [settings.knockHaptic, settings.transmissionHaptic, settings.audioSpeechVoice]);

  // Check audio route on startup
  useEffect(() => {
    nativeBridge.checkAudioOutputRoute().then((res) => {
      if (res.isHeadphones) setEarbudsActive(true);
    });
  }, []);

  // Time-based DND scheduler: automatically locks the door during schedule window
  useEffect(() => {
    if (!settings.dndSchedule.enabled) {
      if (dndScheduleActive) {
        setDndScheduleActive(false);
      }
      return;
    }

    const evaluateDnd = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [startH, startM] = settings.dndSchedule.startTime.split(':').map(Number);
      const [endH, endM] = settings.dndSchedule.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      let inWindow = false;
      if (startMinutes <= endMinutes) {
        inWindow = currentMinutes >= startMinutes && currentMinutes < endMinutes;
      } else {
        // Crosses midnight, e.g. 22:00 (1320m) to 07:00 (420m)
        inWindow = currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }

      if (inWindow) {
        if (doorState !== 'locked') {
          setDoorState('locked');
          setDndScheduleActive(true);
        }
      } else {
        if (dndScheduleActive) {
          setDndScheduleActive(false);
          setDoorState('knock');
        }
      }
    };

    evaluateDnd();
    const interval = setInterval(evaluateDnd, 15000);
    return () => clearInterval(interval);
  }, [settings.dndSchedule, doorState, dndScheduleActive]);

  // Multi-Tab / Multi-Window Live PTT Broadcast Channel
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('door_live_p2p_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'LIVE_PTT_START') {
          soundEngine.playPttStart();
          nativeBridge.haptic('heavy');
          setIncomingAlert({
            active: true,
            friendName: event.data.sender || 'Friend',
            message: event.data.message || 'Live voice drop-in...',
            countdown: 0,
          });
          setTimeout(() => setIncomingAlert(null), 4000);
        } else if (event.data?.type === 'QUICK_WHISPER') {
          soundEngine.playWhisperChime();
          setReceivedWhisperAlert(event.data.whisper);
        } else if (event.data?.type === 'SHOW_AND_TELL_BEAM') {
          soundEngine.playBeamChime();
          setActiveBeam(event.data.beam);
          setIsVideoPeekOpen(true);
        }
      };
      return () => channel.close();
    }
  }, [doorState]);

  // Broadcast when transmitting
  useEffect(() => {
    if (isTransmitting && typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('door_live_p2p_channel');
      channel.postMessage({
        type: 'LIVE_PTT_START',
        sender: 'You (Connected Peer)',
        message: 'Spontaneous voice connected via door key.',
      });
      channel.close();
    }
  }, [isTransmitting]);

  // Handle timed lock countdown
  useEffect(() => {
    if (!timedLockMinutes || doorState !== 'locked') return;

    const timer = setTimeout(() => {
      setDoorState('knock');
      setTimedLockMinutes(null);
      soundEngine.playDoorKnock();
    }, timedLockMinutes * 60 * 1000);

    return () => clearTimeout(timer);
  }, [timedLockMinutes, doorState]);

  // Update a friend's access level to your door
  const handleUpdateFriendAccess = (friendId: string, level: AccessLevel) => {
    setFriends((prev) =>
      prev.map((f) => (f.id === friendId ? { ...f, accessGranted: level } : f))
    );
  };

  // Add a note left on the door
  const handleAddDoorNote = (noteText: string, toFriendName: string) => {
    const authorName = currentUser ? currentUser.displayName : 'You';
    const authorAvatar = currentUser ? currentUser.avatar : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
    const newNote: DoorNote = {
      id: `note-${Date.now()}`,
      fromName: authorName,
      avatar: authorAvatar,
      note: noteText,
      time: 'Just now',
      type: 'text',
    };
    setDoorNotes((prev) => [newNote, ...prev]);

    if (currentUser && selectedFriend) {
      liveDoorService.slipDoorNote(selectedFriend.id, currentUser, noteText);
    }

    // Log to Door History
    setInteractions((prev) => [
      {
        id: `int-${Date.now()}`,
        friendName: toFriendName,
        friendAvatar: selectedFriend.avatar,
        type: 'note_slipped',
        timestamp: new Date(),
        summary: `Slipped a note under ${toFriendName}'s mail slot`,
        details: noteText,
      },
      ...prev,
    ]);
  };

  // Knock on friend's door
  const handleKnockFriend = () => {
    if (!selectedFriend) {
      setIsConnectModalOpen(true);
      return;
    }
    soundEngine.unlockAudio();
    soundEngine.playDoorKnock();
    nativeBridge.haptic('heavy');

    if (currentUser) {
      liveDoorService.sendDoorEvent(selectedFriend.id, {
        type: 'knock',
        fromUser: currentUser,
        payload: 'Knocked 3 times at your door',
      });
    }

    setInteractions((prev) => [
      {
        id: `int-${Date.now()}`,
        friendId: selectedFriend.id,
        friendName: selectedFriend.name,
        friendAvatar: selectedFriend.avatar,
        type: 'answered_knock',
        timestamp: new Date(),
        summary: `You knocked at ${selectedFriend.name}'s door`,
        details: 'Sent 3 wooden knocks across the connection',
      },
      ...prev,
    ]);
  };

  // Transmit real live audio through PTT
  const handleTransmitAudio = (audioBase64: string | null, duration: number) => {
    if (!selectedFriend) return;
    if (currentUser) {
      liveDoorService.sendDoorEvent(selectedFriend.id, {
        type: 'voice_dropin',
        fromUser: currentUser,
        payload: 'Live spontaneous audio transmitted',
        audioBase64: audioBase64 || undefined,
        audioDuration: duration,
      });
    }

    setInteractions((prev) => [
      {
        id: `int-${Date.now()}`,
        friendId: selectedFriend.id,
        friendName: selectedFriend.name,
        friendAvatar: selectedFriend.avatar,
        type: 'voice_dropin',
        timestamp: new Date(),
        summary: `Transmitted ${duration}s voice to ${selectedFriend.name}`,
        details: 'Voice drop-in streamed over live door key connection',
        audioDuration: duration,
      },
      ...prev,
    ]);
  };

  // Handle sending a quick 5-second whisper
  const handleSendWhisper = (whisper: QuickWhisper) => {
    soundEngine.playWhisperChime();
    nativeBridge.haptic('success');
    setIsQuickWhisperOpen(false);

    // Send real-time Firestore event to target friend
    if (currentUser && whisperTargetFriend) {
      liveDoorService.sendDoorEvent(whisperTargetFriend.id, {
        type: 'whisper',
        fromUser: currentUser,
        payload: whisper.transcript,
        audioBase64: whisper.audioBlobUrl,
        audioDuration: whisper.duration,
      });
    }

    // Broadcast if another tab is open
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('door_live_p2p_channel');
      channel.postMessage({
        type: 'QUICK_WHISPER',
        whisper,
      });
      channel.close();
    }
  };

  // Handle beaming user's view (Show & Tell VR)
  const handleBeamImage = (beam: ShowAndTellBeam) => {
    setActiveBeam(beam);

    if (currentUser && selectedFriend) {
      liveDoorService.sendDoorEvent(selectedFriend.id, {
        type: 'beam',
        fromUser: currentUser,
        imageUrl: beam.imageUrl,
        payload: beam.caption,
      });
    }

    // Broadcast to other tabs/devices
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('door_live_p2p_channel');
      channel.postMessage({
        type: 'SHOW_AND_TELL_BEAM',
        beam,
      });
      channel.close();
    }

    // Auto-clear beam after 30 seconds
    setTimeout(() => {
      setActiveBeam((curr) => (curr?.id === beam.id ? null : curr));
    }, 30000);
  };

  const toggleTheme = () => {
    soundEngine.unlockAudio();
    nativeBridge.haptic('light');
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light',
    }));
  };

  const isLight = settings.theme === 'light';
  const currentAccent = settings.accentColor || 'emerald';
  const palette = THEME_PALETTES[currentAccent] || THEME_PALETTES.emerald;
  const missedKnocksCount = interactions.filter((i) => i.type === 'missed_knock' || i.wasMissed).length;

  return (
    <PhoneChassis
      isFrameEnabled={isPhoneFrameEnabled}
      onToggleFrame={() => setIsPhoneFrameEnabled(!isPhoneFrameEnabled)}
      doorState={doorState}
      theme={settings.theme}
    >
      {/* App Container */}
      <div className={`flex flex-col h-full w-full justify-between select-none relative overflow-hidden transition-colors ${
        isLight ? 'bg-[#fcfbf9] text-neutral-900' : 'bg-neutral-950 text-white'
      }`}>
        
        {/* Top Navigation Bar */}
        <header
          className={`flex items-center justify-between px-4 py-2.5 border-b backdrop-blur-md z-30 transition-colors ${
            isLight
              ? 'border-neutral-200/80 bg-white/85'
              : 'border-neutral-800/80 bg-neutral-950/80'
          }`}
        >
          {/* Brand Name */}
          <button
            onClick={() => {
              soundEngine.unlockAudio();
              nativeBridge.haptic('selection');
              setIsBrandModalOpen(true);
            }}
            className="flex items-center gap-2 text-left group"
            title="Click to customize Brand and Door Material"
          >
            <div className={`w-7 h-7 rounded-xl ${palette.badge} flex items-center justify-center text-neutral-950 font-black text-sm shadow-sm group-hover:scale-105 transition-transform`}>
              {selectedBrand.charAt(0)}
            </div>
            <span className={`font-bold text-base tracking-tight ${isLight ? 'text-neutral-900' : 'text-white'}`}>
              {selectedBrand}
            </span>
          </button>

          {/* Center: Doorstep Contact Pill */}
          <div className="relative">
            {selectedFriend ? (
              <button
                id="doorstep-friend-pill"
                onClick={() => {
                  soundEngine.unlockAudio();
                  nativeBridge.haptic('selection');
                  setIsFriendDropdownOpen(!isFriendDropdownOpen);
                }}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold transition ${
                  isLight
                    ? 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-800 shadow-sm'
                    : 'bg-neutral-900 hover:bg-neutral-850 border-neutral-800 text-neutral-200'
                }`}
                title="Switch friend at your doorstep"
              >
                <img
                  src={selectedFriend.avatar}
                  alt={selectedFriend.name}
                  className="w-5 h-5 rounded-full object-cover border border-neutral-600"
                />
                <span className="truncate max-w-[85px]">{selectedFriend.name}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedFriend.doorState === 'locked'
                      ? 'bg-rose-500'
                      : selectedFriend.doorState === 'knock'
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                />
                <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${isFriendDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <button
                id="doorstep-pair-btn"
                onClick={() => {
                  soundEngine.unlockAudio();
                  nativeBridge.haptic('selection');
                  setIsConnectModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition shadow-sm"
                title="Pair with a 2nd person to test live door knocking and audio"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Connect Friend</span>
              </button>
            )}

            {/* Clean Dropdown Menu */}
            <AnimatePresence>
              {isFriendDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  className={`absolute left-1/2 -translate-x-1/2 top-10 w-60 p-2 rounded-2xl border shadow-2xl z-50 flex flex-col gap-1 ${
                    isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-neutral-700'
                  }`}
                >
                  <div className="px-2 py-1 flex items-center justify-between text-[10px] text-neutral-400 uppercase font-semibold">
                    <span>Doorstep Friend</span>
                    <span>Status</span>
                  </div>
                  {friends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => {
                        soundEngine.unlockAudio();
                        soundEngine.playDoorUnlock();
                        nativeBridge.haptic('selection');
                        setSelectedFriendId(friend.id);
                        setIsFriendDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between p-2 rounded-xl text-left transition ${
                        friend.id === selectedFriend.id
                          ? isLight
                            ? 'bg-neutral-100 text-neutral-900 font-semibold'
                            : 'bg-neutral-800 text-neutral-100 font-semibold'
                          : isLight
                          ? 'hover:bg-neutral-50 text-neutral-700'
                          : 'hover:bg-neutral-850 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs">{friend.name}</span>
                          <span className="text-[10px] text-neutral-400 font-normal">{friend.relationship}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          friend.doorState === 'locked'
                            ? 'bg-rose-500'
                            : friend.doorState === 'knock'
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`} />
                        <span className="text-[10px] text-neutral-400 capitalize">
                          {friend.doorState}
                        </span>
                      </div>
                    </button>
                  ))}

                  <div className="pt-1 mt-1 border-t border-neutral-800/40 flex flex-col gap-1">
                    <button
                      id="dropdown-pair-friend-btn"
                      onClick={() => {
                        soundEngine.unlockAudio();
                        nativeBridge.haptic('selection');
                        setIsFriendDropdownOpen(false);
                        setIsConnectModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/25 transition"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Pair Friend / Enter Code</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Action Icons: Live Status, History, Theme & Knob Quick Actions */}
          <div className="flex items-center gap-1.5">
            {/* Live Door Code Status Pill */}
            <button
              id="live-door-badge-btn"
              onClick={() => {
                soundEngine.unlockAudio();
                nativeBridge.haptic('selection');
                if (currentUser) {
                  setIsConnectModalOpen(true);
                } else {
                  setIsAuthModalOpen(true);
                }
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold transition ${
                currentUser
                  ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/60 shadow-sm'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
              }`}
              title={currentUser ? `Your Door Code: ${currentUser.doorCode} — Tap to invite friends` : 'Tap to sign in live'}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono">{currentUser ? currentUser.doorCode : 'Live'}</span>
            </button>

            {/* Door History Button */}
            <button
              id="open-history-header-btn"
              onClick={() => {
                soundEngine.unlockAudio();
                nativeBridge.haptic('selection');
                setIsDoorHistoryOpen(true);
              }}
              className={`relative p-1.5 rounded-full border transition ${
                isLight
                  ? 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-700 shadow-sm'
                  : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
              }`}
              title="Open Door History (Missed Knocks & Whispers Log)"
            >
              <Clock className="w-3.5 h-3.5" />
              {missedKnocksCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {missedKnocksCount}
                </span>
              )}
            </button>

            <button
              id="theme-toggle-header-btn"
              onClick={toggleTheme}
              className={`p-1.5 rounded-full border transition ${
                isLight
                  ? 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-700 shadow-sm'
                  : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
              }`}
              title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {isLight ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <button
              id="open-knob-btn"
              onClick={() => {
                soundEngine.unlockAudio();
                nativeBridge.haptic('selection');
                setIsQuickHubOpen(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition shadow-sm ${
                isLight
                  ? 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-800 shadow-sm'
                  : 'bg-neutral-900 hover:bg-neutral-850 border-neutral-800 text-neutral-200'
              }`}
              title="The Knob (Door Quick Actions & Hardware)"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-600 to-amber-300 border border-amber-400 flex items-center justify-center text-neutral-950">
                <Disc className="w-2 h-2" />
              </div>
              <span>Knob</span>
            </button>
          </div>
        </header>

        {/* Incoming Whisper Alert Banner */}
        <AnimatePresence>
          {receivedWhisperAlert && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`mx-4 mt-2 p-2.5 rounded-2xl border shadow-md flex items-center justify-between gap-2 z-20 ${
                isLight
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <img
                  src={receivedWhisperAlert.avatar}
                  alt={receivedWhisperAlert.friendName}
                  className="w-6 h-6 rounded-full object-cover border border-amber-400/60"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold">{receivedWhisperAlert.friendName}</span>
                    <span className="text-[10px] px-1 rounded bg-amber-500/20 font-mono">
                      {receivedWhisperAlert.duration}s Whisper
                    </span>
                  </div>
                  <span className="text-[11px] italic line-clamp-1">
                    "{receivedWhisperAlert.transcript}"
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    soundEngine.unlockAudio();
                    soundEngine.playWhisperChime();
                    if (receivedWhisperAlert.audioBlobUrl) {
                      liveDoorService.playAudioBase64(receivedWhisperAlert.audioBlobUrl);
                    }
                  }}
                  className="px-2 py-0.5 rounded-md bg-amber-500 text-neutral-950 text-[10px] font-bold"
                >
                  Replay
                </button>
                <button
                  onClick={() => setReceivedWhisperAlert(null)}
                  className="text-neutral-400 hover:text-neutral-600 p-1 text-xs"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tactile 3D Door Hero Section */}
        <DoorHero
          doorState={doorState}
          onStateChange={(nextState) => {
            setDoorState(nextState);
            if (currentUser) {
              liveDoorService.updateDoorState(currentUser.uid, nextState);
            }
          }}
          earbudsActive={earbudsActive}
          onToggleEarbuds={() => setEarbudsActive(!earbudsActive)}
          activeSpeakerName={incomingAlert?.active ? incomingAlert.friendName : null}
          onOpenVideoPeek={() => setIsVideoPeekOpen(true)}
          timedLockMinutes={timedLockMinutes}
          onSetTimedLock={(mins) => {
            setTimedLockMinutes(mins);
            if (mins) {
              setDoorState('locked');
              if (currentUser) {
                liveDoorService.updateDoorState(currentUser.uid, 'locked');
              }
              soundEngine.playLatchThrow(true);
              nativeBridge.haptic('heavy');
            } else {
              setDoorState('knock');
              if (currentUser) {
                liveDoorService.updateDoorState(currentUser.uid, 'knock');
              }
              soundEngine.playLatchThrow(false);
              nativeBridge.haptic('medium');
            }
          }}
          theme={settings.theme}
          dndScheduleActive={dndScheduleActive}
          activeBeam={activeBeam}
          accentColor={currentAccent}
          onOpenKnobDrawer={() => setIsQuickHubOpen(true)}
        />

        {/* Live 2-Person Testing Banner when no friend paired yet */}
        {friends.length === 0 && currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mx-4 mb-2 p-3 rounded-2xl border flex flex-col gap-2.5 shadow-sm z-20 ${
              isLight ? 'bg-emerald-50/80 border-emerald-300/80 text-emerald-950' : 'bg-emerald-950/40 border-emerald-600/40 text-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold">Live 2-Person Mode Ready</span>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                {currentUser.doorCode}
              </span>
            </div>

            <p className="text-[11px] text-neutral-400 leading-snug">
              Share your link with person 2 to test knocking, voice drop-ins, and door locks live right now.
            </p>

            <div className="flex items-center gap-2">
              <button
                id="copy-live-link-banner-btn"
                onClick={async () => {
                  soundEngine.unlockAudio();
                  nativeBridge.haptic('success');
                  const origin = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
                  const url = `${origin}?door=${currentUser.doorCode}`;
                  try {
                    await navigator.clipboard.writeText(url);
                  } catch {
                    // clipboard fallback
                  }
                  setIncomingAlert({
                    active: true,
                    friendName: 'Invite Link Copied',
                    message: 'Send to person 2 to pair instantly!',
                    countdown: 3,
                  });
                }}
                className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Copy 2nd Person Link</span>
              </button>

              <button
                id="enter-code-banner-btn"
                onClick={() => {
                  soundEngine.unlockAudio();
                  nativeBridge.haptic('selection');
                  setIsConnectModalOpen(true);
                }}
                className={`py-1.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition ${
                  isLight
                    ? 'bg-white hover:bg-neutral-50 border-neutral-300 text-neutral-800'
                    : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Enter Code</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Push-to-Talk Controller */}
        <PushToTalkButton
          targetFriend={selectedFriend}
          isTransmitting={isTransmitting}
          setIsTransmitting={setIsTransmitting}
          onLeaveNoteRequest={() => setIsKeyholdersOpen(true)}
          onOpenVideoPeek={() => {
            if (selectedFriend) setIsVideoPeekOpen(true);
            else setIsConnectModalOpen(true);
          }}
          onTriggerWhisper={() => {
            if (selectedFriend) {
              setWhisperTargetFriend(selectedFriend);
              setIsQuickWhisperOpen(true);
            } else {
              setIsConnectModalOpen(true);
            }
          }}
          onOpenShowAndTell={() => {
            if (selectedFriend) setIsShowAndTellOpen(true);
            else setIsConnectModalOpen(true);
          }}
          onTransmitAudio={handleTransmitAudio}
          onKnockFriend={handleKnockFriend}
          onPairFriend={() => setIsConnectModalOpen(true)}
          theme={settings.theme}
          accentColor={currentAccent}
        />

        {/* Quick Whisper 5-Second Modal */}
        {selectedFriend && (
          <QuickWhisperModal
            isOpen={isQuickWhisperOpen}
            onClose={() => setIsQuickWhisperOpen(false)}
            friend={whisperTargetFriend || selectedFriend}
            onSendWhisper={handleSendWhisper}
            theme={settings.theme}
          />
        )}

        {/* Show and Tell VR Beam Modal */}
        {selectedFriend && (
          <ShowAndTellModal
            isOpen={isShowAndTellOpen}
            onClose={() => setIsShowAndTellOpen(false)}
            friend={selectedFriend}
            onBeamImage={handleBeamImage}
            theme={settings.theme}
          />
        )}

        {/* Settings Modal (Theme, Haptics, DND Schedule, Laptop Audio Speech) */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={(newSettings) => setSettings(newSettings)}
          onOpenDoorHistory={() => setIsDoorHistoryOpen(true)}
        />

        {/* Keyholder Management & Door Notes Sheet */}
        <KeyholdersSheet
          isOpen={isKeyholdersOpen}
          onClose={() => setIsKeyholdersOpen(false)}
          friends={friends}
          onUpdateFriendAccess={handleUpdateFriendAccess}
          doorNotes={doorNotes}
          onAddDoorNote={handleAddDoorNote}
        />

        {/* Brand Comparison and Selection Modal */}
        <BrandSelectorModal
          isOpen={isBrandModalOpen}
          onClose={() => setIsBrandModalOpen(false)}
          selectedBrand={selectedBrand}
          onSelectBrand={(brand) => {
            setSelectedBrand(brand);
            setIsBrandModalOpen(false);
          }}
        />

        {/* Peephole / Video Peek Modal */}
        {selectedFriend && (
          <VideoPeekModal
            isOpen={isVideoPeekOpen}
            onClose={() => setIsVideoPeekOpen(false)}
            friend={selectedFriend}
            isTransmittingAudio={isTransmitting}
            activeBeam={activeBeam}
            onOpenShowAndTell={() => setIsShowAndTellOpen(true)}
            theme={settings.theme}
          />
        )}

        {/* 1-Button Native Mobile Conversion Guide Modal */}
        <NativeConversionGuide
          isOpen={isNativeGuideOpen}
          onClose={() => setIsNativeGuideOpen(false)}
        />

        {/* The Knob (Door Quick Actions & Hardware Drawer) */}
        <QuickHubDrawer
          isOpen={isQuickHubOpen}
          onClose={() => setIsQuickHubOpen(false)}
          settings={settings}
          onUpdateSettings={(newSettings) => setSettings(newSettings)}
          doorState={doorState}
          onDoorStateChange={(st) => {
            setDoorState(st);
            if (currentUser) {
              liveDoorService.updateDoorState(currentUser.uid, st);
            }
          }}
          onOpenKeyholders={() => setIsKeyholdersOpen(true)}
          onOpenBrandSelector={() => setIsBrandModalOpen(true)}
          onOpenNativeGuide={() => setIsNativeGuideOpen(true)}
          selectedBrand={selectedBrand}
          friendsCount={friends.length}
          doorNotesCount={doorNotes.length}
          onOpenShowAndTell={() => {
            if (selectedFriend) setIsShowAndTellOpen(true);
            else setIsConnectModalOpen(true);
          }}
          onOpenVideoPeek={() => {
            if (selectedFriend) setIsVideoPeekOpen(true);
            else setIsConnectModalOpen(true);
          }}
          onOpenDoorHistory={() => setIsDoorHistoryOpen(true)}
          interactionsCount={interactions.length}
          missedKnocksCount={missedKnocksCount}
        />

        {/* Door History & Activity Log Drawer */}
        <DoorHistoryDrawer
          isOpen={isDoorHistoryOpen}
          onClose={() => setIsDoorHistoryOpen(false)}
          interactions={interactions}
          onClearHistory={() => setInteractions([])}
          accentColor={currentAccent}
          theme={settings.theme}
        />

        {/* Live Authentication Modal (Google / Guest) */}
        <LiveAuthModal
          isOpen={isAuthModalOpen}
          onSuccess={(profile) => {
            setCurrentUser(profile);
            setIsAuthModalOpen(false);
          }}
          pendingInviteCode={pendingDoorCode}
        />

        {/* Live Friend Connect & Door Code Sharing Modal */}
        <LiveFriendConnectModal
          isOpen={isConnectModalOpen}
          onClose={() => setIsConnectModalOpen(false)}
          currentUser={currentUser || {
            uid: '',
            displayName: 'You',
            avatar: '🚪',
            doorCode: '',
            doorState: doorState,
            isOnline: true,
            isTransmitting: false,
            accentColor: currentAccent,
            isAnonymous: true,
          }}
          liveFriends={liveFriends}
          onFriendConnected={(friend) => {
            setSelectedFriendId(friend.id);
            setIsConnectModalOpen(false);
          }}
          theme={settings.theme}
        />

      </div>
    </PhoneChassis>
  );
}
