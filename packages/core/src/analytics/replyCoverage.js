import { findOutlet } from '../domain/outlets.js';
import { hasFullHistory, listingIndex } from '../domain/listingLevel.js';

/**
 * The two response-time claims the README makes — median first response, and
 * the share answered inside the target window — computed over the outlets whose
 * history we can actually see.
 *
 * AC-9.5 is the whole reason this is a separate module rather than three lines
 * inside the briefing. Both figures assume the reviews in hand are all the
 * reviews there were. For an unclaimed listing that assumption is false: Places
 * shows five, chosen by Google, and none of them can be replied to. Averaging
 * them in would move both numbers in the flattering direction — a branch nobody
 * may answer would drag the median up as an operational failure, when it is a
 * permission one, and a branch with no listing at all would silently vanish
 * from the denominator.
 *
 * So the exclusions are returned rather than applied quietly. A metric that
 * cannot say what it left out is not a measurement.
 */

/** The window the success metrics are stated against (spec.md). */
export const RESPONSE_TARGET_HOURS = 48;

const HOUR_MS = 60 * 60 * 1000;

export function replyCoverage(reviews, listings = [], { targetHours = RESPONSE_TARGET_HOURS } = {}) {
  const index = listingIndex(listings);

  const counted = [];
  const excluded = [];

  for (const outletId of outletIds(reviews, listings)) {
    const listing = index.get(outletId);
    // No probe means no evidence of a full history, and this is a measurement:
    // it counts what it can vouch for and names the rest.
    if (listing && hasFullHistory(listing.level)) counted.push(outletId);
    else excluded.push({ outletId, name: outletName(outletId), level: listing?.level ?? null });
  }

  const countedSet = new Set(counted);
  const scoped = reviews.filter((review) => countedSet.has(review.outletId));
  const replied = scoped.filter((review) => review.sentAt);

  const hours = replied
    .map((review) => (new Date(review.sentAt) - new Date(review.publishedAt)) / HOUR_MS)
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);

  const withinTarget = hours.filter((value) => value <= targetHours).length;

  return {
    medianFirstResponseHours: median(hours),
    withinTargetHours: targetHours,
    withinTargetCount: withinTarget,
    // Of every review that could be replied to, not of every review: an
    // unanswered one is in the denominator, an unanswerable one is not.
    withinTargetShare: scoped.length === 0 ? null : Number((withinTarget / scoped.length).toFixed(3)),
    repliedCount: replied.length,
    reviewsCounted: scoped.length,
    outletsCounted: counted.length,
    outletsExcluded: excluded.length,
    exclusions: excluded,
  };
}

/** Every outlet that either produced a review or was probed for one. */
function outletIds(reviews, listings) {
  const ids = new Set(listings.map((listing) => listing.outletId));
  for (const review of reviews) ids.add(review.outletId);
  return [...ids];
}

function outletName(outletId) {
  return findOutlet(outletId)?.name ?? outletId;
}

/** Even counts average the middle pair, so the figure moves with the data. */
function median(sorted) {
  if (sorted.length === 0) return null;

  const middle = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;

  return Number(value.toFixed(1));
}
