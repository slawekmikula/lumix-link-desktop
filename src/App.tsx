import { useEffect, useMemo, useRef, useState } from 'react';
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
  { label: 'f/18', value: '2133/256' },
  { label: 'f/20', value: '2219/256' },
  { label: 'f/22', value: '2304/256' },
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
  const recording = raw.includes('video_rec=on') || raw.includes('<rec>on</rec>');
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

function parseSettingValue(raw: string | null, type: string): string | null {
  if (!raw) return null;
  try {
    const doc = new DOMParser().parseFromString(raw, 'application/xml');
    if (doc.querySelector('parsererror')) return null;
    const sv = doc.querySelector('settingvalue');
    if (sv && sv.hasAttribute(type)) {
      let val = sv.getAttribute(type);
      // Fix specific aperture value issues where camera returns slightly different values
      if (type === 'focal' && val) {
        // f/4.5
        if (val === '1109/256' || val === '1111/256') val = '1110/256';
        // f/6.3
        if (val === '1365/256' || val === '1367/256') val = '1366/256';
        // f/9
        if (val === '1621/256' || val === '1623/256') val = '1622/256';
        // f/13
        if (val === '1877/256' || val === '1879/256') val = '1878/256';
      }
      return val;
    }
    return null;
  } catch (err) {
    console.error('xml parse failed', err);
    return null;
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

function formatDuration(secondsStr: string | undefined): string {
  if (!secondsStr) return '-';
  const sec = parseInt(secondsStr, 10);
  if (isNaN(sec)) return secondsStr;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function App() {
  const [cameraIp, setCameraIp] = useState('192.168.80.151');
  const [netmask, setNetmask] = useState('24');
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const removeListener = window.electronAPI.onStreamFrame((base64) => {
      if (imgRef.current) {
        imgRef.current.src = `data:image/jpeg;base64,${base64}`;
      }
    });

    return () => {
      removeListener();
      window.electronAPI.stopUdpListener();
    };
  }, []);

  const [status, setStatus] = useState<string>('Not connected');
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain'); // 'contain' acts as 'fit to width', 'cover' will be our 'fit to height' logic or custom
  // actually user asked for "fill width" (current) vs "fill height"
  // Let's use specific names
  const [viewMode, setViewMode] = useState<'width' | 'height'>('width');
  
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
  const [camSettings, setCamSettings] = useState<Record<string, string>>({});

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

  useEffect(() => {
    if (!streamUrl) return;
    // Camera needs periodic commands to keep the stream alive (watchdog)
    // We poll getstate every 3 seconds
    const interval = setInterval(refreshState, 3000);
    return () => clearInterval(interval);
  }, [streamUrl]);

  const fetchCamSettings = async () => {
    const settingsToFetch = [
      'shtrspeed',
      'focal',
      'iso',
      'whitebalance',
      'afmode'
    ];
    
    const newSettings: Record<string, string> = {};
    
    // Process sequentially to avoid overwhelming the camera
    for (const type of settingsToFetch) {
      try {
        const res = await window.electronAPI.getSetting(type);
        const val = parseSettingValue(res, type);
        if (val !== null) {
          newSettings[type] = val;
        }
      } catch (err) {
        console.error(`Failed to fetch setting ${type}`, err);
      }
    }
    
    setCamSettings(prev => ({ ...prev, ...newSettings }));
  };

  const connect = async () => {
    setLoading(true);
    setError(null);
    try {
      await window.electronAPI.startStream();
      await window.electronAPI.startUdpListener();
      setStreamUrl('UDP Stream Active');
      setStatus(`Connected to ${cameraIp}/${netmask}`);
      await refreshState();
      await fetchCamSettings();
    } catch (err) {
      setError((err as Error).message);
      setStatus('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await window.electronAPI.stopUdpListener();
      setStreamUrl(null);
      setStatus('Not connected');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleConnection = () => {
    if (streamUrl) {
      disconnect();
    } else {
      connect();
    }
  };

  const applySetting = async (type: string, value: string, value2?: string) => {
    setLoading(true);
    setError(null);
    try {
      await window.electronAPI.sendSetting(type, value, value2);
      await refreshState();

      // Update local state (optimistic or fetch confirmation)
      setCamSettings(prev => ({ ...prev, [type]: value }));
      
      // confirm from camera
      const res = await window.electronAPI.getSetting(type);
      const val = parseSettingValue(res, type);
      if (val) {
        setCamSettings(prev => ({ ...prev, [type]: val }));
      }
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

  const shootingRef = useRef(false);

  const stopShooting = () => {
    shootingRef.current = false;
    quickCamCommand('capture_cancel');
  };

  const startShooting = () => {
    if (shootingRef.current) return;
    shootingRef.current = true;
    const loop = async () => {
      if (!shootingRef.current) return;
      await quickCamCommand('capture');
      if (!shootingRef.current) {
        quickCamCommand('capture_cancel');
        return;
      }
      await new Promise((r) => setTimeout(r, 300));
      await quickCamCommand('capture_cancel');
      if (!shootingRef.current) return;
      await new Promise((r) => setTimeout(r, 500));
      if (shootingRef.current) loop();
    };
    loop();
  };

  const stateEntries = useMemo(() => xmlToEntries(state.raw), [state.raw]);

  const renderSettingSelect = (
    label: string,
    options: { label: string; value: string }[] | string[],
    onSelect: (value: string) => void,
    controlKey?: string,
  ) => {
    const normalized = options.map((opt) =>
      typeof opt === 'string' ? { label: opt, value: opt } : opt,
    );

    const val = controlKey ? camSettings[controlKey] : undefined;

    return (
      <label className="field">
        <span>{label}</span>
        <select
          value={val !== undefined ? val : ''}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            onSelect(v);
            if (controlKey === undefined) e.target.value = '';
          }}
        >
          {val === undefined && (
            <option value="" disabled>
              select…
            </option>
          )}
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F3 - Connect / Disconnect
      if (e.key === 'F3') {
        e.preventDefault();
        toggleConnection();
      }
      // F4 - Refresh Status
      else if (e.key === 'F4') {
        e.preventDefault();
        refreshState();
      }
      // F5 - Take photo
      else if (e.key === 'F5') {
        e.preventDefault();
        triggerShutter();
      }
      // F6 - Start recording
      else if (e.key === 'F6') {
        e.preventDefault();
        (async () => {
          setLoading(true);
          setError(null);
          try {
            await window.electronAPI.startRecording();
            await refreshState();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setLoading(false);
          }
        })();
      }
      // F7 - Stop recording
      else if (e.key === 'F7') {
        e.preventDefault();
        (async () => {
          setLoading(true);
          setError(null);
          try {
            await window.electronAPI.stopRecording();
            await refreshState();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setLoading(false);
          }
        })();
      }
      // F9 - Enter rec mode
      else if (e.key === 'F9') {
        e.preventDefault();
        setMode('recmode');
      }
      // F10 - Enter play mode
      else if (e.key === 'F10') {
        e.preventDefault();
        setMode('playmode');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerShutter, refreshState, setMode, toggleConnection]);

  const getValue = (path: string) => stateEntries.find((e) => e.path === path)?.value || '-';

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
              <div style={{ display: 'flex', gap: '8px' }}>
                <label className="field" style={{ flex: 1 }}>
                  <span>Camera IP</span>
                  <input value={cameraIp} onChange={(e) => setCameraIp(e.target.value)} />
                </label>
                <label className="field" style={{ width: '80px' }}>
                  <span>Netmask</span>
                  <input value={netmask} onChange={(e) => setNetmask(e.target.value)} />
                </label>
              </div>
              <button onClick={toggleConnection} disabled={loading}>
                {loading
                  ? 'Working…'
                  : streamUrl
                  ? 'Disconnect & Stop Stream (F3)'
                  : 'Connect & Start Stream (F3)'}
              </button>
              <div className="status">{status}</div>
              {error && <div className="error">{error}</div>}
            </div>

            <div className="card">
              <h2>Shooting</h2>
              <div className="actions">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{ flex: 1 }} onClick={() => setMode('recmode')} disabled={loading} title="F9">Rec Mode</button>
                  <button style={{ flex: 1 }} onClick={() => setMode('playmode')} disabled={loading} title="F10">Play Mode</button>
                </div>
                <button onClick={triggerShutter} disabled={loading}>Take Photo (F5)</button>
                <button onClick={toggleRecord} disabled={loading} className={state.recording ? 'danger' : ''}>
                  {state.recording ? 'Stop Recording (F7)' : 'Start Recording (F6)'}
                </button>
                <button onClick={refreshState} disabled={loading}>Refresh Status (F4)</button>
              </div>
              <pre className="state">{state.raw || 'state: n/a'}</pre>
            </div>

            <div className="card">
              <h2>Exposure</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  {renderSettingSelect('Shutter', shutterOptions, (v) => applySetting('shtrspeed', v), 'shtrspeed')}
                </div>
                <div style={{ flex: 1 }}>
                  {renderSettingSelect('Aperture', focalPresets, (v) => applySetting('focal', v), 'focal')}
                </div>
              </div>
              {renderSettingSelect('ISO', isoPresets, (v) => applySetting('iso', v), 'iso')}
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  {renderSettingSelect('White balance', wbModes, (v) => applySetting('whitebalance', v), 'whitebalance')}
                </div>
                <div style={{ flex: 1 }}>
                  {renderSettingSelect('AF mode', afModes, (v) => applySetting('afmode', v), 'afmode')}
                </div>
              </div>
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
                <button
                  onMouseDown={startShooting}
                  onMouseUp={stopShooting}
                  onMouseLeave={stopShooting}
                >
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
            <p className="stream-info">
              <span>🔋 {getValue('state/batt')}</span>
              {' · '}
              <span>📷 {getValue('state/remaincapacity')}</span>
              {' · '}
              <span>📹 {formatDuration(getValue('state/video_remaincapacity'))}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setViewMode(m => m === 'width' ? 'height' : 'width')}>
              {viewMode === 'width' ? 'Fit Height' : 'Fit Width'}
            </button>
            <button onClick={openMini}>Mini Panel</button>
          </div>
        </div>
        {previewUrl ? (
          <div 
            className="preview-frame"
            style={viewMode === 'height' ? { 
              height: 'calc(100vh - 140px)', 
              minHeight: 0, 
              width: 'auto',
              aspectRatio: '4/3', /* Optional, helps centering */
              margin: '0 auto'
            } : {}}
          >
            <img 
              ref={imgRef} 
              alt="Live stream" 
              style={viewMode === 'height' ? {
                width: 'auto',
                height: '100%',
                objectFit: 'contain'
              } : { 
                width: '100%', 
                height: 'auto', 
                objectFit: 'contain' 
              }}
            />
          </div>
        ) : (
          <div className="preview-placeholder">Start stream to view live feed</div>
        )}
      </main>
    </div>
  );
}

export default App;
