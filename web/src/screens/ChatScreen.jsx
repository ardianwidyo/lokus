import { useRef, useState } from 'react';
import { Bot, Send } from 'lucide-react';

import { canWrite } from '../app/roles.js';
import { useSession } from '../app/SessionContext.jsx';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { SUGGESTED_QUESTIONS } from '../data/agentSource.js';
import { TraceChips, TraceTable } from './chat/TraceChips.jsx';

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
        [run.id]: `Tiket ${ticket.id} dibuat untuk ${ticket.owner ?? 'tim ops'} · tenggat ${formatDate(ticket.dueAt)}.`,
      }));
    } catch (error) {
      setReceipts((previous) => ({
        ...previous,
        [run.id]: error?.message ?? 'Tiket gagal dibuat.',
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
      setFailure(error?.message ?? 'Agen tidak menjawab.');
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
          <p className="state-description chat-intro">
            Tanya apa saja tentang cabang, review, atau SOP. Setiap jawaban membawa jejak
            eksekusinya, sumbernya, dan biayanya.
          </p>
        ) : null}

        <ol className="chat-thread">
          {turns.map((turn, index) => (
            <li key={index} className="chat-turn">
              <p className="chat-bubble-user">{turn.question}</p>

              <article className="chat-answer" aria-label="Jawaban agen">
                <header className="chat-answer-head">
                  <span className="chat-answer-agents">
                    <Bot size={13} strokeWidth={1.5} aria-hidden="true" />
                    Supervisor → {turn.run.agents.join(' + ')}
                  </span>
                  <span className="chat-answer-meta">
                    {turn.run.steps.length} langkah · {(turn.run.latencyMs / 1000).toFixed(1)} s ·
                    Rp {turn.run.costIdr}
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
                  <p className="state-note">
                    Tidak ada sumber yang menopang jawaban ini, jadi agen menolak menjawab.
                  </p>
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
            Agen sedang bekerja untuk “{pending}”…
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
            Pertanyaan untuk agen
          </label>
          <input
            id="chat-input"
            ref={inputRef}
            className="input"
            placeholder="Tanya apa saja tentang cabang, review, lokasi, atau SOP…"
            disabled={Boolean(pending)}
          />
          <button type="submit" className="btn btn-primary" disabled={Boolean(pending)}>
            <Send size={14} strokeWidth={1.5} aria-hidden="true" />
            Kirim
          </button>
        </form>

        <ul className="chat-suggestions">
          {SUGGESTED_QUESTIONS.map((question) => (
            <li key={question}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => submit(question)}
                disabled={Boolean(pending)}
              >
                {question}
              </button>
            </li>
          ))}
        </ul>
      </Blueprint>

      <div className="chat-footer-grid">
        <DataPanel
          status={latest ? PANEL_STATUS.READY : PANEL_STATUS.EMPTY}
          kicker="Jejak eksekusi lengkap"
          meta={latest ? <span className="panel-meta">run {latest.id}</span> : null}
          empty={{
            title: 'Belum ada jejak',
            description: 'Ajukan satu pertanyaan; setiap langkah agen akan tercatat di sini.',
          }}
        >
          {latest ? (
            <>
              <TraceTable steps={latest.steps} />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => onNavigate?.('/admin')}
              >
                Buka trace lengkap di Cloud Trace →
              </button>
            </>
          ) : null}
        </DataPanel>

        <DataPanel
          status={latest ? PANEL_STATUS.READY : PANEL_STATUS.EMPTY}
          kicker="Biaya percakapan ini"
          empty={{ title: 'Belum ada biaya', description: 'Biaya dihitung per jawaban.' }}
        >
          {latest ? (
            <>
              <p className="cost-figure">
                Rp {turns.reduce((sum, turn) => sum + turn.run.costIdr, 0)}
              </p>
              <p className="state-description">
                {turns.length} jawaban · {turns.reduce((sum, t) => sum + t.run.steps.length, 0)}{' '}
                langkah tool. Batas keras anggaran tenant diatur di halaman Admin.
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
 */
function AnswerActions({ run, actions, canAct, onNavigate, onTicket }) {
  if (!actions.length) return null;

  return (
    <div className="state-actions" role="group" aria-label="Tindakan untuk jawaban ini">
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

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}
