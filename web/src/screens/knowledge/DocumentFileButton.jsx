import { useLocale } from '../../i18n/index.js';

/** Label per origin — "asli" and "teks" are not the same offer (AC-10.11). */
const ORIGIN_LABEL = {
  original: 'kb.downloadOriginal',
  'indexed-text': 'kb.downloadIndexed',
};

/**
 * The control that hands a document's file over, or says why it cannot.
 *
 * A document LOKUS holds nothing for gets a tag, not a disabled button. A
 * disabled control invites a reader to hunt for the permission or the state
 * that would enable it; there is none — the file was never there, and the tag
 * says exactly that in one word.
 */
export function DocumentFileButton({ doc, busy = false, onDownload }) {
  const { t } = useLocale();
  const file = doc?.file;

  if (!file?.available) {
    // Plain text, not a tag: a bordered tag in this column sits beside the
    // bordered index-state tag in the next one, and two boxes reading as one
    // control is exactly the confusion the row does not need.
    return (
      <span className="file-none" title={t('kb.downloadNotHeldHint')}>
        {t('kb.fileNotHeld')}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-ghost btn-file"
      disabled={busy}
      // Every row holds a button reading "Unduh teks"; the accessible name has
      // to name the document, or a screen reader gets six identical controls.
      aria-label={t('kb.downloadDocument', { title: doc.title })}
      onClick={() => onDownload?.(doc)}
    >
      {busy ? t('kb.downloadWorking') : t(ORIGIN_LABEL[file.origin] ?? 'kb.downloadGeneric')}
    </button>
  );
}
