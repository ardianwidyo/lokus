import { useCallback, useState } from 'react';

import { useSession } from '../../app/SessionContext.jsx';
import { useLocale } from '../../i18n/index.js';
import { saveBlob } from '../../lib/download.js';

/** What the server said it just handed over (`FILE_ORIGIN` in core). */
const ORIGIN_MESSAGE = {
  original: 'kb.downloadDoneOriginal',
  'indexed-text': 'kb.downloadDoneIndexed',
};

/** Why a download can fail, in the words that fit each reason. */
const FAILURE_MESSAGE = {
  ROLE_FORBIDDEN: 'kb.downloadRestricted',
  FILE_NOT_HELD: 'kb.downloadNotHeld',
  TENANT_FORBIDDEN: 'kb.downloadRestricted',
};

/**
 * Downloading one document, for the table row and the inspector alike
 * (AC-10.11).
 *
 * Shared as a hook rather than as a component because the two callers need the
 * same behaviour in different layouts: a row needs a button in a cell and a
 * receipt line under the table, the inspector needs a button in its head and a
 * line in its body. What must not differ is what the receipt says — the reader
 * has to be told which of the three things they were given, and a component
 * that only knew how to render a button would leave that to whoever called it.
 *
 * The receipt is not decoration. A file named `sop-layanan-v4-teks-terindeks.txt`
 * that landed silently would be assumed to be the SOP.
 */
export function useDocumentDownload() {
  const { knowledgeSource, role, tenant } = useSession();
  const { t, errorText } = useLocale();

  const [busyDocId, setBusyDocId] = useState(null);
  const [status, setStatus] = useState(null);

  const tenantId = tenant?.tenantId ?? 'nusa-retail';

  const download = useCallback(
    async (doc) => {
      if (!doc?.docId || busyDocId) return;

      setBusyDocId(doc.docId);
      setStatus(null);

      try {
        const file = await knowledgeSource.documentFile(tenantId, doc.docId, { role });
        // `null` is "no such document for this tenant" — the same single answer
        // the chunk route gives, so a download cannot enumerate ids (AC-6.1).
        if (!file) {
          setStatus({ tone: 'error', message: t('kb.downloadMissing', { title: doc.title }) });
          return;
        }

        saveBlob(file);

        // The origin comes from the source, never from the filename: only the
        // service knows whether those bytes were the original.
        const key = ORIGIN_MESSAGE[file.origin] ?? 'kb.downloadDoneUnknown';
        setStatus({ tone: 'note', message: t(key, { filename: file.filename }) });
      } catch (error) {
        const key = FAILURE_MESSAGE[error?.code];
        setStatus({
          tone: 'error',
          message: key
            ? t(key, { title: doc.title })
            : errorText(error, 'kb.downloadFailed'),
        });
      } finally {
        setBusyDocId(null);
      }
    },
    [busyDocId, knowledgeSource, role, t, errorText, tenantId],
  );

  return { download, busyDocId, status };
}
