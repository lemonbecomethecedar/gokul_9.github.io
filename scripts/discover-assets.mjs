import { existsSync, mkdirSync, readdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { resolve, relative, dirname, join, extname } from 'node:path';

const root = process.cwd();
const sources = ['assets', 'public/assets', 'src/assets', 'public/media', 'media', 'music', 'public/music'];
const target = resolve(root, 'public/managed-assets');
const image = /\.(png|jpg|jpeg|webp|gif|avif)$/i;
const video = /\.(mp4|webm|mov|m4v)$/i;
const audio = /\.(mp3|ogg|wav|m4a|aac)$/i;
const font = /\.(woff2?|ttf|otf)$/i;
function walk(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    const full = join(path, entry.name);
    return entry.isDirectory() ? walk(full) : entry.isFile() ? [full] : [];
  });
}
const files = sources.flatMap(source => walk(resolve(root, source)));
const rules = {
  introVideo: { type: video, test: /minecraft[\s_-]*reimagined|intro|opening|cinematic/i },
  landingBackground: { type: image, test: /menu|cave|landing|bedrock/i },
  mainWorldBackground: { type: /\.(mp4|webm|mov|m4v|png|jpe?g|webp|gif|avif)$/i, test: /main[\s_-]*world|world[\s_-]*background|dashboard|main[\s_-]*background|(?:^|[/\\])main\.(?:mp4|webm|mov|m4v|png|jpe?g|webp|gif|avif)$/i },
  playerSkin: { type: /\.png$/i, test: /skin|player|avatar|steve|alex/i },
  buttonHover: { type: audio, test: /hover|rollover/i },
  buttonClick: { type: audio, test: /landing[\s_-]*click/i },
  mainWorldClick: { type: audio, test: /main[\s_-]*click/i },
  transitionSound: { type: audio, test: /transition|enter|portal|whoosh/i },
  backgroundMusic: { type: audio, test: /music|ambient|soundtrack|bgm/i },
  pixelFont: { type: font, test: /pixel|minecraft|mojang|pressstart/i },
  bodyFont: { type: font, test: /inter|sans|body|regular/i },
  logo: { type: image, test: /logo|title/i }
};
const manifest = { assets: {}, candidates: {}, files: [], missing: [], ambiguous: [] };
for (const file of files) {
  const rel = relative(root, file).replaceAll('\\', '/');
  const dest = join(target, rel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(file, dest);
  manifest.files.push({ source: rel, url: '/managed-assets/' + rel.split('/').map(encodeURIComponent).join('/'), extension: extname(file).toLowerCase() });
}
for (const [key, rule] of Object.entries(rules)) {
  const candidates = manifest.files.filter(file => rule.type.test(file.source) && rule.test.test(file.source));
  manifest.candidates[key] = candidates.map(file => file.source);
  if (candidates.length === 1) manifest.assets[key] = candidates[0].url;
  else if (candidates.length > 1) manifest.ambiguous.push(key);
  else manifest.missing.push(key);
}
mkdirSync(resolve(root, 'src/config'), { recursive: true });
writeFileSync(resolve(root, 'src/config/discovered.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Discovered ${files.length} asset files. Missing: ${manifest.missing.join(', ') || 'none'}. Ambiguous: ${manifest.ambiguous.join(', ') || 'none'}.`);
for (const key of manifest.ambiguous) console.warn(`Choose ${key} explicitly in src/config/assets.ts: ${manifest.candidates[key].join(' | ')}`);