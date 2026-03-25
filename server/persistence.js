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

async function authUidToUserDocEmail(uid) {
  if (!uid) return null;
  try {
    const rec = await admin.auth().getUser(uid);
    return rec.email?.trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

/**
 * Copy each chat line under both participants' profiles: users/{email}/text_chat
 * so the Firebase Console shows a column next to `debates`.
 */
async function mirrorChatToUserProfiles(roomId, authorUid, text, sentAtMs) {
  const db = admin.firestore();
  let proUid = null;
  let conUid = null;
  try {
    const snap = await db.collection('match_sessions').doc(roomId).get();
    if (snap.exists) {
      const d = snap.data();
      proUid = d.proUid ?? null;
      conUid = d.conUid ?? null;
    }
  } catch (e) {
    console.warn('[persist] text_chat mirror read match_sessions', roomId, e?.message ?? e);
    return;
  }

  const peerUid =
    authorUid && proUid && conUid
      ? authorUid === proUid
        ? conUid
        : authorUid === conUid
          ? proUid
          : null
      : null;

  const body = {
    roomId,
    text: String(text).slice(0, 4000),
    sentAtMs: typeof sentAtMs === 'number' ? sentAtMs : Date.now(),
    fromUid: authorUid ?? null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const tasks = [];

  if (authorUid) {
    const authorEmail = await authUidToUserDocEmail(authorUid);
    if (authorEmail) {
      tasks.push(
        db.collection('users').doc(authorEmail).collection('text_chat').add({
          ...body,
          direction: 'sent',
          peerUid: peerUid ?? null,
        })
      );
    }
  }

  if (peerUid) {
    const peerEmail = await authUidToUserDocEmail(peerUid);
    if (peerEmail) {
      tasks.push(
        db.collection('users').doc(peerEmail).collection('text_chat').add({
          ...body,
          direction: 'received',
          peerUid: authorUid ?? null,
        })
      );
    }
  }

  try {
    await Promise.all(tasks);
  } catch (e) {
    console.warn('[persist] text_chat user mirror', roomId, e?.message ?? e);
  }
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
    .then(() => mirrorChatToUserProfiles(roomId, authorUid ?? null, text, sentAtMs))
    .catch((e) => {
      console.warn('[persist] chat_messages / text_chat', roomId, e?.message ?? e);
    });
}
