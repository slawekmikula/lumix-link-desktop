import { useEffect, useMemo, useState } from 'react';
import type { CameraState } from './types';

type XmlEntry = { path: string; value: string };

const tabs = [
  { id: 'main', label: 'Main' },
  { id: 'info', label: 'Info' },
  { id: 'more', label: 'More' },
  { id: 'control', label: 'Control' },
];

const shutterOptions = [
  { label: '1/4000', value: '3072/256' },
  { label: '1/3200', value: '2987/256' },
  { label: '1/2500', value: '2902/256' },
  { label: '1/2000', value: '2816/256' },
  { label: '1/1600', value: '2731/256' },
  { label: '1/1300', value: '2646/256' },
  { label: '1/1000', value: '2560/256' },
  { label: '1/800', value: '2475/256' },
  { label: '1/640', value: '2390/256' },
  { label: '1/500', value: '2304/256' },
  { label: '1/400', value: '2219/256' },
  { label: '1/320', value: '2134/256' },
  { label: '1/250', value: '2048/256' },
  { label: '1/200', value: '1963/256' },
  { label: '1/160', value: '1878/256' },
  { label: '1/125', value: '1792/256' },
  { label: '1/100', value: '1707/256' },
  { label: '1/80', value: '1622/256' },
  { label: '1/60', value: '1536/256' },
  { label: '1/50', value: '1451/256' },
  { label: '1/40', value: '1366/256' },
  { label: '1/30', value: '1280/256' },
  { label: '1/25', value: '1195/256' },
  { label: '1/20', value: '1110/256' },
  { label: '1/15', value: '1024/256' },
  { label: '1/13', value: '939/256' },
  { label: '1/10', value: '854/256' },
  { label: '1/8', value: '768/256' },
  { label: '1/6', value: '683/256' },
  { label: '1/5', value: '598/256' },
  { label: '1/4', value: '512/256' },
  { label: '1/3.2', value: '427/256' },
  { label: '1/2.5', value: '342/256' },
  { label: '1/2', value: '256/256' },
  { label: '1/1.6', value: '171/256' },
  { label: '1/1.3', value: '86/256' },
  { label: '1"', value: '0/256' },
  { label: '1.3"', value: '-85/256' },
  { label: '1.6"', value: '-170/256' },
  { label: '2"', value: '-256/256' },
  { label: '2.5"', value: '-341/256' },
  { label: '3.2"', value: '-426/256' },
  { label: '4"', value: '-512/256' },
  { label: '5"', value: '-682/256' },
  { label: '6"', value: '-768/256' },
  { label: '8"', value: '-853/256' },
  { label: '10"', value: '-938/256' },
  { label: '13"', value: '-1024/256' },
  { label: '15"', value: '-1109/256' },
  { label: '20"', value: '-1194/256' },
  { label: '25"', value: '-1280/256' },
  { label: '30"', value: '-1365/256' },
  { label: '40"', value: '-1450/256' },
  { label: '50"', value: '-1536/256' },
  { label: '60"', value: '16384/256' },
  { label: 'Bulb', value: '256/256' },
];

const isoPresets = ['200', '400', '800', '1600', '3200', '6400', '12800'];
const afModes = ['aftracking', '1area', 'pinpoint', 'facedetection'];
const wbModes = ['auto', 'daylight', 'cloudy', 'shade', 'halogen', 'flash', 'white_set1', 'white_set2', 'white_set3', 'white_set4', 'color_temp'];
const focalPresets = [
  { label: 'f/1.7', value: '392/256' },
  { label: 'f/1.8', value: '427/256' },
  { label: 'f/2', value: '512/256' },
  { label: 'f/2.2', value: '598/256' },
  { label: 'f/2.5', value: '683/256' },
  { label: 'f/2.8', value: '768/256' },
  { label: 'f/3.2', value: '854/256' },
  { label: 'f/3.5', value: '938/256' },
  { label: 'f/4', value: '1024/256' },
  { label: 'f/4.5', value: '1110/256' },
  { label: 'f/5', value: '1195/256' },
  { label: 'f/5.6', value: '1280/256' },
  { label: 'f/6.3', value: '1366/256' },
  { label: 'f/7.1', value: '1451/256' },
  { label: 'f/8', value: '1536/256' },
  { label: 'f/9', value: '1622/256' },
  { label: 'f/10', value: '1707/256' },
  { label: 'f/11', value: '1792/256' },
  { label: 'f/13', value: '1878/256' },
  { label: 'f/14', value: '1963/256' },
  { label: 'f/16', value: '2048/256' },
];

