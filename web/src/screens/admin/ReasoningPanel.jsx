import { useCallback, useState } from 'react';

import { useAsyncData } from '../../app/useAsyncData.js';
import { DataPanel, PANEL_STATUS } from '../../components/states/index.js';
import { useLocale } from '../../i18n/index.js';

/**
 * Which reasoning path answers, and — when the process allows it — the control
 * to change it.
 *
 * No credential is entered here and none is displayed. The API resolves the key
 * and the token provider from its own environment; this panel only asks which
 * of the already-configured paths should be used. A field that accepted a key
 * would send it from a browser across the network, which is the one thing the
 * whole credential design of this repo exists to avoid.
 *
 * A path the process cannot take is shown, disabled, with the variable that is
 * missing. Hiding it would leave an operator wondering whether the feature
 * exists; offering it would be a button that fails.
 */
export function ReasoningPanel({ adminSource }) {
  const { t, errorText } = useLocale();
  const [pending, setPending] = useState(null);
  const [failure, setFailure] = useState(null);

  const load = useCallback(
    () => (adminSource.reasoning ? adminSource.reasoning() : Promise.resolve(null)),
    [adminSource],
  );
  const { status, data, error, reload } = useAsyncData(load);

  // The seeded console has no process to ask: it runs the domain in the
  // browser, where there is no key and no identity to choose between.
  const unavailable = status === PANEL_STATUS.READY && !data;

  async function select(path) {
    setPending(path);
    setFailure(null);
    try {
      await adminSource.selectReasoning(path);
      await reload();
    } catch (problem) {
      // Named rather than swallowed: "belum dikonfigurasi" and "dikunci" are
      // different problems with different fixes.
      setFailure(errorText(problem, 'admin.reasoningFailed'));
    } finally {
      setPending(null);
    }
  }

  return (
    <DataPanel
      status={unavailable ? PANEL_STATUS.EMPTY : status}
      kicker={t('admin.reasoningKicker')}
      loading={{ message: t('admin.reasoningLoading') }}
      empty={{ title: t('admin.reasoningEmpty'), description: t('admin.reasoningEmptyBody') }}
      error={{ title: t('admin.reasoningError'), description: errorText(error, 'admin.errorFallback'), onRetry: reload }}
      needsPermission={{ title: t('admin.reasoningForbidden') }}
    >
      {data ? (
        <>
          <ul className="path-list">
            {data.options.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className={`path-option${option.active ? ' is-active' : ''}`}
                  // Disabled for two different reasons, and the title says
                  // which: nothing to switch to, or nothing may switch it.
                  disabled={!option.available || !data.mutable || pending !== null}
                  aria-pressed={option.active}
                  onClick={() => select(option.id)}
                >
                  <span className="path-mark" aria-hidden="true">
                    {option.active ? '●' : '○'}
                  </span>
                  <span className="path-text">
                    <span>{t(`admin.path.${option.id}`)}</span>
                    {option.detail ? <span className="path-detail">{option.detail}</span> : null}
                  </span>
                  {!option.available ? (
                    <span className="path-state">{t('admin.pathUnavailable')}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>

          {failure ? <p className="state-note is-error">{failure}</p> : null}

          <p className="state-note">
            {data.mutable ? t('admin.reasoningMutable') : t('admin.reasoningLocked')}
          </p>
        </>
      ) : null}
    </DataPanel>
  );
}
