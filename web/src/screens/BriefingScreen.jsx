import { useCallback, useState } from 'react';

import { canWrite } from '../app/roles.js';
import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel } from '../components/states/index.js';

/**
 * Screen 02 · Briefing Pagi.
 *
 * The overnight timeline with the decisions inlined at the point they were
 * made, rather than listed separately. Reading top to bottom you see what the
 * agents did and where a decision fell out of it — the evidence arrives before
 * the ask (AC-1.2, AC-1.4).
 */
export function BriefingScreen({ onNavigate }) {
  const { briefingSource, role } = useSession();
  const [receipts, setReceipts] = useState({});

  const load = useCallback(() => briefingSource.briefing(), [briefingSource]);
  const { status, data, error, reload } = useAsyncData(load);

  const mayAct = canWrite(role);

  const approve = async (decision) => {
    try {
      const ticket = await briefingSource.approveDecision(decision, {
        approvedBy: 'manajer@nusaretail.co.id',
        role,
      });
      setReceipts((previous) => ({
        ...previous,
        [decision.id]: `Tiket ${ticket.id} dibuat · pemilik ${ticket.owner} · tenggat ${formatDate(ticket.dueAt)}.`,
      }));
    } catch (failure) {
      setReceipts((previous) => ({
        ...previous,
        [decision.id]: failure?.message ?? 'Tiket gagal dibuat.',
      }));
    }
  };

  const decisionsByNode = data
    ? groupDecisionsByNode(data.timeline, data.decisions)
    : new Map();

  return (
    <>
      <DataPanel
        status={status}
        kicker={data ? `Briefing pagi · ${formatFullDate(data.generatedAt)}` : 'Briefing pagi'}
        title="Semalam di jaringan Anda"
        meta={
          data ? (
            <span className="panel-meta">
              {data.windowStart} → {data.windowEnd} · {data.reviewsRead} review dibaca · Rp{' '}
              {data.costIdr.toLocaleString('id-ID')}
            </span>
          ) : null
        }
        loading={{ message: 'Agen sedang menyusun briefing semalam…' }}
        empty={{
          title: 'Belum ada briefing',
          description:
            'Siklus agen berikutnya berjalan malam ini pukul 23.00 dan briefing siap sebelum 06.00.',
          onAction: reload,
        }}
        error={{
          title: 'Briefing tak bisa dimuat',
          description: error?.message ?? 'Siklus semalam tidak menjawab.',
          onRetry: reload,
        }}
      >
        {data ? (
          <ol className="timeline">
            {data.timeline.map((node, index) => (
              <li
                key={`${node.time}-${index}`}
                className={`timeline-node${node.unavailable ? ' is-unavailable' : ''}`}
              >
                <span className="timeline-mark" aria-hidden="true" />
                <span className="timeline-time">{node.time}</span>
                <h3 className="timeline-title">{node.title}</h3>
                <p className="timeline-detail">{node.detail}</p>

                {/* Decisions sit at the point in the night they were reached. */}
                {(decisionsByNode.get(index) ?? []).map((decision) => (
                  <DecisionBlock
                    key={decision.id}
                    decision={decision}
                    canAct={mayAct}
                    receipt={receipts[decision.id]}
                    onApprove={approve}
                    onNavigate={onNavigate}
                  />
                ))}
              </li>
            ))}
          </ol>
        ) : null}
      </DataPanel>

      {data ? (
        <div className="metric-grid">
          {data.metrics.map((metric) => (
            <Blueprint key={metric.id} className="metric-card">
              <span className="kicker">{metric.kicker}</span>
              <span className="metric-value">{metric.value}</span>
              <span className="metric-note">{metric.note}</span>
            </Blueprint>
          ))}
        </div>
      ) : null}
    </>
  );
}

const AGENT_OF_DECISION = {
  'Agen Reputasi': 'reputation',
  'Agen Pengetahuan': 'knowledge',
  'Agen Lokasi': 'location',
};

/**
 * Attaches each decision to the last milestone belonging to the agent that
 * produced it, so the timeline reads as cause and then call. Every decision
 * lands exactly once; one that matches no milestone falls to the node before
 * the handover rather than vanishing.
 */
function groupDecisionsByNode(timeline, decisions) {
  const groups = new Map();
  const lastIndexOfAgent = new Map();

  timeline.forEach((node, index) => {
    if (node.agent) lastIndexOfAgent.set(node.agent, index);
  });

  const fallback = Math.max(0, timeline.findIndex((node) => node.handover) - 1);

  for (const decision of [...decisions].sort((a, b) => a.rank - b.rank)) {
    const index = lastIndexOfAgent.get(AGENT_OF_DECISION[decision.agent]) ?? fallback;
    groups.set(index, [...(groups.get(index) ?? []), decision]);
  }

  return groups;
}

function DecisionBlock({ decision, canAct, receipt, onApprove, onNavigate }) {
  return (
    <div className="decision">
      <span className="decision-mark" aria-hidden="true" />
      <div className="decision-head">
        <span className="tag tag-outline">Keputusan {decision.rank}</span>
        <span className="decision-meta">
          {decision.time} · {decision.agent}
        </span>
      </div>

      <h4 className="decision-title">{decision.title}</h4>
      <p className="decision-body">{decision.body}</p>

      <ul className="decision-evidence">
        {decision.evidence.map((item) => (
          <li key={item}>
            <span className="tag tag-neutral">{item}</span>
          </li>
        ))}
      </ul>

      <div className="state-actions">
        {decision.actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={`btn btn-${action.variant}`}
            disabled={action.id === 'approve' && !canAct}
            onClick={() =>
              action.id === 'approve' ? onApprove(decision) : onNavigate?.(reviewHref(decision))
            }
          >
            {action.label}
          </button>
        ))}
      </div>

      {receipt ? (
        <p className="state-note" role="status">
          {receipt}
        </p>
      ) : null}

      {!canAct ? (
        <p className="state-note">
          Peran Anda hanya bisa membaca. Persetujuan keputusan dilakukan oleh manajer atau admin.
        </p>
      ) : null}
    </div>
  );
}

function reviewHref(decision) {
  return decision.theme ? '/tema' : '/review';
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatFullDate(iso) {
  return new Date(iso).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
