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

const withBase = (url: string) => url.startsWith('/')
  ? `${import.meta.env.BASE_URL}${url.slice(1)}`
  : url;
const report = discovered as AssetReport;
const discoveredAssets = Object.fromEntries(
  Object.entries(report.assets).map(([key, url]) => [key, withBase(url)])
) as Partial<Record<AssetKey, string>>;
const resolvedOverrides = Object.fromEntries(
  Object.entries(overrides).map(([key, url]) => [key, withBase(url)])
) as Partial<Record<AssetKey, string>>;

export const assets = { ...discoveredAssets, ...resolvedOverrides };
export const assetReport: AssetReport = {
  ...report,
  assets,
  files: report.files.map(file => ({ ...file, url: withBase(file.url) }))
};
export const isVideo = (path?: string) => !!path && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(path);
export const isAnimatedImage = (path?: string) => !!path && /\.gif(\?|$)/i.test(path);
