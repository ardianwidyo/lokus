import { describe, expect, it } from 'vitest';

import {
  classifyReview,
  scoreThemes,
  themeCluster,
  themesFor,
} from '../src/analytics/themeCluster.js';
import { createSeededGbpAdapter } from '../src/adapters/gbp.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';
import { COMPLAINT_MATRIX } from '../src/seed/reviews.js';

const TENANT = 'nusa-retail';

const allReviews = async () => {
  const { data } = await createSeededGbpAdapter().listReviews({ tenantId: TENANT, limit: 5000 });
  return data.reviews;
};

describe('classifyReview', () => {
  it('finds the theme in the text, with nothing else to go on (AC-2.1)', () => {
    const result = classifyReview(
      'Antre 25 menit cuma buat bayar. Kasir dua, yang buka satu. Pegawainya ramah sih, tapi ya capek.',
    );

    expect(result.theme).toBe('antrean-kasir');
    expect(result.matchedTerms).toContain('antre');
    expect(result.score).toBeGreaterThan(0.5);
  });

  it('picks the dominant complaint when a review mentions two topics', () => {
    // Staff manner is the complaint; "kasir" is only where it happened.
    expect(classifyReview('Kasirnya jutek, tidak menyapa sama sekali.').theme).toBe(
      'keramahan-staf',
    );
    // Stock is the complaint; "promo" is incidental.
    expect(classifyReview('Barang promo habis padahal baru jam sepuluh pagi.').theme).toBe(
      'stok-kosong',
    );
  });

  it('assigns at most one theme, so the matrix cannot double-count', () => {
    const themes = themesFor('Lantainya kotor dan bau, rak juga banyak yang kosong.');

    expect(themes).toHaveLength(1);
  });

  it('returns nothing for a review that carries no complaint', () => {
    expect(classifyReview('Tokonya nyaman, penataan barang rapi. Puas belanja di sini.')).toBeNull();
    expect(themesFor('Lengkap dan dekat rumah.')).toEqual([]);
  });

  it.each([null, undefined, '', '   ', '!!!'])('survives %p without throwing', (text) => {
    expect(classifyReview(text)).toBeNull();
  });

  it('is case and punctuation insensitive', () => {
    expect(classifyReview('ANTREAN!!! panjang sekali...').theme).toBe('antrean-kasir');
  });

  it('counts a keyword once however often it is repeated', () => {
    const once = scoreThemes('parkir penuh');
    const many = scoreThemes('parkir parkir parkir penuh');

    expect(once[0].score).toBe(many[0].score);
  });
});

describe('bq.themeCluster', () => {
  it('returns the tool envelope and cites every review it counted', async () => {
    const result = await themeCluster({ tenantId: TENANT, reviews: await allReviews() });

    expect(result).toHaveProperty('latencyMs');
    expect(result.sources.length).toBe(
      result.data.themes.reduce((sum, theme) => sum + theme.count, 0),
    );
    expect(result.sources[0]).toMatchObject({ type: 'review', id: expect.any(String) });
  });

  it('rediscovers the screen-07 matrix from the review text alone', async () => {
    // The generator planned these counts; the clusterer never saw the plan.
    const { data } = await themeCluster({ tenantId: TENANT, reviews: await allReviews() });
    const byTheme = new Map(data.themes.map((theme) => [theme.theme, theme]));

    for (const [themeId, expectedByOutlet] of Object.entries(COMPLAINT_MATRIX)) {
      for (const [outletId, expected] of Object.entries(expectedByOutlet)) {
        expect(
          byTheme.get(themeId).byOutlet[outletId],
          `${themeId} at ${outletId}`,
        ).toBe(expected);
      }
    }
  });

  it('makes antrean kasir the largest theme in the network', async () => {
    const { data } = await themeCluster({ tenantId: TENANT, reviews: await allReviews() });

    expect(data.themes[0].theme).toBe('antrean-kasir');
    expect(data.themes[0].count).toBe(67);
  });

  it('gives an 8-week series per theme that sums to its total', async () => {
    const { data } = await themeCluster({ tenantId: TENANT, reviews: await allReviews() });

    for (const theme of data.themes) {
      expect(theme.weekly).toHaveLength(8);
      expect(theme.weekly.reduce((sum, n) => sum + n, 0)).toBe(theme.count);
    }
  });

  it('shows Bekasi checkout queues rising sharply against a month earlier', async () => {
    const { data } = await themeCluster({
      tenantId: TENANT,
      outletId: 'BKS-02',
      reviews: await allReviews(),
    });
    const antrean = data.themes.find((theme) => theme.theme === 'antrean-kasir');

    expect(antrean.weekly.at(-1)).toBe(11);
    expect(antrean.delta).toBeGreaterThan(2);
  });

  it('ignores four- and five-star reviews that merely mention a topic', async () => {
    const reviews = [
      { id: 'a', tenantId: TENANT, outletId: 'BKS-02', rating: 5, text: 'Harga bersaing, mantap.', publishedAt: new Date().toISOString() },
      { id: 'b', tenantId: TENANT, outletId: 'BKS-02', rating: 2, text: 'Harga jauh lebih mahal dari sebelah.', publishedAt: new Date().toISOString() },
    ];

    const { data } = await themeCluster({ tenantId: TENANT, reviews, now: new Date() });

    expect(data.reviewsConsidered).toBe(1);
    expect(data.themes[0].count).toBe(1);
  });

  it('scopes to one tenant and refuses without a tenant id', async () => {
    const reviews = await allReviews();

    const other = await themeCluster({ tenantId: 'klinik-sehat-prima', reviews });

    expect(other.data.themes).toHaveLength(0);
    await expect(themeCluster({ reviews })).rejects.toBeInstanceOf(TenantScopeError);
  });

  it('records which regions carry each theme, for the systemic rule', async () => {
    const { data } = await themeCluster({ tenantId: TENANT, reviews: await allReviews() });
    const antrean = data.themes.find((theme) => theme.theme === 'antrean-kasir');

    expect(antrean.regions.length).toBeGreaterThanOrEqual(4);
  });
});
