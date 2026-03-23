# Development log

Chronological record of **what changed** and **why**. **`PROJECT_MEMORY.md`** holds the living product/architecture snapshot; this file holds **time-ordered** work.

**Rule:** After each session, add a new **`## Session: YYYY-MM-DD`** section at the **top** (most recent first). Include: summary, files touched, commands, decisions, follow-ups.

---

## Session: 2026-03-23 (Railway production go-live + quick match fix)

### Summary

- Successfully deployed **Chit Chat** to Railway from GitHub and validated live sign-in/custom-room flows in production.
- Fixed production environment injection for Vite Firebase keys by updating the Docker build stage to accept/pass `VITE_FIREBASE_*` variables at build time.
- Fixed a production quick-match issue where pressing **Pro/Con** could appear to do nothing if Socket.IO connected before Firebase token availability settled.
- Client now establishes Socket.IO for signed-in users in optional auth mode, surfaces clearer connection errors, and retries matchmaking connection gracefully.

### Files

- `Dockerfile`, `src/App.jsx`

### Deployment notes

- Railway variables must be **applied** (pending changes are not active until Apply is clicked).
- `VITE_FIREBASE_*` values are consumed at **build time** in Dockerized deploys.
- Current production setting remains `REQUIRE_FIREBASE_TOKEN=false` until Firebase Admin credential handling is finalized in Railway.

### Follow-ups (planned next)

- Rotate leaked Firebase service-account key and replace local credential file.
- Add secure Firebase Admin credential in Railway, then switch `REQUIRE_FIREBASE_TOKEN=true`.
- Run and record a short production smoke matrix (Quick match + Custom open/code + kick/rejoin).

## Session: 2026-03-23 (kick/rejoin bugfix + host queue recovery)

### Summary

- Fixed a custom-lobby edge case where a kicked challenger could get stuck on **"Joining debate..."** when trying to rejoin.
- Server now reliably re-queues the host after kick/leave/disconnect and skips stale/offline peer ids during matching.
- Client now clears kicked challenger state (`customRoomCode`, host-like waiting flags) and hides **Current room code** for non-host contexts to avoid confusion.
- Result validated in local QA: kick works, challenger sees proper kicked message, and rejoin succeeds.

### Files

- `server/index.js`, `src/App.jsx`

### Follow-ups (planned next)

- Run the same kick/rejoin scenario in production smoke test after deploy.
- Monitor `peerKicks`, `peerLeft`, and cleanup metrics during first 24h.

## Session: 2026-03-23 (custom host moderation: kick opponent)

### Summary

- Added **host-only kick** for custom lobbies: creator can remove the current challenger without ending their lobby.
- Added **kick confirmation** prompt in the client before sending the kick action.
- Behavior: kicked user receives a clear message and returns to custom screen; creator returns to waiting state for the next challenger.

### Files

- `src/App.jsx`, `server/index.js`

### Follow-ups (planned next)

- Production smoke test in deployed environment: verify **kick** + **host stays waiting** + **challenger can rejoin**.
- Keep monitoring metrics (`peerKicks`, `peerLeft`, cleanup counts) during first 24h after deploy.

## Session: 2026-03-23 (operational hardening + next steps)

### Summary

- Added **custom lobby stale cleanup** with TTL and **server-side sweep logs** (orphaned/expired/recovered).
- Added **server metrics counters** (creates/joins/matches/leaves/cleanup) with periodic logs and **final metrics on shutdown**.
- Enforced **Firebase ID token verification** for Socket.IO matchmaking when `REQUIRE_FIREBASE_TOKEN=true` (Firebase Admin SDK).
- Added **single active session per uid** guard to prevent multi-tab/window edge cases.
- UI polish already applied during this iteration: empty-state row, lobby status badge, and **copy room code UX** for custom lobbies.

### Files

- `server/index.js`
- `src/App.jsx`, `src/App.css`
- `docs/*`, `firestore.rules`, `.env.example`

### Follow-ups (planned next)

- Production deployment smoke test: Quick match + Custom open lobby + Custom code-only + multi-tab guard recovery.
- UI copy consistency: ensure all custom-mode labels are user-facing (**Creator / Disagreeing side**) everywhere.
- Monitoring: review metrics/cleanup logs from the first 24h and tune `CUSTOM_LOBBY_TTL_MS` if needed.

## Session: 2026-03-23 (custom lobby stale cleanup logging)

### Summary

