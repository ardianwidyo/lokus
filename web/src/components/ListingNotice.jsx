import { LISTING_LEVELS } from '@lokus/core';

import { canWrite } from '../app/roles.js';
import { useSession } from '../app/SessionContext.jsx';
import { Empty, NeedsPermission } from './states/index.js';
import { useT } from '../i18n/index.js';

/**
 * What an outlet's listing level means for the panel it sits in — spec US-9.
 *
 * The two levels below `managed` are deliberately *not* the same state, and
 * this component exists so no screen can accidentally merge them:
 *
 *   public — a person can fix this. The listing is on Maps and someone holds
 *            the keys, so the needs-permission state is right and a connect
 *            action belongs on it (AC-9.3).
 *   absent — nobody can fix this by granting anything. There is no listing to
 *            connect to, so offering a connect button would send a reader to
 *            an account screen that cannot help them. Empty, with the actual
 *            next step, is the honest state.
 *
 * Returns null at `managed`, so a caller can render it unconditionally.
 */
export function ListingNotice({ listing, outletName = null, onConnect = null }) {
  const t = useT();
  const { role } = useSession();

  if (!listing || listing.level === LISTING_LEVELS.MANAGED) return null;

  if (listing.level === LISTING_LEVELS.PUBLIC) {
    return (
      <NeedsPermission
        title={t('listing.publicTitle')}
        description={t('listing.publicDescription', {
          outlet: outletName ?? t('listing.thisBranch'),
          count: listing.reviewCeiling,
        })}
        actionLabel={t('listing.connect')}
        onConnect={onConnect ?? (() => {})}
        canConnect={canWrite(role)}
      />
    );
  }

  return (
    <Empty
      title={t('listing.absentTitle')}
      description={t('listing.absentDescription', {
        outlet: outletName ?? t('listing.thisBranch'),
      })}
    />
  );
}

/**
 * The one-word badge that puts the level beside the data it qualifies
 * (AC-9.1). Rendered even at `managed`, because "we manage this one" is the
 * fact that makes the other two readable as exceptions rather than as errors.
 */
export function ListingBadge({ level }) {
  const t = useT();
  if (!level) return null;

  const key = {
    [LISTING_LEVELS.MANAGED]: 'listing.levelManaged',
    [LISTING_LEVELS.PUBLIC]: 'listing.levelPublic',
    [LISTING_LEVELS.ABSENT]: 'listing.levelAbsent',
  }[level];

  return (
    <span className={`tag tag-outline listing-badge is-${level}`}>{t(key)}</span>
  );
}
