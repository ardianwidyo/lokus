import { describe, expect, it } from 'vitest';

import { createSeededGbpAdapter } from '../src/adapters/gbp.js';
import { RESPONSE_TARGET_HOURS, replyCoverage } from '../src/analytics/replyCoverage.js';
import { LISTING_LEVELS, listingRecord } from '../src/domain/listingLevel.js';

const TENANT = 'nusa-retail';

const CHECKED_AT = '2026-08-05T23:00:00.000Z';
const probe = (outletId, level) =>
  listingRecord({
    outletId,
    probe:
      level === LISTING_LEVELS.MANAGED
        ? { managedLocation: 'locations/1', placesMatch: 'ChIJx' }
        : level === LISTING_LEVELS.PUBLIC
          ? { managedLocation: null, placesMatch: 'ChIJx' }
          : {},
    checkedAt: CHECKED_AT,
  });

const review = (outletId, publishedAt, sentAt = null) => ({
  id: `${outletId}-${publishedAt}`,
  tenantId: TENANT,
  outletId,
  rating: 2,
  publishedAt,
  sentAt,
});

describe('replyCoverage (AC-9.5)', () => {
  it('counts only outlets whose review history is complete', () => {
    const reviews = [
      review('BKS-02', '2026-08-01T00:00:00.000Z', '2026-08-01T04:00:00.000Z'),
      // Six hours, and it would drag the median if it were counted. It is not:
      // Places showed us five reviews of an unknown many.
      review('KRW-01', '2026-08-01T00:00:00.000Z', '2026-08-01T06:00:00.000Z'),
    ];
    const listings = [
      probe('BKS-02', LISTING_LEVELS.MANAGED),
      probe('KRW-01', LISTING_LEVELS.PUBLIC),
    ];

    const coverage = replyCoverage(reviews, listings);

    expect(coverage.medianFirstResponseHours).toBe(4);
    expect(coverage.outletsCounted).toBe(1);
    expect(coverage.reviewsCounted).toBe(1);
  });

  it('names what it left out rather than dropping it silently', () => {
    const listings = [
      probe('BKS-02', LISTING_LEVELS.MANAGED),
      probe('KRW-01', LISTING_LEVELS.PUBLIC),
      probe('BSD-02', LISTING_LEVELS.ABSENT),
    ];

    const coverage = replyCoverage([], listings);

    expect(coverage.outletsExcluded).toBe(2);
    expect(coverage.exclusions.map((row) => row.outletId)).toEqual(['KRW-01', 'BSD-02']);
    // The name, so a reader can act on it without looking up an id.
    expect(coverage.exclusions[0].name).toBe('Karawang Galuh Mas');
    expect(coverage.exclusions.map((row) => row.level)).toEqual(['public', 'absent']);
  });

  it('counts an outlet with no listing among the excluded, not among the perfect', () => {
    // The failure mode worth pinning: an outlet with zero reviews contributes
    // nothing to either numerator or denominator, so a naive implementation
    // reports it as neither a problem nor an exclusion — it simply vanishes.
    const coverage = replyCoverage([], [probe('BSD-02', LISTING_LEVELS.ABSENT)]);

    expect(coverage.outletsCounted).toBe(0);
    expect(coverage.outletsExcluded).toBe(1);
    expect(coverage.withinTargetShare).toBeNull();
    expect(coverage.medianFirstResponseHours).toBeNull();
  });

  it('measures the share against the reviews it could answer', () => {
    const reviews = [
      review('BKS-02', '2026-08-01T00:00:00.000Z', '2026-08-01T04:00:00.000Z'),
      review('BKS-02', '2026-08-01T00:00:00.000Z', '2026-08-05T00:00:00.000Z'),
      review('BKS-02', '2026-08-01T00:00:00.000Z'),
    ];

    const coverage = replyCoverage(reviews, [probe('BKS-02', LISTING_LEVELS.MANAGED)]);

    // One inside 48h, one at 96h, one never answered. The unanswered review
    // stays in the denominator — it is a failure, not an exemption.
    expect(coverage.withinTargetHours).toBe(RESPONSE_TARGET_HOURS);
    expect(coverage.withinTargetCount).toBe(1);
    expect(coverage.reviewsCounted).toBe(3);
    expect(coverage.withinTargetShare).toBeCloseTo(0.333, 3);
  });

  it('averages the middle pair on an even count, so the median moves with data', () => {
    const reviews = [
      review('BKS-02', '2026-08-01T00:00:00.000Z', '2026-08-01T02:00:00.000Z'),
      review('BKS-02', '2026-08-01T00:00:00.000Z', '2026-08-01T06:00:00.000Z'),
    ];

    expect(
      replyCoverage(reviews, [probe('BKS-02', LISTING_LEVELS.MANAGED)]).medianFirstResponseHours,
    ).toBe(4);
  });

  it('excludes exactly the two branches the seeded estate cannot vouch for', async () => {
    const gbp = createSeededGbpAdapter();
    const { data } = await gbp.listReviews({ tenantId: TENANT, limit: 5000 });

    const coverage = replyCoverage(data.reviews, data.listings);

    expect(coverage.outletsCounted).toBe(6);
    expect(coverage.exclusions.map((row) => row.outletId).sort()).toEqual(['BSD-02', 'KRW-01']);
  });
});
