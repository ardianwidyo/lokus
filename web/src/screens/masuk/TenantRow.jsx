import { Blueprint } from '../../components/Blueprint.jsx';
import { roleLabelKey } from '../../app/roles.js';
import { useLocale } from '../../i18n/index.js';

/**
 * One tenant row: name, "N cabang · segmen · peran: X", and a single tag.
 *
 * AC-6.3 is visible here — the role travels with the tenant from the first
 * screen. The tag follows design/SCREENS.md: last-opened wins, then a trial
 * countdown, then read-only.
 */
export function TenantRow({ tenant, isLastOpened, onSelect, disabled = false }) {
  const { t, fmt } = useLocale();
  const tag = tenantTag(tenant, isLastOpened, t);
  const role = t(roleLabelKey(tenant.role));

  return (
    <Blueprint
      as="button"
      type="button"
      className={`tenant-row${isLastOpened ? ' is-last-opened' : ''}`}
      onClick={() => onSelect(tenant.tenantId)}
      disabled={disabled}
      aria-label={t('masuk.rowLabel', { name: tenant.name, role })}
    >
      <span className="tenant-row-text">
        <span className="tenant-name">{tenant.name}</span>
        <span className="tenant-meta">
          {t('masuk.rowMeta', {
            count: fmt.integer(tenant.outletCount),
            segment: tenant.segment,
            role,
          })}
        </span>
      </span>
      {tag ? <span className={`tag ${tag.className}`}>{tag.label}</span> : null}
    </Blueprint>
  );
}

/**
 * Takes `t` rather than calling a hook, so it stays a plain function the row
 * test can drive directly with either language.
 */
function tenantTag(tenant, isLastOpened, t) {
  if (isLastOpened) return { label: t('masuk.tagLastOpened'), className: 'tag-accent' };
  if (tenant.plan === 'trial' && tenant.trialDaysLeft !== null) {
    return {
      label: t('masuk.tagTrial', { days: tenant.trialDaysLeft }),
      className: 'tag-neutral',
    };
  }
  if (tenant.role === 'viewer') return { label: t('masuk.tagReadOnly'), className: 'tag-neutral' };
  return null;
}

export { tenantTag };
