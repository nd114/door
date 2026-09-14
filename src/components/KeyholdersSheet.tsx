import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Key, ShieldCheck, UserPlus, StickyNote, Mic, Trash2, Check } from 'lucide-react';
import { Friend, DoorNote, AccessLevel } from '../types';
import { soundEngine } from '../services/audioHaptics';
import { nativeBridge } from '../services/nativeBridge';

interface KeyholdersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  friends: Friend[];
  onUpdateFriendAccess: (friendId: string, level: AccessLevel) => void;
  doorNotes: DoorNote[];
  onAddDoorNote: (note: string, toFriendName: string) => void;
}

export const KeyholdersSheet: React.FC<KeyholdersSheetProps> = ({
  isOpen,
  onClose,
  friends,
  onUpdateFriendAccess,
  doorNotes,
  onAddDoorNote,
}) => {
  const [activeTab, setActiveTab] = useState<'keyholders' | 'notes'>('keyholders');
  const [newNoteText, setNewNoteText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShareKey = () => {
    soundEngine.playDoorUnlock();
    nativeBridge.haptic('success');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    soundEngine.playDoorKnock();
    nativeBridge.haptic('medium');
    onAddDoorNote(newNoteText.trim(), 'Door Lock Note');
    setNewNoteText('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="w-full max-w-md bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-[32px] sm:rounded-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
        >
          {/* Sheet Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-100">Keyholder Controls</h3>
                <p className="text-[11px] text-neutral-400">Who has physical access to your Door</p>
              </div>
            </div>

            <button
              onClick={() => {
                nativeBridge.haptic('light');
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-neutral-800 bg-neutral-950/60 p-1">
            <button
              onClick={() => {
                nativeBridge.haptic('selection');
                setActiveTab('keyholders');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                activeTab === 'keyholders'
                  ? 'bg-neutral-800 text-neutral-100 shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Door Keys ({friends.filter((f) => f.accessGranted !== 'none').length})
            </button>
            <button
              onClick={() => {
                nativeBridge.haptic('selection');
                setActiveTab('notes');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                activeTab === 'notes'
                  ? 'bg-neutral-800 text-neutral-100 shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Door Notes ({doorNotes.length})
            </button>
          </div>

          {/* Sheet Content Body */}
          <div className="p-4 overflow-y-auto max-h-[58vh] flex flex-col gap-4 no-scrollbar">
            {activeTab === 'keyholders' ? (
              <>
                {/* Notice on trust */}
                <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    <strong className="text-emerald-400">High-Trust Only:</strong> Only grant keys to partners, best friends, or family. When your door is open, they can speak spontaneously.
                  </p>
                </div>

                {/* Friend List */}
                <div className="flex flex-col gap-2.5">
                  {friends.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 text-center flex flex-col items-center justify-center gap-1.5 py-6">
                      <Key className="w-6 h-6 text-amber-500/50" />
                      <p className="text-xs text-neutral-300 font-semibold">No Keyholders Yet</p>
                      <p className="text-[11px] text-neutral-500 max-w-xs leading-normal">
                        Share your door code with person 2 to grant them a key and talk immediately.
                      </p>
                    </div>
                  ) : (
                    friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={friend.avatar}
                            alt={friend.name}
                            className="w-10 h-10 rounded-full object-cover border border-neutral-700"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs text-neutral-100">{friend.name}</span>
                              <span className="text-[10px] text-neutral-500 font-normal">({friend.relationship})</span>
                            </div>
                            <span className="text-[11px] text-neutral-400 font-mono">{friend.handle}</span>
                          </div>
                        </div>

                        {/* Revoke key button */}
                        {friend.accessGranted !== 'none' && (
                          <button
                            onClick={() => {
                              soundEngine.playDoorLock();
                              nativeBridge.haptic('error');
                              onUpdateFriendAccess(friend.id, 'none');
                            }}
                            className="p-1.5 rounded-lg bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 transition"
                            title="Revoke Key"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Granular Permission Selector */}
                      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-neutral-800/80">
                        <span className="text-[10px] text-neutral-400 font-medium">Their Access:</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              soundEngine.playDoorUnlock();
                              nativeBridge.haptic('medium');
                              onUpdateFriendAccess(friend.id, 'instant_voice');
                            }}
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition ${
                              friend.accessGranted === 'instant_voice'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            Instant Voice
                          </button>

                          <button
                            onClick={() => {
                              soundEngine.playDoorKnock();
                              nativeBridge.haptic('light');
                              onUpdateFriendAccess(friend.id, 'knock_first');
                            }}
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition ${
                              friend.accessGranted === 'knock_first'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            Knock First
                          </button>

                          <button
                            onClick={() => {
                              soundEngine.playDoorLock();
                              nativeBridge.haptic('warning');
                              onUpdateFriendAccess(friend.id, 'none');
                            }}
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold transition ${
                              friend.accessGranted === 'none'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                            }`}
                          >
                            Locked Out
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                </div>

                {/* Invite a new friend button */}
                <button
                  onClick={handleShareKey}
                  className="w-full py-3 px-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 flex items-center justify-center gap-2 text-xs font-semibold text-neutral-100 transition shadow"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Door Key Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 text-amber-400" />
                      <span>Give a Door Key (Share Link)</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              /* Notes Left On Locked Door */
              <div className="flex flex-col gap-3">
                <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-start gap-2.5">
                  <StickyNote className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    When your door is locked, friends cannot blast audio. Instead, they leave quick sticky notes or voice memos pinned to your door.
                  </p>
                </div>

                {/* Create Note Input Form */}
                <form onSubmit={handleCreateNote} className="flex flex-col gap-2">
                  <textarea
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Pin a note to the door..."
                    className="w-full h-16 p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 resize-none"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-neutral-500">Pinned to your door lock screen</span>
                    <button
                      type="submit"
                      disabled={!newNoteText.trim()}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold text-xs transition"
                    >
                      Stick Note
                    </button>
                  </div>
                </form>

                {/* List of existing notes */}
                <div className="flex flex-col gap-2 mt-2">
                  {doorNotes.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 text-center flex flex-col items-center justify-center gap-1.5 py-6">
                      <StickyNote className="w-5 h-5 text-amber-500/50" />
                      <p className="text-xs text-neutral-300 font-semibold">No Notes on Door</p>
                      <p className="text-[11px] text-neutral-500 max-w-xs">
                        When your door is locked, visitors can leave quick sticky notes or voice memos pinned here.
                      </p>
                    </div>
                  ) : (
                    doorNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex items-start gap-2.5"
                      >
                        <img
                          src={note.avatar}
                          alt={note.fromName}
                          className="w-7 h-7 rounded-full object-cover border border-neutral-700 mt-0.5"
                        />
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-neutral-200">{note.fromName}</span>
                            <span className="text-[10px] text-neutral-500">{note.time}</span>
                          </div>
                          <p className="text-xs text-neutral-300 mt-1 leading-normal">{note.note}</p>
                          {note.type === 'voice' && (
                            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded-md w-fit border border-amber-500/20">
                              <Mic className="w-3 h-3" />
                              <span>Voice Memo ({note.audioLength})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
