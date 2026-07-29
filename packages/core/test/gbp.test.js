import { describe, expect, it } from 'vitest';

import { GbpError, createGoogleGbpAdapter, createSeededGbpAdapter } from '../src/adapters/gbp.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';
import { isGrounded } from '../src/lib/toolResult.js';
import { COMPLAINT_MATRIX, TARGET_RATING } from '../src/seed/reviews.js';
import { OUTLETS } from '../src/domain/outlets.js';

const TENANT = 'nusa-retail';

describe('gbp.listReviews', () => {
  it('returns the tool envelope every agent tool must return', async () => {
    const gbp = createSeededGbpAdapter();

    const result = await gbp.listReviews({ tenantId: TENANT, limit: 5 });

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('sources');
    expect(result).toHaveProperty('latencyMs');
    expect(typeof result.latencyMs).toBe('number');
  });

  it('cites every review it returns, so a claim built on it is grounded', async () => {
    const gbp = createSeededGbpAdapter();

    const result = await gbp.listReviews({ tenantId: TENANT, limit: 10 });

    expect(isGrounded(result)).toBe(true);
    expect(result.sources).toHaveLength(result.data.reviews.length);
    expect(result.sources[0]).toMatchObject({ type: 'review', id: expect.any(String) });
  });

  it('refuses a query with no tenant id', async () => {
    const gbp = createSeededGbpAdapter();

    await expect(gbp.listReviews({})).rejects.toBeInstanceOf(TenantScopeError);
    await expect(gbp.listReviews({ tenantId: '  ' })).rejects.toBeInstanceOf(TenantScopeError);
  });

  it('returns nothing for a tenant that owns no reviews (AC-6.1)', async () => {
    const gbp = createSeededGbpAdapter();

    const result = await gbp.listReviews({ tenantId: 'klinik-sehat-prima' });

    expect(result.data.reviews).toHaveLength(0);
    expect(result.sources).toHaveLength(0);
  });

  it('filters by outlet and by date', async () => {
    const gbp = createSeededGbpAdapter();

    const outlet = await gbp.listReviews({ tenantId: TENANT, outletId: 'BKS-02' });
    const recent = await gbp.listReviews({
      tenantId: TENANT,
      outletId: 'BKS-02',
      since: '2026-07-21T00:00:00Z',
    });

    expect(outlet.data.reviews.every((review) => review.outletId === 'BKS-02')).toBe(true);
    expect(recent.data.reviews.length).toBeLessThan(outlet.data.reviews.length);
    expect(recent.data.reviews.every((r) => r.publishedAt >= '2026-07-21')).toBe(true);
  });

  it('reports the full count even when the page is truncated', async () => {
    const gbp = createSeededGbpAdapter();

    const page = await gbp.listReviews({ tenantId: TENANT, limit: 10 });

    expect(page.data.reviews).toHaveLength(10);
    expect(page.data.total).toBeGreaterThan(10);
  });

  it('is deterministic — the same seed produces the same dataset', async () => {
    const first = await createSeededGbpAdapter().listReviews({ tenantId: TENANT });
    const second = await createSeededGbpAdapter().listReviews({ tenantId: TENANT });

    expect(first.data.total).toBe(second.data.total);
    expect(first.data.reviews.map((r) => r.id)).toEqual(second.data.reviews.map((r) => r.id));
  });

  it('sorts newest first, so screen 05 opens on the freshest review', async () => {
    const gbp = createSeededGbpAdapter();

    const { data } = await gbp.listReviews({ tenantId: TENANT, limit: 20 });
    const timestamps = data.reviews.map((review) => review.publishedAt);

    expect([...timestamps].sort().reverse()).toEqual(timestamps);
  });
});

describe('gbp.reply', () => {
  it('sends a reply to a 3-star review without approval', async () => {
    const gbp = createSeededGbpAdapter();
    const { data } = await gbp.listReviews({ tenantId: TENANT });
    const threeStar = data.reviews.find((review) => review.rating >= 3);

    const result = await gbp.reply({
      tenantId: TENANT,
      reviewId: threeStar.id,
      text: 'Terima kasih atas masukannya.',
    });

    expect(result.data.sent).toBe(true);
    expect(isGrounded(result)).toBe(true);
  });

  it('refuses to send a 1-2 star reply without a human approver (constitution II)', async () => {
    const gbp = createSeededGbpAdapter();

    await expect(
      gbp.reply({
        tenantId: TENANT,
        reviewId: 'rev-BKS-02-featured-1',
        text: 'Mohon maaf atas ketidaknyamanannya.',
      }),
    ).rejects.toMatchObject({ code: 'APPROVAL_REQUIRED' });
  });

  it('sends a 1-2 star reply once a human has approved it', async () => {
    const gbp = createSeededGbpAdapter();

    const result = await gbp.reply({
      tenantId: TENANT,
      reviewId: 'rev-BKS-02-featured-1',
      text: 'Mohon maaf atas ketidaknyamanannya.',
      approvedBy: 'dwi@nusaretail.co.id',
    });

    expect(result.data.sent).toBe(true);
  });

  it('gives the same refusal for another tenant\'s review as for a missing one', async () => {
    const gbp = createSeededGbpAdapter();

    const foreign = gbp.reply({
      tenantId: 'klinik-sehat-prima',
      reviewId: 'rev-BKS-02-featured-1',
      text: 'halo',
      approvedBy: 'x',
    });
    const missing = gbp.reply({
      tenantId: 'klinik-sehat-prima',
      reviewId: 'rev-tidak-ada',
      text: 'halo',
      approvedBy: 'x',
    });

    await expect(foreign).rejects.toMatchObject({ code: 'REVIEW_NOT_FOUND' });
    await expect(missing).rejects.toMatchObject({ code: 'REVIEW_NOT_FOUND' });
  });
});

