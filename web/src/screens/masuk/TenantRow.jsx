import { Blueprint } from '../../components/Blueprint.jsx';
import { roleLabel } from '../../app/roles.js';

/**
 * One tenant row: name, "N cabang · segmen · peran: X", and a single tag.
 *
 * AC-6.3 is visible here — the role travels with the tenant from the first
 * screen. The tag follows design/SCREENS.md: last-opened wins, then a trial
 * countdown, then read-only.
 */
export function TenantRow({ tenant, isLastOpened, onSelect, disabled = false }) {
  const tag = tenantTag(tenant, isLastOpened);

  return (
    <Blueprint
      as="button"
      type="button"
      className={`tenant-row${isLastOpened ? ' is-last-opened' : ''}`}
      onClick={() => onSelect(tenant.tenantId)}
      disabled={disabled}
      aria-label={`Buka ${tenant.name}, peran ${roleLabel(tenant.role)}`}
    >
      <span className="tenant-row-text">
        <span className="tenant-name">{tenant.name}</span>
        <span className="tenant-meta">
          {tenant.outletCount} cabang · {tenant.segment} · peran: {roleLabel(tenant.role)}
        </span>
      </span>
      {tag ? <span className={`tag ${tag.className}`}>{tag.label}</span> : null}
    </Blueprint>
  );
}

function tenantTag(tenant, isLastOpened) {
  if (isLastOpened) return { label: 'Terakhir dibuka', className: 'tag-accent' };
  if (tenant.plan === 'trial' && tenant.trialDaysLeft !== null) {
    return { label: `Uji coba · ${tenant.trialDaysLeft} hari`, className: 'tag-neutral' };
  }
  if (tenant.role === 'viewer') return { label: 'Baca saja', className: 'tag-neutral' };
  return null;
}

export { tenantTag };
