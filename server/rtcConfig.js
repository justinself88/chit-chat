const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * ICE config for clients. Optional ICE_SERVERS_JSON env:
 * [{"urls":"stun:..."},{"urls":"turn:...","username":"u","credential":"p"}]
 */
export function getRtcConfigForClient() {
  const raw = process.env.ICE_SERVERS_JSON;
  if (!raw?.trim()) {
    return { iceServers: DEFAULT_ICE_SERVERS };
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.warn('ICE_SERVERS_JSON invalid; using default STUN');
      return { iceServers: DEFAULT_ICE_SERVERS };
    }
    return { iceServers: parsed };
  } catch (e) {
    console.warn('ICE_SERVERS_JSON parse error; using default STUN', e.message);
    return { iceServers: DEFAULT_ICE_SERVERS };
  }
}
