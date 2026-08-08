import { beforeEach, describe, expect, it } from 'vitest';

import { createSeededGbpAdapter, GbpError } from '../src/adapters/gbp.js';
import { createSeededPlacesAdapter } from '../src/adapters/places.js';
import { runNightlyCycle } from '../src/briefing/nightlyCycle.js';
import { createMemoryWarehouse } from '../src/pipeline/warehouse.js';
import {
  LISTING_LEVELS,
  PUBLIC_REVIEW_CEILING,
  canReply,
  deriveListingLevel,
  hasFullHistory,
  listingFor,
  listingRecord,
  reviewCeiling,
  unsendableReason,
} from '../src/domain/listingLevel.js';
import {
  createMemoryApprovalStore,
  saveDraft,
  sendReply,
  ApprovalError,
} from '../src/reputation/approvals.js';
import { draftReply } from '../src/reputation/draftReply.js';
import { seedListings } from '../src/seed/listings.js';

const TENANT = 'nusa-retail';

/** One managed branch, one unclaimed, one that is not on Maps at all. */
const MANAGED_REVIEW = 'rev-BKS-02-featured-1';
const PUBLIC_REVIEW = 'rev-KRW-01-places-1';

describe('listing level derivation (AC-9.2)', () => {
  it('reads the level off the two responses rather than a stored flag', () => {
    expect(deriveListingLevel({ managedLocation: 'locations/1', placesMatch: 'ChIJx' })).toBe(
      LISTING_LEVELS.MANAGED,
    );
    expect(deriveListingLevel({ managedLocation: null, placesMatch: 'ChIJx' })).toBe(
      LISTING_LEVELS.PUBLIC,
    );
    expect(deriveListingLevel({ managedLocation: null, placesMatch: null })).toBe(
      LISTING_LEVELS.ABSENT,
    );
  });

  it('drops to public when the grant goes but the place stays', () => {
    // The revocation case the whole derivation exists for: same outlet, same
    // place id, no v4 location. Nothing had to be edited for the level to fall.
    const before = listingRecord({
      outletId: 'KRW-01',
      probe: { managedLocation: 'locations/9', placesMatch: 'ChIJk' },
      checkedAt: '2026-08-04T23:00:00.000Z',
    });
    const after = listingRecord({
      outletId: 'KRW-01',
      probe: { managedLocation: null, placesMatch: 'ChIJk' },
      checkedAt: '2026-08-05T23:00:00.000Z',
    });

    expect(before.canReply).toBe(true);
    expect(after.canReply).toBe(false);
    expect(after.unsendableReason).toBe('LISTING_UNCLAIMED');
  });

  it('treats an outlet nobody probed as absent, not as permitted', () => {
    const unknown = listingFor([], 'XXX-99');

    expect(unknown.level).toBe(LISTING_LEVELS.ABSENT);
    expect(unknown.canReply).toBe(false);
    expect(unknown.checkedAt).toBeNull();
  });

  it('lets only a managed listing reply, at any rating', () => {
    expect(canReply(LISTING_LEVELS.MANAGED)).toBe(true);
    expect(canReply(LISTING_LEVELS.PUBLIC)).toBe(false);
    expect(canReply(LISTING_LEVELS.ABSENT)).toBe(false);
  });

  it('caps what a public listing can show, and says so is a ceiling (AC-9.6)', () => {
    expect(reviewCeiling(LISTING_LEVELS.MANAGED)).toBeNull();
    expect(reviewCeiling(LISTING_LEVELS.PUBLIC)).toBe(PUBLIC_REVIEW_CEILING);
    expect(reviewCeiling(LISTING_LEVELS.ABSENT)).toBe(0);
  });

  it('trusts only a managed history for measurement (AC-9.5)', () => {
    expect(hasFullHistory(LISTING_LEVELS.MANAGED)).toBe(true);
    expect(hasFullHistory(LISTING_LEVELS.PUBLIC)).toBe(false);
  });

  it('names the two refusals apart, because they need different answers', () => {
    expect(unsendableReason(LISTING_LEVELS.PUBLIC)).toBe('LISTING_UNCLAIMED');
    expect(unsendableReason(LISTING_LEVELS.ABSENT)).toBe('LISTING_ABSENT');
    expect(unsendableReason(LISTING_LEVELS.MANAGED)).toBeNull();
  });
});

