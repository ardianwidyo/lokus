import { findOutlet } from '../domain/outlets.js';
import { themeLabel } from '../domain/themes.js';

/**
 * AC-7.3: every answer offers at least one action.
 *
 * Actions are derived from what the run actually found, not from a fixed menu:
 * "tunjukkan di peta" only appears when an outlet was identified, "lihat
 * review" only when reviews were among the sources. Offering an action that
 * leads nowhere is worse than offering none.
 *
 * A refused answer still gets one action — reporting the knowledge gap — so the
 * dead end is a route to fixing the corpus rather than a full stop.
 */
export function answerActions(run) {
  if (!run) return [];

  const outlet = run.outletId ? findOutlet(run.outletId) : null;
  const reviewSources = (run.sources ?? []).filter((source) => source.type === 'review');
  const actions = [];

  if (run.refused) {
    return [
      {
        id: 'report-gap',
        label: 'Laporkan celah pengetahuan',
        kind: 'gap',
        variant: 'primary',
      },
    ];
  }

  actions.push({
    id: 'create-ticket',
    label: outlet ? `Buat tiket ke manajer ${outlet.name}` : 'Buat tiket tindak lanjut',
    kind: 'ticket',
    variant: 'primary',
    payload: {
      title: ticketTitle(run, outlet),
      outletId: run.outletId ?? null,
      owner: outlet?.manager ?? null,
      sourceInsightId: run.id,
      sourceKind: 'agent_run',
      theme: leadingTheme(run),
    },
  });

  if (reviewSources.length > 0) {
    actions.push({
      id: 'open-reviews',
      label: `Lihat ${reviewSources.length} review`,
      kind: 'navigate',
      variant: 'secondary',
      href: '/review',
    });
  }

  if (outlet) {
    actions.push({
      id: 'show-on-map',
      label: 'Tunjukkan di peta',
      kind: 'navigate',
      variant: 'secondary',
      href: `/peta?outlet=${outlet.outletId}`,
    });
  }

  return actions;
}

function leadingTheme(run) {
  const finding = (run.findings ?? []).find((entry) => entry.agent === 'reputation');
  if (!finding) return null;

  const match = /adalah ([A-Za-z\s]+):/.exec(finding.text);
  return match ? match[1].trim() : null;
}

function ticketTitle(run, outlet) {
  const theme = leadingTheme(run);
  const where = outlet ? ` di ${outlet.name}` : '';

  return theme
    ? `Tindak lanjut keluhan ${themeLabel(theme).toLowerCase()}${where}`
    : `Tindak lanjut: ${truncate(run.question, 60)}`;
}

function truncate(text, max) {
  const value = String(text ?? '');
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
