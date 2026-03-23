import { useEffect, useRef } from 'react';

const URL_SPLIT = /(https?:\/\/[^\s<>"']+)/gi;

function linkifyLine(text) {
  const parts = String(text).split(URL_SPLIT);
  return parts.map((part, i) => {
    if (/^https?:\/\//i.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="debate-chat-link">
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/**
 * Side text chat during an active debate (same Socket.IO room as WebRTC).
 */
export default function DebateChatPanel({
  messages,
  draft,
  onDraftChange,
  onSend,
  disabled,
  mySocketId,
}) {
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && draft.trim()) onSend();
    }
  };

  return (
    <div className="debate-chat" aria-label="Debate text chat">
      <h3 className="debate-chat-title">Text chat</h3>
      <p className="debate-chat-hint">Share links or notes. Enter sends; Shift+Enter for a new line.</p>
      <div ref={listRef} className="debate-chat-messages" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="debate-chat-empty">No messages yet.</p>
        ) : (
          messages.map((m) => {
            const isSelf = m.from === mySocketId;
            return (
              <div
                key={m.key}
                className={`debate-chat-msg ${isSelf ? 'debate-chat-msg--self' : 'debate-chat-msg--peer'}`}
              >
                <span className="debate-chat-msg-label">{isSelf ? 'You' : 'Opponent'}</span>
                <div className="debate-chat-msg-body">{linkifyLine(m.text)}</div>
              </div>
            );
          })
        )}
      </div>
      <div className="debate-chat-compose">
        <textarea
          className="debate-chat-input"
          rows={2}
          maxLength={2000}
          placeholder="Type a message or paste a link…"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label="Chat message"
        />
        <button
          type="button"
          className="btn btn-primary debate-chat-send"
          onClick={onSend}
          disabled={disabled || !draft.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