describe('the seeded estate covers all three levels (AC-9.1)', () => {
  it('probes every outlet, including the ones with nothing to report', async () => {
    const gbp = createSeededGbpAdapter();
    const { data } = await gbp.listReviews({ tenantId: TENANT, limit: 5000 });

    const byLevel = (level) => data.listings.filter((row) => row.level === level);

    expect(data.listings).toHaveLength(8);
    expect(byLevel(LISTING_LEVELS.MANAGED)).toHaveLength(6);
    expect(byLevel(LISTING_LEVELS.PUBLIC).map((row) => row.outletId)).toEqual(['KRW-01']);
    expect(byLevel(LISTING_LEVELS.ABSENT).map((row) => row.outletId)).toEqual(['BSD-02']);
  });

  it('gives the absent branch no reviews and the public one exactly the ceiling', async () => {
    const gbp = createSeededGbpAdapter();
    const { data } = await gbp.listReviews({ tenantId: TENANT, limit: 5000 });

    const forOutlet = (id) => data.reviews.filter((review) => review.outletId === id);

    expect(forOutlet('BSD-02')).toHaveLength(0);
    expect(forOutlet('KRW-01')).toHaveLength(PUBLIC_REVIEW_CEILING);
  });

  it('never seeds a reply against a listing that could not have published one', async () => {
    const gbp = createSeededGbpAdapter();
    const { data } = await gbp.listReviews({ tenantId: TENANT, limit: 5000 });

    for (const review of data.reviews.filter((row) => row.outletId === 'KRW-01')) {
      expect(review.replyState).toBe('none');
      expect(review.sentAt).toBeNull();
      expect(review.source).toBe('google-places');
    }
  });

  it('says when it looked, so a level can be seen to be stale', () => {
    const [listing] = seedListings({ tenantId: TENANT, now: new Date('2026-08-05T23:00:00.000Z') });

    expect(listing.checkedAt).toBe('2026-08-05T23:00:00.000Z');
  });
});

describe('a reply is withheld, not failed at the send (AC-9.4)', () => {
  let gbp;
  let store;
  let reviews;
  let listings;

  const reviewById = (id) => reviews.find((review) => review.id === id);

  const stage = async (id) => {
    const review = reviewById(id);
    const draft = await draftReply({ tenantId: TENANT, review });
    return saveDraft({
      tenantId: TENANT,
      review,
      draft: draft.data,
      store,
      listing: listingFor(listings, review.outletId),
    });
  };

  beforeEach(async () => {
    gbp = createSeededGbpAdapter();
    store = createMemoryApprovalStore();
    const { data } = await gbp.listReviews({ tenantId: TENANT, limit: 5000 });
    reviews = data.reviews;
    listings = data.listings;
  });

  it('still writes the draft for an unclaimed listing, marked unsendable', async () => {
    const record = await stage(PUBLIC_REVIEW);

    // The work is sound; only the authority to publish it is missing. Refusing
    // to draft would throw away something that becomes valid on connection.
    expect(record.text).toBeTruthy();
    expect(record.sendable).toBe(false);
    expect(record.unsendableReason).toBe('LISTING_UNCLAIMED');
    expect(record.listingLevel).toBe(LISTING_LEVELS.PUBLIC);
  });

  it('refuses the send before asking anyone to approve it', async () => {
    await stage(PUBLIC_REVIEW);

    // A 2-star review would normally need a named human first. Asking for that
    // signature would be asking someone to authorise the impossible, so the
    // listing check comes first.
    await expect(sendReply({ tenantId: TENANT, reviewId: PUBLIC_REVIEW, store, gbp })).rejects.toMatchObject(
      { name: 'ApprovalError', code: 'LISTING_UNCLAIMED' },
    );
  });

  it('refuses at the adapter too, even if every layer above it let it through', async () => {
    await expect(
      gbp.reply({
        tenantId: TENANT,
        reviewId: PUBLIC_REVIEW,
        text: 'Terima kasih atas masukannya.',
        approvedBy: 'manajer@nusaretail.co.id',
      }),
    ).rejects.toMatchObject({ name: 'GbpError', code: 'LISTING_UNCLAIMED' });
  });

  it('still sends for a managed listing, so the gate is about the level only', async () => {
    const review = reviewById(MANAGED_REVIEW);
    const draft = await draftReply({ tenantId: TENANT, review });
    await saveDraft({
      tenantId: TENANT,
      review,
      draft: draft.data,
      store,
      listing: listingFor(listings, review.outletId),
    });

    const approved = { ...(await store.get(TENANT, MANAGED_REVIEW)) };
    expect(approved.sendable).toBe(true);

    // Approval is still required at one star — the listing gate replaced
    // nothing, it only runs before.
    await expect(
      sendReply({ tenantId: TENANT, reviewId: MANAGED_REVIEW, store, gbp }),
    ).rejects.toBeInstanceOf(ApprovalError);
  });

  it('does not report an unanswerable review as one held for approval', async () => {
    const cycle = await runNightlyCycle({
      tenantId: TENANT,
      gbp,
      places: createSeededPlacesAdapter(),
      warehouse: createMemoryWarehouse(),
    });

    const replies = cycle.timeline.find((step) => step.title.includes('dibalas otomatis'));

    // Karawang's two 2-star reviews are unanswered, but nobody can sign them
    // into being sent. Counting them among the held would report an approval
    // backlog of 28 that does not exist, and hide the connection problem that
    // does — so the held count stays at 26 and the five are named separately.
    expect(replies.detail).toMatch(/26 ditahan untuk persetujuan/);
    expect(replies.detail).toMatch(/5 belum bisa dibalas/);
  });

  it('is an error the caller can tell apart from a broken adapter', async () => {
    const error = await gbp
      .reply({ tenantId: TENANT, reviewId: PUBLIC_REVIEW, text: 'x', approvedBy: 'a@b.c' })
      .catch((failure) => failure);

    expect(error).toBeInstanceOf(GbpError);
    expect(error.code).not.toBe('REVIEW_NOT_FOUND');
  });
});
