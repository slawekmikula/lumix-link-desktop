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
  // Use IPC to perform the request in the main process to bypass CORS
  return await ipcRenderer.invoke('camera-request', url.toString());
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
  startUdpListener: () => ipcRenderer.invoke('start-udp-listener'),
  stopUdpListener: () => ipcRenderer.invoke('stop-udp-listener'),
  onStreamFrame: (callback: (base64: string) => void) => {
    const subscription = (_event: any, value: string) => callback(value);
    ipcRenderer.on('stream-frame', subscription);
    return () => {
        ipcRenderer.removeListener('stream-frame', subscription);
    };
  },
  getState: async () => callCamera('/cam.cgi', { mode: 'getstate' }),
  sendSetting: async (type: string, value: string, value2?: string) => {
    const params: Record<string, string> = { mode: 'setsetting', type, value };
    if (value2 !== undefined) params.value2 = value2;
    return callCamera('/cam.cgi', params);
  },
  getSetting: async (type: string) => callCamera('/cam.cgi', { mode: 'getsetting', type }),
  getInfo: async (type: string) => callCamera('/cam.cgi', { mode: 'getinfo', type }),
  camCommand: async (value: string) => callCamera('/cam.cgi', { mode: 'camcmd', value }),
  camControl: async (type: string, value: string) => callCamera('/cam.cgi', { mode: 'camctrl', type, value }),
  triggerShutter: async () => callCamera('/cam.cgi', { mode: 'camcmd', value: 'capture' }),
  startRecording: async () => callCamera('/cam.cgi', { mode: 'camcmd', value: 'video_recstart' }),
  stopRecording: async () => callCamera('/cam.cgi', { mode: 'camcmd', value: 'video_recstop' }),
  mini: {
    open: () => ipcRenderer.invoke('mini.open'),
    close: () => ipcRenderer.invoke('mini.close'),
  },
});
