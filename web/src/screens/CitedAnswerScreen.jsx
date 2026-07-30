import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Send } from 'lucide-react';

import { useSession } from '../app/SessionContext.jsx';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { Rich, useLocale } from '../i18n/index.js';

/** Who is asking, from design/SCREENS.md screen 12. A person, not copy. */
const ASKED_BY = { name: 'Dwi Kurnia', outlet: 'Bekasi Timur' };

/**
 * Screen 12 · Jawaban bersitasi.
 *
 * A staff question answered with the SOP page cited — and, when the corpus
 * cannot answer, refused out loud with the gap recorded. Both outcomes are
 * reachable from the same box, which is what makes the refusal credible: it is
 * the same code path, not a demo mode.
 *
 * The question the screen opens on is the reader's language, because it is the
 * console's worked example. The passage it quotes back is not: that is the
 * document's own wording (AC-8.5).
 */
export function CitedAnswerScreen({ onNavigate }) {
  const { knowledgeSource, tenant } = useSession();
  const { t, fmt, errorText } = useLocale();
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
        setFailure(errorText(error, 'answer.errorFallback'));
        setStatus(PANEL_STATUS.ERROR);
      }
    },
    [knowledgeSource, tenant?.tenantId, errorText],
  );

  const defaultQuestion = t('answer.defaultQuestion');

  // The default question runs once, so the screen opens on a worked example.
  // In an effect rather than during render: asking during render made the
  // request a side effect of painting, which StrictMode double-invokes.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    ask(defaultQuestion);
  }, [ask, defaultQuestion]);

  return (
    <div className="answer-grid">
      <div className="answer-main">
        <Blueprint className="question-card">
          <span className="kicker">
            {t('answer.questionMeta', {
              name: ASKED_BY.name,
              outlet: ASKED_BY.outlet,
              channel: t('answer.askedByChannel'),
            })}
          </span>
          <p className="question-text">{answer?.question ?? defaultQuestion}</p>
        </Blueprint>

        <DataPanel
          status={status}
          kicker={answer?.answered ? t('answer.kickerAnswered') : t('answer.kicker')}
          meta={
            answer?.answered ? (
              <span className="panel-meta">
                {t('answer.meta', {
                  sources: answer.citations.length,
                  confidence: answer.confidenceLabel,
                  // Constitution III: who wrote these words is part of the
                  // trace. A generated answer passed a grounding check; a quoted
                  // one never needed to, and the difference is the reader's to
                  // know.
                  origin: answer.generated
                    ? t('answer.originGenerated', {
                        model: answer.generationStep?.model ?? 'Gemini',
                      })
                    : t('answer.originQuoted'),
                })}
              </span>
            ) : null
          }
          loading={{ message: t('answer.loading') }}
          empty={{ title: t('answer.emptyTitle') }}
          error={{
            title: t('answer.errorTitle'),
            description: failure,
            onRetry: () => ask(answer?.question ?? defaultQuestion),
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
                  {t('answer.sendWhatsApp', { name: ASKED_BY.name.split(' ')[0] })}
                </button>
                <button type="button" className="btn btn-secondary">
                  {t('answer.saveFaq')}
                </button>
                <button type="button" className="btn btn-ghost">
                  {t('answer.wrongAnswer')}
                </button>
              </div>
            </>
          ) : null}

          {answer && !answer.answered ? (
            <>
              <p className="draft-refusal">{answer.text}</p>
              <p className="state-description">{answer.reason}</p>
              <p className="state-note">{t('answer.refusedNote')}</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onNavigate?.('/pengetahuan')}
              >
                {t('answer.seeGaps')}
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
            {t('answer.inputLabel')}
          </label>
          <input
            id="kb-question"
            ref={inputRef}
            className="input"
            placeholder={t('answer.inputPlaceholder')}
          />
          <button type="submit" className="btn btn-primary">
            <Send size={14} strokeWidth={1.5} aria-hidden="true" />
            {t('answer.ask')}
          </button>
        </form>

        <p className="state-note answer-foot">
          {t('answer.foot', { threshold: fmt.number(answer?.threshold ?? 0.7) })}
        </p>
      </div>

      <DataPanel
        status={status}
        kicker={t('answer.sourcesKicker')}
        loading={{ message: t('answer.sourcesLoading') }}
        empty={{ title: t('answer.sourcesEmpty') }}
        error={{ title: t('answer.sourcesError') }}
      >
        {answer?.answered ? (
          <>
            <ul className="source-list">
              {answer.citations.map((citation) => (
                <li key={citation.marker}>
                  <Blueprint className="source-card">
                    <p className="source-title">
                      <FileText size={12} strokeWidth={1.5} aria-hidden="true" />
                      <span className="source-marker">{citation.marker}</span> {citation.title} ·{' '}
                      {t('common.page', { page: citation.page })}
                    </p>
                    <p className="source-score">
                      {t('common.score', { score: fmt.number(citation.score) })}
                    </p>
                    {/* The document's own wording, in the document's language. */}
                    <p className="source-quote" lang="id">
                      “{citation.quote}”
                    </p>
                    <button type="button" className="btn btn-ghost">
                      {t('answer.openPage', { page: citation.page })}
                    </button>
                  </Blueprint>
                </li>
              ))}
            </ul>

            {/* AC-4.3: what was considered and left out is part of the answer. */}
            <p className="state-note">
              <Rich
                k="answer.rejectedNote"
                values={{
                  count: <strong>{answer.rejectedCount}</strong>,
                  threshold: fmt.number(answer.threshold),
                }}
              />
            </p>
          </>
        ) : null}

        {answer && !answer.answered ? (
          <p className="state-description">
            {t('answer.noSources', { count: answer.rejectedCount })}
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
