/**
 * The inline execution trace — the thing that makes an agent answer auditable
 * at a glance instead of only in a panel somebody has to go find.
 *
 * design/UI-GUIDELINES.md, "Chip jejak eksekusi": monospace 11px, hairline
 * border, `01 supervisor.route`. The guardrail step is drawn in accent so the
 * eye lands on the check that gates the answer.
 */
export function TraceChips({ steps }) {
  if (!steps?.length) return null;

  return (
    <ol className="trace-chips" aria-label="Jejak eksekusi">
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
  if (!steps?.length) return null;

  return (
    <ol className="trace-rows">
      {steps.map((step) => (
        <li key={step.n}>
          <span className="trace-no">{String(step.n).padStart(2, '0')}</span>
          <span className="trace-body">
            <span className="trace-tool">{step.tool}</span>
            <span className="trace-note">
              {step.note ?? `${step.resultSize} hasil`} · {step.ms} ms
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
