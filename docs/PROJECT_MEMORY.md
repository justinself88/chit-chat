# Project memory

**Read this file first** when starting a new session. It is the continuity handoff: product intent, architecture, file map, and operational facts. Pair it with **`DEV_LOG.md`** for *what changed when* (chronological).

| Field | Value |
|--------|--------|
| **Site name** | **Chit Chat** |
| **Project name (npm)** | `chit-chat` (workspace folder: `Debate Website`) |
| **Last updated** | 2026-03-24 (in-debate text chat) |
| **Database / BaaS** | **Firebase** — **Email/password Auth** + Firestore (`src/firebase.js`, `AuthScreen.jsx`) |

---

## 1. Product intent

**Goal (product: Chit Chat):** A site where a user picks a **debate topic**, chooses **Pro** or **Con**, gets **matched** with someone on the **opposing** side, then has a **live audio/video** conversation (WebRTC).

**Current scope (MVP):** Matchmaking is **in-memory** on a single Node process. The app is **gatekept**: users must **sign in or create an account** (Firebase **Email/Password**) before any topic/debate UI. There are now two modes: **Quick match** (topic-based queue) and **Custom lobbies** (statement-based, room-code capable). **Firestore**: **`users/{uid}`** presence, **`debates`** session logs (`chitChatFirestore.js`). Socket.IO connects after login, and the server can verify Firebase ID tokens via Admin SDK. Enforcement is controlled by environment config (`REQUIRE_FIREBASE_TOKEN=true`). No moderation UI.

---

## 2. What works today

