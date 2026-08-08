import { useCallback, useState } from 'react';

import { themeLabel } from '@lokus/core';

import { canWrite } from '../app/roles.js';
import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { Rich, useLocale } from '../i18n/index.js';
import { DocumentFileButton } from './knowledge/DocumentFileButton.jsx';
import { DocumentInspector } from './knowledge/DocumentInspector.jsx';
import { DocumentUpload } from './knowledge/DocumentUpload.jsx';
import { IndexStateTag } from './knowledge/IndexStateTag.jsx';
import { useDocumentDownload } from './knowledge/useDocumentDownload.js';

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
  // The row a reader opened, and the title as the table already knows it — the
  // content panel needs a name for its refusal before it has a document to
  // read one off (AC-10.9).
  const [openedDoc, setOpenedDoc] = useState(null);

  const load = useCallback(
    () => knowledgeSource.overview(tenant?.tenantId ?? 'nusa-retail'),
    [knowledgeSource, tenant?.tenantId],
  );
  const { status, data, error, reload } = useAsyncData(load);
  // Downloading is a read, so it is not gated on `mayAct`: a viewer who can see
  // a document's chunks can have its file, and a restricted document refuses
  // both by the one rule in the knowledge service (AC-10.9, AC-10.11).
  const { download, busyDocId, status: downloadStatus } = useDocumentDownload();

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
        <div className="kb-main">
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
                      <th scope="col">{t('kb.colFile')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.documents.map((doc) => (
                      <tr key={doc.docId}>
                        {/* The title is the tenant's own document name, and it
                            is the control that opens the document: a row that
                            reports a chunk count should be the way to read the
                            chunks (AC-10.8). A real button, so the keyboard and
                            a screen reader get the same affordance the mouse
                            does. */}
                        <th scope="row">
                          <button
                            type="button"
                            className="doc-open"
                            aria-pressed={openedDoc?.docId === doc.docId}
                            onClick={() => setOpenedDoc({ docId: doc.docId, title: doc.title })}
                          >
                            {doc.title}
                          </button>
                          {/* The same mark an added review carries. A document
                              typed into the demo must never sit here looking
                              like the tenant's own SOP (AC-10.6). */}
                          {doc.addedInSession ? (
                            <span className="tag tag-outline">{t('kb.demoTag')}</span>
                          ) : null}
                        </th>
                        <td>{doc.type}</td>
                        <td>{doc.pages ?? '—'}</td>
                        <td>{doc.chunkCount}</td>
                        <td>
                          <IndexStateTag state={doc.indexState} retrievable={doc.retrievable} />
                        </td>
                        <td>{doc.updatedAt}</td>
                        <td>
                          <DocumentFileButton
                            doc={doc}
                            busy={busyDocId === doc.docId}
                            onDownload={download}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            <p className="state-note">
              <Rich k="kb.docsNote" values={{ indexed: <strong>{t('kb.indexIndexed')}</strong> }} />
            </p>
            <p className="state-note">{t('kb.fileNote')}</p>

            {/* Named for what came down, because the filename alone cannot say
                whether it is the SOP or a transcription of the part of it that
                was indexed (AC-10.11). `role="status"` so the reader who
                triggered it hears the answer without going to look. */}
            {downloadStatus ? (
              <p
                className={`state-note${downloadStatus.tone === 'error' ? ' is-error' : ''}`}
                role={downloadStatus.tone === 'error' ? 'alert' : 'status'}
              >
                {downloadStatus.message}
              </p>
            ) : null}
          </DataPanel>

          {/* Below the table rather than beside it: the chunks are prose, and
              prose in a 330px column would be a stack of two-word lines. */}
          <DocumentInspector docId={openedDoc?.docId ?? null} title={openedDoc?.title ?? null} />
        </div>

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

          {/* `reload` rather than a local insert: the document row carries a
              chunk count and a retrievability verdict the store computed, and
              re-reading is how this screen keeps showing what was indexed
              rather than what was submitted. */}
          <DocumentUpload stats={data?.stats} onIngested={reload} />

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