- Added a **server-side periodic sweep** for custom lobbies so the Join servers list doesn’t accumulate stale “orphaned” or expired rooms.
- Cleanup rules:
  - Remove lobbies whose creator socket is disconnected.
  - Expire open lobbies after a configurable TTL (`CUSTOM_LOBBY_TTL_MS`, default 30 minutes).
  - If a lobby is marked active but the underlying room is invalid, recover it back to waiting.
- When the sweep makes changes, the server logs a concise summary and broadcasts the updated open-lobby list.

### Files

- `server/index.js`

### Decisions

- Cleanup runs every 60s and TTL is configurable to balance correctness vs overhead.

### Follow-ups

- Optionally improve UI messaging if a lobby disappears between render and join.

## Session: 2026-03-23 (custom lobbies: tabs, open vs code-only, persistent host)

### Summary

- **Custom mode redesign:** Reworked custom matchmaking into two tabs — **Join servers** and **Create server**. Join tab supports **live lobby list** plus **Join by code**. Create tab supports statement publishing with selectable visibility: **Open lobby** (listed) or **Code-only** (hidden from list).
- **Host persistence fix:** Creating a custom lobby now places the creator directly into a waiting debate view (camera/mic ready). If a challenger joins and later leaves, the creator is **not forced out**; the lobby returns to waiting and accepts the next challenger until the creator ends the session.
- **Copy confirmation UX:** Room code copy now shows a short **"✓ Copied"** confirmation state.
- **Firestore compatibility:** Custom debate logging now consistently uses `topicId: "custom"` client-side; `firestore.rules` updated to allow optional custom metadata on `debates` writes (`matchMode`, `roomCode`, `statement`) while keeping owner-only create/read and no update/delete.
- **Security hardening (Socket.IO):** Added optional Firebase ID token verification for Socket.IO connections via Firebase Admin SDK. Client now sends an ID token during the Socket.IO handshake; server verifies it when Admin credentials are configured.

### Files

- `src/App.jsx`, `src/App.css`
- `server/index.js`
- `firestore.rules`
- `docs/DEV_LOG.md`, `docs/PROJECT_MEMORY.md`

### Decisions

- Keep custom lobby visibility explicit at creation time (`open` vs `code`).
- Keep creator lobby lifecycle host-controlled (creator leaves = lobby closes).

### Follow-ups

- Consider renaming custom-side labels from internal **pro/con** to user-facing **creator/disagree** in all UI copy.
- Optional: add explicit lobby status badges (`waiting`, `active`) next to room code in the debate panel.

---

## Session: 2026-03-22 (documentation — PROJECT_MEMORY + DEV_LOG)

### Summary

- **Continuity refresh:** Re-read the codebase and updated **`PROJECT_MEMORY.md`** so **§2 What works** and **§7 Repository layout** explicitly include **in-app reporting** (**`ReportIssue.jsx`**, Firestore **`reports`**, **`submitReport`** in **`chitChatFirestore.js`**) and the **90-second client cooldown** after a successful report (**`localStorage`** key **`chitchat:lastReportAt`**). **Last updated** / **Session notes** adjusted to reflect this pass.
- **DEV_LOG:** This entry records the documentation maintenance session (no application code changes).

### Files

- `docs/PROJECT_MEMORY.md`, `docs/DEV_LOG.md`

---

## Session: 2026-03-22 (header nav, mission/support pages, viewport header layout)

### Summary

- **Signed-in header menu:** **`HeaderNavMenu.jsx`** — “Menu” dropdown next to **Sign out** with **Legal** subsection (Terms, Privacy, Community Guidelines, Recording & streaming consent), **Our Mission**, and **Support**. Chooses full-screen overlays via **`headerOverlay`** in **`App.jsx`**; legal reuses **`LegalViewer`**, mission/support use **`MissionPage.jsx`** / **`SupportPage.jsx`** with **`LegalDocumentShell`**.
- **Our Mission copy:** Replaced placeholder with user-provided mission statement (three paragraphs); shell title **Our Mission**; menu label aligned.
- **Layout (important):** Menu/Sign out must align to the **viewport** right edge, and the logo/tagline must center on the **full screen** — not inside the **`max-width: 1100px`** `.app` column. Earlier attempts (`100vw` negative margins on a child of `.app`, CSS grid `1fr auto 1fr`, `position: absolute` inside the column) failed or regressed because the positioning context stayed the narrow column. **Fix:** Render the logged-in header as a **sibling** of `.app` in **`#root`**: wrapper **`app-top-bar`** (full width, horizontal safe-area padding). Main content stays in **`.app`**; when logged in, **`.app--with-global-header`** sets **`padding-top: 0`** so top spacing isn’t doubled. **`header-actions`** remains **`position: absolute; top: 0; right: 0`** relative to **`app-header-row`**. **`#root`** uses **`overflow-x: clip`** to avoid horizontal scroll from older bleed experiments (kept as harmless guard).
- **Dropdown visibility:** Ensured **`HeaderNavMenu`** is actually mounted in the header JSX (it had been imported but omitted briefly). Dropdown panel uses a solid-enough background and z-index so it reads on the page gradient.

