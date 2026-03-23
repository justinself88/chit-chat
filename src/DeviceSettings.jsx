import { useCallback, useEffect, useRef, useState } from 'react';
import AudioLevelMeter from './AudioLevelMeter.jsx';
import { getMediaErrorMessage, getUserMediaWithFallback } from './mediaUtils.js';

/**
 * Lets the user grant permission, pick camera/mic, and preview before joining a match.
 */
export default function DeviceSettings({
  videoDeviceId,
  audioDeviceId,
  onVideoDeviceChange,
  onAudioDeviceChange,
}) {
  const [videoInputs, setVideoInputs] = useState([]);
  const [audioInputs, setAudioInputs] = useState([]);
  const [phase, setPhase] = useState('idle');
  const [banner, setBanner] = useState(null);
  const [mediaHint, setMediaHint] = useState(null);
  const [previewStream, setPreviewStream] = useState(null);
  const previewRef = useRef(null);
  const previewStreamRef = useRef(null);

  const stopPreview = useCallback(() => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
    }
    setPreviewStream(null);
    if (previewRef.current) previewRef.current.srcObject = null;
  }, []);

  const refreshDeviceLists = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setVideoInputs(all.filter((d) => d.kind === 'videoinput'));
      setAudioInputs(all.filter((d) => d.kind === 'audioinput'));
    } catch {
      setBanner('Could not list devices.');
    }
  }, []);

  const allowAndLoadDevices = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setBanner('Your browser does not support camera or microphone access.');
      return;
    }
    setPhase('requesting');
    setBanner(null);
    setMediaHint(null);
    try {
      const temp = await getUserMediaWithFallback('', '');
      const hasVideo = temp.getVideoTracks().length > 0;
      const hasAudio = temp.getAudioTracks().length > 0;
      temp.getTracks().forEach((t) => t.stop());
      await refreshDeviceLists();
      setPhase('ready');
      if (hasAudio && !hasVideo) {
        setMediaHint(
          'Only a microphone is active (no camera). You can still debate with voice; video will be blank until a camera is available.'
        );
      } else if (hasVideo && !hasAudio) {
        setMediaHint('Only a camera is active (no microphone). The other person may not hear you.');
      }
    } catch (err) {
      setPhase('error');
      setBanner(getMediaErrorMessage(err));
    }
  };

  useEffect(() => {
    const onDeviceChange = () => refreshDeviceLists();
    navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange);
    return () =>
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange);
  }, [refreshDeviceLists]);

  useEffect(() => {
    if (phase !== 'ready') {
      stopPreview();
      return;
    }
    let cancelled = false;

    async function runPreview() {
      stopPreview();
      setBanner(null);
      try {
        const stream = await getUserMediaWithFallback(videoDeviceId, audioDeviceId);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        previewStreamRef.current = stream;
        setPreviewStream(stream);
        if (previewRef.current) previewRef.current.srcObject = stream;
      } catch (err) {
        if (!cancelled) setBanner(getMediaErrorMessage(err));
      }
    }

    runPreview();
    return () => {
      cancelled = true;
      stopPreview();
    };
  }, [phase, videoDeviceId, audioDeviceId, stopPreview]);

  const labelFor = (d, i, kind) => {
    if (d.label) return d.label;
    return kind === 'video' ? `Camera ${i + 1}` : `Microphone ${i + 1}`;
  };

  return (
    <div className="device-settings">
      <p className="device-settings-lead">
        Allow access once so we can list your devices. Then pick which camera and microphone to use
        for debates.
      </p>

      {phase === 'idle' || phase === 'error' ? (
        <button type="button" className="btn btn-primary device-settings-cta" onClick={allowAndLoadDevices}>
          Allow &amp; load devices
        </button>
      ) : null}

      {phase === 'requesting' ? (
        <p className="device-settings-status">Waiting for permission…</p>
      ) : null}

      {banner && (
        <div className="error-banner device-settings-banner" role="alert">
          {banner}
        </div>
      )}

      {mediaHint && !banner && (
        <p className="device-settings-info" role="status">
          {mediaHint}
        </p>
      )}

      {phase === 'ready' && (
        <>
          <div className="device-select-row">
            <label htmlFor="device-camera">Camera</label>
            <select
              id="device-camera"
              value={videoDeviceId}
              onChange={(e) => onVideoDeviceChange(e.target.value)}
            >
              <option value="">Default (system)</option>
              {videoInputs.map((d, i) => (
                <option key={d.deviceId || `v-${i}`} value={d.deviceId}>
                  {labelFor(d, i, 'video')}
                </option>
              ))}
            </select>
          </div>
          <div className="device-mic-block">
            <div className="device-select-row">
              <label htmlFor="device-mic">Microphone</label>
              <select
                id="device-mic"
                value={audioDeviceId}
                onChange={(e) => onAudioDeviceChange(e.target.value)}
              >
                <option value="">Default (system)</option>
                {audioInputs.map((d, i) => (
                  <option key={d.deviceId || `a-${i}`} value={d.deviceId}>
                    {labelFor(d, i, 'audio')}
                  </option>
                ))}
              </select>
            </div>
            <AudioLevelMeter stream={previewStream} />
          </div>
          <button type="button" className="btn btn-ghost" onClick={refreshDeviceLists}>
            Refresh device list
          </button>
          <div className="device-preview-wrap">
            <video ref={previewRef} className="device-preview-video" autoPlay playsInline muted />
            <span className="device-preview-label">Preview</span>
          </div>
        </>
      )}
    </div>
  );
}
