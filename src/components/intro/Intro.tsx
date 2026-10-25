import { useEffect, useRef, useState } from 'react';
import { assets } from '../../config/assets';
import { useWorld } from '../../app/store';

export function Intro({ onReady, onStart }: { onReady: () => void; onStart: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);
  const [started, setStarted] = useState(false);
  const settled = useWorld(state => state.introSettled);
  const settle = useWorld(state => state.settleIntro);
  const revealed = useRef(false);
  const reveal = () => { if (!revealed.current) { revealed.current = true; onReady(); } };
  useEffect(() => {
    const node = video.current;
    return () => { node?.pause(); };
  }, []);
  useEffect(() => {
    // Use actual playback progress, including pauses and buffering, not wall time.
    if (!started) return;
    let frame = 0;
    const check = () => {
      if (video.current && video.current.currentTime >= 6) reveal();
      frame = window.requestAnimationFrame(check);
    };
    frame = window.requestAnimationFrame(check);
    return () => window.cancelAnimationFrame(frame);
  }, [started]);
  useEffect(() => {
    const stop = () => video.current?.pause();
    window.addEventListener('intro-stop', stop);
    return () => window.removeEventListener('intro-stop', stop);
  }, []);
  const finish = () => { reveal(); sessionStorage.setItem('mc-intro-seen', '1'); settle(); };
  const start = () => {
    const node = video.current;
    if (!node) { onStart(); finish(); return; }
    // Start directly in the trusted user gesture, with fixed audible volume.
    node.muted = false;
    node.volume = 0.75;
    const playback = node.play();
    setStarted(true); setBlocked(false); onStart();
    void playback.catch(() => setBlocked(true));
  };
  return <>
    {assets.introVideo && <video ref={video} className="intro-video" src={assets.introVideo} playsInline preload="auto" onTimeUpdate={event => { if (event.currentTarget.currentTime >= 6) reveal(); }} onEnded={finish} onError={() => { if (started) finish(); }} aria-label="Opening cinematic" />}
    {(!started || blocked) && !settled && <div className="entry-gate"><button autoFocus className="entry-gate__button" onClick={start}>{blocked ? 'CLICK TO RETRY' : 'CLICK TO ENTER'}</button></div>}
    {started && !blocked && !settled && <div className="intro-controls"><button className="skip-intro" onClick={() => { video.current?.pause(); finish(); }}>SKIP INTRO <span aria-hidden="true">↗</span></button></div>}
  </>;
}