import { createRoot } from 'react-dom/client';
import { useEffect, useMemo, useState } from 'react';
import './mini.css';
import { parseState, xmlToEntries, formatDuration } from './utils';

function MiniApp() {
  const [stateRaw, setStateRaw] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedState = useMemo(() => parseState(stateRaw), [stateRaw]);
  const recording = parsedState.recording;
  
  const stateEntries = useMemo(() => xmlToEntries(stateRaw), [stateRaw]);
  const getValue = (path: string) => stateEntries.find((e) => e.path === path)?.value || '-';

  const refresh = async () => {
    try {
      const raw = await window.electronAPI.getState();
      setStateRaw(raw);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, []);

  const snap = async () => {
    setBusy(true);
    setError(null);
    try {
      await window.electronAPI.triggerShutter();
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      if (recording) {
        await window.electronAPI.stopRecording();
      } else {
        await window.electronAPI.startRecording();
      }
      // Trigger a refresh shortly after to pick up the change
      setTimeout(refresh, 1000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mini">
      <h3>Quick Controls</h3>
      <div className="buttons">
        <button onClick={snap} disabled={busy}>Take Photo</button>
        <button onClick={toggle} className={recording ? 'danger' : ''} disabled={busy}>
          {recording ? 'Stop Rec' : 'Start Rec'}
        </button>
      </div>
      <div className="status">{recording ? 'Recording' : 'Idle'}</div>
      
      <div className="stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', fontSize: '13px', paddingTop: '8px', borderTop: '1px solid #1a3c5a', marginTop: '4px' }}>
          <span title="Battery">🔋 {getValue('state/batt')}</span>
          <span title="Photos Remaining">📷 {getValue('state/remaincapacity')}</span>
          <span title="Video Time Remaining">📹 {formatDuration(getValue('state/video_remaincapacity'))}</span>
      </div>

      {error && <div className="error">{error}</div>}
    </div>
  );
}

const rootEl = document.getElementById('mini-root');
if (!rootEl) throw new Error('Mini root missing');
createRoot(rootEl).render(<MiniApp />);
