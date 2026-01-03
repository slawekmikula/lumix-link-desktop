import { contextBridge, ipcRenderer } from 'electron';

let cameraIp: string | null = null;

async function callCamera(path: string, params?: Record<string, string>) {
  if (!cameraIp) throw new Error('Camera IP not set');
  const url = new URL(path, `http://${cameraIp}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.append(k, v);
    }
  }
  const response = await fetch(url.toString(), { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Camera call failed: ${response.status}`);
  }
  return response.text();
}

contextBridge.exposeInMainWorld('electronAPI', {
  setCameraIp: (ip: string) => {
    cameraIp = ip;
  },
  startStream: async () => {
    if (!cameraIp) throw new Error('Camera IP not set');
    await callCamera('/cam.cgi', { mode: 'camcmd', value: 'recmode' });
    await callCamera('/cam.cgi', { mode: 'startstream', value: '49199' });
    return `http://${cameraIp}:49199`;
  },
  getState: async () => callCamera('/cam.cgi', { mode: 'getstate' }),
  sendSetting: async (type: string, value: string) => callCamera('/cam.cgi', { mode: 'setsetting', type, value }),
  triggerShutter: async () => callCamera('/cam.cgi', { mode: 'camcmd', value: 'capture' }),
  startRecording: async () => callCamera('/cam.cgi', { mode: 'camcmd', value: 'video_recstart' }),
  stopRecording: async () => callCamera('/cam.cgi', { mode: 'camcmd', value: 'video_recstop' }),
  mini: {
    open: () => ipcRenderer.invoke('mini.open'),
    close: () => ipcRenderer.invoke('mini.close'),
  },
});
