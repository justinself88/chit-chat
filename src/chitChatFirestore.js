import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase.js';

/** Heartbeat for the signed-in user (Firebase Auth UID). Safe to call often. */
export async function syncUserPresence() {
  if (!isFirebaseConfigured || !db || !auth?.currentUser) return;
  const uid = auth.currentUser.uid;
  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        app: 'chit-chat',
        lastSeenAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('[chit-chat] syncUserPresence', e);
  }
}

/**
 * Records one side’s view of a completed debate (for history / analytics).
 * Fails quietly so UI never breaks.
 */
export async function logDebateSessionEnd({
  topicId,
  yourSide,
  roomId,
  startedAtMs,
  reason,
  connectionState,
}) {
  if (!isFirebaseConfigured || !db || !auth?.currentUser) return;
  if (!topicId || !yourSide || !startedAtMs) return;
  const uid = auth.currentUser.uid;
  const endedAtMs = Date.now();
  try {
    await addDoc(collection(db, 'debates'), {
      uid,
      topicId,
      yourSide,
      roomId: roomId ?? null,
      startedAtMs,
      endedAtMs,
      durationSec: Math.max(0, Math.round((endedAtMs - startedAtMs) / 1000)),
      reason,
      connectionState: connectionState ?? null,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[chit-chat] logDebateSessionEnd', e);
  }
}

/** Loads recent debate rows for this user (sorted newest first on the client). */
export async function fetchRecentDebates(uid, max = 40) {
  if (!isFirebaseConfigured || !db || !uid) return [];
  const q = query(collection(db, 'debates'), where('uid', '==', uid), limit(max));
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.endedAtMs ?? 0) - (a.endedAtMs ?? 0));
  return rows;
}

const REPORT_COOLDOWN_MS = 90_000;
const REPORT_COOLDOWN_STORAGE_KEY = 'chitchat:lastReportAt';

function getReportCooldownRemainingMs() {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  const raw = window.localStorage.getItem(REPORT_COOLDOWN_STORAGE_KEY);
  if (!raw) return 0;
  const last = parseInt(raw, 10);
  if (Number.isNaN(last)) return 0;
  const elapsed = Date.now() - last;
  return Math.max(0, REPORT_COOLDOWN_MS - elapsed);
}

function markReportSubmitted() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(REPORT_COOLDOWN_STORAGE_KEY, String(Date.now()));
}

/** User-submitted moderation report (review in Firebase Console). */
export async function submitReport({ topicId, roomId, yourSide, category, details }) {
  if (!isFirebaseConfigured || !db || !auth?.currentUser) {
    throw new Error('Not signed in.');
  }
  const remaining = getReportCooldownRemainingMs();
  if (remaining > 0) {
    const sec = Math.max(1, Math.ceil(remaining / 1000));
    throw new Error(`Please wait ${sec} seconds before sending another report.`);
  }
  const reporterUid = auth.currentUser.uid;
  const text = (details ?? '').trim().slice(0, 2000);
  if (!text) {
    throw new Error('Please add a short description.');
  }
  await addDoc(collection(db, 'reports'), {
    reporterUid,
    topicId: topicId ?? '',
    roomId: roomId ?? null,
    yourSide: yourSide === 'con' ? 'con' : 'pro',
    category,
    details: text,
    createdAt: serverTimestamp(),
  });
  markReportSubmitted();
}
