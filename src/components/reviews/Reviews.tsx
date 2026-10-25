import { useEffect, useState, type FormEvent } from 'react';
type Review = { id: string; name: string; message: string; rating: number; createdAt: string };
export function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/reviews', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Guestbook is unavailable. Please try again later.');
      const data = await response.json() as { reviews: Review[]; emailConfigured: boolean };
      setReviews(data.reviews); setReady(true);
      if (!data.emailConfigured) setNotice('Reviews are published here. Owner email notifications are not configured yet.');
    }).catch((cause: Error) => { if (cause.name !== 'AbortError') setError(cause.message); });
    return () => controller.abort();
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(data)) });
      const result = await response.json() as { review?: Review; emailSent?: boolean; error?: string };
      if (!response.ok || !result.review) throw new Error(result.error || 'Unable to publish your review.');
      setReviews(previous => [result.review!, ...previous]); setPage(0); form.reset();
      setNotice(result.emailSent ? 'Review published. The owner has been notified by email.' : 'Review published. Email notification could not be delivered; your review is safely saved.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to publish your review.'); }
    finally { setBusy(false); }
  };
  const count = Math.max(1, reviews.length);
  return <div className="reviews-layout"><form className="review-form" onSubmit={submit}>
    <label>Your name<input name="name" required minLength={2} maxLength={50} autoComplete="name" /></label>
    <label>Rating<select name="rating" defaultValue="5">{[5, 4, 3, 2, 1].map(rating => <option key={rating} value={rating}>{rating} / 5</option>)}</select></label>
    <label>Your review<textarea name="message" required minLength={10} maxLength={600} rows={4} /></label>
    <label className="review-trap" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <small>Your name, rating, and message will be public and may be emailed to the owner. Please don’t include private information.</small>
    <button className="small-action" disabled={busy || !ready} type="submit">{busy ? 'PUBLISHING…' : 'POST REVIEW ↗'}</button>
    <p className="review-notice" role="status">{notice}</p><p className="review-error" role="alert">{error}</p>
  </form><div className="review-feed"><span className="eyebrow">VISITOR REVIEWS / {reviews.length}</span>
    {!reviews.length && <p className="reviews-empty">{ready ? 'Be the first to leave a note.' : 'Opening the guestbook…'}</p>}
    {reviews.slice(page, page + 1).map(review => <article className="review-entry" key={review.id}><header><strong>{review.name}</strong><span aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></header><p>{review.message}</p><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString()}</time></article>)}
    {count > 1 && <div className="review-pagination"><button disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous reviews">←</button><span>{page + 1} / {count}</span><button disabled={page + 1 === count} onClick={() => setPage(page + 1)} aria-label="Next reviews">→</button></div>}
  </div></div>;
}