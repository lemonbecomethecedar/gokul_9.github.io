import { create } from 'zustand';

export type Phase = 'BOOT' | 'INTRO' | 'LANDING' | 'ENTERING_WORLD' | 'LOADING_WORLD' | 'MAIN_WORLD' | 'SECTION_OPEN' | 'EXITING_WORLD';
export type Section = 'about' | 'hobbies' | 'socials' | 'settings' | 'reviews';
export type Quality = 'auto' | 'low' | 'medium' | 'high';
export type Preferences = { music: number; effects: number; muted: boolean; graphics: Quality; animation: Quality; reducedMotion: boolean };
const defaults: Preferences = { music: 0.24, effects: 0.36, muted: false, graphics: 'auto', animation: 'auto', reducedMotion: false };
function savedPreferences(): Preferences {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem('mc-preferences') || '{}') }; } catch { return defaults; }
}
interface WorldState {
  phase: Phase;
  section: Section | null;
  menuRevealed: boolean;
  introSettled: boolean;
  loadingStage: number;
  preferences: Preferences;
  setPhase: (phase: Phase) => void;
  setMenuRevealed: (value: boolean) => void;
  settleIntro: () => void;
  setLoadingStage: (value: number) => void;
  openSection: (section: Section) => void;
  closeSection: () => void;
  updatePreferences: (value: Partial<Preferences>) => void;
}
export const useWorld = create<WorldState>((set, get) => ({
  phase: 'BOOT', section: null, menuRevealed: false, introSettled: false, loadingStage: -1,
  preferences: savedPreferences(),
  setPhase: phase => set({ phase }),
  setMenuRevealed: menuRevealed => set({ menuRevealed }),
  settleIntro: () => set({ introSettled: true, menuRevealed: true, phase: get().phase === 'INTRO' ? 'LANDING' : get().phase }),
  setLoadingStage: loadingStage => set({ loadingStage }),
  openSection: section => { if (['MAIN_WORLD', 'SECTION_OPEN'].includes(get().phase)) set({ section, phase: 'SECTION_OPEN' }); },
  closeSection: () => { if (get().phase === 'SECTION_OPEN') set({ section: null, phase: 'MAIN_WORLD' }); },
  updatePreferences: value => {
    const preferences = { ...get().preferences, ...value };
    localStorage.setItem('mc-preferences', JSON.stringify(preferences));
    set({ preferences });
  }
}));