import { describe, expect, it } from 'vitest';

import { createSeededGbpAdapter } from '../src/adapters/gbp.js';
import { createSeededPlacesAdapter } from '../src/adapters/places.js';
import { answerActions } from '../src/agents/answerActions.js';
import {
  createKnowledgeAgent,
  createLocationAgent,
  createReputationAgent,
} from '../src/agents/specialists.js';
import { createSupervisor } from '../src/agents/supervisor.js';
import { runNightlyCycle } from '../src/briefing/nightlyCycle.js';
import { ragCite } from '../src/knowledge/cite.js';
import { compareSites } from '../src/location/compareSites.js';
import { scoutSites } from '../src/location/siteScout.js';
import { createMemoryWarehouse } from '../src/pipeline/warehouse.js';
import { draftReply } from '../src/reputation/draftReply.js';
import { guardrailCheck } from '../src/reputation/guardrails.js';
import { seedTickets } from '../src/seed/tickets.js';
import { createMemoryTicketStore } from '../src/tickets/ticketStore.js';

/**
 * T062 asserts a boundary, not a mechanism: agent-authored copy follows the
 * locale, tenant content does not. These tests are written against the boundary,
 * because that is the part a future change is likely to get wrong.
 */

const TENANT = 'nusa-retail';

function supervisorWith() {
  return createSupervisor({
    agents: {
      reputation: createReputationAgent({ gbp: createSeededGbpAdapter() }),
      knowledge: createKnowledgeAgent(),
      location: createLocationAgent({ places: createSeededPlacesAdapter() }),
    },
  });
}

describe('T062 · agent-authored copy follows the locale', () => {
  it('narrates the overnight cycle in the requested language', async () => {
    const options = {
      tenantId: TENANT,
      gbp: createSeededGbpAdapter(),
      places: createSeededPlacesAdapter(),
    };

    const [indonesian, english] = await Promise.all([
      runNightlyCycle({ ...options, warehouse: createMemoryWarehouse(), locale: 'id' }),
      runNightlyCycle({ ...options, warehouse: createMemoryWarehouse(), locale: 'en' }),
    ]);

    expect(indonesian.timeline[0].title).toMatch(/Agen Reputasi membaca \d+ review baru/);
    expect(english.timeline[0].title).toMatch(/The Reputation Agent read \d+ new reviews/);

    expect(indonesian.timeline.at(-1).title).toBe('Briefing diserahkan');
    expect(english.timeline.at(-1).title).toBe('Briefing handed over');

    // The counts are the same work described twice, not two different cycles.
    expect(english.reviewsRead).toBe(indonesian.reviewsRead);
    expect(english.decisions).toHaveLength(indonesian.decisions.length);
  });

  it('writes a briefing decision, its evidence and its actions in the language', async () => {
    const english = await runNightlyCycle({
      tenantId: TENANT,
      gbp: createSeededGbpAdapter(),
      places: createSeededPlacesAdapter(),
      warehouse: createMemoryWarehouse(),
      locale: 'en',
    });

    const decision = english.decisions[0];
    expect(decision.agent).toBe('Reputation Agent');
    expect(decision.actions.map((a) => a.label)).toContain('Approve & raise a ticket');
    expect(decision.evidence.join(' ')).toMatch(/complaints/);
    expect(decision.evidence.join(' ')).not.toMatch(/keluhan/);
  });

  it('explains a guardrail result in the language', () => {
    const clean = guardrailCheck({ draftText: 'Terima kasih atas masukannya.', locale: 'en' });
    expect(clean.data.summary).toBe('Guardrails passed 4/4');
    expect(clean.data.checks[1].detail).toBe('No customer personal data in the reply.');

    const dirty = guardrailCheck({
      draftText: 'Hubungi kami di 081234567890 dan kami beri voucher.',
      locale: 'en',
    });
    expect(dirty.data.checks[1].detail).toBe('The reply contains a phone number.');
  });

  it('scores and compares candidate sites in the language', async () => {
    const places = createSeededPlacesAdapter();

    const scouted = await scoutSites({ tenantId: TENANT, places, locale: 'en' });
    expect(scouted.data.recommended[0].labels.cannibalisation).toBe('Cannibalisation');
    expect(scouted.data.request).toMatch(/Find candidate sites/);

    const compared = await compareSites({ tenantId: TENANT, places, locale: 'en' });
    expect(compared.data.rows[0].label).toBe('Location score');
    expect(compared.data.rows[0].origin).toBe('measured');
    expect(compared.data.a.conclusion).not.toMatch(/Pilih ini/);
  });

  it('labels seeded ticket work and the board columns in the language', async () => {
    const store = createMemoryTicketStore({ seed: seedTickets({ tenantId: TENANT, locale: 'en' }) });
    const board = await store.board(TENANT, { locale: 'en' });

    expect(board.map((column) => column.label)).toEqual([
      'New',
      'In progress',
      'Waiting',
      'Done',
    ]);
    expect(board[0].tickets[0].title).toMatch(/Audit the drinks shelf restock schedule/);

    // The stored status ids stay Indonesian whatever the reader's language, so a
    // ticket written by yesterday's build still reads as done today.
    expect(board.map((column) => column.status)).toEqual([
      'baru',
      'dikerjakan',
      'menunggu',
      'selesai',
    ]);
  });

  it('names the actions on an agent answer in the language', async () => {
    const supervisor = supervisorWith();
    const run = await supervisor.ask({
      tenantId: TENANT,
      question: 'Kenapa rating cabang Bekasi Timur turun bulan ini?',
      locale: 'en',
    });

    const labels = answerActions(run).map((action) => action.label);
    expect(labels.some((label) => label.startsWith('Raise a ticket'))).toBe(true);
    expect(labels).toContain('Show on the map');
  });

  it('reads the locale off the run, so a caller need not repeat it', async () => {
    const run = await supervisorWith().ask({
      tenantId: TENANT,
      question: 'Kenapa rating cabang Bekasi Timur turun bulan ini?',
      locale: 'en',
    });

    expect(run.locale).toBe('en');
    expect(answerActions(run)).toEqual(answerActions(run, 'en'));
  });

  it('recovers the leading theme from the finding’s id, not from its prose', async () => {
    // The regex this replaces read the Indonesian sentence, so in English it
    // returned an English label as a theme id and the ticket carried a theme
    // nothing else could match.
    const run = await supervisorWith().ask({
      tenantId: TENANT,
      question: 'Kenapa rating cabang Bekasi Timur turun bulan ini?',
      locale: 'en',
    });

    const ticket = answerActions(run).find((action) => action.id === 'create-ticket');
    expect(ticket.payload.theme).toBe(
      run.findings.find((finding) => finding.agent === 'reputation').themeId,
    );
    // A theme id, matchable against the keyword table — never a display label.
    expect(ticket.payload.theme).toMatch(/^[a-z-]+$/);
  });
});

