import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import gsap from 'gsap';
import { useWorld } from './app/store';
import { assets, isVideo } from './config/assets';
import { audio } from './audio/manager';
import { CharacterCanvas } from './components/character/MinecraftCharacter';
import { Intro } from './components/intro/Intro';
import { WorldLoading } from './components/loading/WorldLoading';
import { Dashboard } from './components/dashboard/Dashboard';
import { Settings } from './components/settings/Settings';
import { MenuButton } from './components/ui/MenuButton';
import { MusicIsland } from './components/music/MusicIsland';

function preloadImage(url?: string) {
  if (!url) return Promise.resolve();
  return new Promise<void>(resolve => { const image = new Image(); image.onload = () => { void image.decode().catch(() => {}).then(() => resolve()); }; image.onerror = () => resolve(); image.src = url; });
}
function preloadVideo(url?: string) {
  if (!url || !isVideo(url)) return preloadImage(url);
  return new Promise<void>(resolve => { const node = document.createElement('video'); const done = () => { node.onloadeddata = null; node.onerror = null; node.removeAttribute('src'); resolve(); }; node.onloadeddata = done; node.onerror = done; node.preload = 'auto'; node.muted = true; node.src = url; });
}
function characterAction(action: string, duration = 0.9) { window.dispatchEvent(new CustomEvent('character-action', { detail: { action, duration } })); }

function WorldBackdrop({ visible }: { visible: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const sync = () => { if (visible && !document.hidden) void ref.current?.play().catch(() => {}); else ref.current?.pause(); };
    sync(); document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [visible]);
  return <div className={`world-background ${visible ? 'world-background--visible' : ''}`}>
    {assets.mainWorldBackground && (isVideo(assets.mainWorldBackground) ? <video ref={ref} src={assets.mainWorldBackground} muted loop playsInline preload="auto" /> : <img src={assets.mainWorldBackground} alt="" />)}
    <div className="world-background__shade" />
  </div>;
}