- UI flow: Welcome → Topic list → Pro/Con → waiting spinner or immediate match → debate view (local + remote video + optional **text chat** for links/notes).
- **Socket.IO:** queue join, match, signaling (`offer` / `answer` / `ice`), `leave-queue`, `leave-debate`, `peer-left` on disconnect or opponent leave. **Rate limit:** `join-queue` is capped per IP (see **`server/rateLimit.js`**, env **`RATE_LIMIT_*`**); `queue-error` may include **`code: 'rate_limited'`**.
- **WebRTC:** `getUserMedia`, `RTCPeerConnection`, STUN by default; client loads ICE config from **`GET /api/rtc-config`** (optional TURN via `ICE_SERVERS_JSON` on server). **Device picker:** collapsible **Camera & microphone** panel (before a debate) requests permission, lists inputs, preview, and passes `deviceId` constraints into the live call (`DeviceSettings.jsx`, `mediaUtils.js`).
- **Signaling race handling:** Client buffers Socket.IO `signal` events until `RTCPeerConnection` exists, then flushes (answerer can receive offer before PC is ready).
- **Production path:** `npm run build` produces `dist/`; `npm start` runs `server/index.js`, which serves static files + SPA fallback when `dist` exists.
- **Firebase (client):** `onAuthStateChanged` drives session; **`AuthScreen`** is email/password only (no anonymous). **`src/chitChatFirestore.js`** — **`syncUserPresence()`**, **`logDebateSessionEnd()`**; **`fetchRecentDebates`** for Past sessions. Deploy **`firestore.rules`**; enable **Email/Password** in Firebase Console (optionally **disable Anonymous**).
- **Deploy:** `Dockerfile` + `.dockerignore`, **`docs/DEPLOY.md`** (env vars, `VITE_*` at build time).
- **Past sessions UI:** Welcome → **Past sessions** loads **`debates`** for the current signed-in user (`fetchRecentDebates`, `DebateHistory.jsx`).
- **In-app reports:** During a debate, **Report issue** opens **`ReportIssue.jsx`** (category + details). **`submitReport`** writes Firestore **`reports`** (`reporterUid`, `topicId`, `roomId`, `yourSide`, `category`, `details`, `createdAt`). Rules: authenticated create with matching uid; read own reports only. **Client cooldown:** after a successful submit, **`localStorage`** **`chitchat:lastReportAt`** blocks another report for **90 seconds** (see **`chitChatFirestore.js`**). Modal closes on leave debate / peer disconnect.
- **Legal & onboarding:** Full-screen **`LegalViewer`** for **Terms of Service**, **Privacy Policy**, **Community Guidelines**, and **Recording & Streaming Consent Agreement** (`src/legal/*.jsx`). **Create account** requires **18+** plus acceptance of all four (single combined policy line with links). **`VITE_CONTACT_EMAIL`** in `.env` drives Privacy + Recording contact lines (`src/legal/contactEmail.js`). Favicon: **`public/chitchat-logo.png`**.
- **Branding / UI theme:** **`BrandLogo.jsx`** + Chitchat logo asset. **Global theme** in **`index.css`** (design tokens + page background); signed-in UI matches auth (**sky blue** palette as of last update). **`AuthScreen.css`** styles the auth card; **`App.app--auth-only`** full-bleeds auth when not signed in.
- **Signed-in header:** Full-width **`app-top-bar`** is a **sibling** of **`.app`** (not inside the max-width column) so the logo/tagline center on the viewport and **Menu** / **Sign out** sit at the **viewport** right (with padding). **`HeaderNavMenu`** opens a dropdown: legal docs → **`LegalViewer`**, plus **Our Mission** (**`MissionPage.jsx`**) and **Support** (**`SupportPage.jsx`** — contact email + in-debate reporting note). Overlays driven by **`headerOverlay`** state in **`App.jsx`**. When logged in, **`.app--with-global-header`** removes duplicate top padding on the main column.
- **Custom lobbies (new):** In **Custom debates**, users can switch tabs: **Join servers** (live open-lobby browser + **Join by code**) and **Create server** (statement + visibility mode). Visibility options: **Open lobby** (shows in list) or **Code-only** (hidden, code join only). Creating a lobby now places the creator into a waiting debate view immediately; if a challenger leaves, the creator remains in-session and returns to waiting until they end the lobby.
- **Socket.IO authentication (new):** Socket.IO handshake can optionally verify the user’s Firebase ID token using Firebase Admin SDK. Server enforcement is controlled by environment configuration; when not configured it will not block local development.
- **Production deployment status (new):** Live on Railway with GitHub auto-deploy. Build-time Firebase client env injection is handled in Docker build stage; Railway variable changes must be applied before redeploy.
- **Production smoke (2026-03-24):** Quick Match + live **video/audio** confirmed on **two separate PCs** (two accounts, production URL).
- **Operational hardening (new):** Server adds metrics logs, periodic custom-lobby stale cleanup with TTL sweep/logging, and a single-active-session-per-uid guard to reduce multi-tab/window edge cases.
- **Custom host moderation (new):** In active custom debates, the creator can **Kick opponent**. Server authorizes only the lobby creator for this action; kicked user returns to custom screen while host remains in waiting-lobby state.

---

## 3. What is not built yet (explicit gaps)

- Email/password is implemented; **Google / Apple** sign-in not added yet.
- Richer history (filters, export, opponent id when you add signaling metadata).
- **Blocks** (blocklist by user id), richer moderation tooling, **recording** pipeline if productized.
- Multi-server / horizontal scaling (queues are **not** shared across processes).
- Structured debate phases (timers, judge, scoring).
- Mobile-native apps (web only).

---

## 4. Architecture (concise)

```
Browser A (Vite :5173)                    Browser B
     |                                         |
     |  HTTP /api/rtc-config, /health         |
     |  WebSocket /socket.io (proxied to :3001)|
     v                                         v
              Node server (:3001)
              - Express: REST + optional static dist
              - Socket.IO: matchmaking + signal relay
              - In-memory Map: topicId -> { pro: [socketIds], con: [...] }

Browser A <-------------- WebRTC (P2P) --------------> Browser B
              (SDP/ICE exchanged via Socket.IO room)

Firebase (HTTPS APIs, client SDK) ← used for Auth + Firestore; independent of Socket.IO / Node matchmaking.
```

