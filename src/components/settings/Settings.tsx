import { useWorld, type Quality } from '../../app/store';

export function Settings() {
  const values = useWorld(state => state.preferences);
  const update = useWorld(state => state.updatePreferences);
  return <div className="settings-grid">
    <label className="setting-row"><span>MUSIC VOLUME</span><span>{Math.round(values.music * 100)}%</span><input type="range" min="0" max="1" step="0.01" value={values.music} onChange={e => update({ music: Number(e.target.value) })} /></label>
    <label className="setting-row"><span>SOUND EFFECTS</span><span>{Math.round(values.effects * 100)}%</span><input type="range" min="0" max="1" step="0.01" value={values.effects} onChange={e => update({ effects: Number(e.target.value) })} /></label>
    <label className="setting-row"><span>GRAPHICS QUALITY</span><select value={values.graphics} onChange={e => update({ graphics: e.target.value as Quality })}>{['auto','low','medium','high'].map(x => <option key={x} value={x}>{x.toUpperCase()}</option>)}</select></label>
    <label className="setting-row"><span>ANIMATION QUALITY</span><select value={values.animation} onChange={e => update({ animation: e.target.value as Quality })}>{['auto','low','medium','high'].map(x => <option key={x} value={x}>{x.toUpperCase()}</option>)}</select></label>
    <label className="setting-row setting-row--inline"><span>REDUCED MOTION</span><input type="checkbox" checked={values.reducedMotion} onChange={e => update({ reducedMotion: e.target.checked })} /></label>
    <label className="setting-row setting-row--inline"><span>MUTE ALL AUDIO</span><input type="checkbox" checked={values.muted} onChange={e => update({ muted: e.target.checked })} /></label>
    <button className="small-action" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen(); }}>TOGGLE FULLSCREEN ↗</button>
  </div>;
}