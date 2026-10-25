import { useEffect, useRef, useState } from 'react';
import { useWorld, type Section } from '../../app/store';
import { profile, hobbies, socials } from '../../config/content';
import { Reviews } from '../reviews/Reviews';
import { Settings } from '../settings/Settings';
import { audio } from '../../audio/manager';

const navigation: { id: Section; title: string; number: string; icon: string; description: string }[] = [
  { id: 'about', title: 'ABOUT ME', number: '01', icon: '◈', description: 'The story behind the player' },
  { id: 'hobbies', title: 'HOBBIES', number: '02', icon: '✦', description: 'Things I love to explore' },
  { id: 'socials', title: 'SOCIALS', number: '03', icon: '⌁', description: 'Find me beyond this world' }
];

function About() {
  return <div className="about-scroll" tabIndex={0} role="region" aria-label="About me, scrollable content">
    <p className="about-lead">{profile.introduction}</p><div className="hairline" />
    <div className="about-columns"><div><span className="eyebrow">PLAYER FILE / 001</span><h3>The person behind the player.</h3><p>{profile.biography}</p></div><div className="facts"><div><span>PLAYER</span><strong>{profile.name}</strong></div><div><span>LOCATION</span><strong>{profile.location}</strong></div><div><span>STATUS</span><strong>{profile.status}</strong></div></div></div>
    <div className="hairline" /><span className="eyebrow">INTERESTS</span><div className="tags">{profile.interests.map(x => <span key={x}>{x}</span>)}</div>
    {profile.achievements.length > 0 && <><div className="hairline" /><span className="eyebrow">ACHIEVEMENTS UNLOCKED</span><div className="achievement-list">{profile.achievements.map(x => <div key={x.title}><strong>{x.title}</strong><p>{x.description}</p></div>)}</div></>}
  </div>;
}
function Hobbies() {
  const [selected, setSelected] = useState(0);
  if (!hobbies.length) return <Empty title="Uncharted interests" subtitle="Hobbies can be added in src/config/content.ts." />;
  return <div className="tile-grid">{hobbies.slice(0, 6).map((hobby, i) => <button className={`content-tile ${selected === i ? 'content-tile--active' : ''}`} key={hobby.title} onClick={() => setSelected(i)}><span className="tile-icon">{hobby.icon}</span><strong>{hobby.title}</strong><small>{selected === i && hobby.detail ? hobby.detail : hobby.description}</small></button>)}</div>;
}
function Socials() {
  if (!socials.length) return <Empty title="Connections coming soon" subtitle="Add verified social profiles in src/config/content.ts." />;
  return <div className="social-list">{socials.map(item => <a href={item.url} key={item.platform} target="_blank" rel="noopener noreferrer"><span>{item.icon}</span><strong>{item.platform}</strong><small>{item.username}</small><span>↗</span></a>)}</div>;
}
function Empty({ title, subtitle }: { title: string; subtitle: string }) { return <div className="empty-state"><span className="empty-glyph" aria-hidden="true">▧</span><h3>{title}</h3><p>{subtitle}</p></div>; }

export function Dashboard({ onExit }: { onExit: () => void }) {
  const section = useWorld(state => state.section);
  const open = useWorld(state => state.openSection);
  const close = useWorld(state => state.closeSection);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!section) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('keydown', escape); previous?.focus(); };
  }, [section, close]);
  return <div className="dashboard" data-section={section || 'home'}>
    <div className="dashboard-topline"><div><span className="signal-dot" /> WORLD ONLINE <span className="topline-divider">/</span> PERSONAL REALM</div><div>PLAYER FILE <span className="topline-divider">/</span> 001</div></div>
    <div className="dashboard-layout">
      <div className="skyblock-space" aria-hidden="true" />
      <main className="dashboard-main"><nav className="destination-list" aria-label="Explore the world">{navigation.map(item => <button className="destination" key={item.id} onMouseEnter={() => audio.play('buttonHover')} onPointerDown={event => { if (event.button === 0) audio.play('worldClick'); }} onClick={event => { if (event.detail === 0) audio.play('worldClick'); open(item.id); }}><span className="destination-number">{item.number}</span><span className="destination-icon">{item.icon}</span><span className="destination-label"><strong>{item.title}</strong><small>{item.description}</small></span><span className="destination-arrow">↗</span></button>)}</nav></main>
    </div>
    <div className="dashboard-footer"><button className="review-trigger" onClick={() => { audio.play('worldClick'); open('reviews'); }}>✎ WRITE A REVIEW</button><div><button onClick={() => open('settings')}>⚙ SETTINGS</button><span className="topline-divider">/</span><button onClick={onExit}>↩ EXIT WORLD</button></div></div>
    {section && <div className="section-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) close(); }}><div className={`section-panel ${section === 'about' ? 'section-panel--about' : ''}`} role="dialog" aria-modal="true" aria-label={section} tabIndex={-1} ref={panel}><div className="section-header"><div><span className="eyebrow">PLAYER WORLD / {section.toUpperCase()}</span><h2>{section === 'about' ? 'About the player' : section === 'reviews' ? 'The guestbook' : section.charAt(0).toUpperCase() + section.slice(1)}</h2></div><button className="close-panel" onClick={close} aria-label="Close section">✕ <span>CLOSE</span></button></div><div className="section-content">{section === 'about' ? <About /> : section === 'hobbies' ? <Hobbies /> : section === 'socials' ? <Socials /> : section === 'reviews' ? <Reviews /> : <Settings />}</div><div className="section-bottom">MINECRAFT REIMAGINED <span>↗</span> PLAYER WORLD</div></div></div>}
  </div>;
}