export default function App() {
  const phase = useWorld(state => state.phase);
  const setPhase = useWorld(state => state.setPhase);
  const menuRevealed = useWorld(state => state.menuRevealed);
  const setMenuRevealed = useWorld(state => state.setMenuRevealed);
  const introSettled = useWorld(state => state.introSettled);
  const settleIntro = useWorld(state => state.settleIntro);
  const setLoadingStage = useWorld(state => state.setLoadingStage);
  const preferences = useWorld(state => state.preferences);
  const [landingSettings, setLandingSettings] = useState(false);
  const [waveSignal, setWaveSignal] = useState(0);
  const [cinematicVisible, setCinematicVisible] = useState(() => !sessionStorage.getItem('mc-intro-seen') && !!assets.introVideo);
  const characterFrame = useRef<HTMLDivElement>(null);
  const characterPositioned = useRef(false);
  const busy = useRef(false);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const alive = useRef(true);
  const reduced = preferences.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const inWorld = phase === 'MAIN_WORLD' || phase === 'SECTION_OPEN' || phase === 'EXITING_WORLD';
  const duringTransition = phase === 'ENTERING_WORLD' || phase === 'LOADING_WORLD';
  useEffect(() => {
    alive.current = true;
    audio.preload();
    if (sessionStorage.getItem('mc-intro-seen') || !assets.introVideo) { setMenuRevealed(true); settleIntro(); setPhase('LANDING'); }
    else { setPhase('BOOT'); void preloadImage(assets.landingBackground); }
    return () => { alive.current = false; timeline.current?.kill(); audio.stop(); };
  }, []);
  useLayoutEffect(() => {
    const node = characterFrame.current;
    if (!node) return;
    const position = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const mobile = w <= 700;
      const cinematic = phase === 'ENTERING_WORLD' || phase === 'LOADING_WORLD';
      const width = inWorld ? w * (mobile ? 0.68 : 0.39) : cinematic ? w * (mobile ? 0.86 : 0.46) : Math.min(w * (mobile ? 0.27 : 0.21), 330);
      const height = h * (inWorld ? mobile ? 0.36 : 0.68 : cinematic ? 0.66 : mobile ? 0.23 : 0.44);
      const left = inWorld ? mobile ? w * 0.16 : (w - Math.min(w * 0.914, 1120)) / 2 : cinematic ? (w - width) / 2 : w * 0.92 - width;
      const top = h * (inWorld ? mobile ? 0.07 : 0.14 : cinematic ? 0.09 : mobile ? 0.68 : 0.32);
      gsap.to(node, { left, top, width, height, duration: characterPositioned.current && !reduced ? 1.05 : 0, ease: 'power3.inOut', overwrite: true });
      characterPositioned.current = true;
    };
    position(); window.addEventListener('resize', position);
    return () => { window.removeEventListener('resize', position); gsap.killTweensOf(node); };
  }, [duringTransition, inWorld, reduced]);
  useEffect(() => { audio.syncMusic(inWorld); }, [inWorld, preferences]);
  useEffect(() => {
    const fonts = ([['pixelFont', 'MinecraftPixel'], ['bodyFont', 'PlayerBody']] as const).map(async ([key, family]) => {
      if (!assets[key]) return;
      try { const font = await new FontFace(family, `url("${assets[key]}")`).load(); document.fonts.add(font); document.documentElement.style.setProperty(key === 'pixelFont' ? '--pixel-font' : '--body-font', `"${family}"`); } catch { /* Keep the system-font fallback. */ }
    });
    void Promise.all(fonts);
  }, []);
  useEffect(() => {
    if (!introSettled || phase === 'ENTERING_WORLD') return;
    const timeout = window.setTimeout(() => setCinematicVisible(false), 1100);
    return () => window.clearTimeout(timeout);
  }, [introSettled, phase]);
  const enter = useCallback(async () => {
    if (busy.current || !['LANDING', 'INTRO'].includes(useWorld.getState().phase)) return;
    busy.current = true; setLandingSettings(false);
    window.dispatchEvent(new Event('intro-stop'));
    sessionStorage.setItem('mc-intro-seen', '1');
    audio.play('transitionSound'); setPhase('ENTERING_WORLD');
    const duration = reduced ? 0.12 : 1;
    timeline.current?.kill();
    setLoadingStage(0);
    const preparation = (async () => {
      await preloadImage(assets.playerSkin);
      if (!alive.current) return;
      setLoadingStage(1);
      await preloadImage(assets.landingBackground);
      if (!alive.current) return;
      setLoadingStage(2);
      await import('./components/dashboard/Dashboard');
      if (!alive.current) return;
      setLoadingStage(3);
      await preloadVideo(assets.mainWorldBackground);
      if (alive.current) setLoadingStage(4);
    })();
    timeline.current = gsap.timeline();
    timeline.current.to('.landing-interface', { autoAlpha: 0, duration: 0.38 * duration, ease: 'power2.inOut' }, 0)
      .to('.blackout', { opacity: 1, duration: 0.95 * duration }, 0.16 * duration)
      .call(() => setCinematicVisible(false), [], 1.1 * duration)
      .call(() => setWaveSignal(n => n + 1), [], 0.63 * duration)
      .call(() => characterAction('spin', 0.78 * duration), [], 1.95 * duration)
      .call(() => { flushSync(() => setPhase('LOADING_WORLD')); }, [], 1.45 * duration)
      .call(() => {}, [], 2.8 * duration);
    await Promise.all([preparation, new Promise<void>(resolve => timeline.current?.eventCallback('onComplete', resolve))]);
    if (!alive.current) return;
    await new Promise<void>(resolve => {
      timeline.current = gsap.timeline({ onComplete: resolve })
        .to('.loading-ui', { opacity: 0, duration: reduced ? 0.06 : 0.24 });
    });
    if (!alive.current) return;
    audio.play('transitionSound');
    flushSync(() => { setPhase('MAIN_WORLD'); setWaveSignal(n => n + 1); });
    timeline.current = gsap.timeline({ onComplete: () => { if (alive.current) busy.current = false; } })
      .to('.blackout', { opacity: 0, duration: reduced ? 0.1 : 0.9 }, 0.12)
      .fromTo('.dashboard', { opacity: 0, y: reduced ? 0 : 22 }, { opacity: 1, y: 0, duration: reduced ? 0.1 : 0.9, ease: 'power2.out' }, 0.16)
      .fromTo('.destination', { opacity: 0, x: reduced ? 0 : -14 }, { opacity: 1, x: 0, stagger: reduced ? 0 : 0.09, duration: reduced ? 0.1 : 0.46, ease: 'power2.out' }, 0.39);
  }, [reduced, setLoadingStage, setPhase]);
  const exit = useCallback(() => {
    if (busy.current) return;
    busy.current = true; audio.play('transitionSound'); setPhase('EXITING_WORLD');
    gsap.to('.dashboard', { opacity: 0, y: reduced ? 0 : -12, duration: reduced ? 0.1 : 0.38, onComplete: () => {
      characterAction('reset'); setLoadingStage(-1); setMenuRevealed(true); settleIntro(); setPhase('LANDING');
      gsap.set('.landing-interface', { clearProps: 'all' });
      gsap.set('.landing-backdrop', { clearProps: 'all' });
      gsap.set('.blackout', { clearProps: 'all' });
      busy.current = false;
    } });
  }, [reduced, setPhase, setLoadingStage, setMenuRevealed, settleIntro]);
  const showLanding = phase === 'BOOT' || phase === 'INTRO' || phase === 'LANDING' || phase === 'ENTERING_WORLD';
  const showWorld = inWorld;
  const mode = inWorld ? 'world' : phase === 'LOADING_WORLD' ? 'loading' : phase === 'ENTERING_WORLD' ? 'transition' : 'landing';
  return <div className={`app app--${phase.toLowerCase()} ${landingSettings ? 'app--modal-open' : ''} ${reduced ? 'reduce-motion' : ''}`}>
    <div className="landing-backdrop" style={assets.landingBackground ? { backgroundImage: `url("${assets.landingBackground}")` } : undefined} />
    {cinematicVisible && <div className={`cinematic-layer ${introSettled ? 'cinematic-layer--settled' : ''}`}><Intro onStart={() => setPhase('INTRO')} onReady={() => setMenuRevealed(true)} /></div>}
    <WorldBackdrop visible={showWorld} />
    <div className="blackout" aria-hidden="true" />
    <div ref={characterFrame} className={`character-stage ${!menuRevealed ? 'character-stage--hidden' : ''} ${inWorld ? 'character-stage--world' : ''} ${duringTransition ? 'character-stage--transition' : ''}`} aria-label="Animated Minecraft player character" onClick={() => { if (inWorld) setWaveSignal(n => n + 1); }}><CharacterCanvas mode={mode} waveSignal={waveSignal} /></div>
    {showLanding && <div className={`landing-interface ${menuRevealed ? 'landing-interface--shown' : ''}`} inert={!menuRevealed} aria-hidden={!menuRevealed}>
      <div className="landing-menu"><MenuButton onClick={enter}>ENTER WORLD</MenuButton><MenuButton variant="quiet" onClick={() => setLandingSettings(true)}>SETTINGS</MenuButton></div>
    </div>}
    {phase === 'LOADING_WORLD' && <WorldLoading />}
    {showWorld && <Dashboard onExit={exit} />}
    {(phase === 'MAIN_WORLD' || phase === 'SECTION_OPEN') && <MusicIsland />}
    {landingSettings && <div className="section-backdrop" onPointerDown={e => { if (e.target === e.currentTarget) setLandingSettings(false); }}><div className="section-panel landing-settings" role="dialog" aria-modal="true" aria-label="Settings"><div className="section-header"><div><span className="eyebrow">MAIN MENU / OPTIONS</span><h2>Settings</h2></div><button className="close-panel" onClick={() => setLandingSettings(false)}>✕ CLOSE</button></div><div className="section-content"><Settings /></div></div></div>}
  </div>;
}