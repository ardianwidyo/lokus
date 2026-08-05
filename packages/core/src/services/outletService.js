import { ratingTrend } from '../analytics/ratingTrend.js';
import { themeCluster } from '../analytics/themeCluster.js';
import { TREND_WEEKS, weekStart } from '../domain/clock.js';
import { listingFor } from '../domain/listingLevel.js';
import { findOutlet, outletsForTenant } from '../domain/outlets.js';
import { themeLabel } from '../domain/themes.js';
import { DEFAULT_LOCALE } from '../i18n/locales.js';
import { assertTenant } from '../lib/tenantScope.js';
import { locationScore } from '../location/locationScore.js';

/**
 * One branch, assembled from all three agents — screen 04.
 *
 * The screen is where reputation, location and the review queue are read
 * against each other, so the composition lives here rather than in the screen:
 * the API and the seeded browser source must agree about a branch, and the
 * whole point of the screen is that two independent signals can be seen
 * pointing at the same thing.
 */

/** Weeks per block when comparing "lately" against "before that". */
export const BLOCK_WEEKS = 4;

/** How far around the branch the mini-map looks. Matches the network map. */
export const RADIUS_M = 1000;

export function createOutletService({ gbp, places, weights = undefined } = {}) {
  const readByTenant = new Map();
  async function read(tenantId) {
    if (!readByTenant.has(tenantId)) {
      const { data } = await gbp.listReviews({ tenantId, limit: 5000 });
      readByTenant.set(tenantId, { reviews: data.reviews, listings: data.listings ?? [] });
    }
    return readByTenant.get(tenantId);
  }

  /** The picker at the top of the screen: every branch, worst score first. */
  async function list(tenantId) {
    assertTenant(tenantId);
    const outlets = outletsForTenant(tenantId);
    const { listings } = await read(tenantId);

    const scored = await Promise.all(
      outlets.map(async (outlet) => {
        const { data } = await locationScore({
          tenantId,
          outletId: outlet.outletId,
          places,
          weights,
        });
        return {
          outletId: outlet.outletId,
          code: outlet.code,
          name: outlet.name,
          score: data.total,
          // Every branch is scored — Places answers for a neighbourhood whether
          // or not we hold the listing — but the picker still has to show which
          // ones the reputation half of the screen will be silent about.
          listingLevel: listingFor(listings, outlet.outletId).level,
        };
      }),
    );

    return scored.sort((a, b) => a.score - b.score);
  }

  async function detail(tenantId, outletId, { locale = DEFAULT_LOCALE } = {}) {
    assertTenant(tenantId);

    const outlet = findOutlet(outletId);
    // A branch from another tenant must read exactly like one that does not
    // exist, or the 404 becomes a way to enumerate the other tenant's estate.
    if (!outlet || outlet.tenantId !== tenantId) return null;

    const { reviews, listings } = await read(tenantId);
    const ranking = await list(tenantId);

    const [trend, themes, score, nearby] = await Promise.all([
      ratingTrend({ tenantId, outletId, reviews }),
      themeCluster({ tenantId, reviews, outletId }),
      locationScore({ tenantId, outletId, places, weights, locale }),
      places.nearbyCompetitors({ geo: outlet.geo, radiusM: RADIUS_M }),
    ]);

    const mine = reviews.filter((review) => review.outletId === outletId);
    const complaints = themes.data.themes.reduce((sum, theme) => sum + theme.count, 0);

    return {
      outlet: {
        outletId: outlet.outletId,
        code: outlet.code,
        name: outlet.name,
        region: outlet.region,
        address: outlet.address,
        manager: outlet.manager,
        openedAt: outlet.openedAt,
        geo: outlet.geo,
      },
      // The rating panel below is only as complete as this says it is: at
      // `public` it rests on the five reviews Places exposed, at `absent` on
      // nothing at all. The screen must be able to say which (AC-9.1, AC-9.6).
      listing: listingFor(listings, outletId),
      rating: ratingSummary(mine, trend.data.points),
      location: {
        score: score.data.total,
        // Ascending list, so index 0 is the weakest; rank 1 is the strongest.
        rank: ranking.length - ranking.findIndex((row) => row.outletId === outletId),
        of: ranking.length,
        factors: score.data.factors,
        weights: score.data.weights,
        factorLabels: score.data.labels,
        derivedFactors: score.data.derivedFactors,
        surveyedFactors: score.data.surveyedFactors,
      },
      trend: {
        weeks: TREND_WEEKS,
        points: trend.data.points.map((point) => ({
          ...point,
          startsAt: weekStart(point.week).toISOString().slice(0, 10),
        })),
        changePoints: trend.data.changePoints,
        overallDelta: trend.data.overallDelta,
      },
      // From Places, not from the ratings: an opening is an event that happened
      // whether or not the rating moved that week.
      event: openingEvent(nearby.data.pois, trend.data.points),
      themes: themes.data.themes.map((theme) => ({
        theme: theme.theme,
        label: themeLabel(theme.theme, locale),
        count: theme.count,
        share: complaints === 0 ? 0 : Number((theme.count / complaints).toFixed(3)),
      })),
      complaintCount: complaints,
      nearby: {
        radiusM: nearby.data.radiusM,
        total: nearby.data.total,
        newSinceCount: nearby.data.newSinceCount,
        pois: nearby.data.pois,
      },
      queue: {
        unreplied: mine.filter((review) => review.replyState !== 'sent').length,
        needsAction: mine.filter((review) => review.rating <= 2 && review.replyState !== 'sent')
          .length,
      },
      sourceCount: mine.length + nearby.data.total,
    };
  }

  return { list, detail };
}