### Files

- `src/App.jsx`, `src/App.css`, `src/HeaderNavMenu.jsx`, `src/MissionPage.jsx`, `src/SupportPage.jsx`, `src/index.css` (root overflow)
- `docs/DEV_LOG.md`, `docs/PROJECT_MEMORY.md`

### Decisions

- Keep extending the menu by adding rows or groups in **`HeaderNavMenu.jsx`** (and new overlay components or **`LegalViewer`** ids as needed).

### Follow-ups

- If the logo asset has a large opaque (e.g. black) bounding box, consider a trimmed PNG for visual centering independent of layout.

---

## Session: 2026-03-22 (report cooldown)

### Summary

- **Anti-spam:** After a successful report, **`submitReport`** records a timestamp in **`localStorage`** (`chitchat:lastReportAt`) and blocks another submit for **90 seconds** (clear message with remaining time). Mitigates rapid-fire reports from the same browser.

### Files

- `src/chitChatFirestore.js`, `docs/DEV_LOG.md`

---

## Session: 2026-03-22 (in-app reports + Firestore)

### Summary

- **Moderation intake:** Users can **Report issue** during a debate — modal (**`ReportIssue.jsx`**) with category (harassment / spam / other) + details. **`submitReport`** in **`chitChatFirestore.js`** writes **`reports`** with `reporterUid`, `topicId`, `roomId`, `yourSide`, `category`, `details`, `createdAt`.
- **Firestore rules:** `reports` — create when authenticated and `reporterUid == uid`; read own reports only; no updates. **Deploy updated `firestore.rules`** to Firebase Console.
- **UX:** Modal closes when leaving debate or opponent disconnects.

### Files

- `src/ReportIssue.jsx`, `src/App.jsx`, `src/App.css`, `src/chitChatFirestore.js`, `firestore.rules`, `docs/DEV_LOG.md`, `docs/PROJECT_MEMORY.md`

### Follow-ups

- Admin workflow: Firebase Console or Cloud Function to notify on new reports. **Block** still needs peer identity (or server-side matchmaking IDs) for a fuller block system.

---

## Session: 2026-03-22 (server: matchmaking rate limit)

### Summary

- **Abuse resistance:** In-memory **fixed-window** rate limit on **`join-queue`** per client IP (`server/rateLimit.js`). Uses **`x-forwarded-for`** when present (reverse proxy). On exceed, server emits **`queue-error`** with **`code: 'rate_limited'`** and copy; client shows it in the existing error banner.
- **Config:** **`RATE_LIMIT_JOIN_QUEUE_MAX`** (default 40), **`RATE_LIMIT_JOIN_QUEUE_WINDOW_MS`** (default 60000) — documented in **`.env.example`**.

### Files

- `server/index.js`, `server/rateLimit.js`, `.env.example`, `src/App.jsx`, `docs/DEV_LOG.md`

### Follow-ups

- For multiple Node processes, move limits to **Redis** or an edge/WAF. Optional caps on **`signal`** volume or concurrent sockets per IP after metrics.

---

## Session: 2026-03-22 (legal pages, branding, auth UI, theme)

### Summary

- **In-app legal:** Added **`src/legal/`** — **`TermsOfService`**, **`PrivacyPolicy`**, **`CommunityGuidelines`**, **`RecordingAgreement`**, **`LegalDocumentShell`**, **`LegalViewer`**, **`contactEmail.js`** (`VITE_CONTACT_EMAIL` for Privacy + Recording contact lines). Removed placeholder-only **`LegalPlaceholder`** once Recording text existed.
- **Signup UX:** **18+** checkbox plus one combined acceptance line with links to all four documents; **`AuthScreen`** footer links to each policy. **`App`** uses **`app--auth-only`** for full-bleed auth layout.
- **Branding:** **`public/chitchat-logo.png`**, **`BrandLogo.jsx`**, favicon in **`index.html`**.
- **Auth styling:** **`AuthScreen.css`** (card, tabs, primary CTA, certification block). Iterated global **theme** in **`index.css`** + **`App.css`** so signed-in UI matches auth: palette moved from dark → earthy green → vibrant grass → **sky blue** (current); shared **`--page-bg-image`**, glass panels, primary buttons, audio meter gradient, legal overlay background.
- **Community Guidelines:** User-provided copy; **emojis removed** from subsection titles in **`CommunityGuidelines.jsx`**.

