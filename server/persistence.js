import admin from 'firebase-admin';

/**
 * Canonical debate records (operator / Admin SDK only — see firestore.rules).
 * Called when Firebase Admin is initialized (service account or ADC).
 */

export function persistMatchSession(adminReady, payload) {
  if (!adminReady || !payload?.roomId) return;
  const {
    roomId,
    proUid,
    conUid,
    topicId,
    matchMode,
    roomCode,
    statement,
  } = payload;

  const db = admin.firestore();
  const ref = db.collection('match_sessions').doc(roomId);

  ref
    .set(
      {
        roomId,
        proUid: proUid ?? null,
        conUid: conUid ?? null,
        topicId: topicId ?? null,
        matchMode: matchMode === 'custom' ? 'custom' : 'quick',
        roomCode: roomCode ?? null,
        statement: typeof statement === 'string' ? statement.slice(0, 500) : null,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
    .catch((e) => console.warn('[persist] match_sessions', roomId, e?.message ?? e));
}

export function persistChatMessage(adminReady, payload) {
  if (!adminReady || !payload?.roomId || !payload.text) return;
  const { roomId, authorUid, authorSocketId, text, sentAtMs } = payload;

  const db = admin.firestore();
  db
    .collection('match_sessions')
    .doc(roomId)
    .collection('chat_messages')
    .add({
      authorUid: authorUid ?? null,
      authorSocketId: authorSocketId ?? null,
      text: String(text).slice(0, 4000),
      sentAtMs: typeof sentAtMs === 'number' ? sentAtMs : Date.now(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    .catch((e) => console.warn('[persist] chat_messages', roomId, e?.message ?? e));
}
