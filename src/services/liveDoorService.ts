import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  Timestamp,
  FirebaseUser,
} from './firebase';
import { UserProfile, DoorState, Friend, DoorInteraction, DoorNote, ShowAndTellBeam } from '../types';
import { soundEngine } from './audioHaptics';

// Audio recording state
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let recordingStartTime: number = 0;

const GUEST_STORAGE_KEY = 'door_guest_session_v2';

export const liveDoorService = {
  authListeners: new Set<(profile: UserProfile | null) => void>(),
  currentSessionProfile: null as UserProfile | null,

  getStoredGuestSession(): UserProfile | null {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem(GUEST_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as UserProfile;
      }
    } catch (_) {}
    return null;
  },

  saveGuestSession(profile: UserProfile | null): void {
    try {
      if (typeof window === 'undefined') return;
      if (profile) {
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(profile));
      } else {
        localStorage.removeItem(GUEST_STORAGE_KEY);
      }
    } catch (_) {}
  },

  notifyAuth(profile: UserProfile | null): void {
    this.currentSessionProfile = profile;
    this.authListeners.forEach((cb) => {
      try {
        cb(profile);
      } catch (err) {
        console.error('Error in auth listener:', err);
      }
    });
  },

  // --- Auth & User Profile ---
  async signInWithGoogle(customHandle?: string): Promise<UserProfile> {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const chosenName = customHandle || 'Keyholder';
    const profile = await this.syncUserProfile(user, chosenName, user.photoURL || '');
    this.saveGuestSession(null);
    this.notifyAuth(profile);
    return profile;
  },

  async signInAsGuest(name: string = 'Keyholder', avatarIcon: string = '🚪'): Promise<UserProfile> {
    const cleanName = name.trim() || 'Keyholder';

    // 1. Attempt Firebase Anonymous Auth first
    try {
      const result = await signInAnonymously(auth);
      const user = result.user;
      const profile = await this.syncUserProfile(user, cleanName, avatarIcon);
      this.saveGuestSession(profile);
      this.notifyAuth(profile);
      return profile;
    } catch (firebaseAuthError: any) {
      console.warn('Firebase signInAnonymously not enabled or unavailable, switching to instant guest session:', firebaseAuthError?.code || firebaseAuthError);
    }

    // 2. Instant fallback client guest session with stable UID
    let guestUid = '';
    const stored = this.getStoredGuestSession();
    if (stored?.uid && stored.uid.startsWith('guest_')) {
      guestUid = stored.uid;
    } else {
      const randStr = Math.random().toString(36).substring(2, 9);
      guestUid = `guest_${randStr}${Date.now().toString(36)}`;
    }

    const guestUser = {
      uid: guestUid,
      isAnonymous: true,
    };

    try {
      const profile = await this.syncUserProfile(guestUser, cleanName, avatarIcon);
      this.saveGuestSession(profile);
      this.notifyAuth(profile);
      return profile;
    } catch (fsErr) {
      console.warn('Firestore write failed for guest, using local persistent profile:', fsErr);
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let rand = '';
      for (let i = 0; i < 6; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const localProfile: UserProfile = {
        uid: guestUid,
        displayName: cleanName,
        avatar: avatarIcon || '🚪',
        doorCode: `DOOR-${rand}`,
        doorState: 'open',
        isOnline: true,
        isTransmitting: false,
        accentColor: 'emerald',
        isAnonymous: true,
      };
      this.saveGuestSession(localProfile);
      this.notifyAuth(localProfile);
      return localProfile;
    }
  },

  async signOut(): Promise<void> {
    this.saveGuestSession(null);
    try {
      await signOut(auth);
    } catch (_) {}
    this.notifyAuth(null);
  },

  onAuth(callback: (profile: UserProfile | null) => void): () => void {
    this.authListeners.add(callback);

    // Initial check: if already active in current session or localStorage
    if (this.currentSessionProfile) {
      callback(this.currentSessionProfile);
    } else {
      const storedGuest = this.getStoredGuestSession();
      if (storedGuest) {
        this.currentSessionProfile = storedGuest;
        callback(storedGuest);
      }
    }

    // Listen to Firebase Auth state changes
    const unsubFirebase = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        const stored = this.getStoredGuestSession();
        if (stored) {
          this.notifyAuth(stored);
        } else {
          this.notifyAuth(null);
        }
        return;
      }
      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          // Check if existing profile in Firestore had any stored email or legacy door code format
          if ((data as any).email || !/^DOOR-[A-Z0-9]{6}$/.test(data.doorCode || '')) {
            const updated = await this.syncUserProfile(firebaseUser, 'Keyholder', data.avatar || '🚪');
            this.notifyAuth(updated);
          } else {
            this.notifyAuth(data);
          }
        } else {
          // Default profile if newly authenticated
          const defaultName = 'Keyholder';
          const defaultAvatar = '🔑';
          const profile = await this.syncUserProfile(firebaseUser, defaultName, defaultAvatar);
          this.notifyAuth(profile);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        const stored = this.getStoredGuestSession();
        this.notifyAuth(stored || null);
      }
    });

    return () => {
      this.authListeners.delete(callback);
      unsubFirebase();
    };
  },

  async syncUserProfile(
    user: { uid: string; isAnonymous?: boolean },
    displayName: string,
    avatar: string
  ): Promise<UserProfile> {
    const userDocRef = doc(db, 'users', user.uid);
    let existingData: any = null;
    try {
      const existingSnap = await getDoc(userDocRef);
      existingData = existingSnap.exists() ? existingSnap.data() : null;
    } catch (_) {}

    let doorCode = '';
    const existingCode = existingData?.doorCode;

    // Use existing code only if it conforms to generic random 6-character format
    if (existingCode && /^DOOR-[A-Z0-9]{6}$/.test(existingCode)) {
      doorCode = existingCode;
    } else {
      if (existingCode) {
        try {
          await deleteDoc(doc(db, 'doorCodes', existingCode.toUpperCase()));
        } catch (_) {}
      }
      // Generate clean 6-character random alphanumeric door code: e.g. "DOOR-8X2M9P" with zero PII
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let rand = '';
      for (let i = 0; i < 6; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      doorCode = `DOOR-${rand}`;
    }

    // Sanitize display name so no emails or PII are persisted
    let cleanName = displayName?.trim() || 'Keyholder';
    if (cleanName.includes('@')) {
      cleanName = 'Keyholder';
    }

    const profile: UserProfile = {
      uid: user.uid,
      displayName: cleanName,
      avatar: avatar || '🚪',
      doorCode,
      doorState: existingData?.doorState || 'open',
      isOnline: true,
      isTransmitting: false,
      accentColor: 'emerald',
      isAnonymous: user.isAnonymous ?? true,
    };

    try {
      await setDoc(userDocRef, {
        uid: profile.uid,
        displayName: profile.displayName,
        avatar: profile.avatar,
        doorCode: profile.doorCode,
        doorState: profile.doorState,
        isOnline: profile.isOnline,
        isTransmitting: profile.isTransmitting,
        accentColor: profile.accentColor,
        isAnonymous: profile.isAnonymous,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('Could not write user profile to Firestore:', e);
    }

    // Register doorCode index for friend lookup (without any PII)
    try {
      await setDoc(doc(db, 'doorCodes', doorCode.toUpperCase()), {
        uid: user.uid,
        displayName: profile.displayName,
        avatar: profile.avatar,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('Failed to index door code', e);
    }

    return profile;
  },

  async updateDoorState(uid: string, doorState: DoorState): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        doorState,
        lastSeen: serverTimestamp(),
      });
    } catch (e) {
      console.error('Failed to update door state:', e);
    }
  },

  async updateTransmitting(uid: string, isTransmitting: boolean): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        isTransmitting,
      });
    } catch (e) {
      // Non-blocking
    }
  },

  async updateProfileInfo(uid: string, data: Partial<UserProfile>): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      if (data.doorCode) {
        await setDoc(doc(db, 'doorCodes', data.doorCode.toUpperCase()), {
          uid,
          displayName: data.displayName || 'Friend',
          avatar: data.avatar || '🚪',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (e) {
      console.error('Failed to update profile info:', e);
    }
  },

  // --- Friend & Keyholder Management ---
  async connectByDoorCode(myProfile: UserProfile, rawCode: string): Promise<Friend | null> {
    const cleanCode = rawCode.trim().toUpperCase();
    if (!cleanCode) return null;

    try {
      // 1. Lookup code in doorCodes
      const codeRef = doc(db, 'doorCodes', cleanCode);
      const codeSnap = await getDoc(codeRef);

      let targetUid = '';
      if (codeSnap.exists()) {
        targetUid = codeSnap.data().uid;
      } else {
        // Maybe it's a raw UID
        targetUid = rawCode.trim();
      }

      if (!targetUid || targetUid === myProfile.uid) {
        return null;
      }

      // 2. Fetch target user profile
      const targetUserRef = doc(db, 'users', targetUid);
      const targetSnap = await getDoc(targetUserRef);
      if (!targetSnap.exists()) return null;

      const targetData = targetSnap.data() as UserProfile;

      // 3. Add to my keyholders list
      const myKeyholderRef = doc(db, 'users', myProfile.uid, 'keyholders', targetUid);
      const friendObj: Friend = {
        id: targetUid,
        name: targetData.displayName,
        handle: `@${targetData.displayName.toLowerCase().replace(/\s+/g, '')}`,
        avatar: targetData.avatar,
        relationship: 'Doorstep Friend',
        doorState: targetData.doorState || 'open',
        accessGranted: 'instant_voice',
        accessReceived: 'instant_voice',
        isOnline: targetData.isOnline ?? true,
        isSpeaking: targetData.isTransmitting ?? false,
        lastActive: 'Just now',
      };

      await setDoc(myKeyholderRef, {
        ...friendObj,
        doorCode: targetData.doorCode,
        connectedAt: serverTimestamp(),
      }, { merge: true });

      // 4. Reciprocate: Add me to their keyholders list so they can immediately see and knock on my door too!
      const reciprocalRef = doc(db, 'users', targetUid, 'keyholders', myProfile.uid);
      await setDoc(reciprocalRef, {
        id: myProfile.uid,
        name: myProfile.displayName,
        handle: `@${myProfile.displayName.toLowerCase().replace(/\s+/g, '')}`,
        avatar: myProfile.avatar,
        relationship: 'Doorstep Friend',
        doorState: myProfile.doorState,
        accessGranted: 'instant_voice',
        accessReceived: 'instant_voice',
        isOnline: true,
        isSpeaking: false,
        doorCode: myProfile.doorCode,
        connectedAt: serverTimestamp(),
      }, { merge: true });

      return friendObj;
    } catch (err) {
      console.error('Error connecting friend by door code:', err);
      return null;
    }
  },

  subscribeToKeyholders(myUid: string, callback: (friends: Friend[]) => void): () => void {
    const colRef = collection(db, 'users', myUid, 'keyholders');
    return onSnapshot(colRef, (snapshot) => {
      const friends: Friend[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        friends.push({
          id: docSnap.id,
          name: data.name || 'Friend',
          handle: data.handle || `@${(data.name || 'friend').toLowerCase()}`,
          avatar: data.avatar || '🚪',
          relationship: data.relationship || 'Friend',
          doorState: data.doorState || 'open',
          accessGranted: data.accessGranted || 'instant_voice',
          accessReceived: data.accessReceived || 'instant_voice',
          isOnline: data.isOnline ?? true,
          isSpeaking: data.isSpeaking ?? false,
          earphonesActive: data.earphonesActive ?? false,
          batteryLevel: data.batteryLevel ?? 88,
          lastActive: data.lastActive || 'Online',
        });
      });
      callback(friends);
    }, (error) => {
      console.error('Error subscribing to keyholders:', error);
    });
  },

  subscribeToFriendLiveState(friendUid: string, callback: (data: Partial<UserProfile>) => void): () => void {
    const userRef = doc(db, 'users', friendUid);
    return onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        callback({
          doorState: d.doorState,
          isOnline: d.isOnline,
          isTransmitting: d.isTransmitting,
          displayName: d.displayName,
          avatar: d.avatar,
        });
      }
    });
  },

  // --- Real-Time Events (Knocks, Whispers, PTT, Notes, Beams) ---
  async sendDoorEvent(
    toUserId: string,
    event: {
      type: 'knock' | 'voice_dropin' | 'whisper' | 'beam' | 'note';
      fromUser: UserProfile;
      payload?: string;
      audioBase64?: string;
      audioDuration?: number;
      imageUrl?: string;
    }
  ): Promise<void> {
    try {
      const eventsCol = collection(db, 'users', toUserId, 'events');
      await addDoc(eventsCol, {
        type: event.type,
        fromUserId: event.fromUser.uid,
        fromName: event.fromUser.displayName,
        fromAvatar: event.fromUser.avatar,
        payload: event.payload || '',
        audioBase64: event.audioBase64 || null,
        audioDuration: event.audioDuration || 0,
        imageUrl: event.imageUrl || null,
        handled: false,
        timestamp: serverTimestamp(),
      });

      // Also log to Door History on receiver's end
      const historyCol = collection(db, 'users', toUserId, 'history');
      let summary = '';
      let typeMap: DoorInteraction['type'] = 'answered_knock';

      if (event.type === 'knock') {
        summary = `${event.fromUser.displayName} knocked at your door`;
        typeMap = 'answered_knock';
      } else if (event.type === 'whisper') {
        summary = `Received a ${Math.round(event.audioDuration || 4)}s Whisper`;
        typeMap = 'whisper_received';
      } else if (event.type === 'voice_dropin') {
        summary = `Voice Drop-in from ${event.fromUser.displayName}`;
        typeMap = 'voice_dropin';
      } else if (event.type === 'beam') {
        summary = `${event.fromUser.displayName} beamed camera view to your peephole`;
        typeMap = 'beam_shared';
      } else if (event.type === 'note') {
        summary = `Note slipped under door by ${event.fromUser.displayName}`;
        typeMap = 'note_slipped';
      }

      await addDoc(historyCol, {
        friendId: event.fromUser.uid,
        friendName: event.fromUser.displayName,
        friendAvatar: event.fromUser.avatar,
        type: typeMap,
        summary,
        details: event.payload || '',
        voiceTranscript: event.payload || '',
        audioDuration: event.audioDuration || 0,
        imageUrl: event.imageUrl || null,
        wasMissed: false,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.error('Failed to send door event:', e);
    }
  },

  subscribeToIncomingEvents(
    myUid: string,
    onEvent: (event: {
      id: string;
      type: 'knock' | 'voice_dropin' | 'whisper' | 'beam' | 'note';
      fromUserId: string;
      fromName: string;
      fromAvatar: string;
      payload?: string;
      audioBase64?: string;
      audioDuration?: number;
      imageUrl?: string;
      timestamp: Date;
    }) => void
  ): () => void {
    const eventsCol = collection(db, 'users', myUid, 'events');
    const q = query(eventsCol, orderBy('timestamp', 'desc'), limit(5));

    let initialLoad = true;
    return onSnapshot(q, (snapshot) => {
      if (initialLoad) {
        initialLoad = false;
        return; // Don't trigger stale old events from past sessions
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Check if handled
          if (!data.handled) {
            // Mark handled so it won't repeat
            try {
              updateDoc(change.doc.ref, { handled: true });
            } catch (e) {
              // ignore
            }

            const ts = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date();
            // Only trigger if occurred in the last 20 seconds
            if (Date.now() - ts.getTime() < 20000) {
              onEvent({
                id: change.doc.id,
                type: data.type,
                fromUserId: data.fromUserId,
                fromName: data.fromName,
                fromAvatar: data.fromAvatar,
                payload: data.payload,
                audioBase64: data.audioBase64,
                audioDuration: data.audioDuration,
                imageUrl: data.imageUrl,
                timestamp: ts,
              });
            }
          }
        }
      });
    }, (error) => {
      console.error('Error listening to incoming events:', error);
    });
  },

  // --- Real Microphone Audio Recording ---
  async startMicrophoneRecording(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      recordingStartTime = Date.now();

      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };
      mediaRecorder.start(100);
      return true;
    } catch (err) {
      console.warn('Microphone permission not granted or unavailable:', err);
      return false;
    }
  },

  async stopMicrophoneRecording(): Promise<{ audioBase64: string | null; duration: number }> {
    return new Promise((resolve) => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve({ audioBase64: null, duration: 0 });
        return;
      }

      const duration = Math.max(0.5, (Date.now() - recordingStartTime) / 1000);

      mediaRecorder.onstop = async () => {
        try {
          const mimeType = mediaRecorder?.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunks, { type: mimeType });

          // Convert to Base64 data URL
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            // Stop tracks
            mediaRecorder?.stream.getTracks().forEach((track) => track.stop());
            mediaRecorder = null;
            resolve({ audioBase64: base64data, duration });
          };
          reader.readAsDataURL(audioBlob);
        } catch (e) {
          mediaRecorder?.stream.getTracks().forEach((track) => track.stop());
          mediaRecorder = null;
          resolve({ audioBase64: null, duration });
        }
      };

      mediaRecorder.stop();
    });
  },

  async playAudioBase64(base64Data: string): Promise<void> {
    if (!base64Data) return;
    try {
      const audioCtx = soundEngine.getContext();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const base64Clean = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const binaryString = atob(base64Clean);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start(0);
      return;
    } catch (e) {
      // Fallback: HTML5 Audio element
      return new Promise((resolve) => {
        try {
          const audio = new Audio(base64Data);
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => resolve());
          }
        } catch {
          resolve();
        }
      });
    }
  },

  // --- Door Notes Sync ---
  subscribeToDoorNotes(myUid: string, callback: (notes: DoorNote[]) => void): () => void {
    const colRef = collection(db, 'users', myUid, 'notes');
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(20));
    return onSnapshot(q, (snap) => {
      const notes: DoorNote[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const ts = d.timestamp instanceof Timestamp ? d.timestamp.toDate() : new Date();
        notes.push({
          id: docSnap.id,
          fromName: d.fromName || 'Friend',
          avatar: d.avatar || '✉️',
          note: d.note || '',
          time: ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: d.type || 'text',
          audioLength: d.audioLength,
        });
      });
      callback(notes);
    });
  },

  async slipDoorNote(toUserId: string, fromUser: UserProfile, noteText: string): Promise<void> {
    try {
      const colRef = collection(db, 'users', toUserId, 'notes');
      await addDoc(colRef, {
        fromUserId: fromUser.uid,
        fromName: fromUser.displayName,
        avatar: fromUser.avatar,
        note: noteText,
        type: 'text',
        timestamp: serverTimestamp(),
      });

      // Send event to trigger animation on friend's device
      await this.sendDoorEvent(toUserId, {
        type: 'note',
        fromUser,
        payload: noteText,
      });
    } catch (e) {
      console.error('Failed to slip note:', e);
    }
  },

  // --- History & Interactions ---
  subscribeToHistory(myUid: string, callback: (items: DoorInteraction[]) => void): () => void {
    const colRef = collection(db, 'users', myUid, 'history');
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(30));
    return onSnapshot(q, (snap) => {
      const items: DoorInteraction[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const ts = d.timestamp instanceof Timestamp ? d.timestamp.toDate() : new Date();
        items.push({
          id: docSnap.id,
          friendId: d.friendId,
          friendName: d.friendName || 'Friend',
          friendAvatar: d.friendAvatar || '🚪',
          type: d.type || 'answered_knock',
          timestamp: ts,
          summary: d.summary || 'Interaction logged',
          details: d.details,
          audioDuration: d.audioDuration,
          voiceTranscript: d.voiceTranscript,
          imageUrl: d.imageUrl,
          wasMissed: d.wasMissed ?? false,
        });
      });
      callback(items);
    });
  },
};
