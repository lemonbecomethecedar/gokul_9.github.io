import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import nodemailer from 'nodemailer';

const file = resolve(process.env.REVIEWS_FILE || 'data/reviews.json');
let writing = Promise.resolve();
const attempts = new Map();
export function validateReview(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid review.');
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const message = typeof value.message === 'string' ? value.message.trim() : '';
  const rating = Number(value.rating);
  if (value.website || name.length < 2 || name.length > 50 || message.length < 10 || message.length > 600 || !Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Enter a name (2–50 characters), a review (10–600 characters), and a rating from 1 to 5.');
  if (/[\x00-\x1f\x7f]/.test(name)) throw new Error('Name contains unsupported characters.');
  return { id: randomUUID(), name, message, rating, createdAt: new Date().toISOString() };
}
async function readReviews() {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
async function saveReview(review) {
  const task = writing.then(async () => {
    const reviews = await readReviews();
    await mkdir(dirname(file), { recursive: true });
    const temporary = `${file}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify([review, ...reviews], null, 2), { mode: 0o600 });
    await rename(temporary, file);
  });
  writing = task.catch(() => {});
  await task;
}
function mailConfigured() { return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.REVIEW_OWNER_EMAIL); }
async function notify(review) {
  if (!mailConfigured()) return false;
  const transport = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000, disableFileAccess: true, disableUrlAccess: true });
  try {
    const result = await transport.sendMail({ from: process.env.GMAIL_USER, to: process.env.REVIEW_OWNER_EMAIL, subject: 'New Minecraft Reimagined review', text: `New public review\n\nName: ${review.name}\nRating: ${review.rating}/5\nDate: ${review.createdAt}\n\n${review.message}` });
    return result.accepted.length > 0;
  } catch (error) { console.error('Review email delivery failed:', error.code || 'SMTP_ERROR'); return false; }
  finally { transport.close(); }
}
function json(response, code, value) { response.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(JSON.stringify(value)); }
export function createReviewServer() {
  return createServer(async (request, response) => {
    if (request.url?.split('?')[0] !== '/api/reviews') return json(response, 404, { error: 'Not found.' });
    try {
      if (request.method === 'GET') return json(response, 200, { reviews: await readReviews(), emailConfigured: mailConfigured() });
      if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed.' });
      const expectedOrigin = process.env.SITE_ORIGIN || `http://${request.headers.host}`;
      if (request.headers.origin && request.headers.origin !== expectedOrigin) return json(response, 403, { error: 'Origin not allowed.' });
      if (!request.headers['content-type']?.startsWith('application/json')) return json(response, 415, { error: 'JSON required.' });
      const address = request.socket.remoteAddress || 'unknown';
      const now = Date.now();
      for (const [key, expiry] of attempts) if (expiry <= now) attempts.delete(key);
      if (attempts.has(address)) return json(response, 429, { error: 'Please wait a minute before posting another review.' });
      let raw = '';
      for await (const chunk of request) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 8192) return json(response, 413, { error: 'Review is too large.' });
      }
      let review;
      try { review = validateReview(JSON.parse(raw)); } catch (error) { return json(response, 400, { error: error.message }); }
      attempts.set(address, now + 60000);
      await saveReview(review);
      const emailSent = await notify(review);
      return json(response, 201, { review, emailSent });
    } catch { return json(response, 500, { error: 'The review service is unavailable. Please try again later.' }); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.REVIEWS_PORT || 8787);
  createReviewServer().listen(port, '127.0.0.1', () => console.log(`Reviews API listening on 127.0.0.1:${port}`));
}