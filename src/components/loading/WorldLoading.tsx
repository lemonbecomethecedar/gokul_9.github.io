import { SkinHead } from '../character/MinecraftCharacter';
import { useWorld } from '../../app/store';
const labels = ['INITIALIZING PLAYER', 'LOADING ASSETS', 'PREPARING INTERFACE', 'GENERATING WORLD', 'READY'];
export function WorldLoading() {
  const stage = useWorld(state => state.loadingStage);
  return <div className={`loading-ui ${stage === 4 ? 'loading-ui--ready' : ''}`} role="status" aria-live="polite">
    <span className="eyebrow">WORLD GENERATION</span>
    <div className="head-track" aria-label={`${Math.max(0, stage + 1)} of 5 steps ready`}>
      {labels.map((label, i) => <div className={`head-step ${i <= stage ? 'head-step--done' : ''} ${i === stage ? 'head-step--current' : ''}`} key={label}><SkinHead active={i <= stage} /><span className="head-connector" /></div>)}
    </div>
    <p className="loading-status">{labels[Math.max(0, stage)]}<span className="loading-dots">...</span></p>
  </div>;
}