import { useRef, useState } from 'react';

import { ACCEPT_ATTRIBUTE, UPLOAD_MAX_BYTES, classifyUpload } from '@lokus/core';

import { canWrite } from '../../app/roles.js';
import { useSession } from '../../app/SessionContext.jsx';
import { Blueprint } from '../../components/Blueprint.jsx';
import { useLocale } from '../../i18n/index.js';
import { fileText } from '../../lib/fileBytes.js';

/**
 * The upload card on screen 11, which now indexes for real.
 *
 * It was a `<div class="dropzone">` and a disabled checkbox — the shape of an
 * upload with nothing behind it. `knowledgeSource.ingest` had existed since the
 * knowledge service was written and had no caller.
 *
 * Three ways in, because a demo needs all of them: drop a PDF the tenant
 * actually owns, drop a `.txt` and watch it become searchable, or paste when a
 * judge dictates a clause from the floor.
 *
 * What separates them is not whether they are accepted but what happens next,
 * and the card says which before anything is submitted. A text file lands in
 * the textarea, so the reader sees what the agent is about to be given rather
 * than trusting that a file arrived intact. A PDF does not: it is stored whole
 * and marked as awaiting extraction, because `TextDecoder` over a PDF produces
 * mojibake that chunks cleanly and cites gibberish at a customer (AC-10.12).
 */
export function DocumentUpload({ stats, onIngested }) {
  const { knowledgeSource, role, tenant, canResetSeededData, resetSeededData, dataChanged } =
    useSession();
  const { t, errorText } = useLocale();

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  // The file itself, kept so the document can be handed back as the file it
  // arrived as rather than as a generated `.txt` (AC-10.11). Null for pasted
  // text, which has no file to be named after.
  const [file, setFile] = useState(null);
  // What that file is: readable and about to be indexed, or storable and about
  // to sit at zero chunks. The card says which before the reader commits.
  const [kind, setKind] = useState(null);
  const [restricted, setRestricted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [failure, setFailure] = useState(null);
  const fileRef = useRef(null);

  const mayAct = canWrite(role);
  const tenantId = tenant?.tenantId ?? 'nusa-retail';

  /**
   * The same rules the API applies, applied here so a 25 MB PDF is refused
   * before it is read into a tab rather than after a minute of upload
   * (`classifyUpload` throws the code the message is chosen by).
   */
  async function readFile(picked) {
    if (!picked) return;
    setFailure(null);

    let classified;
    try {
      classified = classifyUpload({ filename: picked.name, sizeBytes: picked.size });
    } catch (error) {
      setFailure(
        error?.code === 'FILE_TOO_LARGE'
          ? t('kb.uploadTooLarge', { limit: Math.round(UPLOAD_MAX_BYTES / (1024 * 1024)) })
          : t('kb.uploadUnsupported', { types: ACCEPT_ATTRIBUTE.replace(/,/g, ' ') }),
      );
      return;
    }

    setFile(picked);
    setKind(classified);
    // Only a text file is shown before it is indexed. Rendering a PDF's bytes
    // into the textarea would fill it with the mojibake this refuses to index.
    setText(classified.readable ? await fileText(picked) : '');
    // Only as a default: a file named `sop-antrean-v4.txt` is a worse document
    // title than whatever the reader would have typed, so it never overwrites.
    if (!title.trim()) {
      setTitle(picked.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
    }
  }

  function clearFile() {
    setFile(null);
    setKind(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function submit(event) {
    event.preventDefault();
    if (!mayAct || busy) return;

    setBusy(true);
    setFailure(null);
    setReceipt(null);

    try {
      // A file goes up as a file; only text with no file behind it goes up as
      // text. That is what keeps the download an original rather than a
      // reconstruction (AC-10.11).
      const result = file
        ? await knowledgeSource.uploadDocument(tenantId, {
            title: title.trim(),
            restricted,
            file,
          })
        : await knowledgeSource.ingest(tenantId, {
            title: title.trim(),
            text,
            type: 'TXT',
            restricted,
          });

      setReceipt(receiptFor(result));
      setTitle('');
      setText('');
      setRestricted(false);
      clearFile();

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

  /**
   * Three outcomes, three sentences. The store reports which one happened
   * rather than the console inferring it from a chunk count of zero — zero
   * chunks is also what a restricted text document has, and those are not the
   * same event (AC-10.12).
   */
  function receiptFor(result) {
    const name = title.trim();

    if (result.indexed === false) {
      return t('kb.uploadReceiptStored', { title: name, type: result.type });
    }
    if (restricted) {
      return t('kb.uploadReceiptRestricted', { title: name, chunks: result.chunks });
    }
    return t('kb.uploadReceipt', { title: name, chunks: result.chunks, pages: result.pages });
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
            accept={ACCEPT_ATTRIBUTE}
            disabled={!mayAct}
            onChange={(event) => readFile(event.target.files?.[0])}
          />
        </label>

        {/* What is about to happen to this file, before it happens. A reader
            who drops a PDF expecting it to be searchable should learn that
            here, not from a chunk count of 0 in the table afterwards. */}
        {file ? (
          <div className="picked-file">
            <span className="picked-file-name">{file.name}</span>
            <span className="state-note">
              {kind?.readable
                ? t('kb.pickedReadable', { type: kind.type })
                : t('kb.pickedStored', { type: kind?.type ?? '' })}
            </span>
            <button type="button" className="btn btn-ghost btn-file" onClick={clearFile}>
              {t('kb.pickedRemove')}
            </button>
          </div>
        ) : null}

        {/* Hidden for a file whose text nobody has read: an empty textarea
            beside a chosen PDF reads as "paste the text as well", and typing
            in it would produce a document that is half file and half prose. */}
        {file && !kind?.readable ? null : (
          <div className="field">
            <label htmlFor="kb-text">{t('kb.uploadTextLabel')}</label>
            <textarea
              id="kb-text"
              className="input"
              rows={6}
              value={text}
              disabled={!mayAct}
              placeholder={t('kb.uploadTextPlaceholder')}
              onChange={(event) => {
                setText(event.target.value);
                // Edited after a drop, the text is no longer that file's
                // contents. Keeping the file would make the download claim a
                // provenance it lost the moment this box was typed in.
                clearFile();
              }}
            />
          </div>
        )}

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
            // A chosen file is content in its own right; requiring text as well
            // would make a PDF unsubmittable.
            disabled={!mayAct || busy || !title.trim() || (!file && !text.trim())}
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
