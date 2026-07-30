import { findOutlet } from '../domain/outlets.js';
import { themeLabel } from '../domain/themes.js';
import { DEFAULT_LOCALE } from '../i18n/locales.js';
import { t } from '../i18n/index.js';

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
export function answerActions(run, locale = run?.locale ?? DEFAULT_LOCALE) {
  if (!run) return [];

  const outlet = run.outletId ? findOutlet(run.outletId) : null;
  const reviewSources = (run.sources ?? []).filter((source) => source.type === 'review');
  const actions = [];

  if (run.refused) {
    return [
      {
        id: 'report-gap',
        label: t(locale, 'action.reportGap'),
        kind: 'gap',
        variant: 'primary',
      },
    ];
  }

  actions.push({
    id: 'create-ticket',
    label: outlet
      ? t(locale, 'action.createTicketAt', { outlet: outlet.name })
      : t(locale, 'action.createTicket'),
    kind: 'ticket',
    variant: 'primary',
    payload: {
      title: ticketTitle(run, outlet, locale),
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
      label: t(locale, 'action.openReviews', { count: reviewSources.length }),
      kind: 'navigate',
      variant: 'secondary',
      href: '/review',
    });
  }

  if (outlet) {
    actions.push({
      id: 'show-on-map',
      label: t(locale, 'action.showOnMap'),
      kind: 'navigate',
      variant: 'secondary',
      href: `/peta?outlet=${outlet.outletId}`,
    });
  }

  return actions;
}

/**
 * The theme the reputation agent led with.
 *
 * This used to recover it by running `/adalah ([A-Za-z\s]+):/` over the agent's
 * own sentence, which worked only while there was exactly one language for that
 * sentence to be written in — and would have returned the *English* label as a
 * theme id, so the ticket carried a theme nothing else could match. The finding
 * now states the id, and prose is left to readers.
 */
function leadingTheme(run) {
  return (run.findings ?? []).find((entry) => entry.agent === 'reputation')?.themeId ?? null;
}

function ticketTitle(run, outlet, locale) {
  const theme = leadingTheme(run);
  const where = outlet ? t(locale, 'action.ticketWhere', { outlet: outlet.name }) : '';

  return theme
    ? t(locale, 'action.ticketTitleTheme', { theme: themeLabel(theme, locale).toLowerCase(), where })
    : t(locale, 'action.ticketTitleQuestion', { question: truncate(run.question, 60) });
}

function truncate(text, max) {
  const value = String(text ?? '');
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