const lightMetering = ['center', 'spot', 'multi'];
const colorModes = ['vivid', 'natural', 'bw', 'scenery', 'portrait', 'custom'];
const aspectRatios = ['4:3', '3:2', '1:1', '16:9'];
const pictureSizes = ['16m', '8m', '4m'];
const pictureQualities = ['fine', 'standard', 'raw_fine', 'raw_standard'];
const videoQualities = [
  'mov_24p_50mbps',
  'mov_24p_72mbps',
  'mov_30p_50mbps',
  'mov_30p_72mbps',
  'mov_60p_50mbps',
  'mov_60p_72mbps',
  'mp4_30p_4mbps',
  'mp4_30p_10mbps',
  'mp4_30p_20mbps',
  'avchd_24p_24mbps',
  'avchd_30p_24mbps',
  'avchd_60p_28mbps',
  'avchd_60i_17mbps',
];
const videoRectimes = ['30', '60', '90', '120', '180', '240', '300', '600', '1200', '1800', '2400'];
const colorTemps = ['2500', '3000', '3500', '4000', '4500', '5000', '5500', '6000', '6500', '7000', '7500', '8000', '8500', '9000', '9500', '10000'];

const getSettingTypes = ['afmode', 'focusmode', 'mf_asst', 'mf_asst_mag', 'ex_tele_conv', 'colormode'];
const getInfoTypes = ['capability', 'allmenu', 'curmenu', 'lens'];

function parseState(raw: string | null): CameraState {
  if (!raw) return { raw, recording: false };
  const recording = raw.includes('video_rec=on');
  return { raw, recording };
}

function xmlToEntries(raw: string | null): XmlEntry[] {
  if (!raw) return [];
  try {
    const doc = new DOMParser().parseFromString(raw, 'application/xml');
    if (doc.querySelector('parsererror')) return [];
    const entries: XmlEntry[] = [];

    const walk = (node: Element, path: string) => {
      const childElements = Array.from(node.children) as Element[];
      if (childElements.length === 0) {
        entries.push({ path, value: node.textContent || '' });
        return;
      }
      childElements.forEach((child) => {
        const nextPath = path ? `${path}/${child.nodeName}` : child.nodeName;
        walk(child, nextPath);
      });
    };

    walk(doc.documentElement, '');
    return entries;
  } catch (err) {
    console.error('xml parse failed', err);
    return [];
  }
}

