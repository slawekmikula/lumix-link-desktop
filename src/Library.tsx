import { useState, useEffect, useCallback } from 'react';

type ContentItem = {
  id: string;
  filename: string;
  filetype: string;
  date: string;
  thumbnail?: string; // Base64
};

export function Library() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const fetchLibrary = async () => {
    setLoading(true);
    setStatusMsg('Fetching list...');
    try {
      const xmlStr = await window.electronAPI.getLibraryContents();
      console.log('Library XML:', xmlStr);
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
      
      const contents: ContentItem[] = [];
      const contentNodes = xmlDoc.getElementsByTagName('content'); 
      
      if (contentNodes.length === 0) {
        // Try alternate parsing for 'csv' style or debug info
        setStatusMsg(`No content found. Raw response length: ${xmlStr.length}. Check console.`);
      } else {
        setStatusMsg(`Found ${contentNodes.length} items.`);
      }

      for (let i = 0; i < contentNodes.length; i++) {
        const node = contentNodes[i];
        // Example structure
        const id = node.getElementsByTagName('content_id')[0]?.textContent || '';
        const name = node.getElementsByTagName('file_name')[0]?.textContent || 'Unknown';
        const date = node.getElementsByTagName('created_time')[0]?.textContent || '';
        const type = name.split('.').pop()?.toLowerCase() || 'dat';

        if (id) {
          contents.push({ id, filename: name, filetype: type, date });
        }
      }
      
      setItems(contents);
      
      // Fetch thumbnails
      // We can do this lazily or all at once. Let's do batches.
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
          const thumbBase64 = await window.electronAPI.getThumbnail(item.id);
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
      const savedPath = await window.electronAPI.downloadGeneric(item.id, item.filename);
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
                <div style={{ color: '#aaa' }}>{item.date}</div>
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
