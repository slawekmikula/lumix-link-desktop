import { CameraState, XmlEntry } from './types';

export function parseState(raw: string | null): CameraState {
  if (!raw) return { raw, recording: false };
  const recording = raw.includes('video_rec=on') || raw.includes('<rec>on</rec>');
  return { raw, recording };
}

export function xmlToEntries(raw: string | null): XmlEntry[] {
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

export function formatDuration(secondsStr: string | undefined): string {
  if (!secondsStr) return '-';
  const sec = parseInt(secondsStr, 10);
  if (isNaN(sec)) return secondsStr;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}
