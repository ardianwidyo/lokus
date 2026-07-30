import { useCallback, useState } from 'react';

import { themeLabel } from '@lokus/core';

import { canWrite } from '../app/roles.js';
import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { Rich, useLocale } from '../i18n/index.js';

/** The index states the store returns, mapped to their dictionary keys. */
const INDEX_LABEL_KEYS = {
  indexed: 'kb.indexIndexed',
  diproses: 'kb.indexProcessing',
  'menunggu-tinjauan': 'kb.indexAwaitingReview',
  dikecualikan: 'kb.indexExcluded',
  antre: 'kb.indexQueued',
};

/**
 * Screen 11 · Pusat pengetahuan.
 *
 * What the corpus contains, what it can answer, and what it keeps failing to
 * answer. The last of those is the point: a knowledge base that only shows what
 * it has invites the reader to assume it has everything.
 */
export function KnowledgeScreen({ onNavigate }) {
  const { knowledgeSource, role, tenant } = useSession();
  const { locale, t, fmt, errorText } = useLocale();
  const [receipt, setReceipt] = useState(null);

  const load = useCallback(
    () => knowledgeSource.overview(tenant?.tenantId ?? 'nusa-retail'),
    [knowledgeSource, tenant?.tenantId],
  );
  const { status, data, error, reload } = useAsyncData(load);

  const mayAct = canWrite(role);

  return (
    <>
      <div className="metric-grid">
        <Blueprint className="metric-card">
          <span className="kicker">{t('kb.metricDocsKicker')}</span>
          <span className="metric-value">{data?.stats.indexedCount ?? '—'}</span>
          <span className="metric-note">
            {data
              ? t('kb.metricDocsNote', {
                  chunks: fmt.integer(data.stats.chunkCount),
                  documents: data.stats.documentCount,
                })
              : ''}
          </span>
        </Blueprint>

        <Blueprint className="metric-card">
          <span className="kicker">{t('kb.metricCoverageKicker')}</span>
          <span className="metric-value">{data ? fmt.percent(data.coverage.rate) : '—'}</span>
          <span className="budget-bar" aria-hidden="true">
            <span
              className="budget-fill"
              style={{ width: `${data ? Math.round(data.coverage.rate * 100) : 0}%` }}
            />
          </span>
          <span className="metric-note">
            {data
              ? t('kb.metricCoverageNote', {
                  answered: data.coverage.answered,
                  probed: data.coverage.probed,
                })
              : ''}
          </span>
        </Blueprint>

        <Blueprint className="metric-card">
          <span className="kicker">{t('kb.metricUnansweredKicker')}</span>
          <span className="metric-value">{data?.totalUnanswered ?? '—'}</span>
          <span className="metric-note">
            {data ? t('kb.metricUnansweredNote', { count: data.gaps.length }) : ''}
          </span>
        </Blueprint>

        <Blueprint className="metric-card">
          <span className="kicker">{t('kb.metricEmbeddingKicker')}</span>
          <span className="metric-value metric-value-sm">{data?.stats.embeddingModel ?? '—'}</span>
          <span className="metric-note">
            {data
              ? t('kb.metricEmbeddingNote', {
                  dimensions: data.stats.dimensions,
                  chunkTokens: data.stats.chunkTokens,
                  overlapTokens: data.stats.overlapTokens,
                })
              : ''}
          </span>
        </Blueprint>
      </div>

      <div className="kb-grid">
        <DataPanel
          status={status}
          kicker={t('kb.docsKicker')}
          loading={{ message: t('kb.docsLoading') }}
          empty={{ title: t('kb.docsEmptyTitle'), description: t('kb.docsEmptyDescription') }}
          error={{
            title: t('kb.docsErrorTitle'),
            description: errorText(error, 'kb.docsErrorFallback'),
            onRetry: reload,
          }}
        >
          {data ? (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">{t('kb.colDocument')}</th>
                    <th scope="col">{t('kb.colType')}</th>
                    <th scope="col">{t('kb.colPages')}</th>
                    <th scope="col">{t('kb.colChunks')}</th>
                    <th scope="col">{t('kb.colIndexState')}</th>
                    <th scope="col">{t('kb.colUpdated')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.documents.map((doc) => (
                    <tr key={doc.docId}>
                      {/* The title is the tenant's own document name. */}
                      <th scope="row">{doc.title}</th>
                      <td>{doc.type}</td>
                      <td>{doc.pages ?? '—'}</td>
                      <td>{doc.chunkCount}</td>
                      <td>
                        {/* Retrievable or not is the fact that matters; the
                            label alone would let "menunggu tinjauan" read as
                            searchable. */}
                        <span className={`tag ${doc.retrievable ? 'tag-accent' : 'tag-outline'}`}>
                          {INDEX_LABEL_KEYS[doc.indexState]
                            ? t(INDEX_LABEL_KEYS[doc.indexState])
                            : doc.indexState}
                        </span>
                      </td>
                      <td>{doc.updatedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <p className="state-note">
            <Rich
              k="kb.docsNote"
              values={{ indexed: <strong>{t('kb.indexIndexed')}</strong> }}
            />
          </p>
        </DataPanel>

        <div className="kb-side">
          <DataPanel
            status={
              data && data.gaps.length === 0 && status === PANEL_STATUS.READY
                ? PANEL_STATUS.EMPTY
                : status
            }
            className="gap-panel"
            kicker={t('kb.gapsKicker')}
            loading={{ message: t('kb.gapsLoading') }}
            empty={{
              title: t('kb.gapsEmptyTitle'),
              description: t('kb.gapsEmptyDescription'),
            }}
            error={{ title: t('kb.gapsError'), onRetry: reload }}
          >
            {data?.gaps?.length ? (
              <>
                {data.gaps.slice(0, 2).map((gap) => (
                  <div key={gap.theme} className="gap-item">
                    {/* `themeLabel` falls back to the raw id for a cluster like
                        "lain" that has no dictionary entry, so an untranslated
                        theme still reads as something rather than vanishing. */}
                    <h3 className="finding-headline">
                      {themeLabel(gap.theme, locale).replace(/-/g, ' ')}
                    </h3>
                    <p className="state-description">
                      {t('kb.gapDescription', {
                        occurrences: gap.occurrences,
                        people: gap.askedBy.length || t('kb.gapPeopleUnknown'),
                      })}
                    </p>
                    <p className="gap-question">“{gap.questions[0]}”</p>

                    {gap.proposedClause ? (
                      <>
                        {/* The clause is a draft destined for an Indonesian SOP,
                            so it is shown as written. For an English reader the
                            kicker says so rather than the clause pretending to
                            be English (spec.md AC-8.5). */}
                        <p className="kicker">
                          {t(locale === 'id' ? 'kb.clauseKicker' : 'kb.clauseKickerForeign')}
                        </p>
                        <p className="gap-clause" lang="id">
                          {gap.proposedClause}
                        </p>
                        <div className="state-actions">
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={!mayAct}
                            onClick={() => setReceipt(t('kb.clauseSent', { theme: gap.theme }))}
                          >
                            {t('kb.sendToOwner')}
                          </button>
                          <button type="button" className="btn btn-secondary" disabled={!mayAct}>
                            {t('kb.editClause')}
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="state-note">{t('kb.noClause')}</p>
                    )}
                  </div>
                ))}

                <p className="state-note">
                  <Rich
                    k="kb.clauseNote"
                    values={{ draft: <strong>{t('kb.clauseNoteEmphasis')}</strong> }}
                  />
                </p>
              </>
            ) : null}

            {receipt ? (
              <p className="state-note" role="status">
                {receipt}
              </p>
            ) : null}
          </DataPanel>

          <Blueprint className="upload-card">
            <span className="kicker">{t('kb.uploadKicker')}</span>
            <div className="dropzone">
              {t('kb.dropzone')}
              <span className="dropzone-note">
                {t('kb.dropzoneNote', {
                  chunkTokens: data?.stats.chunkTokens ?? 800,
                  overlapTokens: data?.stats.overlapTokens ?? 120,
                })}
              </span>
            </div>
            <label className="radio">
              <input type="checkbox" disabled={!mayAct} />
              <span className="dot" />
              {t('kb.restrictLabel')}
            </label>
            <p className="state-note">{t('kb.restrictNote')}</p>
          </Blueprint>

          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => onNavigate?.('/jawaban')}
          >
            {t('kb.seeExample')}
          </button>
        </div>
      </div>
    </>
  );
}