**Dev vs prod URLs**

- **Development:** User opens **http://localhost:5173**. Vite dev server proxies `/socket.io`, `/api`, `/health` to **http://127.0.0.1:3001** (see `vite.config.js`).
- **Production:** Typically one origin serves UI + API + Socket.IO (e.g. same host, `PORT`); client uses relative URLs.

---

## 5. Socket.IO events (contract)

| Event | Direction | Purpose |
|--------|-----------|---------|
| `join-queue` | C → S | `{ topicId, side: 'pro' \| 'con' }` — enter matchmaking. |
| `queued` | S → C | Acknowledge waiting in queue. |
| `queue-error` | S → C | Invalid topic/side (`ALLOWED_TOPIC_IDS` / validation). |
| `matched` | S → C | `{ roomId, isOfferer, topicId, yourSide }` — pair found; client starts WebRTC. |
| `signal` | C ↔ C via S | `{ roomId, type: 'offer' \| 'answer' \| 'ice', payload }` — WebRTC signaling. |
| `debate-chat` | C → S | `{ roomId, text }` — in-debate text message; relayed to both peers in the Socket.IO room. |
| `debate-chat` | S → C | `{ text, from, sentAtMs }` — broadcast to everyone in the debate room (including sender). |
| `leave-queue` | C → S | Leave waiting state. |
| `leave-debate` | C → S | Voluntarily leave call; server notifies peer (`peer-left`). |
| `peer-left` | S → C | Opponent disconnected or left. |
| `create-custom-game` | C → S | `{ statement, joinMode: 'open' \| 'code' }` — create statement lobby + queue creator. |
| `join-custom-room` | C → S | `{ side: 'pro' \| 'con', roomCode }` — join statement lobby by code/list. |
| `custom-games-updated` | S → C | Broadcast current open custom lobbies list. |
| `custom-game-created` | S → C | Ack to creator with generated room code and statement. |
| `custom-lobby-waiting` | S → C | Sent to creator when challenger leaves; host remains in waiting state. |

Server stores `socket.data.topicId`, `socket.data.side`, `socket.data.roomId` for validation and routing.

---

## 6. HTTP endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | JSON `{ ok: true }` — liveness. |
| GET | `/api/rtc-config` | JSON `{ iceServers: [...] }` for the browser. |

Static files + `index.html` SPA fallback apply when `dist/` exists (production build).

---

## 7. Repository layout (source only)

```text
Debate Website/
  docs/
    DEV_LOG.md           # Chronological sessions — append each time
    PROJECT_MEMORY.md    # This file — refresh facts each session
  server/
    index.js             # Express, Socket.IO, queues, routes
    rateLimit.js         # Fixed-window limiter + client IP helper
    rtcConfig.js         # ICE config from env + defaults
  shared/
    topics.js            # TOPICS[], ALLOWED_TOPIC_IDS
  public/
    chitchat-logo.png    # Logo + favicon
  src/
    App.jsx              # UI + WebRTC client; logged-in header outside .app (app-top-bar)
    DebateChatPanel.jsx  # In-debate text chat (links + notes)
    HeaderNavMenu.jsx    # Menu dropdown: legal, Our Mission, Support
    MissionPage.jsx      # Our Mission (LegalDocumentShell)
    SupportPage.jsx      # Support / contact (LegalDocumentShell + contactEmail)
    AuthScreen.jsx       # Email/password sign-in & sign-up + legal acknowledgments
    AuthScreen.css       # Auth screen layout / card (pairs with global index.css tokens)
    BrandLogo.jsx        # Chitchat wordmark image
    legal/               # Legal pages + viewer (Terms, Privacy, Community Guidelines, Recording)
    chitChatFirestore.js # Firestore: presence + debate logs + reports + fetch
    ReportIssue.jsx      # In-debate report modal → reports collection
    DebateHistory.jsx    # Past sessions list
    firebase.js          # Firebase app, auth, Firestore
    AudioLevelMeter.jsx
    DeviceSettings.jsx   # Camera/mic selection + preview
    mediaUtils.js        # getUserMedia error strings + constraint builder
    App.css
    main.jsx
    index.css            # :root theme tokens + body background
    topics.js            # re-exports TOPICS from shared/
  firestore.rules        # Firestore security rules (deploy to Firebase)
  Dockerfile             # Production image (Node + static dist)
  docs/DEPLOY.md         # Hosting / env notes
  index.html
  vite.config.js
  package.json
  .env.example
  .gitignore
```