function KeyValueGrid({ entries }: { entries: XmlEntry[] }) {
  if (!entries.length) return <div className="muted">No data</div>;
  return (
    <div className="kv-grid">
      {entries.map((item) => (
        <div key={`${item.path}-${item.value}`} className="kv-row">
          <span className="kv-key">{item.path}</span>
          <span className="kv-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [cameraIp, setCameraIp] = useState('192.168.0.1');
  const [netmask, setNetmask] = useState('24');
  const [status, setStatus] = useState<string>('Not connected');
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [state, setState] = useState<CameraState>({ raw: null, recording: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'main' | 'info' | 'more' | 'control'>('main');
  const [getSettingType, setGetSettingType] = useState(getSettingTypes[0]);
  const [getInfoType, setGetInfoType] = useState(getInfoTypes[0]);
  const [getSettingResult, setGetSettingResult] = useState<string | null>(null);
  const [getInfoResult, setGetInfoResult] = useState<string | null>(null);
  const [settingEntries, setSettingEntries] = useState<XmlEntry[]>([]);
  const [infoEntries, setInfoEntries] = useState<XmlEntry[]>([]);
  const [focusTimer, setFocusTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  const previewUrl = useMemo(() => {
    if (!streamUrl) return null;
    return `${streamUrl}`;
  }, [streamUrl]);

  useEffect(() => {
    window.electronAPI.setCameraIp(cameraIp);
  }, [cameraIp]);

  useEffect(() => () => stopFocusRepeat(), []);

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

  const applySetting = async (type: string, value: string, value2?: string) => {
    setLoading(true);
    setError(null);
    try {
      await window.electronAPI.sendSetting(type, value, value2);
      await refreshState();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const setMode = async (modeValue: 'recmode' | 'playmode') => {
    setLoading(true);
    setError(null);
    try {
      await window.electronAPI.camCommand(modeValue);
      await refreshState();
      setStatus(`Mode set to ${modeValue}`);
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

  const runGetSetting = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.electronAPI.getSetting(getSettingType);
      setGetSettingResult(res);
      setSettingEntries(xmlToEntries(res));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const runGetInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.electronAPI.getInfo(getInfoType);
      setGetInfoResult(res);
      setInfoEntries(xmlToEntries(res));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const quickCamCommand = async (value: string) => {
    setError(null);
    try {
      await window.electronAPI.camCommand(value);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const quickCamControl = async (value: string) => {
    setError(null);
    try {
      await window.electronAPI.camControl('focus', value);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const stopFocusRepeat = () => {
    if (focusTimer) {
      clearInterval(focusTimer);
      setFocusTimer(null);
    }
  };

  const startFocusRepeat = (value: string, intervalMs: number) => {
    stopFocusRepeat();
    quickCamControl(value);
    const timer = window.setInterval(() => quickCamControl(value), intervalMs);
    setFocusTimer(timer);
  };

  const stateEntries = useMemo(() => xmlToEntries(state.raw), [state.raw]);

  const renderSettingSelect = (
    label: string,
    options: { label: string; value: string }[] | string[],
    onSelect: (value: string) => void,
  ) => {
    const normalized = options.map((opt) =>
      typeof opt === 'string' ? { label: opt, value: opt } : opt,
    );

    return (
      <label className="field">
        <span>{label}</span>
        <select
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            onSelect(v);
            e.target.value = '';
          }}
        >
          <option value="" disabled>
            select…
          </option>
          {normalized.map((opt) => (
            <option key={`${opt.label}-${opt.value}`} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
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
        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'main' && (
          <>
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
              <h2>Camera Mode</h2>
              <div className="actions">
                <button onClick={() => setMode('recmode')} disabled={loading}>Set Rec Mode</button>
                <button onClick={() => setMode('playmode')} disabled={loading}>Set Play Mode</button>
              </div>
            </div>

            <div className="card">
              <h2>Exposure</h2>
              {renderSettingSelect('Shutter', shutterOptions, (v) => applySetting('shtrspeed', v))}
              {renderSettingSelect('Aperture', focalPresets, (v) => applySetting('focal', v))}
              {renderSettingSelect('ISO', isoPresets, (v) => applySetting('iso', v))}
              {renderSettingSelect('White balance', wbModes, (v) => applySetting('whitebalance', v))}
              {renderSettingSelect('AF mode', afModes, (v) => applySetting('afmode', v))}
            </div>

            <div className="card">
              <h2>Shooting</h2>
              <div className="actions">
                <button onClick={triggerShutter} disabled={loading}>Take Photo</button>
                <button onClick={toggleRecord} disabled={loading} className={state.recording ? 'danger' : ''}>
                  {state.recording ? 'Stop Recording' : 'Start Recording'}
                </button>
                <button onClick={openMini}>Open Mini Panel</button>
                <button onClick={refreshState} disabled={loading}>Refresh Status</button>
              </div>
              <pre className="state">{state.raw || 'state: n/a'}</pre>
            </div>
          </>
        )}

        {activeTab === 'info' && (
          <>
            <div className="card">
              <h2>Get Settings</h2>
              <label className="field">
                <span>Type</span>
                <select value={getSettingType} onChange={(e) => setGetSettingType(e.target.value)}>
                  {getSettingTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <button onClick={runGetSetting} disabled={loading}>Fetch</button>
              <KeyValueGrid entries={settingEntries} />
              {getSettingResult && <pre className="state">{getSettingResult}</pre>}
            </div>
            <div className="card">
              <h2>Get Info</h2>
              <label className="field">
                <span>Type</span>
                <select value={getInfoType} onChange={(e) => setGetInfoType(e.target.value)}>
                  {getInfoTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <button onClick={runGetInfo} disabled={loading}>Fetch</button>
              <KeyValueGrid entries={infoEntries} />
              {getInfoResult && <pre className="state">{getInfoResult}</pre>}
            </div>
            <div className="card">
              <h2>Camera State</h2>
              <div className="actions">
                <button onClick={refreshState} disabled={loading}>Refresh state</button>
              </div>
              <KeyValueGrid entries={stateEntries} />
              {state.raw && <pre className="state">{state.raw}</pre>}
            </div>
          </>
        )}

        {activeTab === 'more' && (
          <>
            <div className="card">
              <h2>Set… (Extended)</h2>
              {renderSettingSelect('Shutter Speed', shutterOptions, (v) => applySetting('shtrspeed', v))}
              {renderSettingSelect('Aperture', focalPresets, (v) => applySetting('focal', v))}
              {renderSettingSelect('ISO', isoPresets, (v) => applySetting('iso', v))}
              {renderSettingSelect('AF Mode', afModes, (v) => applySetting('afmode', v))}
              {renderSettingSelect('Light metering', lightMetering, (v) => applySetting('lightmetering', v))}
              {renderSettingSelect('Color mode', colorModes, (v) => applySetting('colormode', v))}
              {renderSettingSelect('Aspect ratio', aspectRatios, (v) => applySetting('aspectratio', v))}
              {renderSettingSelect('Picture size', pictureSizes, (v) => applySetting('pictsize', v))}
              {renderSettingSelect('Picture quality', pictureQualities, (v) => applySetting('quality', v))}
              {renderSettingSelect('Video quality', videoQualities, (v) => applySetting('videoquality', v))}
              {renderSettingSelect('Video rectime', videoRectimes, (v) => applySetting('videorectime', v))}
              {renderSettingSelect('White balance', wbModes, (v) => applySetting('whitebalance', v))}
              {renderSettingSelect('Color temperature', colorTemps, (v) => applySetting('whitebalance', 'color_temp', v))}
            </div>
          </>
        )}

        {activeTab === 'control' && (
          <>
            <div className="card">
              <h2>Zoom</h2>
              <div className="actions">
                <button onClick={() => quickCamCommand('wide-fast')}>Wide · Fast</button>
                <button onClick={() => quickCamCommand('wide-normal')}>Wide · Slow</button>
                <button onClick={() => quickCamCommand('tele-normal')}>Tele · Slow</button>
                <button onClick={() => quickCamCommand('tele-fast')}>Tele · Fast</button>
                <button onClick={() => quickCamCommand('zoomstop')}>Stop</button>
              </div>
            </div>

            <div className="card">
              <h2>Manual Focus (hold)</h2>
              <div className="actions focus-actions">
                <button
                  onMouseDown={() => startFocusRepeat('wide-fast', 400)}
                  onMouseUp={stopFocusRepeat}
                  onMouseLeave={stopFocusRepeat}
                >
                  Wide · Fast
                </button>
                <button
                  onMouseDown={() => startFocusRepeat('wide-normal', 200)}
                  onMouseUp={stopFocusRepeat}
                  onMouseLeave={stopFocusRepeat}
                >
                  Wide · Slow
                </button>
                <button
                  onMouseDown={() => startFocusRepeat('tele-normal', 200)}
                  onMouseUp={stopFocusRepeat}
                  onMouseLeave={stopFocusRepeat}
                >
                  Tele · Slow
                </button>
                <button
                  onMouseDown={() => startFocusRepeat('tele-fast', 400)}
                  onMouseUp={stopFocusRepeat}
                  onMouseLeave={stopFocusRepeat}
                >
                  Tele · Fast
                </button>
              </div>
            </div>

            <div className="card">
              <h2>(Continuous) Shooting</h2>
              <div className="actions">
                <button onMouseDown={() => quickCamCommand('capture')} onMouseUp={() => quickCamCommand('capture_cancel')}>
                  Hold to shoot
                </button>
                <button onClick={() => quickCamCommand('capture_cancel')}>Stop</button>
              </div>
            </div>
          </>
        )}
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