describe('the real Business Profile adapter', () => {
  it('refuses to be constructed without credentials rather than inventing reviews', () => {
    expect(() => createGoogleGbpAdapter({})).toThrow(GbpError);
    expect(() => createGoogleGbpAdapter({})).toThrow(/belum dikonfigurasi/);
  });

  it('is explicit that it awaits pilot API access, so no caller mistakes it for working', () => {
    expect(() => createGoogleGbpAdapter({ accessToken: 'x', accountId: 'y' })).toThrow(
      /Q1/,
    );
  });
});

describe('adapters do not share mutable state', () => {
  it('keeps one adapter\'s reply out of another\'s data', async () => {
    // The generated rows are cached per seed for speed; each adapter must
    // still copy them, or a send in one place appears everywhere.
    const first = createSeededGbpAdapter();
    const second = createSeededGbpAdapter();

    await first.reply({
      tenantId: TENANT,
      reviewId: 'rev-BKS-02-featured-1',
      text: 'Mohon maaf.',
      approvedBy: 'dwi@nusaretail.co.id',
    });

    const fromSecond = (await second.listReviews({ tenantId: TENANT, limit: 5000 })).data.reviews.find(
      (review) => review.id === 'rev-BKS-02-featured-1',
    );

    expect(fromSecond.replyState).toBe('none');
    expect(fromSecond.approvedBy).toBeNull();
  });

  it('still returns identical data to two untouched adapters', async () => {
    const a = await createSeededGbpAdapter().listReviews({ tenantId: TENANT, limit: 5000 });
    const b = await createSeededGbpAdapter().listReviews({ tenantId: TENANT, limit: 5000 });

    expect(a.data.reviews).toEqual(b.data.reviews);
  });
});

describe('the seeded dataset', () => {
  it('hits each outlet\'s target rating within a tenth of a star', async () => {
    const gbp = createSeededGbpAdapter();
    // The whole set, not the default page — a truncated page skews the mean.
    const { data } = await gbp.listReviews({ tenantId: TENANT, limit: 5000 });

    for (const outlet of OUTLETS) {
      const own = data.reviews.filter((review) => review.outletId === outlet.outletId);
      const mean = own.reduce((sum, review) => sum + review.rating, 0) / own.length;

      expect(Math.abs(mean - TARGET_RATING[outlet.outletId])).toBeLessThan(0.1);
    }
  });

  it('gives Bekasi 18 reviews in the current week, as the briefing claims', async () => {
    const gbp = createSeededGbpAdapter();
    const { data } = await gbp.listReviews({
      tenantId: TENANT,
      outletId: 'BKS-02',
      since: '2026-07-21T08:00:00+07:00',
    });

    // Screen 02, decision 1: "Muncul di 11 dari 18 review pekan ini".
    const complaints = data.reviews.filter((review) => review.rating <= 3);
    expect(complaints).toHaveLength(18);
  });

  it('carries no pre-assigned theme label for the clusterer to cheat with (AC-2.1)', async () => {
    const gbp = createSeededGbpAdapter();
    const { data } = await gbp.listReviews({ tenantId: TENANT, limit: 50 });

    for (const review of data.reviews) {
      expect(review).not.toHaveProperty('theme');
      expect(review).not.toHaveProperty('themes');
    }
  });

  it('plans the complaint matrix design/SCREENS.md screen 07 shows', () => {
    expect(COMPLAINT_MATRIX['antrean-kasir']['BKS-02']).toBe(31);
    expect(COMPLAINT_MATRIX['stok-kosong']['DPK-01']).toBe(22);
    expect(COMPLAINT_MATRIX.parkir['SRP-03']).toBe(19);
    expect(COMPLAINT_MATRIX.kebersihan['CKR-01']).toBe(17);
  });
});
