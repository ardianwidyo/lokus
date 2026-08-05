/**
 * What LOKUS is permitted to do with an outlet's Google listing — spec US-9.
 *
 * Reviews reach us through two APIs that are not interchangeable. Places API
 * (New) answers for any place on Maps with nothing but an API key, and returns
 * at most five reviews, read-only. Business Profile API v4 returns the full
 * history and is the only way to publish a reply — but it needs OAuth from the
 * account that manages the listing, on a project Google has allowlisted.
 *
 * So an outlet sits at one of three levels, and the difference is not a
 * configuration detail: it decides whether the Reputation agent may promise a
 * reply at all. Replying is a property of ownership. No key, quota, or billing
 * change lifts `absent` or `public` into it.
 */

export const LISTING_LEVELS = Object.freeze({
  /** No listing on Google Maps at all. Nothing to read, nothing to answer. */
  ABSENT: 'absent',
  /** A listing exists, but the tenant neither owns nor manages it. */
  PUBLIC: 'public',
  /** Claimed, verified, and LOKUS holds the `business.manage` grant. */
  MANAGED: 'managed',
});

export const LISTING_LEVEL_ORDER = Object.freeze([
  LISTING_LEVELS.ABSENT,
  LISTING_LEVELS.PUBLIC,
  LISTING_LEVELS.MANAGED,
]);

/**
 * Places API (New) returns at most this many reviews per place, chosen by
 * Google rather than by us. It is a ceiling on what we can see, not a count of
 * what the outlet received — the console has to say so (AC-9.6), or a quiet
 * branch and a capped one read the same.
 */
export const PUBLIC_REVIEW_CEILING = 5;

/** Which API answered for an outlet. Carried so a reader can check the claim. */
export const LISTING_SOURCES = Object.freeze({
  [LISTING_LEVELS.MANAGED]: 'business-profile-v4',
  [LISTING_LEVELS.PUBLIC]: 'places-v1',
  [LISTING_LEVELS.ABSENT]: null,
});

/** Why a reply cannot be sent, as a code the UI translates. */
export const UNSENDABLE_REASONS = Object.freeze({
  [LISTING_LEVELS.ABSENT]: 'LISTING_ABSENT',
  [LISTING_LEVELS.PUBLIC]: 'LISTING_UNCLAIMED',
});

export function isListingLevel(value) {
  return LISTING_LEVEL_ORDER.includes(value);
}

/**
 * The level, derived from what the two calls actually returned.
 *
 * AC-9.2: never from a flag someone set. Both the seeded adapter and the Google
 * one run *this* function over their own responses, so a grant that is revoked
 * shows up as a level drop on the next cycle instead of a stale success — there
 * is no stored answer to go out of date.
 *
 * @param {{ managedLocation?: string|null, placesMatch?: string|null }} probe
 *   `managedLocation` is the v4 location name the Business Profile call
 *   returned; `placesMatch` is the place id the Places call resolved. Either
 *   may be null, which is the whole point.
 */
export function deriveListingLevel({ managedLocation = null, placesMatch = null } = {}) {
  if (managedLocation) return LISTING_LEVELS.MANAGED;
  if (placesMatch) return LISTING_LEVELS.PUBLIC;
  return LISTING_LEVELS.ABSENT;
}

/** AC-9.4. The only level that may publish a reply. */
export function canReply(level) {
  return level === LISTING_LEVELS.MANAGED;
}

/**
 * AC-9.5. Whether the review history is complete enough to measure against.
 * Five reviews Google picked cannot support a median response time, and a
 * metric that quietly averaged them in would be wrong in the flattering
 * direction.
 */
export function hasFullHistory(level) {
  return level === LISTING_LEVELS.MANAGED;
}

/** How many reviews this level can ever show. `null` means no ceiling. */
export function reviewCeiling(level) {
  if (level === LISTING_LEVELS.MANAGED) return null;
  if (level === LISTING_LEVELS.PUBLIC) return PUBLIC_REVIEW_CEILING;
  return 0;
}

/** The reason code for a level that cannot reply, or null for one that can. */
export function unsendableReason(level) {
  return UNSENDABLE_REASONS[level] ?? null;
}

/**
 * The record every caller downstream reads: the level plus the evidence for it.
 *
 * `checkedAt` is part of the answer rather than decoration — a level is a claim
 * about what the credentials returned at a moment, and a reader deciding
 * whether to go and reconnect an account needs to know when we last looked.
 */
export function listingRecord({ outletId, probe = {}, checkedAt }) {
  const level = deriveListingLevel(probe);

  return Object.freeze({
    outletId,
    level,
    checkedAt,
    source: LISTING_SOURCES[level],
    placeId: probe.placesMatch ?? null,
    locationName: probe.managedLocation ?? null,
    canReply: canReply(level),
    hasFullHistory: hasFullHistory(level),
    reviewCeiling: reviewCeiling(level),
    unsendableReason: unsendableReason(level),
  });
}

/** Index a list of records by outlet, for the many callers that look one up. */
export function listingIndex(listings = []) {
  return new Map(listings.map((listing) => [listing.outletId, listing]));
}

/**
 * The level for an outlet we have no record for. Deliberately `absent` rather
 * than a permissive default: an outlet nobody probed has not earned a reply.
 */
export function listingFor(listings, outletId) {
  const index = listings instanceof Map ? listings : listingIndex(listings);
  return index.get(outletId) ?? listingRecord({ outletId, probe: {}, checkedAt: null });
}
