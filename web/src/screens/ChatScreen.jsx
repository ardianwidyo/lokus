import { useRef, useState } from 'react';
import { Bot, Send } from 'lucide-react';

import { canWrite } from '../app/roles.js';
import { useSession } from '../app/SessionContext.jsx';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { useLocale, useT } from '../i18n/index.js';
import { TraceChips, TraceTable } from './chat/TraceChips.jsx';

/** The three prompts screen 10 offers below the composer. */
const SUGGESTION_KEYS = ['chat.suggestion1', 'chat.suggestion2', 'chat.suggestion3'];

/**
 * Screen 10 · Chat agen.
 *
 * One column, and the execution trace lives *inside* the answer rather than
 * behind a toggle. The trace is the evidence that the answer was assembled
 * from tool calls rather than generated; hiding it would undo the point.
 *
 * The answer, its sources, its cost and its guardrail verdict all come from one
 * persisted agent run (`GET /v1/runs/:id` serves the same object).
 */
export function ChatScreen({ onNavigate }) {
  const { agent, role } = useSession();
  const { t, fmt, errorText } = useLocale();
  const [turns, setTurns] = useState([]);
  const [pending, setPending] = useState(null);
  const [failure, setFailure] = useState(null);
  const [receipts, setReceipts] = useState({});
  const inputRef = useRef(null);

  // Creating a ticket writes data, so a viewer gets the answer without the
  // actions that change anything (AC-6.3).
  const mayAct = canWrite(role);

  const createTicket = async (run, payload) => {
    try {
      const ticket = await agent.createTicket(payload);
      setReceipts((previous) => ({
        ...previous,
        [run.id]: t('chat.ticketCreatedWithDue', {
          id: ticket.id,
          owner: ticket.owner ?? t('chat.ticketOwnerFallback'),
          due: fmt.shortDate(ticket.dueAt),
        }),
      }));
    } catch (error) {
      setReceipts((previous) => ({
        ...previous,
        [run.id]: errorText(error, 'common.ticketFailed'),
      }));
    }
  };

  const submit = async (question) => {
    const asked = question.trim();
    if (!asked || pending) return;

    setFailure(null);
    setPending(asked);

    try {
      const run = await agent.ask(asked);
      setTurns((previous) => [...previous, { question: asked, run }]);
    } catch (error) {
      setFailure(errorText(error, 'chat.failed'));
    } finally {
      setPending(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const latest = turns.at(-1)?.run ?? null;

  return (
    <>
      <Blueprint className="chat-panel">
        {turns.length === 0 && !pending ? (
          <p className="state-description chat-intro">{t('chat.intro')}</p>
        ) : null}

        <ol className="chat-thread">
          {turns.map((turn, index) => (
            <li key={index} className="chat-turn">
              <p className="chat-bubble-user">{turn.question}</p>

              <article className="chat-answer" aria-label={t('chat.answerLabel')}>
                <header className="chat-answer-head">
                  <span className="chat-answer-agents">
                    <Bot size={13} strokeWidth={1.5} aria-hidden="true" />
                    {t('chat.agents', { agents: turn.run.agents.join(' + ') })}
                  </span>
                  <span className="chat-answer-meta">
                    {t('chat.answerMeta', {
                      steps: turn.run.steps.length,
                      seconds: fmt.number(turn.run.latencyMs / 1000, 1),
                      cost: fmt.integer(turn.run.costIdr),
                    })}
                  </span>
                </header>

                <TraceChips steps={turn.run.steps} />

                {turn.run.answer.split('\n\n').map((paragraph, n) => (
                  <p key={n} className="chat-answer-text">
                    {paragraph}
                  </p>
                ))}

                {turn.run.sourceSummary.length > 0 ? (
                  <ul className="citation-chips">
                    {turn.run.sourceSummary.map((tag) => (
                      <li key={tag}>
                        <span className="tag tag-accent">{tag}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="state-note">{t('chat.noSources')}</p>
                )}

                <AnswerActions
                  run={turn.run}
                  actions={agent.actionsFor(turn.run)}
                  canAct={mayAct}
                  onNavigate={onNavigate}
                  onTicket={createTicket}
                />

                {receipts[turn.run.id] ? (
                  <p className="state-note" role="status">
                    {receipts[turn.run.id]}
                  </p>
                ) : null}
              </article>
            </li>
          ))}
        </ol>

        {pending ? (
          <p className="chat-working" role="status" aria-live="polite">
            <span className="chat-working-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            {t('chat.working', { question: pending })}
          </p>
        ) : null}

        {failure ? (
          <p className="state-note" role="alert">
            {failure}
          </p>
        ) : null}

        <form
          className="chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            submit(inputRef.current?.value ?? '');
          }}
        >
          <label className="sr-only" htmlFor="chat-input">
            {t('chat.inputLabel')}
          </label>
          <input
            id="chat-input"
            ref={inputRef}
            className="input"
            placeholder={t('chat.inputPlaceholder')}
            disabled={Boolean(pending)}
          />
          <button type="submit" className="btn btn-primary" disabled={Boolean(pending)}>
            <Send size={14} strokeWidth={1.5} aria-hidden="true" />
            {t('chat.send')}
          </button>
        </form>

        <ul className="chat-suggestions">
          {SUGGESTION_KEYS.map((key) => (
            <li key={key}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => submit(t(key))}
                disabled={Boolean(pending)}
              >
                {t(key)}
              </button>
            </li>
          ))}
        </ul>
      </Blueprint>

      <div className="chat-footer-grid">
        <DataPanel
          status={latest ? PANEL_STATUS.READY : PANEL_STATUS.EMPTY}
          kicker={t('chat.traceKicker')}
          meta={latest ? <span className="panel-meta">{t('chat.traceMeta', { id: latest.id })}</span> : null}
          empty={{
            title: t('chat.traceEmptyTitle'),
            description: t('chat.traceEmptyDescription'),
          }}
        >
          {latest ? (
            <>
              <TraceTable steps={latest.steps} />
              <button type="button" className="btn btn-ghost" onClick={() => onNavigate?.('/admin')}>
                {t('chat.openTrace')}
              </button>
            </>
          ) : null}
        </DataPanel>

        <DataPanel
          status={latest ? PANEL_STATUS.READY : PANEL_STATUS.EMPTY}
          kicker={t('chat.costKicker')}
          empty={{ title: t('chat.costEmptyTitle'), description: t('chat.costEmptyDescription') }}
        >
          {latest ? (
            <>
              <p className="cost-figure">
                Rp {fmt.integer(turns.reduce((sum, turn) => sum + turn.run.costIdr, 0))}
              </p>
              <p className="state-description">
                {t('chat.costNote', {
                  answers: turns.length,
                  steps: turns.reduce((sum, turn) => sum + turn.run.steps.length, 0),
                })}
              </p>
              <p className="state-note">{latest.guardrail.summary}</p>
            </>
          ) : null}
        </DataPanel>
      </div>
    </>
  );
}

/**
 * AC-7.3: at least one action on every answer, derived from what the run
 * actually found rather than from a fixed menu. A refused answer still offers
 * the knowledge-gap route, so a dead end leads somewhere.
 *
 * The labels come from the domain, already in the reader's language.
 */
function AnswerActions({ run, actions, canAct, onNavigate, onTicket }) {
  const t = useT();

  if (!actions.length) return null;

  return (
    <div className="state-actions" role="group" aria-label={t('chat.actionsLabel')}>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={`btn btn-${action.variant}`}
          disabled={action.kind !== 'navigate' && !canAct}
          onClick={() => {
            if (action.kind === 'navigate') return onNavigate?.(action.href);
            if (action.kind === 'ticket') return onTicket(run, action.payload);
            return onNavigate?.('/pengetahuan');
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

export { SUGGESTION_KEYS };
