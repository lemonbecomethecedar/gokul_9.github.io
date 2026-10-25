import discovered from './discovered.json';

export type AssetKey =
  | 'introVideo'
  | 'landingBackground'
  | 'mainWorldBackground'
  | 'playerSkin'
  | 'buttonHover'
  | 'buttonClick'
  | 'mainWorldClick'
  | 'transitionSound'
  | 'backgroundMusic'
  | 'pixelFont'
  | 'bodyFont'
  | 'logo';

export interface AssetFile {
  source: string;
  url: string;
  extension: string;
}

export interface AssetReport {
  assets: Partial<Record<AssetKey, string>>;
  candidates: Partial<Record<AssetKey, string[]>>;
  files: AssetFile[];
  missing: string[];
  ambiguous: string[];
}

// If discovery reports multiple matches, select one candidate's emitted URL here.
export const overrides: Partial<Record<AssetKey, string>> = {
  // Explicit asset overrides go here if more than one candidate matches a role.
};

// Explicitly choose slim arms if the provided skin uses the Alex geometry.
export const skinConfig: { model: 'classic' | 'slim' } = { model: 'classic' };
export const assets = { ...discovered.assets, ...overrides } as Partial<Record<AssetKey, string>>;
export const assetReport: AssetReport = discovered as AssetReport;
export const isVideo = (path?: string) => !!path && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(path);
export const isAnimatedImage = (path?: string) => !!path && /\.gif(\?|$)/i.test(path);