/**
 * The headline rating is the mean of every review, because that is the number
 * the network map shows for the same branch and the two may not disagree. The
 * movement beside it compares the last four weeks against the four before —
 * labelled as that, not as "this month", since the blocks are what was
 * measured.
 */
function ratingSummary(reviews, points) {
  const mean = reviews.length
    ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(2))
    : null;

  const recent = blockMean(points.slice(-BLOCK_WEEKS));
  const prior = blockMean(points.slice(-BLOCK_WEEKS * 2, -BLOCK_WEEKS));
  const latest = points.filter((point) => point.rating !== null).at(-1) ?? null;

  return {
    mean,
    reviewCount: reviews.length,
    recentMean: recent,
    priorMean: prior,
    delta: recent === null || prior === null ? null : Number((recent - prior).toFixed(2)),
    blockWeeks: BLOCK_WEEKS,
    latestWeekRating: latest?.rating ?? null,
    latestWeek: latest?.week ?? null,
  };
}

/** Weighted by review count, so a quiet week does not carry a busy one. */
function blockMean(points) {
  const sum = points.reduce((total, point) => total + (point.rating ?? 0) * point.reviewCount, 0);
  const count = points.reduce((total, point) => total + point.reviewCount, 0);
  return count === 0 ? null : Number((sum / count).toFixed(2));
}

/**
 * The one competitor opening inside the window, if there is one, placed on the
 * week it happened. `ratingMoved` reports what the series did that week; it is
 * deliberately a separate field from the event, so a reader can see the two
 * facts without the screen joining them into a claim.
 */
function openingEvent(pois, points) {
  const opened = pois
    .filter((poi) => poi.openedAt)
    .map((poi) => ({ poi, week: weekOf(poi.openedAt, points) }))
    .filter((entry) => entry.week !== null)
    .sort((a, b) => b.week - a.week)[0];

  if (!opened) return null;

  const at = ratingAt(points, opened.week);
  const before = ratingAt(points, opened.week - 1);

  return {
    week: opened.week,
    name: opened.poi.name,
    openedAt: opened.poi.openedAt,
    distanceM: opened.poi.distanceM,
    placeId: opened.poi.placeId,
    ratingMoved:
      at === null || before === null
        ? null
        : { from: before, to: at, delta: Number((at - before).toFixed(2)) },
  };
}

/** The mean for one week, or null when that week had no reviews to average. */
function ratingAt(points, week) {
  return points.find((point) => point.week === week)?.rating ?? null;
}

function weekOf(date, points) {
  const at = new Date(date).getTime();

  for (const point of points) {
    const start = weekStart(point.week).getTime();
    if (at >= start && at < start + 7 * 24 * 3600 * 1000) return point.week;
  }
  return null;
}
