import { DAY_MS, DEMO_NOW, HOUR_MS, TREND_WEEKS, WEEK_MS } from '../domain/clock.js';
import { LISTING_LEVELS, PUBLIC_REVIEW_CEILING, deriveListingLevel } from '../domain/listingLevel.js';
import { OUTLETS } from '../domain/outlets.js';
import { SEED_LISTING_PROBES } from './listings.js';
import { createRng } from './rng.js';
import { AUTHOR_NAMES, COMPLAINT_TEMPLATES, POSITIVE_TEMPLATES } from './reviewTemplates.js';

/**
 * The seeded review dataset.
 *
 * Every figure the console shows is computed from these rows, so a number on
 * screen can always be traced back to the reviews that produced it
 * (constitution I). The generator is deterministic: same seed, same bytes, on
 * every machine and every run.
 *
 * The 8-week complaint matrix below is the one design/SCREENS.md screen 07
 * displays. It is the *plan* for generation — the clusterer still has to
 * rediscover it from the review text, and a test asserts that it does.
 */

/** theme → outlet → complaint reviews over the 8-week window. */
export const COMPLAINT_MATRIX = Object.freeze({
  'antrean-kasir': { 'BKS-02': 31, 'CKR-01': 9, 'DPK-01': 4, 'SRP-03': 12, 'BGR-01': 3, 'TGR-01': 8 },
  kebersihan: { 'BKS-02': 5, 'CKR-01': 17, 'DPK-01': 2, 'SRP-03': 4, 'BGR-01': 8, 'TGR-01': 3 },
  'stok-kosong': { 'BKS-02': 7, 'CKR-01': 3, 'DPK-01': 22, 'SRP-03': 6, 'BGR-01': 1, 'TGR-01': 2 },
  parkir: { 'BKS-02': 13, 'CKR-01': 2, 'DPK-01': 6, 'SRP-03': 19, 'BGR-01': 4, 'TGR-01': 7 },
  'harga-vs-pesaing': { 'BKS-02': 8, 'CKR-01': 7, 'DPK-01': 11, 'SRP-03': 3, 'BGR-01': 2, 'TGR-01': 4 },
  'keramahan-staf': { 'BKS-02': 2, 'CKR-01': 3, 'DPK-01': 1, 'SRP-03': 2, 'BGR-01': 1, 'TGR-01': 2 },
});

/** Average star rating each outlet should land on (screens 03 and 04). */
export const TARGET_RATING = Object.freeze({
  'BKS-02': 3.8,
  'CKR-01': 4.0,
  'DPK-01': 3.6,
  'SRP-03': 4.3,
  'BGR-01': 4.5,
  'TGR-01': 4.1,
});

/**
 * Bekasi's weekly shape is pinned rather than spread evenly, because two
 * headline claims depend on it: "muncul di 11 dari 18 review pekan ini" and
 * "naik 3x dari Juni" (screen 02, decision 1). Week 8 is the current week.
 */
const WEEKLY_PLAN = Object.freeze({
  'BKS-02': {
    'antrean-kasir': [2, 2, 3, 3, 3, 3, 4, 11],
    kebersihan: [1, 1, 0, 1, 0, 1, 0, 1],
    'stok-kosong': [1, 1, 1, 1, 1, 0, 1, 1],
    parkir: [2, 2, 1, 2, 1, 1, 1, 3],
    'harga-vs-pesaing': [1, 1, 1, 1, 1, 1, 1, 1],
    'keramahan-staf': [0, 0, 1, 0, 0, 0, 0, 1],
  },
});

/**
 * The reviews screens 05 and 06 open on. Written out rather than generated so
 * the demo always lands on the same rows. Ratna's text is verbatim from
 * design/SCREENS.md; it replaces one generated slot instead of adding to the
 * matrix, so the counts stay exact.
 */
