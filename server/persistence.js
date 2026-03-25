import admin from 'firebase-admin';

/**
 * Match + chat persistence (Firebase Admin only). All paths under:
 *   users/{email}/debates/{roomId}           — session row (merge)
 *   users/{email}/debates/{roomId}/chat_messages — one doc per line (both users)
 */

export async function persistMatchSession(adminReady, payload) {
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
  const [proEmail, conEmail] = await Promise.all([
    authUidToUserDocEmail(proUid),
    authUidToUserDocEmail(conUid),
  ]);

  const row = {
    roomId,
    sessionKind: 'match',
    proUid: proUid ?? null,
    conUid: conUid ?? null,
    topicId: topicId ?? null,
    matchMode: matchMode === 'custom' ? 'custom' : 'quick',
    roomCode: roomCode ?? null,
    statement: typeof statement === 'string' ? statement.slice(0, 500) : null,
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const tasks = [];
  if (proEmail) {
    tasks.push(
      db
        .collection('users')
        .doc(proEmail)
        .collection('debates')
        .doc(roomId)
        .set(row, { merge: true })
    );
  }
  if (conEmail && conEmail !== proEmail) {
    tasks.push(
      db
        .collection('users')
        .doc(conEmail)
        .collection('debates')
        .doc(roomId)
        .set(row, { merge: true })
    );
  }

  try {
    await Promise.all(tasks);
  } catch (e) {
    console.warn('[persist] users/.../debates session', roomId, e?.message ?? e);
  }
}

async function authUidToUserDocEmail(uid) {
  if (!uid) return null;
  try {
    const rec = await admin.auth().getUser(uid);
    return rec.email?.trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

export async function persistChatMessage(adminReady, payload) {
  if (!adminReady || !payload?.roomId || !payload.text) return;
  const { roomId, authorUid, authorSocketId, text, sentAtMs, proUid, conUid } = payload;

  const proEmail = await authUidToUserDocEmail(proUid);
  const conEmail = await authUidToUserDocEmail(conUid);
  if (!proEmail || !conEmail) {
    console.warn('[persist] chat_messages missing participant emails', roomId, {
      proUid,
      conUid,
      proEmail,
      conEmail,
    });
    return;
  }

  const msg = {
    authorUid: authorUid ?? null,
    authorSocketId: authorSocketId ?? null,
    text: String(text).slice(0, 4000),
    sentAtMs: typeof sentAtMs === 'number' ? sentAtMs : Date.now(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const db = admin.firestore();
  const paths = proEmail === conEmail ? [proEmail] : [proEmail, conEmail];
  try {
    await Promise.all(
      paths.map((email) =>
        db
          .collection('users')
          .doc(email)
          .collection('debates')
          .doc(roomId)
          .collection('chat_messages')
          .add(msg)
      )
    );
  } catch (e) {
    console.warn('[persist] chat_messages', roomId, e?.message ?? e);
  }
}
