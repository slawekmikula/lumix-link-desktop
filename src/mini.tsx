import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import './mini.css';

function MiniApp() {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const state = await window.electronAPI.getState();
      setRecording(state.includes('video_rec=on'));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    refresh();
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
      await refresh();
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
      {error && <div className="error">{error}</div>}
    </div>
  );
}

const rootEl = document.getElementById('mini-root');
if (!rootEl) throw new Error('Mini root missing');
createRoot(rootEl).render(<MiniApp />);
