import { beforeEach, describe, expect, it } from 'vitest';

import { createSeededGbpAdapter } from '../src/adapters/gbp.js';
import { draftReply } from '../src/reputation/draftReply.js';
import {
  APPROVAL_REQUIRED_MAX_RATING,
  ApprovalError,
  REPLY_STATES,
  approveDraft,
  createMemoryApprovalStore,
  replyQueueSummary,
  requiresApproval,
  saveDraft,
  sendReply,
} from '../src/reputation/approvals.js';

const TENANT = 'nusa-retail';
const ONE_STAR = 'rev-BKS-02-featured-1';
const THREE_STAR = 'rev-SRP-03-featured-1';

describe('reply approval workflow (AC-3.1)', () => {
  let gbp;
  let store;
  let reviews;

  const reviewById = (id) => reviews.find((review) => review.id === id);

  const stageDraft = async (id) => {
    const review = reviewById(id);
    const draft = await draftReply({ tenantId: TENANT, review });
    return saveDraft({ tenantId: TENANT, review, draft: draft.data, store });
  };

  beforeEach(async () => {
    gbp = createSeededGbpAdapter();
    store = createMemoryApprovalStore();
    reviews = (await gbp.listReviews({ tenantId: TENANT, limit: 5000 })).data.reviews;
  });

  it('needs approval at 1 and 2 stars, not at 3', () => {
    expect(APPROVAL_REQUIRED_MAX_RATING).toBe(2);
    expect(requiresApproval({ rating: 1 })).toBe(true);
    expect(requiresApproval({ rating: 2 })).toBe(true);
    expect(requiresApproval({ rating: 3 })).toBe(false);
  });

  it('blocks sending a 1-star reply that nobody approved', async () => {
    await stageDraft(ONE_STAR);

    await expect(sendReply({ tenantId: TENANT, reviewId: ONE_STAR, store, gbp })).rejects.toMatchObject(
      { code: 'APPROVAL_REQUIRED' },
    );
  });

  it('sends it once a manager approves, and records who and when', async () => {
    await stageDraft(ONE_STAR);

    const approved = await approveDraft({
      tenantId: TENANT,
      reviewId: ONE_STAR,
      approvedBy: 'dwi@nusaretail.co.id',
      role: 'manager',
      store,
    });
    const sent = await sendReply({ tenantId: TENANT, reviewId: ONE_STAR, store, gbp });

    expect(approved.approvedBy).toBe('dwi@nusaretail.co.id');
    expect(approved.approvedAt).toEqual(expect.any(String));
    expect(sent.data.state).toBe(REPLY_STATES.SENT);
    expect(sent.data.approvedBy).toBe('dwi@nusaretail.co.id');
  });

  it('sends a 3-star reply without human approval', async () => {
    await stageDraft(THREE_STAR);

    const sent = await sendReply({ tenantId: TENANT, reviewId: THREE_STAR, store, gbp });

    expect(sent.data.state).toBe(REPLY_STATES.SENT);
    expect(sent.data.approvedBy).toBeNull();
  });

  it('refuses an approval with no named approver', async () => {
    await stageDraft(ONE_STAR);

    await expect(
      approveDraft({ tenantId: TENANT, reviewId: ONE_STAR, approvedBy: '', role: 'manager', store }),
    ).rejects.toMatchObject({ code: 'APPROVER_REQUIRED' });
  });

  it('refuses approval from a viewer (AC-6.3)', async () => {
    await stageDraft(ONE_STAR);

    await expect(
      approveDraft({
        tenantId: TENANT,
        reviewId: ONE_STAR,
        approvedBy: 'lina@nusaretail.co.id',
        role: 'viewer',
        store,
      }),
    ).rejects.toMatchObject({ code: 'ROLE_FORBIDDEN' });
  });

  it('keeps an append-only audit trail of approval and send', async () => {
    await stageDraft(ONE_STAR);
    await approveDraft({
      tenantId: TENANT,
      reviewId: ONE_STAR,
      approvedBy: 'dwi@nusaretail.co.id',
      role: 'manager',
      store,
    });
    await sendReply({ tenantId: TENANT, reviewId: ONE_STAR, store, gbp });

    const trail = await store.auditFor(TENANT, ONE_STAR);

    expect(trail.map((entry) => entry.action)).toEqual(['approve', 'send']);
    expect(trail[0].actor).toBe('dwi@nusaretail.co.id');
    expect(trail.every((entry) => entry.at)).toBe(true);
  });

  it('will not send the same reply twice', async () => {
    await stageDraft(THREE_STAR);
    await sendReply({ tenantId: TENANT, reviewId: THREE_STAR, store, gbp });

    await expect(
      approveDraft({
        tenantId: TENANT,
        reviewId: THREE_STAR,
        approvedBy: 'dwi@nusaretail.co.id',
        role: 'manager',
        store,
      }),
    ).rejects.toMatchObject({ code: 'ALREADY_SENT' });
  });

  it('hides a draft belonging to another tenant', async () => {
    await stageDraft(ONE_STAR);

    expect(await store.get('klinik-sehat-prima', ONE_STAR)).toBeNull();
    await expect(
      sendReply({ tenantId: 'klinik-sehat-prima', reviewId: ONE_STAR, store, gbp }),
    ).rejects.toMatchObject({ code: 'DRAFT_NOT_FOUND' });
  });

  it('still refuses at the adapter even if the workflow gate were bypassed', async () => {
    // Defence in depth: the adapter enforces the same rule independently.
    await expect(
      gbp.reply({ tenantId: TENANT, reviewId: ONE_STAR, text: 'halo' }),
    ).rejects.toMatchObject({ code: 'APPROVAL_REQUIRED' });
  });

  it('refuses to save a draft the generator declined to write', async () => {
    const review = reviewById(ONE_STAR);
    const refused = await draftReply({ tenantId: TENANT, review, passages: [] });

    await expect(
      saveDraft({ tenantId: TENANT, review, draft: refused.data, store }),
    ).rejects.toBeInstanceOf(ApprovalError);
  });

  it('summarises the queue into the three buckets screen 05 shows', async () => {
    const summary = await replyQueueSummary({ tenantId: TENANT, reviews, store });

    expect(summary.needsAction).toBeGreaterThan(0);
    expect(summary.sent).toBeGreaterThan(summary.needsAction);
    expect(summary.needsActionReviews.every((review) => review.rating <= 2)).toBe(true);
  });
});
