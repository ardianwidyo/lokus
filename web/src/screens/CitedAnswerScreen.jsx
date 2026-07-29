import { useCallback, useRef, useState } from 'react';
import { FileText, Send } from 'lucide-react';

import { useSession } from '../app/SessionContext.jsx';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';

/** The question screen 12 opens on, from design/SCREENS.md. */
const DEFAULT_QUESTION =
  'Pelanggan minta refund barang promo yang sudah dibuka. Boleh atau tidak, dan apa syaratnya?';

const ASKED_BY = { name: 'Dwi Kurnia', outlet: 'Bekasi Timur', channel: 'via WhatsApp' };

/**
 * Screen 12 · Jawaban bersitasi.
 *
 * A staff question answered with the SOP page cited — and, when the corpus
 * cannot answer, refused out loud with the gap recorded. Both outcomes are
 * reachable from the same box, which is what makes the refusal credible: it is
 * the same code path, not a demo mode.
 */
export function CitedAnswerScreen({ onNavigate }) {
  const { knowledgeSource, tenant } = useSession();
  const [answer, setAnswer] = useState(null);
  const [status, setStatus] = useState(PANEL_STATUS.LOADING);
  const [failure, setFailure] = useState(null);
  const inputRef = useRef(null);

  const ask = useCallback(
    async (question) => {
      const asked = String(question ?? '').trim();
      if (!asked) return;

      setStatus(PANEL_STATUS.LOADING);
      setFailure(null);

      try {
        const result = await knowledgeSource.ask(tenant?.tenantId ?? 'nusa-retail', asked, {
          askedBy: ASKED_BY.name,
        });
        setAnswer(result);
        setStatus(PANEL_STATUS.READY);
      } catch (error) {
        setFailure(error?.message ?? 'Layanan pengetahuan tidak menjawab.');
        setStatus(PANEL_STATUS.ERROR);
      }
    },
    [knowledgeSource, tenant?.tenantId],
  );

  // The default question runs once, so the screen opens on a worked example.
  const started = useRef(false);
  if (!started.current) {
    started.current = true;
    ask(DEFAULT_QUESTION);
  }

  return (
    <div className="answer-grid">
      <div className="answer-main">
        <Blueprint className="question-card">
          <span className="kicker">
            {ASKED_BY.name} · {ASKED_BY.outlet} · {ASKED_BY.channel}
          </span>
          <p className="question-text">{answer?.question ?? DEFAULT_QUESTION}</p>
        </Blueprint>

        <DataPanel
          status={status}
          kicker={answer?.answered ? 'Jawaban Agen Pengetahuan' : 'Agen Pengetahuan'}
          meta={
            answer?.answered ? (
              <span className="panel-meta">
                {answer.citations.length} sumber · {answer.confidenceLabel}
              </span>
            ) : null
          }
          loading={{ message: 'Agen sedang mencari pasal yang relevan…' }}
          empty={{ title: 'Belum ada pertanyaan' }}
          error={{
            title: 'Jawaban tak bisa dimuat',
            description: failure,
            onRetry: () => ask(answer?.question ?? DEFAULT_QUESTION),
          }}
        >
          {answer?.answered ? (
            <>
              {answer.paragraphs.map((paragraph, index) => (
                <p key={index} className="answer-text">
                  {renderMarkers(paragraph)}
                </p>
              ))}

              <div className="state-actions">
                <button type="button" className="btn btn-primary">
                  Kirim ke WhatsApp {ASKED_BY.name.split(' ')[0]}
                </button>
                <button type="button" className="btn btn-secondary">
                  Simpan sebagai FAQ
                </button>
                <button type="button" className="btn btn-ghost">
                  Jawaban ini salah
                </button>
              </div>
            </>
          ) : null}

          {answer && !answer.answered ? (
            <>
              <p className="draft-refusal">{answer.text}</p>
              <p className="state-description">{answer.reason}</p>
              <p className="state-note">
                Pertanyaan ini sudah dicatat sebagai celah pengetahuan. Tidak ada jawaban yang
                dikarang.
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onNavigate?.('/pengetahuan')}
              >
                Lihat celah pengetahuan →
              </button>
            </>
          ) : null}
        </DataPanel>

        <form
          className="chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            ask(inputRef.current?.value);
            if (inputRef.current) inputRef.current.value = '';
          }}
        >
          <label className="sr-only" htmlFor="kb-question">
            Pertanyaan staf cabang
          </label>
          <input
            id="kb-question"
            ref={inputRef}
            className="input"
            placeholder="Tanya apa saja yang ada di SOP…"
          />
          <button type="submit" className="btn btn-primary">
            <Send size={14} strokeWidth={1.5} aria-hidden="true" />
            Tanya
          </button>
        </form>

        <p className="state-note answer-foot">
          Agen menolak menjawab bila skor kemiripan sumber di bawah{' '}
          {answer?.threshold?.toFixed(2) ?? '0,70'} — dalam kasus itu ia mengatakan “tidak ada di
          dokumen” dan mencatat pertanyaannya sebagai celah pengetahuan. Tidak ada jawaban yang
          dikarang.
        </p>
      </div>

      <DataPanel
        status={status}
        kicker="Sumber"
        loading={{ message: 'Mengambil kutipan…' }}
        empty={{ title: 'Belum ada sumber' }}
        error={{ title: 'Sumber tak bisa dimuat' }}
      >
        {answer?.answered ? (
          <>
            <ul className="source-list">
              {answer.citations.map((citation) => (
                <li key={citation.marker}>
                  <Blueprint className="source-card">
                    <p className="source-title">
                      <FileText size={12} strokeWidth={1.5} aria-hidden="true" />
                      <span className="source-marker">{citation.marker}</span> {citation.title} · hal.{' '}
                      {citation.page}
                    </p>
                    <p className="source-score">skor {citation.score.toFixed(2)}</p>
                    <p className="source-quote">“{citation.quote}”</p>
                    <button type="button" className="btn btn-ghost">
                      Buka halaman {citation.page} →
                    </button>
                  </Blueprint>
                </li>
              ))}
            </ul>

            {/* AC-4.3: what was considered and left out is part of the answer. */}
            <p className="state-note">
              Potongan yang dipertimbangkan tapi tidak dipakai: <strong>{answer.rejectedCount}</strong>{' '}
              · semuanya di bawah ambang {answer.threshold.toFixed(2)}.
            </p>
          </>
        ) : null}

        {answer && !answer.answered ? (
          <p className="state-description">
            Tidak ada kutipan yang lolos ambang, jadi tidak ada sumber untuk ditampilkan.{' '}
            {answer.rejectedCount} potongan dipertimbangkan dan semuanya ditolak.
          </p>
        ) : null}
      </DataPanel>
    </div>
  );
}

/** Turns the trailing [1] / [2] into accent superscript markers. */
function renderMarkers(paragraph) {
  return paragraph.split(/(\[\d\])/).map((part, index) =>
    /^\[\d\]$/.test(part) ? (
      <sup key={index} className="answer-marker">
        {part}
      </sup>
    ) : (
      part
    ),
  );
}
