import { assets } from '../config/assets';
import { useWorld } from '../app/store';
import { musicTracks } from '../config/music';
type Effect = 'buttonHover' | 'buttonClick' | 'worldClick' | 'transitionSound';

class AudioManager {
  private lastHover = 0;
  private music?: HTMLAudioElement;
  private musicRequested = true;
  private worldActive = false;
  private trackIndex = 0;
  getMusicElement() {
    if (!musicTracks.length) return undefined;
    if (!this.music) {
      this.music = new Audio(musicTracks[this.trackIndex].src);
      this.music.preload = 'metadata';
      this.music.addEventListener('ended', () => this.changeTrack(1));
      document.addEventListener('visibilitychange', () => this.syncMusic(this.worldActive));
    }
    return this.music;
  }
  getTrackIndex() { return this.trackIndex; }
  toggleMusic() {
    const element = this.getMusicElement();
    if (!element) return;
    this.musicRequested = element.paused;
    if (this.musicRequested) {
      const preferences = useWorld.getState().preferences;
      if (preferences.muted || preferences.music === 0) useWorld.getState().updatePreferences({ muted: false, music: preferences.music || 0.24 });
    }
    this.syncMusic(this.worldActive);
  }
  changeTrack(direction: number) {
    const element = this.getMusicElement();
    if (!element) return;
    this.trackIndex = (this.trackIndex + direction + musicTracks.length) % musicTracks.length;
    element.src = musicTracks[this.trackIndex].src;
    element.load();
    this.syncMusic(this.worldActive);
    element.dispatchEvent(new Event('trackchange'));
  }
  private sounds = new Set<HTMLAudioElement>();
  private pools = new Map<Effect, HTMLAudioElement[]>();
  preload() {
    for (const kind of ['buttonHover', 'buttonClick', 'worldClick', 'transitionSound'] as Effect[]) {
      if (this.pools.has(kind)) continue;
      const url = assets[kind === 'worldClick' ? 'mainWorldClick' : kind];
      if (!url) continue;
      this.pools.set(kind, Array.from({ length: kind === 'buttonHover' ? 1 : 3 }, () => {
        const sound = new Audio(url);
        sound.preload = 'auto';
        sound.addEventListener('ended', () => this.sounds.delete(sound));
        sound.load();
        return sound;
      }));
    }
  }
  play(kind: Effect) {
    const url = assets[kind === 'worldClick' ? 'mainWorldClick' : kind];
    if (!url) return;
    const now = performance.now();
    if (kind === 'buttonHover' && now - this.lastHover < 160) return;
    if (kind === 'buttonHover') this.lastHover = now;
    const { muted, effects } = useWorld.getState().preferences;
    if (muted || !effects) return;
    this.preload();
    const pool = this.pools.get(kind);
    const sound = pool?.find(candidate => candidate.paused || candidate.ended) || pool?.[0];
    if (!sound) return;
    sound.pause();
    sound.currentTime = 0;
    sound.volume = effects * 0.65;
    this.sounds.add(sound);
    void sound.play().catch(() => this.sounds.delete(sound));
  }
  syncMusic(playing: boolean) {
    this.worldActive = playing;
    const element = this.getMusicElement();
    if (!element) return;
    const { muted, music } = useWorld.getState().preferences;
    element.volume = muted ? 0 : music * 0.5;
    if (playing && this.musicRequested && !document.hidden && !muted && music > 0) void element.play().catch(() => {});
    else element.pause();
  }
  stop() { this.sounds.forEach(sound => sound.pause()); this.sounds.clear(); this.syncMusic(false); }
}
export const audio = new AudioManager();