const FEATURED = Object.freeze([
  {
    id: 'rev-BKS-02-featured-1',
    outletId: 'BKS-02',
    theme: 'antrean-kasir',
    rating: 1,
    author: 'Ratna W.',
    hoursAgo: 2,
    text: 'Antre 25 menit cuma buat bayar. Kasir dua, yang buka satu. Pegawainya ramah sih, tapi ya capek.',
  },
  {
    id: 'rev-DPK-01-featured-1',
    outletId: 'DPK-01',
    theme: 'stok-kosong',
    rating: 2,
    author: 'Hendra S.',
    hoursAgo: 5,
    text: 'Stok minuman dingin kosong lagi, sudah tiga kali begini. Rak bagian tengah juga banyak yang habis.',
  },
  {
    id: 'rev-CKR-01-featured-1',
    outletId: 'CKR-01',
    theme: 'kebersihan',
    rating: 2,
    author: 'Melati A.',
    hoursAgo: 6,
    text: 'Lantainya kotor dan ada bau kurang sedap dekat rak pendingin. Kebersihan perlu diperhatikan lagi.',
  },
  {
    id: 'rev-SRP-03-featured-1',
    outletId: 'SRP-03',
    theme: 'parkir',
    rating: 3,
    author: 'Yoga P.',
    hoursAgo: 26,
    text: 'Barangnya lengkap, tapi parkir motor penuh terus jam pulang kerja. Lahan parkirnya kurang.',
  },
  {
    id: 'rev-TGR-01-featured-1',
    outletId: 'TGR-01',
    theme: 'harga-vs-pesaing',
    rating: 3,
    author: 'Nadia R.',
    hoursAgo: 28,
    text: 'Tokonya nyaman, sayang harga beberapa barang lebih mahal daripada minimarket sebelah.',
  },
]);

/** One positive featured review, so screen 05 shows a five-star row too. */
const FEATURED_POSITIVE = Object.freeze({
  id: 'rev-BGR-01-featured-1',
  outletId: 'BGR-01',
  rating: 5,
  author: 'Bimo W.',
  hoursAgo: 30,
  text: 'Kasir cepat walau ramai, stafnya sigap mengarahkan ke kasir tambahan. Cabang paling nyaman sejauh ini.',
});

/**
 * The five reviews Places API (New) exposes for the Karawang branch — its
 * whole visible history, because five is the ceiling (AC-9.6), not because the
 * branch only ever received five.
 *
 * Two of them are complaints an area manager would want answered today, which
 * is the point: the console has to show the reviews *and* the fact that nobody
 * here has the authority to reply to them.
 */
const PUBLIC_REVIEWS = Object.freeze([
  {
    id: 'rev-KRW-01-places-1',
    outletId: 'KRW-01',
    rating: 2,
    author: 'Dimas A.',
    hoursAgo: 9,
    text: 'Antrean panjang jam makan siang dan hanya satu kasir yang buka. Barangnya lengkap sih.',
  },
  {
    id: 'rev-KRW-01-places-2',
    outletId: 'KRW-01',
    rating: 2,
    author: 'Sinta M.',
    hoursAgo: 33,
    text: 'Rak minuman dingin banyak yang kosong dan lantainya lengket dekat pintu masuk.',
  },
  {
    id: 'rev-KRW-01-places-3',
    outletId: 'KRW-01',
    rating: 3,
    author: 'Bagas P.',
    hoursAgo: 52,
    text: 'Standar saja. Parkir motor cukup, tapi harga beberapa item lebih mahal dari sebelah.',
  },
  {
    id: 'rev-KRW-01-places-4',
    outletId: 'KRW-01',
    rating: 4,
    author: 'Ayu Lestari',
    hoursAgo: 80,
    text: 'Stafnya ramah dan mau bantu carikan barang. Tokonya bersih waktu saya datang.',
  },
  {
    id: 'rev-KRW-01-places-5',
    outletId: 'KRW-01',
    rating: 5,
    author: 'Rizal H.',
    hoursAgo: 121,
    text: 'Dekat rumah, buka 24 jam, kasirnya cepat. Sejauh ini tidak ada keluhan.',
  },
]);