---

## 8. Environment & config

| Variable | Notes |
|----------|--------|
| `PORT` | Server listen port (default **3001**). |
| `RATE_LIMIT_JOIN_QUEUE_MAX` | Optional. Max **`join-queue`** events per IP per window (default **40**). In-memory only. |
| `RATE_LIMIT_JOIN_QUEUE_WINDOW_MS` | Optional. Window length in ms (default **60000**). |
| `ICE_SERVERS_JSON` | Optional. JSON **array** of ICE server objects. Parsed in `server/rtcConfig.js`. Invalid JSON falls back to default STUN. |
| `CUSTOM_LOBBY_TTL_MS` | Optional server runtime. Custom lobby idle/stale expiration in ms (default **1800000** = 30 minutes). |
| `DEBATE_CHAT_MAX_LEN` | Optional. Max characters per chat message (default **2000**, clamped 500–4000). |
| `DEBATE_CHAT_MAX_PER_MIN` | Optional. Max chat messages per socket per rolling minute (default **30**, minimum **10**). |
| `REQUIRE_FIREBASE_TOKEN` | Optional server runtime hardening. If `true`, Socket.IO requires a valid Firebase ID token and server startup fails without Firebase Admin credentials. |
| `FIREBASE_ADMIN_SERVICE_ACCOUNT` | Optional server runtime credential (raw JSON or base64 JSON) for Firebase Admin token verification. Alternative is platform ADC (`GOOGLE_APPLICATION_CREDENTIALS`). |
| `VITE_FIREBASE_*` | **Client-only** (Vite). `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId` from Firebase Console → Project settings → Web app. Enables Auth + Firestore. In Docker/Railway, these must be available at **build time**. |
| `VITE_CONTACT_EMAIL` | Optional. Public contact email in **Privacy Policy**, **Recording Agreement**, and **Support** page (header menu; mailto when set). |

Copy `.env.example` to `.env` locally if needed (`.env` is gitignored). For Firebase, enable **Email/Password** under Authentication → Sign-in method; create **Firestore** database when you start writing data.

---

## 9. Scripts

| Command | Behavior |
|---------|----------|
| `npm install` | Install dependencies. |
| `npm run dev` | `concurrently`: `node server/index.js` + `vite` — **primary dev workflow**. |
| `npm run build` | Vite build → `dist/`. |
| `npm start` | `node server/index.js` (serves `dist/` if present). |

---

## 10. Machine / environment notes (this workspace)

