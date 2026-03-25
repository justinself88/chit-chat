# Operator moderation API

Internal tools for **investigations**, **audit trails**, and **account enforcement**. Data lives in **Firestore** (`reports`, **`users/{email}/debates`**, legacy top-level `debates`, `match_sessions`, `chat_messages`, `moderation_actions`) and **Firebase Auth** (enable/disable user).

## Prerequisites

1. **Firebase Admin** on the Node server (`FIREBASE_ADMIN_SERVICE_ACCOUNT` or ADC), same as Socket.IO / `match_sessions` persistence.
2. **`CHITCHAT_MODERATION_SECRET`** — long random string (16+ characters). On Railway or `.env` for local server **only** (never commit real values; never expose in the browser).

## Authentication

Every request must send the secret in **one** of these ways:

- Header: `X-Chitchat-Moderation: <your-secret>`
- Header: `Authorization: Bearer <your-secret>`

Use **HTTPS** in production. If the secret leaks, rotate it immediately.

## Base URL

- Local API server: `http://127.0.0.1:3001`
- Production: your deployed origin (e.g. Railway), same host as the site if the server serves the API.

With Vite dev, paths under `/api` proxy to port **3001** — e.g. `http://localhost:5173/api/mod/status` works if the secret is set on the backend.

## Endpoints

### Health

`GET /api/mod/status` — returns `{ ok: true }` when Admin + secret check passed.

### User reports (all reporters)

`GET /api/mod/reports?limit=50` — newest first (default limit 50, max 200).

`GET /api/mod/reports/:id` — single report.

### Match + chat (by WebRTC / Socket room id)

`GET /api/mod/match/:roomId?chatLimit=200` — `match_sessions` doc (if any) and `chat_messages` (ordered by time).

### Per-user debate rows (self-logged client history)

`GET /api/mod/user/:uid/debates?limit=40` — **`users/{email}/debates`** for that Auth user’s email plus legacy top-level **`debates`** rows with the same `uid` (merged, Admin SDK).

### Per-user canonical matches

`GET /api/mod/user/:uid/sessions?limit=40` — **`match_sessions`** where the user is **pro** or **con**, merged.

### Moderation audit log

`GET /api/mod/actions?limit=50` — documents from **`moderation_actions`**, newest first.

`POST /api/mod/actions` — append an audit row (JSON body):

```json
{
  "targetUid": "firebase-auth-uid",
  "action": "note",
  "reason": "Investigated report #abc; no policy violation.",
  "actorLabel": "support@example.com",
  "relatedReportId": "optional-firestore-doc-id",
  "relatedRoomId": "optional-room-id"
}
```

Allowed **`action`** values: `note`, `warn`, `ban_applied`, `ban_lifted`, `reviewed`, `escalated`.

### Firebase Auth: disable / enable sign-in

These call the **Admin Auth API** so the user cannot sign in until re-enabled.

`POST /api/mod/user/:uid/auth-disable` — body must include **`reason`** (audit text).

```json
{
  "reason": "Repeated harassment; report #…",
  "actorLabel": "support@example.com"
}
```

`POST /api/mod/user/:uid/auth-enable` — same shape; clears **disabled** on the account.

## Example (curl)

Replace `SECRET`, `HOST`, and `ROOM`.

```bash
curl -sS -H "X-Chitchat-Moderation: SECRET" "https://HOST/api/mod/status"

curl -sS -H "X-Chitchat-Moderation: SECRET" "https://HOST/api/mod/reports?limit=20"

curl -sS -H "X-Chitchat-Moderation: SECRET" "https://HOST/api/mod/match/ROOM?chatLimit=500"

curl -sS -X POST -H "Content-Type: application/json" \
  -H "X-Chitchat-Moderation: SECRET" \
  -d '{"targetUid":"UID","action":"note","reason":"Reviewed; warned in email.","actorLabel":"ops"}' \
  "https://HOST/api/mod/actions"
```

## Firestore rules

Deploy the repo’s **`firestore.rules`**. The **`moderation_actions`** collection must remain **client-deny**; only the server writes there via Admin SDK.

## Indexes

If Firestore returns an error with a link to **create an index**, open the link (usually for `orderBy('createdAt')` on `reports` or `moderation_actions`). Deploy the suggested index.

## Console workflow (no HTTP)

You can still use **Firebase Console → Firestore** to browse `reports`, `match_sessions`, etc., when logged in as a project owner. The HTTP API is for scripted access, backups, and tying actions to **`moderation_actions`**.
