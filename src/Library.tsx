import { useMemo, useState } from 'react';

export type ContentItem = {
  id: string;
  filename: string;
  filetype: string;
  date: string;
  sizeBytes?: number;
  thumbnail?: string; // Base64
  originalUrl?: string;
  localPath?: string;
};

type SortBasis = 'date' | 'number';
type SortDirection = 'asc' | 'desc';

function getFilenameNumber(filename: string): number {
  const stem = filename.replace(/\.[^.]+$/, '');
  const match = stem.match(/(\d+)/g);
  if (!match || match.length === 0) return 0;

  // Typical Lumix naming is XXX-YYYY; keep the segments separate
  // so sorting is stable and independent from file extension.
  const major = Number(match[0]) || 0;
  const minor = Number(match[1] ?? 0) || 0;
  return major * 100000 + minor;
}

function parseDateValue(value: string): number {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

function formatDisplayDate(value: string): string {
  const t = parseDateValue(value);
  if (!t) return 'Date: -';
  return `Date: ${new Date(t).toLocaleString()}`;
}

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Size: -';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  const rounded = i === 0 ? `${Math.round(size)}` : `${size.toFixed(1)}`;
  return `Size: ${rounded} ${units[i]}`;
}

export function useLibrary() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [downloadDir, setDownloadDir] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [sortBasis, setSortBasis] = useState<SortBasis>('date');

  const sortedItems = useMemo(() => {
    const mult = sortDirection === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      if (sortBasis === 'date') {
        const av = parseDateValue(a.date);
        const bv = parseDateValue(b.date);
        return (av - bv) * mult;
      }

      const av = getFilenameNumber(a.filename);
      const bv = getFilenameNumber(b.filename);
      return (av - bv) * mult;
    });
  }, [items, sortBasis, sortDirection]);

  const detectSortBasis = (contents: ContentItem[]) => {
    const hasDate = contents.some((item) => parseDateValue(item.date) > 0);
    setSortBasis(hasDate ? 'date' : 'number');
  };

  const applyLocalState = async (contents: ContentItem[]) => {
    if (contents.length === 0) return contents;
    const map = await window.electronAPI.checkLocalFiles(contents.map((c) => c.filename));
    return contents.map((item) => ({
      ...item,
      localPath: map[item.filename],
    }));
  };

  const initDownloadDirectory = async () => {
    try {
      const dir = await window.electronAPI.getDownloadDirectory();
      setDownloadDir(dir);
    } catch (e) {
      console.warn('Failed to read download directory', e);
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
          const sizeRaw = resNode?.getAttribute('size');
          const sizeBytes = sizeRaw ? Number(sizeRaw) : undefined;
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
             contents.push({
              id,
              filename: title,
              filetype: type,
              date,
              sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : undefined,
              originalUrl: res,
            });
          }
        }

        start += items.length;
        if (items.length < batch) break; 
        if (total > 0 && start >= total) break;
      }

      detectSortBasis(contents);
      const withLocalState = await applyLocalState(contents);
      setItems(withLocalState);
      setStatusMsg(`Loaded ${withLocalState.length} items.`);
      
      // Fetch thumbnails
      loadThumbnails(withLocalState);

    } catch (err) {
      console.error('Failed to load library', err);
      setStatusMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (item: ContentItem) => {
    setDownloading(item.id);
    // Start heartbeat to keep camera alive during download
    const heartbeat = setInterval(() => {
        window.electronAPI.getState().catch(e => console.warn('Heartbeat failed', e));
    }, 4000);

    try {
      // Ensure we are in playmode before downloading
      await window.electronAPI.camCommand('playmode');
      // Small delay just in case
      await new Promise(r => setTimeout(r, 300));

      const savedPath = await window.electronAPI.downloadGeneric(item.id, item.filename, item.originalUrl);
      setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, localPath: savedPath } : p)));
      setStatusMsg(`Downloaded: ${item.filename}`);
    } catch (err) {
      console.error(err);
      setStatusMsg(`Download failed: ${item.filename}`);
    } finally {
      clearInterval(heartbeat);
      setDownloading(null);
    }
  };

  const handleDelete = async (item: ContentItem) => {
    setDeleting(item.id);
    try {
      if (item.localPath) {
        await window.electronAPI.deleteLocalFile(item.localPath);
        setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, localPath: undefined } : p)));
        setStatusMsg(`Deleted local file: ${item.filename}`);
        return;
      }

      await window.electronAPI.camCommand('playmode');
      await new Promise((r) => setTimeout(r, 250));
      await window.electronAPI.deleteRemoteContent(item.id);
      setItems((prev) => prev.filter((p) => p.id !== item.id));
      setStatusMsg(`Deleted remote file: ${item.filename}`);
    } catch (err) {
      console.error(err);
      setStatusMsg(`Delete failed: ${item.filename}`);
      await window.electronAPI.showErrorDialog(
        'Delete failed',
        err instanceof Error ? err.message : `Could not delete ${item.filename}`,
      );
    } finally {
      setDeleting(null);
    }
  };

  const chooseDownloadDirectory = async () => {
    const picked = await window.electronAPI.chooseDownloadDirectory();
    if (!picked) return;
    setDownloadDir(picked);
    const next = await applyLocalState(items);
    setItems(next);
  };

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return {
    items: sortedItems,
    loading,
    downloading,
    deleting,
    statusMsg,
    downloadDir,
    sortDirection,
    sortBasis,
    fetchLibrary,
    handleDownload,
    handleDelete,
    toggleSortDirection,
    chooseDownloadDirectory,
    initDownloadDirectory,
  };
}