- **OS:** Windows (paths use `Debate Website` with a space).
- **Node.js:** Was installed with **`winget install OpenJS.NodeJS.LTS`** when `node`/`npm` were missing. Default install path: `C:\Program Files\nodejs\`. If a **new** terminal does not find `npm`, restart the terminal or sign out/in so `PATH` updates.
- **Testing matching:** Use two browser contexts (e.g. two profiles or normal + InPrivate) on **http://localhost:5173**, same topic, opposite sides.

---

## 11. Gotchas

- **Header alignment:** Do **not** put the logged-in header **inside** **`.app`** if you need controls flush to the **viewport** edge — **`.app`** is **`max-width: min(1100px, 100%)`** centered, so `right: 0` or grid columns only span that column. Use **`app-top-bar`** as a full-width sibling (see **`App.jsx`**).
- **`ERR_CONNECTION_REFUSED` on :5173:** Dev servers not running — run `npm run dev` and keep the process alive.
- **Strict NAT / failed WebRTC:** May need TURN; set `ICE_SERVERS_JSON` and/or provider credentials. UI shows connection state and a hint when `connectionState === 'failed'`.
- **Topic IDs:** Must exist in `shared/topics.js` and pass `ALLOWED_TOPIC_IDS` on the server.
- **Custom lobby lifecycle:** Lobby creator persists in the debate view while waiting. Challenger leave/disconnect should not eject host; only host ending session closes lobby.
- **Kick/rejoin stability:** After host kick (or challenger leave/disconnect), host is re-queued for the lobby, stale peers are skipped in matchmaking, and kicked challengers should not retain host-style room-code state.
- **Custom lobby cleanup:** A server-side sweep runs every ~60s to remove orphaned/expired custom lobbies. When it changes state, it broadcasts the updated open-lobby list and logs a concise summary (orphaned/expired/recovered counts + codes).
- **Planned next:** Run a production smoke-test matrix (Quick match + Custom open + Custom code-only + multi-tab safeguard recovery) and review metrics/cleanup logs for the first 24h; then tune `CUSTOM_LOBBY_TTL_MS` if needed and finish any remaining custom-mode copy consistency.
- **Railway variables:** New/changed vars remain staged until **Apply changes** is clicked in the Railway UI.
- **Production quick-match reliability:** Socket connection now tolerates temporary ID token unavailability in optional auth mode and shows clearer connection errors instead of a silent side-button no-op.
- **Production transport hardening:** Express SPA fallback now skips `/socket.io` routes to avoid polling transport interception in production builds.
- **Queue UI acknowledgement rule:** Waiting spinner should only render after server `queued` ack (not immediately on click).
- **Firebase:** If keys are missing, the app still runs; only the dev hint appears (in development). If **Email/Password** is not enabled in Console, sign-in or sign-up errors surface on **`AuthScreen`** (`auth/operation-not-allowed`).

---

## 12. Documentation contract (end of every session)

1. **`docs/DEV_LOG.md`** — Add a new **Session** block at the **top** (newest first): what shipped, files touched, commands/decisions, open issues.
2. **`docs/PROJECT_MEMORY.md`** — Update **Last updated**, adjust tables/sections if behavior or layout changed, append **Session notes (rolling)**.

---

## Session notes (rolling)

Short bullets for the **latest** context; keep recent history; trim only when noisy.

- **2026-03-22:** **Docs pass** — **`PROJECT_MEMORY`** / **`DEV_LOG`** updated; **§2** + file map now spell out **`ReportIssue`**, **`reports`**, and **90s report cooldown** (`localStorage` key `chitchat:lastReportAt`).
- **2026-03-23:** **Custom mode overhaul** — two custom tabs (**Join servers** / **Create server**), **Join by code** restored, creation visibility (`open` vs `code-only`), creator stays in waiting lobby after challenger leaves, copy confirmation (`✓ Copied`), and Firestore alignment (`topicId: "custom"` + optional debates fields in rules).
- **2026-03-23:** **Custom lobby cleanup** — periodic stale-lobby sweep with TTL (`CUSTOM_LOBBY_TTL_MS`) plus server logs and automatic refresh of open-lobby list when cleanup changes state.
- **2026-03-23:** **Host kick controls** — custom-lobby creator can kick challenger (with client confirmation) and continue hosting the same lobby.
- **2026-03-23:** **Kick/rejoin bugfix validated** — fixed stuck "Joining debate..." rejoin path after kick by re-queuing host and clearing kicked challenger local state.
- **2026-03-23:** **Railway go-live validated** — production app reachable, login and custom rooms working. Added Docker build-stage `VITE_FIREBASE_*` env injection and client socket readiness fix for quick-match side selection in production.
- **2026-03-23:** **Production matchmaking diagnostics** — added Socket.IO transport fallback guard and client queue/wait UX hardening; Quick Match cross-account pairing remained under active verification in production.
- **2026-03-24:** **Production QA (two PCs)** — Quick Match + live **video/audio** validated on production (desktop vs laptop, two accounts). Next: custom lobby + kick/rejoin regression; optional token enforcement retest.
- **2026-03-24:** **In-debate text chat** — Socket.IO `debate-chat` relay in the same room as WebRTC; UI panel (`DebateChatPanel.jsx`) with linkified `https?://` URLs; server max length + per-minute rate limit; chat cleared when match ends or opponent leaves.
- **2026-03-22:** **Header menu + layout** — **`HeaderNavMenu`** (Legal, Our Mission, Support), **`MissionPage`** / **`SupportPage`**, **`headerOverlay`**. **Viewport-wide header:** **`app-top-bar`** sibling of **`.app`**; **`.app--with-global-header`**; **`#root`** **`overflow-x: clip`**. Mission copy is user-authored. Removed reliance on **`app-header-bleed`** inside `.app` for edge alignment.
- **2026-03-22:** **In-app reports** — Firestore **`reports`**, **`submitReport`**, **`ReportIssue`** on debate screen; rules updated. **Deploy `firestore.rules`.**
- **2026-03-22:** **Matchmaking rate limit** — `join-queue` per IP via **`server/rateLimit.js`** (`RATE_LIMIT_JOIN_QUEUE_*` env). **`queue-error`** `rate_limited` handled in **`App.jsx`**.
- **2026-03-22:** **Legal suite** in-app — Terms, Privacy, Community Guidelines, Recording & Streaming Consent (`src/legal/`). **Signup** certification (18+ + policies). **`VITE_CONTACT_EMAIL`**, **`contactEmail.js`**. **Chitchat logo** (`public/chitchat-logo.png`, **`BrandLogo`**). **Auth UI** restyled (card, “More sign-in options”, full-bleed **`app--auth-only`**). **Global theme** centralized in **`index.css`** (iterated: earthy green → vibrant grass → **sky blue**); **`AuthScreen.css`** + **`App.css`** aligned. Removed unused **`LegalPlaceholder`**. **Community Guidelines** emoji-free.
- **2026-03-22:** MVP + server validation + `rtc-config` + `leave-debate` + dev proxies documented. Node installed via winget; `npm run dev` verified. User asked for **DEV_LOG + PROJECT_MEMORY**; both exist—this file expanded so a future session can resume without re-reading the whole chat.
- **2026-03-22 (same day):** User asked to ensure both docs are updated so “future self” has full continuity—**this PROJECT_MEMORY** and **DEV_LOG** were refreshed with architecture, event contracts, gaps, and maintenance rules.
- **2026-03-22:** **Email/password gate** — `AuthScreen`, `onAuthStateChanged`, Socket only after login; **Sign out** in header. Anonymous auth removed.
- **2026-03-22:** **Past sessions** screen (loads `debates` for the current uid).
- **2026-03-22:** **Firestore persistence** — `users/{uid}` presence, `debates` session logs; **rules** updated; **Dockerfile** + **`docs/DEPLOY.md`**.
- **2026-03-22:** **Device selection** for camera/microphone before debates (`DeviceSettings`, `mediaUtils`).
- **2026-03-22:** Product/site name **Chit Chat** (npm package `chit-chat`).
- **2026-03-22:** Chose **Firebase** for DB/BaaS. Added `firebase` SDK, `src/firebase.js`, anonymous sign-in in `App.jsx`, `firestore.rules` starter, `VITE_FIREBASE_*` in `.env.example`.

---
