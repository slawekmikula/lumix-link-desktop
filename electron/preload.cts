import { contextBridge, ipcRenderer } from 'electron';

let cameraIp: string | null = null;

async function ensureCameraIp() {
  if (!cameraIp) {
    cameraIp = await ipcRenderer.invoke('get-camera-ip');
  }
  if (!cameraIp) throw new Error('Camera IP not set');
  return cameraIp;
}

async function callCamera(path: string, params?: Record<string, string>) {
  await ensureCameraIp();
  const url = new URL(path, `http://${cameraIp}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.append(k, v);
    }
  }
  // Use IPC to perform the request in the main process to bypass CORS
  try {
    return await ipcRenderer.invoke('camera-request', url.toString());
  } catch (error: any) {
    if (error.message && error.message.includes('fetch failed')) {
      throw new Error('Could not connect to the device');
    }
    throw error;
  }
}

async function callDlna(action: string, body: string) {
  await ensureCameraIp();
  const url = `http://${cameraIp}:60606/Server0/CDS_control`;
  return await ipcRenderer.invoke('camera-request', url, {
    method: 'POST',
    headers: {
      'SOAPAction': action,
      'Content-Type': 'text/xml; charset="utf-8"'
    },
    body
  });
}

contextBridge.exposeInMainWorld('electronAPI', {
  setCameraIp: (ip: string) => {
    cameraIp = ip;
    ipcRenderer.invoke('set-camera-ip', ip);
  },
  startStream: async () => {
    await ensureCameraIp();
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
  getLibraryContents: async () => callCamera('/cam.cgi', { mode: 'get_content_list' }),
  getContentInfo: async () => callCamera('/cam.cgi', { mode: 'get_content_info' }),
  browseDlna: async (objectId: string, start: number = 0, count: number = 30) => {
    const body = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
<s:Body>
<u:Browse xmlns:u="urn:schemas-upnp-org:service:ContentDirectory:1">
<ObjectID>${objectId}</ObjectID>
<BrowseFlag>BrowseDirectChildren</BrowseFlag>
<Filter>*</Filter>
<StartingIndex>${start}</StartingIndex>
<RequestedCount>${count}</RequestedCount>
<SortCriteria></SortCriteria>
</u:Browse>
</s:Body>
</s:Envelope>`;
    return callDlna('"urn:schemas-upnp-org:service:ContentDirectory:1#Browse"', body);
  },
  getThumbnail: async (fileName: string) => {
    await ensureCameraIp();
    // FileName e.g. "107-0692.JPG" -> transform to "1070692.JPG"
    const cleanName = fileName.replace(/-/g, '');
    const url = `http://${cameraIp}:50001/DT${cleanName}`;
    const cacheKey = `DT${cleanName}`;
    return await ipcRenderer.invoke('get-thumbnail', url, cacheKey);
  },
  downloadGeneric: async (contentId: string, fileName: string, customUrl?: string) => {
      await ensureCameraIp();
      const cleanName = fileName.replace(/-/g, '');
      const url = `http://${cameraIp}:50001/DL${cleanName}`;
      return await ipcRenderer.invoke('download-file', url, fileName);
  },
  mini: {
    open: () => ipcRenderer.invoke('mini.open'),
    close: () => ipcRenderer.invoke('mini.close'),
  },
});
