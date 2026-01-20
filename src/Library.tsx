import { useState, useEffect, useCallback } from 'react';

type ContentItem = {
  id: string;
  filename: string;
  filetype: string;
  date: string;
  thumbnail?: string; // Base64
  originalUrl?: string;
};

export function Library() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const fetchLibrary = async () => {
    setLoading(true);
    setStatusMsg('Preparing...');
    const parser = new DOMParser();

    try {
      // 1. Switch to Play Mode
      setStatusMsg('Switching to Play Mode...');
      await window.electronAPI.camCommand('playmode');
      await new Promise(r => setTimeout(r, 800)); // Delay to let mode switch happen

      // 2. Get State/Content Info
      setStatusMsg('Checking content info...');
      try {
        await window.electronAPI.getState(); // Refresh state
      } catch (e) {
         console.warn(e);
      }

      let total = 0;
      try {
        const infoRaw = await window.electronAPI.getContentInfo();
        // Parse infoRaw to get count
        // <camrply><total_content_number>38</total_content_number>...</camrply>
        const infoDoc = parser.parseFromString(infoRaw, 'text/xml');
        const totalStr = infoDoc.querySelector('total_content_number')?.textContent;
        total = totalStr ? parseInt(totalStr, 10) : 0;
        setStatusMsg(`Found ${total} items via ContentInfo. Fetching DLNA list...`);
      } catch (err) {
        console.warn('get_content_info failed, proceeding with blind DLNA browse', err);
        setStatusMsg('Could not get content count. Trying DLNA browse...');
      }
      
      const contents: ContentItem[] = [];
      let start = 0;
      const batch = 30; // restricted by camera usually

      while (true) {
        setStatusMsg(`Fetching items ${start + 1} - ${start + batch}...`);
        
        let soapXml = '';
        try {
           soapXml = await window.electronAPI.browseDlna('0', start, batch);
        } catch (err) {
           console.error('DLNA Browse failed', err);
           if (contents.length > 0) break; // If we have some items, keep them
           throw err; // If first request fails, throw
        }
        
        const soapDoc = parser.parseFromString(soapXml, 'text/xml');
        // Handle namespaced tag names in XML
        const resultNode = soapDoc.getElementsByTagName('Result')[0] || 
                           soapDoc.getElementsByTagName('u:Result')[0] || 
                           soapDoc.querySelector('Result');
        
        if (!resultNode || !resultNode.textContent) {
          console.log('No result in SOAP response');
          break;
        }

        const didlXml = resultNode.textContent;
        const didlDoc = parser.parseFromString(didlXml, 'text/xml');
        const items = didlDoc.getElementsByTagName('item');
        
        if (items.length === 0) break;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const id = item.getAttribute('id') || '';
          // dc:title might benamespaced
          let title = item.getElementsByTagName('dc:title')[0]?.textContent || 
                        item.getElementsByTagName('title')[0]?.textContent || 'Unknown';
          const date = item.getElementsByTagName('dc:date')[0]?.textContent || 
                       item.getElementsByTagName('date')[0]?.textContent || '';
          
          const upnpClass = item.getElementsByTagName('upnp:class')[0]?.textContent || 
                            item.getElementsByTagName('class')[0]?.textContent || '';
          
          const resNode = item.getElementsByTagName('res')[0];
          const res = resNode?.textContent || undefined;
          const protocolInfo = resNode?.getAttribute('protocolInfo') || '';

          // Infer extension if missing in title
          if (title && !title.includes('.')) {
            let ext = '';
            if (protocolInfo.includes('image/jpeg')) ext = 'jpg';
            else if (protocolInfo.includes('video/mp4')) ext = 'mp4';
            else if (protocolInfo.includes('video/quicktime')) ext = 'mov';
            else if (upnpClass.includes('imageItem')) ext = 'jpg';
            else if (upnpClass.includes('videoItem')) ext = 'mp4';
            
            if (ext) title = `${title}.${ext}`;
          }

          const type = title.split('.').pop()?.toLowerCase() || 'dat';

          if (id) {
             contents.push({ id, filename: title, filetype: type, date, originalUrl: res });
          }
        }

        start += items.length;
        if (items.length < batch) break; 
        if (total > 0 && start >= total) break;
      }

      setItems(contents);
      setStatusMsg(`Loaded ${contents.length} items.`);
      
      // Fetch thumbnails
      loadThumbnails(contents);

    } catch (err) {
      console.error('Failed to load library', err);
      setStatusMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const loadThumbnails = async (contents: ContentItem[]) => {
    for (const item of contents) {
      if (item.filetype === 'jpg' || item.filetype === 'mp4' || item.filetype === 'mov') {
        try {
          const thumbBase64 = await window.electronAPI.getThumbnail(item.filename);
          setItems(prev => prev.map(p => p.id === item.id ? { ...p, thumbnail: `data:image/jpeg;base64,${thumbBase64}` } : p));
        } catch (e) {
            console.warn(`Failed to fetch thumb for ${item.id}`, e);
        }
      }
    }
  };

  const handleDownload = async (item: ContentItem) => {
    setDownloading(item.id);
    try {
      // Ensure we are in playmode before downloading
      await window.electronAPI.camCommand('playmode');
      // Small delay just in case
      await new Promise(r => setTimeout(r, 300));

      const savedPath = await window.electronAPI.downloadGeneric(item.id, item.filename, item.originalUrl);
      alert(`Saved to: ${savedPath}`);
    } catch (err) {
      console.error(err);
      alert('Download failed');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div style={{ padding: '20px', color: '#fff', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Library</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span>{statusMsg}</span>
            <button onClick={fetchLibrary} disabled={loading} style={{ padding: '8px 16px', borderRadius: '4px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer' }}>
            {loading ? 'Scanning...' : 'Scan Camera'}
            </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
        {items.map(item => (
          <div key={item.id} style={{ background: '#1e3550', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '120px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.thumbnail ? (
                <img src={item.thumbnail} alt={item.filename} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : (
                <span>No Preview</span>
              )}
            </div>
            <div style={{ padding: '10px', fontSize: '12px' }}>
                <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.filename}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', marginTop: '4px' }}>
                   <span>{item.date}</span>
                   <span style={{ textTransform: 'uppercase', fontSize: '10px', background: '#374151', padding: '1px 4px', borderRadius: '3px' }}>{item.filetype}</span>
                </div>
                <button 
                  onClick={() => handleDownload(item)} 
                  disabled={downloading === item.id}
                  style={{ marginTop: '8px', width: '100%', padding: '6px', background: '#4b5563', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                >
                  {downloading === item.id ? 'Downloading...' : 'Download'}
                </button>
            </div>
          </div>
        ))}
      </div>
      
      {items.length === 0 && !loading && (
        <div style={{ textAlign: 'center', marginTop: '40px', color: '#6b7280' }}>
          No items found or not scanned yet.
        </div>
      )}
    </div>
  );
}
