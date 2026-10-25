import { assets, assetReport } from './assets';
export interface MusicTrack { src: string; title: string; artist: string }
// Use every file in the supplied music directory as a playlist, in filename order.
export const musicTracks: MusicTrack[] = assetReport.files
  .filter(file => /(?:^|\/)music\//i.test(file.source) && /\.(mp3|ogg|wav|m4a|aac|flac)$/i.test(file.source))
  .sort((a, b) => a.source.localeCompare(b.source))
  .map(file => ({ src: file.url, title: /c418-aria-math/i.test(file.source) ? 'Aria Math' : file.source.split('/').pop()!.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '), artist: /c418-aria-math/i.test(file.source) ? 'C418' : 'Local music' }));
if (!musicTracks.length && assets.backgroundMusic) musicTracks.push({ src: assets.backgroundMusic, title: 'World soundtrack', artist: 'Local music' });