### Files (representative)

- `src/legal/*`, `src/AuthScreen.jsx`, `src/AuthScreen.css`, `src/App.jsx`, `src/App.css`, `src/index.css`, `index.html`, `public/chitchat-logo.png`, `src/BrandLogo.jsx`, `.env.example`

### Follow-ups

- Set **`VITE_CONTACT_EMAIL`** for production. Counsel review of policy text. Server-side **Firebase token verification** for matchmaking when hardening for public launch.

---

## Session: 2026-03-22 (auth docs — email/password only)

### Summary

- Firebase Console is set to **Email/Password**; the client already used **`AuthScreen`** (no Anonymous). Removed leftover **Anonymous** wording from **`PROJECT_MEMORY`**, **`.env.example`**, **`firestore.rules`** header comment, **`chitChatFirestore.js`**, and clarified the older **DEV_LOG** Firebase session (anonymous prototype superseded).

### Files

- `docs/PROJECT_MEMORY.md`, `docs/DEV_LOG.md`, `firestore.rules`, `src/chitChatFirestore.js`, `.env.example`

---

## Session: 2026-03-22 (email/password gate)

### Summary

- **Gatekept app:** Removed anonymous auth. **`AuthScreen`** (sign in / create account / forgot password). **`onAuthStateChanged`** + **`authReady`**; main UI and Socket.IO only when `firebaseUserId` is set.
- **Sign out** in header; **`handleSignOut`** clears local state and calls Firebase **`signOut`**.
- **Reset effect** when user becomes null (cleanup + welcome). **`cleanupMedia`** now clears **`roomIdRef`**.
- **Styles:** auth form, header row. **`firebase.js`:** dropped `ensureAnonymousUser`.
- **Docs / `.env.example`:** Email/Password required; note server does not verify JWTs on matchmaking yet.

### Files

- `src/AuthScreen.jsx`, `src/App.jsx`, `src/App.css`, `src/firebase.js`, `src/DebateHistory.jsx`, `.env.example`, `docs/*`

### User (Firebase Console)

- Enable **Email/Password** under Authentication → Sign-in method; optionally **disable Anonymous**.

---

## Session: 2026-03-22 (past sessions UI)

### Summary

- **Past sessions** on welcome: **`fetchRecentDebates(uid)`** + **`DebateHistory.jsx`** lists Firestore `debates` (newest first via client sort). Refresh + back to welcome.

### Files

- `src/chitChatFirestore.js`, `src/DebateHistory.jsx`, `src/App.jsx`, `src/App.css`, docs

---

## Session: 2026-03-22 (persistence + deploy path)

### Summary

- **Firestore:** `syncUserPresence()` writes **`users/{uid}`** (`app`, `lastSeenAt`). **`logDebateSessionEnd()`** adds **`debates`** docs on **Leave** (`reason: leave`) or **peer-left** (`peer_left`) with topic, side, room, duration, WebRTC `connectionState`. Wired in `App.jsx` via `debateSessionRef` + `flushDebateLog`.
- **Rules:** `firestore.rules` — users own-doc; debates create/read only when `uid` matches auth (immutable after create).
- **Deploy:** `Dockerfile` (multi-stage build + `npm start`), `.dockerignore`, **`docs/DEPLOY.md`** (VITE build-time vars, `PORT`, Docker).

### Files

- `src/chitChatFirestore.js`, `src/App.jsx`, `firestore.rules`
- `Dockerfile`, `.dockerignore`, `docs/DEPLOY.md`
- `docs/PROJECT_MEMORY.md`, `docs/DEV_LOG.md`

### Follow-ups

- Deploy rules in Firebase Console if the project still uses **test mode** defaults for collections.
- Optional UI: list `debates` for the signed-in user.

---

## Session: 2026-03-22 (device selection)

### Summary

- Added **Camera & microphone** UI (expandable section, open by default before a debate): grant permission, enumerate devices, dropdowns for camera/mic, refresh list, live preview.
- Debate `getUserMedia` uses **`buildMediaConstraints(videoDeviceId, audioDeviceId)`** (`mediaUtils.js`); empty string = system default.
- Extracted **`getMediaErrorMessage`** to `mediaUtils.js` for reuse.

### Files

- `src/DeviceSettings.jsx`, `src/mediaUtils.js`, `src/App.jsx`, `src/App.css`

---

## Session: 2026-03-22 (branding: Chit Chat)