/** Distributes a total across 8 weeks, leaning the remainder onto later weeks. */
function evenSpread(total, weeks = TREND_WEEKS) {
  const base = Math.floor(total / weeks);
  const remainder = total % weeks;
  return Array.from({ length: weeks }, (_, index) =>
    base + (index >= weeks - remainder ? 1 : 0),
  );
}

function weeklyPlanFor(outletId, themeId) {
  return WEEKLY_PLAN[outletId]?.[themeId] ?? evenSpread(COMPLAINT_MATRIX[themeId][outletId]);
}

/** A timestamp inside the given 1-based week, deterministic per review. */
function publishedInWeek(weekIndex, rng, now) {
  const weekEnd = now.getTime() - (TREND_WEEKS - weekIndex) * WEEK_MS;
  const offset = rng.int(0, 6) * DAY_MS + rng.int(8, 21) * HOUR_MS + rng.int(0, 59) * 60_000;
  return new Date(weekEnd - WEEK_MS + offset);
}

/**
 * Reply state follows the rules the product actually enforces (AC-3.1):
 * 1-2 star replies wait for a human, everything else can be sent by the agent.
 */
function replyStateFor(rating, publishedAt, now) {
  const ageDays = (now.getTime() - publishedAt.getTime()) / DAY_MS;

  if (rating <= 2) return ageDays > 7 ? 'sent' : 'none';
  return ageDays > 2 ? 'sent' : 'draft';
}

function buildReview({
  id,
  tenantId,
  outletId,
  rating,
  author,
  text,
  publishedAt,
  now,
  level = LISTING_LEVELS.MANAGED,
}) {
  const managed = level === LISTING_LEVELS.MANAGED;
  // A review nobody may answer has no reply history to have, so its state is
  // `none` by construction rather than by a rule applied later. Seeding one as
  // `sent` would be recording a reply that could not have been published.
  const replyState = managed ? replyStateFor(rating, publishedAt, now) : 'none';

  return {
    id,
    tenantId,
    outletId,
    rating,
    text,
    author,
    publishedAt: publishedAt.toISOString(),
    replyState,
    replyText: null,
    approvedBy: null,
    approvedAt: null,
    // A fixture, not a measurement: every sent reply is six hours after its
    // review. `replyCoverage` computes a real median over these, but the median
    // it finds is this constant — so nothing may cite it as evidence of how
    // fast the agents are. The README says so too.
    sentAt: replyState === 'sent' ? new Date(publishedAt.getTime() + 6 * HOUR_MS).toISOString() : null,
    source: managed ? 'google-business-profile' : 'google-places',
    sourceUri: managed
      ? `https://business.google.com/reviews/${id}`
      : `https://www.google.com/maps/place/?q=place_id:${SEED_LISTING_PROBES[outletId]?.placesMatch ?? ''}`,
  };
}

/**
 * Builds the whole dataset. Complaint rows come from the matrix; positive rows
 * are then added until each outlet's mean rating reaches its target, so the
 * ratings on screens 03 and 04 are an average of real rows rather than a
 * hard-coded figure.
 */
