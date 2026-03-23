import { useEffect, useRef, useState } from 'react';

/**
 * Shows input level from a MediaStream's audio track (Web Audio Analyser).
 */
export default function AudioLevelMeter({ stream, compact = false, muted = false }) {
  const [level, setLevel] = useState(0);
  const smoothRef = useRef(0);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    if (!stream?.getAudioTracks?.().length) {
      smoothRef.current = 0;
      setLevel(0);
      return;
    }

    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.75;
    source.connect(analyser);

    const freq = new Uint8Array(analyser.frequencyBinCount);
    let raf;

    const tick = () => {
      analyser.getByteFrequencyData(freq);
      let sum = 0;
      for (let i = 0; i < freq.length; i++) sum += freq[i];
      const raw = Math.min(1, (sum / freq.length / 255) * 3.2);
      smoothRef.current = smoothRef.current * 0.65 + raw * 0.35;
      setLevel(mutedRef.current ? 0 : smoothRef.current);
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      ctx.resume().catch(() => {});
      raf = requestAnimationFrame(tick);
    };
    start();

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      ctx.close().catch(() => {});
    };
  }, [stream]);

  const hasAudio = stream?.getAudioTracks?.().length > 0;

  return (
    <div
      className={`audio-meter ${compact ? 'audio-meter--compact' : ''}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(level * 100)}
      aria-label="Microphone input level"
    >
      <div className="audio-meter-label">Mic</div>
      <div className="audio-meter-track">
        <div
          className="audio-meter-fill"
          style={{ transform: `scaleX(${hasAudio && !muted ? level : 0})` }}
        />
      </div>
      {!compact && (
        <span className="audio-meter-hint">{hasAudio ? 'Speak to see the bar move' : 'No mic in this stream'}</span>
      )}
    </div>
  );
}
