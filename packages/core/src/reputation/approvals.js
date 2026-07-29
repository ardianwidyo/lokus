import { assertTenant, scopeToTenant } from '../lib/tenantScope.js';
import { toolResult } from '../lib/toolResult.js';

/**
 * Reply approval — constitution II, "Human owns the public voice".
 *
 * AC-3.1: a reply to a 1-2 star review cannot be sent until a human approves
 * it, and who approved it and when is persisted and auditable.
 *
 * The rule is enforced in three independent places on purpose:
 *   1. here, in the workflow,
 *   2. in `adapters/gbp.js`, which refuses an unapproved low-star send,
 *   3. in the API's role gate, which refuses a viewer outright.
 * Any one of them failing still leaves the customer-facing guarantee intact.
 */

export const REPLY_STATES = Object.freeze({
  NONE: 'none',
  DRAFT: 'draft',
  APPROVED: 'approved',
  SENT: 'sent',
});

/** Ratings at or below this need a named human before anything is published. */
export const APPROVAL_REQUIRED_MAX_RATING = 2;

/** Only these roles may approve. A viewer is read-only (AC-6.3). */
const APPROVER_ROLES = new Set(['admin', 'manager']);

export class ApprovalError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ApprovalError';
    this.code = code;
  }
}

export function requiresApproval(review) {
  return review.rating <= APPROVAL_REQUIRED_MAX_RATING;
}

/**
 * Persists drafts and approvals. Firestore in production, memory here; the
 * audit trail is append-only either way — an approval is never overwritten,
 * because "who said yes" has to survive later edits.
 */
export function createMemoryApprovalStore() {
  const drafts = new Map(); // `${tenantId}:${reviewId}` -> draft
  const audit = [];

  const key = (tenantId, reviewId) => `${tenantId}:${reviewId}`;

  return {
    async put(tenantId, draft) {
      assertTenant(tenantId);
      drafts.set(key(tenantId, draft.reviewId), { ...draft, tenantId });
      return draft;
    },

    async get(tenantId, reviewId) {
      assertTenant(tenantId);
      const draft = drafts.get(key(tenantId, reviewId));
      // A draft belonging to another tenant is invisible, not just forbidden.
      return draft && draft.tenantId === tenantId ? { ...draft } : null;
    },

    async list(tenantId, { state = null } = {}) {
      assertTenant(tenantId);
      const rows = scopeToTenant(tenantId, [...drafts.values()]);
      return state ? rows.filter((draft) => draft.state === state) : rows;
    },

    async appendAudit(tenantId, entry) {
      assertTenant(tenantId);
      audit.push({ ...entry, tenantId, at: entry.at });
      return entry;
    },

    async auditFor(tenantId, reviewId) {
      assertTenant(tenantId);
      return audit.filter((row) => row.tenantId === tenantId && row.reviewId === reviewId);
    },
  };
}

/** Stores a generated draft against its review, ready for review by a human. */
export async function saveDraft({ tenantId, review, draft, store, now = () => new Date() }) {
  assertTenant(tenantId);
  if (!draft?.drafted) {
    throw new ApprovalError('NO_DRAFT', 'Tidak ada draft untuk disimpan');
  }

  const record = {
    reviewId: review.id,
    outletId: review.outletId,
    rating: review.rating,
    text: draft.text,
    citations: draft.citations,
    state: REPLY_STATES.DRAFT,
    requiresApproval: requiresApproval(review),
    approvedBy: null,
    approvedAt: null,
    sentAt: null,
    createdAt: now().toISOString(),
  };

  await store.put(tenantId, record);
  return record;
}

/**
 * Approves a draft. Records the approver and the timestamp before anything can
 * be sent, so the audit trail exists even if the send later fails.
 */
export async function approveDraft({
  tenantId,
  reviewId,
  approvedBy,
  role,
  store,
  now = () => new Date(),
}) {
  assertTenant(tenantId);

  if (!approvedBy) {
    throw new ApprovalError('APPROVER_REQUIRED', 'Persetujuan harus mencantumkan identitas penyetuju');
  }
  if (!APPROVER_ROLES.has(role)) {
    throw new ApprovalError('ROLE_FORBIDDEN', `Peran ${role} tidak boleh menyetujui balasan`);
  }

  const draft = await store.get(tenantId, reviewId);
  if (!draft) throw new ApprovalError('DRAFT_NOT_FOUND', 'Draft tidak ditemukan untuk tenant ini');
  if (draft.state === REPLY_STATES.SENT) {
    throw new ApprovalError('ALREADY_SENT', 'Balasan sudah terkirim');
  }

  const approvedAt = now().toISOString();
  const approved = { ...draft, state: REPLY_STATES.APPROVED, approvedBy, approvedAt };

  await store.put(tenantId, approved);
  await store.appendAudit(tenantId, {
    reviewId,
    action: 'approve',
    actor: approvedBy,
    role,
    at: approvedAt,
  });

  return approved;
}

/**
 * Sends a reply. This is the gate: a 1-2 star reply that has not been approved
 * by a named human is refused here, before the adapter is ever called.
 */
export async function sendReply({
  tenantId,
  reviewId,
  store,
  gbp,
  actor = null,
  now = () => new Date(),
}) {
  const startedAt = Date.now();
  assertTenant(tenantId);

  const draft = await store.get(tenantId, reviewId);
  if (!draft) throw new ApprovalError('DRAFT_NOT_FOUND', 'Draft tidak ditemukan untuk tenant ini');

  if (draft.requiresApproval && draft.state !== REPLY_STATES.APPROVED) {
    throw new ApprovalError(
      'APPROVAL_REQUIRED',
      'Balasan untuk review bintang 1-2 wajib disetujui manusia sebelum dikirim',
    );
  }

  const result = await gbp.reply({
    tenantId,
    reviewId,
    text: draft.text,
    approvedBy: draft.approvedBy,
  });

  const sentAt = result.data.sentAt ?? now().toISOString();
  const sent = { ...draft, state: REPLY_STATES.SENT, sentAt };

  await store.put(tenantId, sent);
  await store.appendAudit(tenantId, {
    reviewId,
    action: 'send',
    actor: actor ?? draft.approvedBy ?? 'agent',
    role: draft.approvedBy ? 'human' : 'agent',
    at: sentAt,
  });

  return toolResult({ data: sent, sources: result.sources, startedAt });
}

/** Screen 05's three buckets: needs action, draft ready, already sent. */
export async function replyQueueSummary({ tenantId, reviews, store }) {
  assertTenant(tenantId);
  const drafts = await store.list(tenantId);
  const byReview = new Map(drafts.map((draft) => [draft.reviewId, draft]));

  const scoped = reviews.filter((review) => review.tenantId === tenantId);

  const needsAction = scoped.filter((review) => {
    const draft = byReview.get(review.id);
    if (review.replyState === 'sent') return false;
    return requiresApproval(review) && draft?.state !== REPLY_STATES.SENT;
  });

  const draftReady = scoped.filter((review) => {
    const draft = byReview.get(review.id);
    return !requiresApproval(review) && (draft?.state === REPLY_STATES.DRAFT || review.replyState === 'draft');
  });

  const sent = scoped.filter(
    (review) => review.replyState === 'sent' || byReview.get(review.id)?.state === REPLY_STATES.SENT,
  );

  return {
    needsAction: needsAction.length,
    draftReady: draftReady.length,
    sent: sent.length,
    needsActionReviews: needsAction,
  };
}
