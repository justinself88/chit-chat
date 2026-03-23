import { TOPICS } from './topics.js';

function topicTitle(id) {
  return TOPICS.find((t) => t.id === id)?.label ?? id;
}

function formatDuration(sec) {
  if (sec == null || Number.isNaN(sec)) return '—';
  const s = Math.max(0, Math.floor(sec));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

function reasonLabel(r) {
  if (r === 'leave') return 'You left';
  if (r === 'peer_left') return 'Opponent left';
  return r ?? '—';
}

export default function DebateHistory({ rows, loading, error, onBack, onRefresh }) {
  return (
    <div className="panel history-panel">
      <h2>Past sessions</h2>
      <p className="history-lead">
        Stored in your Firebase project for your signed-in account.
      </p>

      <div className="history-toolbar">
        <button type="button" className="btn btn-ghost" onClick={onRefresh} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <button type="button" className="back-btn" onClick={onBack} style={{ marginTop: 0 }}>
          Back
        </button>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="history-empty">No sessions yet. Finish a debate and it will show up here.</p>
      )}

      {rows.length > 0 && (
        <ul className="history-list">
          {rows.map((row) => (
            <li key={row.id} className="history-item">
              <div className="history-item-main">
                <strong>{topicTitle(row.topicId)}</strong>
                <span className="history-side">
                  You: {row.yourSide === 'pro' ? 'Pro' : 'Con'}
                </span>
              </div>
              <div className="history-item-meta">
                <span>{row.endedAtMs ? new Date(row.endedAtMs).toLocaleString() : '—'}</span>
                <span className="history-dot">·</span>
                <span>{formatDuration(row.durationSec)}</span>
                <span className="history-dot">·</span>
                <span>{reasonLabel(row.reason)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
