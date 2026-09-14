export type DoorState = 'locked' | 'knock' | 'open';

export type AccessLevel = 'none' | 'knock_first' | 'instant_voice';

export type KnockHapticPattern = 'standard' | 'wood_rattle' | 'heartbeat' | 'minimal';
export type ActivePttHapticPattern = 'tick' | 'continuous' | 'double_chime' | 'silent';

export interface DndSchedule {
  enabled: boolean;
  startTime: string; // e.g. "22:00"
  endTime: string;   // e.g. "07:00"
}

export type AccentColor = 'emerald' | 'blue' | 'purple';

export interface AppSettings {
  knockHaptic: KnockHapticPattern;
  transmissionHaptic: ActivePttHapticPattern;
  dndSchedule: DndSchedule;
  audioSpeechVoice: boolean;
  theme: 'light' | 'dark';
  accentColor: AccentColor;
}

export interface QuickWhisper {
  id: string;
  friendId: string;
  friendName: string;
  avatar: string;
  audioBlobUrl?: string;
  transcript: string;
  duration: number; // in seconds, max 5
  timestamp: Date;
  isPlayed: boolean;
}

export interface Friend {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  relationship: string;
  doorState: DoorState;
  accessGranted: AccessLevel; // What access they have to YOUR door
  accessReceived: AccessLevel; // What access you have to THEIR door
  isOnline: boolean;
  isSpeaking: boolean;
  earphonesActive?: boolean;
  batteryLevel?: number;
  lastActive: string;
}

export interface KnockEvent {
  id: string;
  fromFriendId: string;
  fromFriendName: string;
  avatar: string;
  timestamp: Date;
  type: 'knock' | 'voice_dropin' | 'door_note';
  message?: string;
  audioDuration?: number;
}

export interface NativeBridgeStatus {
  isNative: boolean;
  platform: 'ios' | 'android' | 'web';
  hasMicrophonePermission: boolean;
  isEarphonesConnected: boolean;
  hapticsSupported: boolean;
  backgroundPttReady: boolean;
}

export interface DoorNote {
  id: string;
  fromName: string;
  avatar: string;
  note: string;
  time: string;
  type: 'text' | 'voice';
  audioLength?: string;
}

export interface ShowAndTellBeam {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  imageUrl: string;
  caption?: string;
  timestamp: Date;
  active: boolean;
}

export type InteractionType =
  | 'missed_knock'
  | 'answered_knock'
  | 'whisper_received'
  | 'voice_dropin'
  | 'note_slipped'
  | 'beam_shared'
  | 'latch_toggled';

export interface DoorInteraction {
  id: string;
  friendId?: string;
  friendName: string;
  friendAvatar: string;
  type: InteractionType;
  timestamp: Date;
  summary: string;
  details?: string;
  audioDuration?: number; // duration in seconds
  voiceTranscript?: string;
  imageUrl?: string;
  wasMissed?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  avatar: string;
  doorCode: string;
  doorState: DoorState;
  isOnline: boolean;
  isTransmitting: boolean;
  accentColor: AccentColor;
  isAnonymous: boolean;
}