export function LibraryGrid({ 
  items, loading, downloading, deleting, handleDownload, handleDelete, onViewLocal 
}: { 
  items: ContentItem[], 
  loading: boolean, 
  downloading: string | null, 
  deleting: string | null,
  handleDownload: (item: ContentItem) => void,
  handleDelete: (item: ContentItem) => void,
  onViewLocal: (item: ContentItem) => void,
}) {
  const isImage = (fileType: string) => ['jpg', 'jpeg', 'png', 'webp'].includes(fileType.toLowerCase());
  const isVideo = (fileType: string) => fileType.toLowerCase() === 'mp4';
  const canViewLocal = (item: ContentItem) => Boolean(item.localPath) && (isImage(item.filetype) || isVideo(item.filetype));

  return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', height: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
        {items.map(item => (
          <div key={item.id} style={{ background: '#1e3550', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '120px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {item.thumbnail ? (
                <img src={item.thumbnail} alt={item.filename} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : (
                <span>No Preview</span>
              )}
              {item.localPath && (
                <div
                  title="Available locally"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '999px',
                    background: 'rgba(16,185,129,0.95)',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 700,
                    display: 'grid',
                    placeItems: 'center',
                    boxShadow: '0 0 0 2px rgba(0,0,0,0.4)',
                  }}
                >
                  ✓
                </div>
              )}
              {isVideo(item.filetype) && (
                <div
                  title="Video"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    padding: '2px 6px',
                    borderRadius: '999px',
                    background: 'rgba(37,99,235,0.92)',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
                  }}
                >
                  MP4
                </div>
              )}
            </div>
            <div style={{ padding: '10px', fontSize: '12px' }}>
                <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.filename}</div>
               <div style={{ color: '#93a8c4', marginTop: '4px', lineHeight: 1.35 }}>
                <div>{formatDisplayDate(item.date)}</div>
                <div>{formatSize(item.sizeBytes)}</div>
               </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', marginTop: '4px' }}>
                 <span>{item.localPath ? 'Local' : 'Remote'}</span>
                   <span style={{ textTransform: 'uppercase', fontSize: '10px', background: '#374151', padding: '1px 4px', borderRadius: '3px' }}>{item.filetype}</span>
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleDownload(item)} 
                    disabled={downloading === item.id || deleting === item.id}
                    style={{ flex: 1, padding: '6px', background: '#4b5563', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                  >
                    {downloading === item.id ? 'Downloading...' : 'Download'}
                  </button>
                  {canViewLocal(item) && (
                    <button
                      onClick={() => onViewLocal(item)}
                      style={{ flex: 1, padding: '6px', background: '#2563eb', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                    >
                      View
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item)}
                    disabled={deleting === item.id || downloading === item.id}
                    title={deleting === item.id ? 'Deleting...' : 'Delete'}
                    aria-label={deleting === item.id ? 'Deleting...' : 'Delete'}
                    style={{
                      width: '34px',
                      minWidth: '34px',
                      padding: '6px',
                      background: '#7f1d1d',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {deleting === item.id ? '…' : '🗑'}
                  </button>
                </div>
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
