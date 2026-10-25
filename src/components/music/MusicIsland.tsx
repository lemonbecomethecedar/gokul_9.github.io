import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { audio } from '../../audio/manager';
import { musicTracks } from '../../config/music';
import { useWorld } from '../../app/store';

type Mode = 'compact' | 'expanded' | 'docked';
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export function MusicIsland() {
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const moving = useRef(false);
  const modeRef = useRef<Mode>('compact');
  const [mode, setMode] = useState<Mode>('compact');
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(audio.getTrackIndex());
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const preferences = useWorld(state => state.preferences);
  const phase = useWorld(state => state.phase);
  const track = musicTracks[index];
  const reduced = preferences.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dimensions = () => ({ width: Math.min(380, window.innerWidth - 32), center: window.innerWidth / 2, dock: window.innerWidth - 22 });
  const setState = (value: Mode) => { modeRef.current = value; setMode(value); };
  const dock = () => {
    if (!root.current || moving.current || (root.current.contains(document.activeElement) && document.activeElement?.matches(':focus-visible'))) { arm(); return; }
    moving.current = true;
    const d = reduced ? 0.01 : 1;
    timeline.current?.kill();
    timeline.current = gsap.timeline({ onComplete: () => { setState('docked'); moving.current = false; } });
    timeline.current.to(content.current, { opacity: 0, y: -6, duration: 0.15 * d })
      .call(() => setState('compact'))
      .to(root.current, { width: 210, height: 48, borderRadius: 28, duration: 0.35 * d, ease: 'power3.inOut' })
      .to(root.current, { left: dimensions().dock, width: 76, duration: 0.65 * d, ease: 'power3.inOut' });
  };
  const arm = () => { clearTimeout(timer.current); timer.current = setTimeout(dock, 6500); };
  const expand = () => {
    if (moving.current || modeRef.current === 'expanded') { arm(); return; }
    moving.current = true;
    const d = reduced ? 0.01 : 1;
    timeline.current?.kill();
    timeline.current = gsap.timeline({ onComplete: () => { moving.current = false; arm(); } });
    // First travel to top-center as a pill, only then unfold the panel.
    timeline.current.to(root.current, { left: dimensions().center, width: 210, height: 48, borderRadius: 28, duration: (modeRef.current === 'docked' ? 0.65 : 0.12) * d, ease: 'power3.inOut' })
      .call(() => setState('expanded'))
      .to(root.current, { width: dimensions().width, height: 225, borderRadius: 32, duration: 0.48 * d, ease: 'power3.inOut' })
      .to(content.current, { opacity: 1, y: 0, duration: 0.24 * d }, '-=0.12');
  };
  const collapse = () => {
    if (moving.current) return;
    moving.current = true; timeline.current?.kill();
    timeline.current = gsap.timeline({ onComplete: () => { setState('compact'); moving.current = false; arm(); } })
      .to(content.current, { opacity: 0, duration: reduced ? 0.01 : 0.12 })
      .to(root.current, { width: 210, height: 48, borderRadius: 28, duration: reduced ? 0.01 : 0.4, ease: 'power3.inOut' });
  };
  useLayoutEffect(() => {
    gsap.set(root.current, { left: dimensions().center, width: 210, height: 48, xPercent: -50 });
    const resize = () => { timeline.current?.kill(); moving.current = false; gsap.set(root.current, { left: modeRef.current === 'docked' ? dimensions().dock : dimensions().center, width: modeRef.current === 'expanded' ? dimensions().width : modeRef.current === 'docked' ? 76 : 210, height: modeRef.current === 'expanded' ? 225 : 48 }); gsap.set(content.current, { opacity: modeRef.current === 'expanded' ? 1 : 0, y: modeRef.current === 'expanded' ? 0 : -6 }); arm(); };
    window.addEventListener('resize', resize); arm();
    return () => { clearTimeout(timer.current); timeline.current?.kill(); window.removeEventListener('resize', resize); };
  }, []);
  useEffect(() => {
    const element = audio.getMusicElement(); if (!element) return;
    const sync = () => { setPlaying(!element.paused); setTime(element.currentTime || 0); setDuration(Number.isFinite(element.duration) ? element.duration : 0); setIndex(audio.getTrackIndex()); };
    const failed = () => { setError('This track could not be loaded.'); sync(); };
    const loaded = () => { setError(''); sync(); };
    const events = ['play', 'pause', 'timeupdate', 'durationchange', 'trackchange'];
    events.forEach(event => element.addEventListener(event, sync));
    element.addEventListener('error', failed); element.addEventListener('loadedmetadata', loaded); sync();
    return () => { events.forEach(event => element.removeEventListener(event, sync)); element.removeEventListener('error', failed); element.removeEventListener('loadedmetadata', loaded); };
  }, []);
  const expanded = mode === 'expanded';
  return <div ref={root} className={`music-island music-island--${mode} ${playing ? 'music-island--playing' : ''} ${phase === 'SECTION_OPEN' ? 'music-island--behind-modal' : ''}`} onPointerMove={arm} onPointerDown={arm} onKeyDown={event => { arm(); if (event.key === 'Escape') { collapse(); event.stopPropagation(); } }} onFocus={arm} onBlur={arm}>
    <button className="music-island__pill" aria-label={mode === 'docked' ? 'Open music player' : `${expanded ? 'Collapse' : 'Expand'} music player`} aria-expanded={expanded} onClick={expanded ? collapse : expand}>
      <span className="music-disc" aria-hidden="true">♫</span><span className="music-pill-title">{track?.title || 'No music added'}</span><span className="music-bars" aria-hidden="true"><i /><i /><i /><i /></span>
    </button>
    <div ref={content} className="music-island__panel" inert={!expanded} aria-hidden={!expanded}>
      <div className="music-track"><span className="music-cover" aria-hidden="true">♫</span><div><strong>{track?.title || 'No tracks available'}</strong><small>{track?.artist || 'Add audio to assets/music'}</small></div></div>
      <label className="music-seek"><span className="sr-only">Track position</span><input type="range" min={0} max={duration || 1} step="0.1" disabled={!duration} value={Math.min(time, duration || 1)} onChange={event => { const element = audio.getMusicElement(); if (element) { element.currentTime = Number(event.target.value); setTime(element.currentTime); } }} /><span>{clock(time)}</span><span>{clock(duration)}</span></label>
      <div className="music-controls"><button disabled={!track} aria-label="Previous track" onClick={() => audio.changeTrack(-1)}>⏮</button><button className="music-play" disabled={!track} aria-label={playing ? 'Pause music' : 'Play music'} onClick={() => audio.toggleMusic()}>{playing ? 'Ⅱ' : '▶'}</button><button disabled={!track} aria-label="Next track" onClick={() => audio.changeTrack(1)}>⏭</button><label><span className="sr-only">Music volume</span><span aria-hidden="true">♫</span><input type="range" min="0" max="1" step="0.01" value={preferences.music} onChange={event => useWorld.getState().updatePreferences({ music: Number(event.target.value) })} /></label></div>
      {error && <span className="music-error" role="status">{error}</span>}
    </div>
  </div>;
}