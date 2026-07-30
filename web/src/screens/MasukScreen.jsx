import { useCallback, useState } from 'react';

import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { useLocale } from '../i18n/index.js';
import { SignInCard } from './masuk/SignInCard.jsx';
import { TenantRow } from './masuk/TenantRow.jsx';

/**
 * Screen 01 · Masuk & pilih tenant.
 *
 * Two columns: the 400px sign-in card and the tenant panel. The tenant panel is
 * a data panel, so it carries all four states — including "perlu izin" for an
 * account that signed in but was granted no tenant.
 *
 * Behaviour from design/SCREENS.md: choosing a tenant stores tenantId + role,
 * drops the client cache, and opens screen 02.
 */
export function MasukScreen({ onNavigate }) {
  const { source, selectTenant } = useSession();
  const { t, errorText } = useLocale();
  const [selecting, setSelecting] = useState(null);
  const [selectError, setSelectError] = useState(null);

  const loadSession = useCallback(() => source.loadSession(), [source]);
  const { status, data, error, reload } = useAsyncData(loadSession);

  const tenants = data?.tenants ?? [];
  const lastOpenedId = mostRecentlyOpenedId(tenants);

  const handleSelect = async (tenantId) => {
    setSelecting(tenantId);
    setSelectError(null);
    try {
      await selectTenant(tenantId);
      onNavigate('/briefing');
    } catch (failure) {
      setSelectError(errorText(failure, 'masuk.tenantOpenFailed'));
    } finally {
      setSelecting(null);
    }
  };

  return (
    <div className="masuk">
      <SignInCard
        onSignInWithGoogle={() => source.signInWithGoogle()}
        onSendLink={(email) => source.sendSignInLink(email)}
      />

      <div className="masuk-tenants">
        <DataPanel
          status={panelStatus(status, tenants)}
          kicker={t('masuk.tenantsKicker')}
          meta={
            source.isSeeded ? <span className="tag tag-neutral">{t('common.sampleData')}</span> : null
          }
          loading={{ message: t('masuk.tenantsLoading') }}
          empty={{
            title: t('masuk.tenantsEmptyTitle'),
            description: t('masuk.tenantsEmptyDescription'),
          }}
          error={{
            title: t('masuk.tenantsErrorTitle'),
            description: error
              ? t('masuk.tenantsErrorRetry', { message: errorText(error) })
              : t('masuk.tenantsErrorFallback'),
            onRetry: reload,
          }}
          needsPermission={{
            title: t('masuk.tenantsPermissionTitle'),
            description: t('masuk.tenantsPermissionDescription'),
          }}
        >
          <ul className="tenant-list">
            {tenants.map((tenant) => (
              <li key={tenant.tenantId}>
                <TenantRow
                  tenant={tenant}
                  isLastOpened={tenant.tenantId === lastOpenedId}
                  onSelect={handleSelect}
                  disabled={selecting !== null}
                />
              </li>
            ))}
          </ul>

          {selectError ? (
            <p className="signin-failure" role="alert">
              {selectError}
            </p>
          ) : null}

          <p className="tenant-note">{t('masuk.tenantNote')}</p>
        </DataPanel>
      </div>
    </div>
  );
}

function panelStatus(status, tenants) {
  if (status === PANEL_STATUS.READY && tenants.length === 0) return PANEL_STATUS.EMPTY;
  return status;
}

function mostRecentlyOpenedId(tenants) {
  return (
    tenants
      .filter((tenant) => tenant.lastOpenedAt)
      .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))[0]?.tenantId ?? null
  );
}
