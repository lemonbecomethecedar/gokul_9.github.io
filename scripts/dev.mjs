import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
if (existsSync('.env.server') && process.loadEnvFile) process.loadEnvFile('.env.server');
const { createReviewServer } = await import('../server/reviews.mjs');
const server = createReviewServer();
const port = Number(process.env.REVIEWS_PORT || 8787);
server.on('error', error => { console.error('Reviews API could not start:', error.message); process.exit(1); });
server.listen(port, '127.0.0.1', () => {
  const vite = spawn(process.execPath, ['./node_modules/vite/bin/vite.js', '--host', '0.0.0.0', ...process.argv.slice(2)], { stdio: 'inherit' });
  const stop = () => { vite.kill(); server.close(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  vite.on('exit', code => { server.close(); process.exitCode = code || 0; });
});