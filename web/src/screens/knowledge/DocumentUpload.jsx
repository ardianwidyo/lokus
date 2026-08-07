import { useRef, useState } from 'react';

import { canWrite } from '../../app/roles.js';
import { useSession } from '../../app/SessionContext.jsx';
import { Blueprint } from '../../components/Blueprint.jsx';
import { useLocale } from '../../i18n/index.js';

/** What a browser can read without a server to extract it. */
const READABLE = /\.(txt|md|markdown)$/i;

/**
 * The upload card on screen 11, which now indexes for real.
 *
 * It was a `<div class="dropzone">` and a disabled checkbox — the shape of an
 * upload with nothing behind it. `knowledgeSource.ingest` had existed since the
 * knowledge service was written and had no caller.
 *
 * Two ways in, because a demo needs both: drop a file when there is one to
 * hand, paste when a judge dictates a clause from the floor. Either way the
 * text lands in the same textarea before anything is indexed, so the reader
 * sees what the agent is about to be given rather than trusting that a file
 * arrived intact.
 *
 * Only plain text. A PDF needs a server-side extractor (`kb.ingest` gets one
 * from Cloud Storage in production), and offering a format that silently
 * produces a document of mojibake would be worse than refusing it.
 */
export function DocumentUpload({ stats, onIngested }) {
  const { knowledgeSource, role, tenant, canResetSeededData, resetSeededData, dataChanged } =
    useSession();
  const { t, errorText } = useLocale();

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [restricted, setRestricted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [failure, setFailure] = useState(null);
  const fileRef = useRef(null);

  const mayAct = canWrite(role);
  const tenantId = tenant?.tenantId ?? 'nusa-retail';

  async function readFile(file) {
    if (!file) return;
    setFailure(null);

    if (!READABLE.test(file.name)) {
      setFailure(t('kb.uploadUnsupported'));
      return;
    }

    const contents = await file.text();
    setText(contents);
    // Only as a default: a file named `sop-antrean-v4.txt` is a worse document
    // title than whatever the reader would have typed, so it never overwrites.
    if (!title.trim()) setTitle(file.name.replace(READABLE, '').replace(/[-_]+/g, ' '));
  }

  async function submit(event) {
    event.preventDefault();
    if (!mayAct || busy) return;

    setBusy(true);
    setFailure(null);
    setReceipt(null);

    try {
      const result = await knowledgeSource.ingest(tenantId, {
        title: title.trim(),
        text,
        type: 'TXT',
        restricted,
      });

      setReceipt(
        restricted
          ? t('kb.uploadReceiptRestricted', { title: title.trim(), chunks: result.chunks })
          : t('kb.uploadReceipt', {
              title: title.trim(),
              chunks: result.chunks,
              pages: result.pages,
            }),
      );
      setTitle('');
      setText('');
      setRestricted(false);
      if (fileRef.current) fileRef.current.value = '';

      // The table on this screen, and every screen that retrieves from the
      // corpus. Without the second call the document is indexed and the chat
      // agent goes on answering from the corpus as it was (AC-10.2).
      onIngested?.();
      dataChanged?.();
    } catch (error) {
      setFailure(errorText(error, 'kb.uploadFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Blueprint className="upload-card">
      <span className="kicker">{t('kb.uploadKicker')}</span>

      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="kb-title">{t('kb.uploadTitleLabel')}</label>
          <input
            id="kb-title"
            className="input"
            value={title}
            disabled={!mayAct}
            placeholder={t('kb.uploadTitlePlaceholder')}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        {/* A label, so the whole zone is the file picker's hit area and the
            keyboard reaches it through the input rather than through a
            div with a click handler bolted on. */}
        <label
          className={`dropzone${dragging ? ' dropzone-active' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            readFile(event.dataTransfer.files?.[0]);
          }}
        >
          {dragging ? t('kb.uploadDropActive') : t('kb.dropzone')}
          <span className="dropzone-note">
            {t('kb.dropzoneNote', {
              chunkTokens: stats?.chunkTokens ?? 800,
              overlapTokens: stats?.overlapTokens ?? 120,
            })}
          </span>
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            accept=".txt,.md,.markdown,text/plain,text/markdown"
            disabled={!mayAct}
            onChange={(event) => readFile(event.target.files?.[0])}
          />
        </label>

        <div className="field">
          <label htmlFor="kb-text">{t('kb.uploadTextLabel')}</label>
          <textarea
            id="kb-text"
            className="input"
            rows={6}
            value={text}
            disabled={!mayAct}
            placeholder={t('kb.uploadTextPlaceholder')}
            onChange={(event) => setText(event.target.value)}
          />
        </div>

        <label className="radio">
          <input
            type="checkbox"
            checked={restricted}
            disabled={!mayAct}
            onChange={(event) => setRestricted(event.target.checked)}
          />
          <span className="dot" />
          {t('kb.restrictLabel')}
        </label>
        <p className="state-note">{t('kb.restrictNote')}</p>

        <div className="state-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!mayAct || busy || !title.trim() || !text.trim()}
          >
            {busy ? t('kb.uploadWorking') : t('kb.uploadSubmit')}
          </button>
          {canResetSeededData ? (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => {
                setReceipt(t('kb.resetDone'));
                setFailure(null);
                resetSeededData();
              }}
            >
              {t('kb.reset')}
            </button>
          ) : null}
        </div>
      </form>

      {receipt ? (
        <p className="state-note" role="status">
          {receipt}
        </p>
      ) : null}
      {failure ? (
        <p className="state-note" role="alert">
          {failure}
        </p>
      ) : null}
      {!mayAct ? <p className="state-note">{t('kb.uploadReadOnly')}</p> : null}
    </Blueprint>
  );
}
