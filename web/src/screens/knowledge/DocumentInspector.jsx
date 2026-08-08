import { useCallback } from 'react';

import { useSession } from '../../app/SessionContext.jsx';
import { useAsyncData } from '../../app/useAsyncData.js';
import { DataPanel, PANEL_STATUS } from '../../components/states/index.js';
import { useLocale } from '../../i18n/index.js';
import { DocumentFileButton } from './DocumentFileButton.jsx';
import { IndexStateTag } from './IndexStateTag.jsx';
import { useDocumentDownload } from './useDocumentDownload.js';

/**
 * Screen 11 · Isi dokumen.
 *
 * The table said a document had 14 chunks and stopped there. What those chunks
 * contain was visible nowhere in the console except inside a citation, so a
 * reader wanting to know what the agent had actually been given could only ask
 * it a question and hope (AC-10.8).
 *
 * What this shows is the indexed chunks, not the file that was handed over:
 * they are printed as stored, in store order, with the page and token count the
 * chunker recorded. A clause split across a boundary appears split. That is the
 * whole value — a corpus that looks complete in a table can still be unable to
 * answer, and this is where that becomes visible before a customer finds out.
 *
 * A restricted document is refused rather than emptied, and the refusal happens
 * in `knowledgeService` so the browser and the API decide it the same way.
 * `ROLE_FORBIDDEN` is one of the codes `useAsyncData` reads as needs-permission,
 * so this panel reaches that state through the same route every other panel
 * does (AC-10.9).
 */
export function DocumentInspector({ docId, title = null }) {
  const { knowledgeSource, role, tenant } = useSession();
  const { t, fmt, errorText } = useLocale();

  const tenantId = tenant?.tenantId ?? 'nusa-retail';

  const load = useCallback(
    async () => (docId ? knowledgeSource.document(tenantId, docId, { role }) : null),
    [knowledgeSource, tenantId, docId, role],
  );
  const { status, data, error, reload } = useAsyncData(load);
  // Its own instance, so the receipt for a download started here appears here.
  // Sharing one with the table would announce it two panels away from the
  // button that was pressed.
  const { download, busyDocId, status: downloadStatus } = useDocumentDownload();

  // No selection and "no such document" are the same to a reader: there is
  // nothing to read. The store already refuses another tenant's id by returning
  // nothing, and this is where that lands.
  const panelStatus = status === PANEL_STATUS.READY && !data ? PANEL_STATUS.EMPTY : status;

  return (
    <DataPanel
      status={panelStatus}
      className="doc-panel"
      kicker={
        data ? t('kb.docContentKicker', { title: data.title }) : t('kb.docContentKickerPlain')
      }
      meta={data ? t('kb.docContentChunks', { count: data.chunkCount }) : null}
      loading={{ message: t('kb.docContentLoading') }}
      empty={{
        title: t('kb.docContentEmptyTitle'),
        description: t('kb.docContentEmptyDescription'),
      }}
      error={{
        title: t('kb.docContentErrorTitle'),
        description: errorText(error, 'kb.docContentErrorFallback'),
        onRetry: reload,
      }}
      needsPermission={{
        title: t('kb.docRestrictedTitle'),
        // Named, because "you may not read this" and "you may not read *this
        // document*" are different amounts of information, and the reader who
        // has to go and ask an admin needs the second one.
        description: t('kb.docRestrictedDescription', { title: title ?? docId }),
      }}
    >
      {data ? (
        <>
          <p className="doc-meta">
            {t('kb.docContentMeta', {
              type: data.type,
              pages: data.pages ?? '—',
              updated: data.updatedAt,
            })}{' '}
            <IndexStateTag state={data.indexState} retrievable={data.retrievable} />
            {/* The document being read is the one most likely to be wanted as a
                file, and sending the reader back to the table to find its row
                again is the kind of small tax that makes a console tiring. */}
            <span className="doc-meta-action">
              <DocumentFileButton
                doc={data}
                busy={busyDocId === data.docId}
                onDownload={download}
              />
            </span>
          </p>

          {downloadStatus ? (
            <p
              className={`state-note${downloadStatus.tone === 'error' ? ' is-error' : ''}`}
              role={downloadStatus.tone === 'error' ? 'alert' : 'status'}
            >
              {downloadStatus.message}
            </p>
          ) : null}

          {/* Stored is not the same as quotable, and the difference is the
              reason this console can be trusted about its own corpus. */}
          {!data.retrievable ? (
            <p className="state-note">{t('kb.docContentNotRetrievable')}</p>
          ) : null}

          {data.chunks.length ? (
            <ol className="chunk-list">
              {data.chunks.map((chunk) => (
                <li key={chunk.chunkId} className="chunk-item">
                  <span className="kicker">
                    {t('kb.chunkMeta', {
                      page: chunk.page ?? '—',
                      tokens: fmt.integer(chunk.tokens),
                    })}
                  </span>
                  {/* The corpus is the tenant's own Indonesian prose whichever
                      language the console is in, so it is marked as such rather
                      than inheriting the page language. */}
                  <p className="chunk-text" lang="id">
                    {chunk.text}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="state-note">{t('kb.docContentNoChunks')}</p>
          )}
        </>
      ) : null}
    </DataPanel>
  );
}
