import { useT } from '../../i18n/index.js';

/**
 * The inline execution trace — the thing that makes an agent answer auditable
 * at a glance instead of only in a panel somebody has to go find.
 *
 * design/UI-GUIDELINES.md, "Chip jejak eksekusi": monospace 11px, hairline
 * border, `01 supervisor.route`. The guardrail step is drawn in accent so the
 * eye lands on the check that gates the answer.
 *
 * Tool names are not translated in either language: `bq.themeCluster` is the
 * name of a call, and a reader checking the trace against the code needs the
 * same string in both places. `step.note` arrives already translated from the
 * agent that recorded it.
 */
export function TraceChips({ steps }) {
  const t = useT();

  if (!steps?.length) return null;

  return (
    <ol className="trace-chips" aria-label={t('chat.traceLabel')}>
      {steps.map((step) => (
        <li key={step.n}>
          <span className={`trace-chip${step.tool.startsWith('guardrail') ? ' is-guardrail' : ''}`}>
            {String(step.n).padStart(2, '0')} {step.tool}
            {step.resultSize > 0 ? ` · ${step.resultSize}` : ''}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The numbered panel below the conversation: tool, note, latency. */
export function TraceTable({ steps }) {
  const t = useT();

  if (!steps?.length) return null;

  return (
    <ol className="trace-rows">
      {steps.map((step) => (
        <li key={step.n}>
          <span className="trace-no">{String(step.n).padStart(2, '0')}</span>
          <span className="trace-body">
            <span className="trace-tool">{step.tool}</span>
            <span className="trace-note">
              {step.note ?? t('chat.traceResults', { count: step.resultSize })} · {step.ms} ms
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