describe('T062 · tenant content does not follow the locale (AC-8.5)', () => {
  it('drafts the public reply in Indonesian for an English reader', async () => {
    const { data } = await createSeededGbpAdapter().listReviews({ tenantId: TENANT, limit: 5000 });
    const review = data.reviews.find((row) => row.rating <= 2 && row.text.includes('antre'));

    const english = await draftReply({ tenantId: TENANT, review, locale: 'en' });

    // The customer reads this under their own Google review.
    expect(english.data.text).toMatch(/Terima kasih/);
    expect(english.data.text).toMatch(/SOP/);
    // What the reviewer reads *about* the draft is English.
    expect(english.data.tone).toBe('warm, accountable');
  });

  it('quotes an SOP passage identically in both locales, explaining it in each', async () => {
    const question = 'Apa kata SOP soal refund barang promo?';

    const [indonesian, english] = await Promise.all([
      ragCite({ tenantId: TENANT, question, locale: 'id' }),
      ragCite({ tenantId: TENANT, question, locale: 'en' }),
    ]);

    expect(english.data.answered).toBe(true);
    expect(indonesian.data.answered).toBe(true);

    // The quotation is the document's own wording and must be byte-identical:
    // a "translated" citation is no longer a citation of anything.
    expect(english.data.citations.map((c) => c.quote)).toEqual(
      indonesian.data.citations.map((c) => c.quote),
    );
    expect(english.data.citations.map((c) => c.page)).toEqual(
      indonesian.data.citations.map((c) => c.page),
    );

    // What the console says *about* the answer does follow the locale.
    expect(indonesian.data.confidenceLabel).toMatch(/keyakinan/);
    expect(english.data.confidenceLabel).toMatch(/confidence/);
  });

  it('refuses in the reader’s language while keeping the sentinel Indonesian', async () => {
    const answer = await ragCite({
      tenantId: TENANT,
      question: 'zzzz qqqq xxxx tidak ada kata ini di dokumen mana pun',
      locale: 'en',
    });

    expect(answer.data.answered).toBe(false);
    expect(answer.data.text).toBe('Not in the documents.');
    expect(answer.data.reason).toMatch(/No passage reached the confidence threshold of 0\.70/);
  });
});