### Summary

- **Site name:** **Chit Chat** (user-facing title in `index.html` and `App.jsx` header; npm package renamed to `chit-chat`).
- **Files:** `index.html`, `src/App.jsx`, `package.json`, `package-lock.json`, `docs/PROJECT_MEMORY.md`.

---

## Session: 2026-03-22 (Firebase)

### Summary

- **Decision:** Use **Firebase** (user preference; aligns with prior project experience; strong free tier for small apps).
- **Implemented:** `firebase` npm package; `src/firebase.js` initializes **Auth** + **Firestore** when `VITE_FIREBASE_*` variables are present; **`ensureAnonymousUser()`** for stable UID without email signup.
- **Superseded:** Email/password gate (`AuthScreen`) replaced anonymous sign-in; **`ensureAnonymousUser`** removed from `firebase.js` (see session *email/password gate* above).
- **UI:** Welcome screen copy updates when Firebase is active; dev-only hint if keys missing; error if Email/Password sign-in is disabled in Console (`auth/operation-not-allowed`).
- **Rules:** `firestore.rules` — `users/{userId}` read/write for owner UID only; extend with new collections as needed.
- **Docs:** `.env.example` extended; `PROJECT_MEMORY` / `DEV_LOG` updated.

### Files touched

- `package.json` (dependency `firebase`)
- `src/firebase.js`, `src/App.jsx`, `src/App.css`
- `firestore.rules`, `.env.example`
- `docs/PROJECT_MEMORY.md`, `docs/DEV_LOG.md`

### Follow-ups

- Wire Firestore writes (e.g. debate summaries, queue metadata) and tighten rules per collection.
- Optional: Firebase CLI + `firebase deploy` for rules; email/Google auth when product needs it.

---

## Session: 2026-03-22 (documentation continuity)

### Summary

- User asked that **`PROJECT_MEMORY.md`** and **`DEV_LOG.md`** be maintained so a future assistant or developer can read them and be **fully up to date** as if the session never ended.
- **PROJECT_MEMORY** was expanded with: read-first guidance, what works vs not built, architecture overview, Socket.IO event contract, HTTP routes, repo layout, env vars, scripts, Windows/Node notes, gotchas, and a **documentation contract** (what to update each session).
- **DEV_LOG** was aligned: this session recorded; prior session kept as historical record.

### Files touched

- `docs/PROJECT_MEMORY.md` — major expansion / continuity handoff.
- `docs/DEV_LOG.md` — this entry + structure clarification.

### Follow-ups

- None for docs specifically; next feature work should append a new session block above this one.

---

## Session: 2026-03-22 (initial build & environment)

### Summary

- **Scaffolded** full-stack debate MVP: React + Vite client; Express + Socket.IO server; WebRTC peer video/audio.
- **Matchmaking:** Per-topic queues for `pro` and `con`; first waiter on opposite side pairs with incoming joiner; room id encodes topic + socket ids; offerer flag for SDP.
- **Server:** `GET /health`, `GET /api/rtc-config` (ICE from `server/rtcConfig.js` + optional `ICE_SERVERS_JSON`); topic allowlist via `shared/topics.js`; `leave-debate` notifies peer; `queue-error` on bad input; static `dist` + SPA fallback in production.
- **Client:** Steps welcome → topic → side → waiting/matched → debate; fetches RTC config; buffers signaling until PC ready; connection-state pill; `leave-debate` on Leave button; mic/camera toggles.
- **Repo:** `dotenv`, `.env.example`, `.gitignore`; `shared/topics.js` + `src/topics.js` re-export.
- **Vite:** Proxies `/socket.io`, `/api`, `/health` to port **3001**.

### Environment / user support

- Cursor/agent environment initially had **no Node on PATH**; **`winget install OpenJS.NodeJS.LTS`** installed Node on the user machine.
- Ran **`npm install`** (181 packages) and **`npm run dev`** — Vite **5173**, server **3001**.
- User saw **`ERR_CONNECTION_REFUSED`** on localhost:5173 before the dev server was running — resolved by installing Node and starting `npm run dev`.

### Files / areas (high level)

- `server/index.js`, `server/rtcConfig.js`
- `shared/topics.js`, `src/App.jsx`, `src/App.css`, `src/main.jsx`, `src/index.css`, `src/topics.js`
- `vite.config.js`, `index.html`, `package.json`

### Commands

```text
npm install
npm run dev
npm run build
npm start
```

### Follow-ups (idea backlog)

- Accounts, moderation, Redis (or similar) for multi-instance queues, TURN for difficult NATs, structured debate rounds.

---
