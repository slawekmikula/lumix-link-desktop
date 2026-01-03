import { useEffect, useMemo, useState } from 'react';
import type { CameraState } from './types';

const shutterPresets = [
  '1/4000',
  '1/2000',
  '1/1000',
  '1/500',
  '1/250',
  '1/125',
  '1/60',
  '1/30',
  '1/15',
  '1/8',
  '1/4',
  '1/2',
  '1s',
  '2s',
  '4s',
  '8s',
  '15s',
  '30s',
];

const isoPresets = ['200', '400', '800', '1600', '3200', '6400', '12800'];
const afModes = ['aftracking', '1area', 'pinpoint', 'facedetection'];
const wbModes = ['auto', 'daylight', 'cloudy', 'shade', 'halogen', 'flash'];

function parseState(raw: string | null): CameraState {
  if (!raw) return { raw, recording: false };
  const recording = raw.includes('video_rec=on');
  return { raw, recording };
}

function App() {
  const [cameraIp, setCameraIp] = useState('192.168.0.1');
  const [netmask, setNetmask] = useState('24');
  const [status, setStatus] = useState<string>('Not connected');
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [state, setState] = useState<CameraState>({ raw: null, recording: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => {
    if (!streamUrl) return null;
    return `${streamUrl}`;
  }, [streamUrl]);

  useEffect(() => {
    window.electronAPI.setCameraIp(cameraIp);
  }, [cameraIp]);

  const refreshState = async () => {
    try {
      const raw = await window.electronAPI.getState();
      setState(parseState(raw));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const connect = async () => {
    setLoading(true);
    setError(null);
    try {
      const stream = await window.electronAPI.startStream();
      setStreamUrl(stream);
      setStatus(`Connected to ${cameraIp}/${netmask}`);
      await refreshState();
    } catch (err) {
      setError((err as Error).message);
      setStatus('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const applySetting = async (type: string, value: string) => {
    setLoading(true);
    setError(null);
    try {
      await window.electronAPI.sendSetting(type, value);
      await refreshState();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const triggerShutter = async () => {
    setLoading(true);
    setError(null);
    try {
      await window.electronAPI.triggerShutter();
      await refreshState();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecord = async () => {
    setLoading(true);
    setError(null);
    try {
      if (state.recording) {
        await window.electronAPI.stopRecording();
      } else {
        await window.electronAPI.startRecording();
      }
      await refreshState();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const openMini = () => {
    window.electronAPI.mini.open();
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>Lumix Link Desktop</h1>
        <div className="card">
          <h2>Connection</h2>
          <label className="field">
            <span>Camera IP</span>
            <input value={cameraIp} onChange={(e) => setCameraIp(e.target.value)} />
          </label>
          <label className="field">
            <span>Netmask</span>
            <input value={netmask} onChange={(e) => setNetmask(e.target.value)} />
          </label>
          <button onClick={connect} disabled={loading}>
            {loading ? 'Connecting…' : 'Connect & Start Stream'}
          </button>
          <div className="status">{status}</div>
          {error && <div className="error">{error}</div>}
        </div>

        <div className="card">
          <h2>Exposure</h2>
          <label className="field">
            <span>Shutter</span>
            <select onChange={(e) => applySetting('shtrspeed', e.target.value)} defaultValue="">
              <option value="" disabled>select…</option>
              {shutterPresets.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>ISO</span>
            <select onChange={(e) => applySetting('iso', e.target.value)} defaultValue="">
              <option value="" disabled>select…</option>
              {isoPresets.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>White balance</span>
            <select onChange={(e) => applySetting('whitebalance', e.target.value)} defaultValue="">
              <option value="" disabled>select…</option>
              {wbModes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>AF mode</span>
            <select onChange={(e) => applySetting('afmode', e.target.value)} defaultValue="">
              <option value="" disabled>select…</option>
              {afModes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="card">
          <h2>Shooting</h2>
          <div className="actions">
            <button onClick={triggerShutter} disabled={loading}>Take Photo</button>
            <button onClick={toggleRecord} disabled={loading} className={state.recording ? 'danger' : ''}>
              {state.recording ? 'Stop Recording' : 'Start Recording'}
            </button>
            <button onClick={openMini}>Open Mini Panel</button>
          </div>
          <pre className="state">{state.raw || 'state: n/a'}</pre>
        </div>
      </aside>

      <main className="preview">
        <div className="preview-header">
          <div>
            <h2>Live Preview</h2>
            <p>Port 49199 stream</p>
          </div>
          <button onClick={refreshState} disabled={loading}>Refresh Status</button>
        </div>
        {previewUrl ? (
          <div className="preview-frame">
            <img src={previewUrl} alt="Live stream" />
          </div>
        ) : (
          <div className="preview-placeholder">Start stream to view live feed</div>
        )}
      </main>
    </div>
  );
}

export default App;