export function generateReviews({ now = DEMO_NOW, seed = 'lokus-2026' } = {}) {
  const rng = createRng(seed);
  const reviews = [];
  let sequence = 0;

  const featuredByKey = new Map(
    FEATURED.map((item) => [`${item.outletId}:${item.theme}`, item]),
  );

  // Only outlets whose listing we manage have a history to generate. The other
  // two are not missing data by oversight — an unclaimed listing genuinely does
  // not expose one, and an outlet absent from Maps has none to expose.
  const levelOf = (outletId) => deriveListingLevel(SEED_LISTING_PROBES[outletId] ?? {});
  const managedOutlets = OUTLETS.filter(
    (outlet) => levelOf(outlet.outletId) === LISTING_LEVELS.MANAGED,
  );

  for (const outlet of managedOutlets) {
    for (const themeId of Object.keys(COMPLAINT_MATRIX)) {
      const plan = weeklyPlanFor(outlet.outletId, themeId);
      const featured = featuredByKey.get(`${outlet.outletId}:${themeId}`);
      let featuredPlaced = false;

      plan.forEach((count, weekOffset) => {
        const weekIndex = weekOffset + 1;

        for (let n = 0; n < count; n += 1) {
          // The featured review takes one slot in the current week rather than
          // adding a row, so the matrix totals stay exact.
          if (featured && !featuredPlaced && weekIndex === TREND_WEEKS) {
            featuredPlaced = true;
            reviews.push(
              buildReview({
                ...featured,
                tenantId: outlet.tenantId,
                publishedAt: new Date(now.getTime() - featured.hoursAgo * HOUR_MS),
                now,
              }),
            );
            continue;
          }

          sequence += 1;
          const rating = rng.next() < 0.45 ? rng.int(1, 2) : 3;
          reviews.push(
            buildReview({
              id: `rev-${outlet.outletId}-${String(sequence).padStart(4, '0')}`,
              tenantId: outlet.tenantId,
              outletId: outlet.outletId,
              rating,
              author: rng.pick(AUTHOR_NAMES),
              text: rng.pick(COMPLAINT_TEMPLATES[themeId]),
              publishedAt: publishedInWeek(weekIndex, rng, now),
              now,
            }),
          );
        }
      });
    }
  }

  reviews.push(
    buildReview({
      ...FEATURED_POSITIVE,
      tenantId: 'nusa-retail',
      publishedAt: new Date(now.getTime() - FEATURED_POSITIVE.hoursAgo * HOUR_MS),
      now,
    }),
  );

  // Everything Places will show for an unclaimed listing, and no more. The slice
  // is not decoration: if the ceiling ever changes, the dataset has to change
  // with it rather than keep asserting a number the API no longer honours.
  for (const row of PUBLIC_REVIEWS.slice(0, PUBLIC_REVIEW_CEILING)) {
    reviews.push(
      buildReview({
        ...row,
        tenantId: 'nusa-retail',
        publishedAt: new Date(now.getTime() - row.hoursAgo * HOUR_MS),
        now,
        level: LISTING_LEVELS.PUBLIC,
      }),
    );
  }

  // Top up with satisfied customers until the outlet's mean is as close to its
  // target as four- and five-star rows can get it. Stopping at the first
  // crossing would overshoot badly on the smaller outlets, so each step picks
  // the rating that reduces the error and the loop ends when none does.
  for (const outlet of managedOutlets) {
    const target = TARGET_RATING[outlet.outletId];
    const own = reviews.filter((review) => review.outletId === outlet.outletId);
    let sum = own.reduce((total, review) => total + review.rating, 0);
    let count = own.length;

    for (;;) {
      const currentError = Math.abs(sum / count - target);
      const best = [4, 5]
        .map((rating) => ({ rating, error: Math.abs((sum + rating) / (count + 1) - target) }))
        .sort((a, b) => a.error - b.error)[0];

      if (best.error >= currentError) break;
      const rating = best.rating;

      sequence += 1;
      reviews.push(
        buildReview({
          id: `rev-${outlet.outletId}-${String(sequence).padStart(4, '0')}`,
          tenantId: outlet.tenantId,
          outletId: outlet.outletId,
          rating,
          author: rng.pick(AUTHOR_NAMES),
          text: rng.pick(POSITIVE_TEMPLATES),
          publishedAt: publishedInWeek(rng.int(1, TREND_WEEKS), rng, now),
          now,
        }),
      );
      sum += rating;
      count += 1;
    }
  }

  return reviews.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export { FEATURED, FEATURED_POSITIVE, evenSpread };
