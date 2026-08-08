import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ROLES } from '../src/auth/roles.js';
import { createServices } from '../src/services/index.js';
import { buildServer } from '../src/server.js';
import { TEST_AUTH_CONFIG, TEST_PROJECT_ID, createTestIssuer } from './helpers/tokens.js';

const TENANT = 'nusa-retail';
const OTHER = 'dealer-arta-motor';

const CONFIG = {
  environment: 'test',
  region: 'asia-southeast2',
  projectId: TEST_PROJECT_ID,
  auth: TEST_AUTH_CONFIG,
};

const REPORT = {
  generatedAt: '2026-07-29T00:00:00.000Z',
  cases: 60,
  gates: [{ key: 'theme_accuracy', label: 'Ketepatan tema keluhan', value: 1, threshold: '>= 0.85', passed: true }],
};

describe('domain routes over HTTP (T058)', () => {
  let issuer;
  let fastify;

  beforeEach(async () => {
    issuer = await createTestIssuer();
    fastify = buildServer({
      config: CONFIG,
      verifyIdToken: issuer.verify,
      services: createServices({ evaluationReport: REPORT }),
      logger: false,
    });
    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
  });

  const token = (roles) => issuer.sign({ roles });
  const asManager = () => token({ [TENANT]: ROLES.MANAGER });
  const asViewer = () => token({ [TENANT]: ROLES.VIEWER });
  const asAdmin = () => token({ [TENANT]: ROLES.ADMIN });

  const call = (method, url, jwt, { tenantId = TENANT, payload = undefined } = {}) =>
    fastify.inject({
      method,
      url,
      headers: {
        ...(jwt ? { authorization: `Bearer ${jwt}` } : {}),
        ...(tenantId ? { 'x-lokus-tenant': tenantId } : {}),
      },
      ...(payload ? { payload } : {}),
    });

  describe('reviews', () => {
    it('lists the inbox with counts computed from the data', async () => {
      const response = await call('GET', '/v1/reviews', await asViewer());
      const body = response.json();

      expect(response.statusCode).toBe(200);
      expect(body.rows.length).toBeGreaterThan(0);
      expect(body.counts['perlu-tindakan']).toBeGreaterThan(0);
    });

    describe('the demo composer (AC-10.4)', () => {
      const DEMO = { outletId: 'BKS-02', rating: 1, author: 'Ardian', text: 'Kasir satu, antre 25 menit.' };

      it('adds a review and marks where it came from, never as one Google returned', async () => {
        // AC-10.6: a console that presented typed text as a Google review would
        // be lying about the one thing the product rests on.
        const response = await call('POST', '/v1/reviews/demo', await asManager(), { payload: DEMO });

        expect(response.statusCode).toBe(200);
        expect(response.json().review.source).toBe('demo');
      });

      it('lets the clusterer read what was typed, and the drafter answer it', async () => {
        // The claim a seeded dataset cannot make on its own: every seeded row
        // was written to be grouped the way it groups.
        const added = (await call('POST', '/v1/reviews/demo', await asManager(), { payload: DEMO })).json();
        const url = `/v1/reviews/${added.review.id}`;
        const detail = (await call('GET', url, await asManager())).json();

        expect(detail.draft.theme).toBe('antrean-kasir');
        expect(detail.draft.text.length).toBeGreaterThan(20);
      });

      it('refuses a viewer, because adding a row is a write', async () => {
        const response = await call('POST', '/v1/reviews/demo', await asViewer(), { payload: DEMO });
        expect(response.statusCode).toBe(403);
      });

      it('answers the same for another tenant branch as for one that does not exist', async () => {
        // One refusal for both, so the route cannot be used to enumerate
        // branches (AC-6.1).
        const foreign = await call('POST', '/v1/reviews/demo', await asManager(), {
          payload: { ...DEMO, outletId: 'SBY-01' },
        });
        const missing = await call('POST', '/v1/reviews/demo', await asManager(), {
          payload: { ...DEMO, outletId: 'tidak-ada' },
        });

        expect(foreign.json().error.code).toBe(missing.json().error.code);
      });

      it('refuses a review with no text, which cannot be analysed', async () => {
        const response = await call('POST', '/v1/reviews/demo', await asManager(), {
          payload: { ...DEMO, text: '   ' },
        });
        expect(response.statusCode).toBeGreaterThanOrEqual(400);
      });
    });

    it('rejects an unknown bucket rather than silently returning everything', async () => {
      const response = await call('GET', '/v1/reviews?bucket=semua', await asViewer());

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('BUCKET_INVALID');
    });

    it('returns a review with its draft, citations and guardrail verdict', async () => {
      const response = await call('GET', '/v1/reviews/rev-BKS-02-featured-1', await asViewer());
      const { draft, guardrail } = response.json();

      expect(draft.drafted).toBe(true);
      expect(draft.citations.length).toBeGreaterThan(0);
      expect(guardrail.passedCount).toBe(4);
    });

    it('gives the same 404 for another tenant\'s review as for a missing one', async () => {
      const jwt = await token({ [OTHER]: ROLES.ADMIN });

      const foreign = await call('GET', '/v1/reviews/rev-BKS-02-featured-1', jwt, { tenantId: OTHER });
      const missing = await call('GET', '/v1/reviews/rev-tidak-ada', jwt, { tenantId: OTHER });

      expect(foreign.statusCode).toBe(404);
      expect(foreign.json()).toEqual(missing.json());
    });

    it('lets a manager send a reply and records the caller as approver', async () => {
      const response = await call('POST', '/v1/reviews/rev-BKS-02-featured-1/reply', await asManager());
      const body = response.json();

      expect(response.statusCode).toBe(200);
      expect(body.state).toBe('sent');
      // The approver is the authenticated caller, never a name from the body.
      expect(body.approvedBy).toBe('dwi@nusaretail.co.id');
    });

    it('refuses a viewer sending a reply (AC-6.3)', async () => {
      const response = await call('POST', '/v1/reviews/rev-BKS-02-featured-1/reply', await asViewer());

      expect(response.statusCode).toBe(403);
      expect(response.json().error.code).toBe('ROLE_FORBIDDEN');
    });

    it('serves the theme matrix', async () => {
      const response = await call('GET', '/v1/themes', await asViewer());
      const body = response.json();

      expect(body.themes[0].theme).toBe('antrean-kasir');
      expect(body.finding.regionCount).toBeGreaterThanOrEqual(4);
    });
  });

  describe('briefing and tickets', () => {
    it('serves the briefing with at most three decisions', async () => {
      const response = await call('GET', '/v1/briefing', await asViewer());
      const body = response.json();

      expect(body.decisions.length).toBeGreaterThan(0);
      expect(body.decisions.length).toBeLessThanOrEqual(3);
      expect(body.metrics).toHaveLength(4);
    });

    it('turns an approved decision into a ticket (AC-1.3)', async () => {
      const briefing = (await call('GET', '/v1/briefing', await asManager())).json();
      const decision = briefing.decisions[0];

      const response = await call(
        'POST',
        `/v1/briefing/decisions/${decision.id}/approve`,
        await asManager(),
      );
      const { ticket } = response.json();

      expect(ticket.id).toMatch(/^T-\d+$/);
      expect(ticket.owner).toBeTruthy();
      expect(ticket.sourceInsightId).toBe(decision.id);
    });

    it('returns 422 with the domain code on a second approval, not a 500', async () => {
      const briefing = (await call('GET', '/v1/briefing', await asManager())).json();
      const id = briefing.decisions[0].id;

      await call('POST', `/v1/briefing/decisions/${id}/approve`, await asManager());
      const second = await call('POST', `/v1/briefing/decisions/${id}/approve`, await asManager());

      // A refused approval is the caller's situation, not an outage.
      expect(second.statusCode).toBe(422);
      expect(second.json().error.code).toBe('ALREADY_APPROVED');
    });

    it('refuses a viewer approving a decision', async () => {
      const briefing = (await call('GET', '/v1/briefing', await asViewer())).json();

      const response = await call(
        'POST',
        `/v1/briefing/decisions/${briefing.decisions[0].id}/approve`,
        await asViewer(),
      );

      expect(response.statusCode).toBe(403);
    });

    it('serves the four-column board with close-time stats', async () => {
      const response = await call('GET', '/v1/tickets', await asViewer());
      const { board, stats } = response.json();

      expect(board.map((column) => column.status)).toEqual([
        'baru',
        'dikerjakan',
        'menunggu',
        'selesai',
      ]);
      expect(stats.slaDays).toBe(5);
    });

    it('refuses a ticket with no link back to an insight', async () => {
      const response = await call('POST', '/v1/tickets', await asManager(), {
        payload: { title: 'Tanpa asal' },
      });

      expect(response.statusCode).toBe(422);
      expect(response.json().error.code).toBe('SOURCE_REQUIRED');
    });

    it('shows a ticket raised for one tenant nowhere in another', async () => {
      await call('POST', '/v1/tickets', await asManager(), {
        payload: { title: 'Milik Nusa', sourceInsightId: 'run-x' },
      });

      const other = await call('GET', '/v1/tickets', await token({ [OTHER]: ROLES.ADMIN }), {
        tenantId: OTHER,
      });
      const total = other.json().board.reduce((sum, c) => sum + c.tickets.length, 0);

      expect(total).toBe(0);
    });
  });

  describe('agent', () => {
    it('answers with a trace, sources and a cost', async () => {
      const response = await call('POST', '/v1/agent/ask', await asViewer(), {
        payload: { question: 'Kenapa rating cabang Bekasi Timur turun bulan ini?' },
      });
      const { run, actions } = response.json();

      expect(run.steps[0].tool).toBe('supervisor.route');
      expect(run.costIdr).toBeGreaterThan(0);
      expect(run.sources.length).toBeGreaterThan(0);
      expect(actions.length).toBeGreaterThan(0);
    });

    it('refuses rather than inventing when nothing can be sourced', async () => {
      const response = await call('POST', '/v1/agent/ask', await asViewer(), {
        payload: { question: 'Bagaimana resep rendang padang?' },
      });
      const { run } = response.json();

      expect(run.refused).toBe(true);
      expect(run.sources).toEqual([]);
    });

    it('requires a question', async () => {
      const response = await call('POST', '/v1/agent/ask', await asViewer(), { payload: { question: '  ' } });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('QUESTION_REQUIRED');
    });

    it('persists the run so its trace is fetchable afterwards (AC-7.2)', async () => {
      const asked = await call('POST', '/v1/agent/ask', await asViewer(), {
        payload: { question: 'Ringkas keluhan pekan ini' },
      });
      const { run } = asked.json();

      const fetched = await call('GET', `/v1/runs/${run.id}`, await asViewer());

      expect(fetched.statusCode).toBe(200);
      expect(fetched.json().run.steps).toHaveLength(run.steps.length);
    });
  });

  describe('admin', () => {
    it('serves the overview to an admin', async () => {
      const response = await call('GET', '/v1/admin/overview', await asAdmin());
      const body = response.json();

      expect(body.budget.usedPercent).toBe(34);
      expect(body.evaluation.cases).toBe(60);
      expect(body.guardrails).toHaveLength(4);
    });

    it('refuses a manager, not only a viewer (AC-6.2)', async () => {
      // Per-tenant cost is not a branch manager's business.
      expect((await call('GET', '/v1/admin/overview', await asManager())).statusCode).toBe(403);
      expect((await call('GET', '/v1/admin/overview', await asViewer())).statusCode).toBe(403);
    });

    it('splits the cost breakdown so the rows add up to the headline', async () => {
      const { budget } = (await call('GET', '/v1/admin/overview', await asAdmin())).json();
      const sum = budget.breakdown.reduce((total, row) => total + row.idr, 0);

      expect(sum).toBe(budget.spentIdr);
    });
  });

  describe('outlets (T034)', () => {
    it('lists the branches with the weakest score first', async () => {
      const response = await call('GET', '/v1/outlets', await asViewer());
      const { outlets } = response.json();

      expect(response.statusCode).toBe(200);
      expect(outlets[0].outletId).toBe('DPK-01');
    });

    it('serves one branch joined across the agents', async () => {
      const body = (await call('GET', '/v1/outlets/BKS-02', await asViewer())).json();

      expect(body.outlet.name).toBe('Bekasi Timur');
      expect(body.rating.mean).toBe(3.8);
      expect(body.location.score).toBe(71);
      expect(body.themes[0].theme).toBe('antrean-kasir');
      expect(body.nearby.total).toBe(5);
    });

    it('404s an unknown branch', async () => {
      const response = await call('GET', '/v1/outlets/TIDAK-ADA', await asViewer());

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('OUTLET_NOT_FOUND');
    });

    it('gives another tenant the same 404, not a 403 that confirms it exists', async () => {
      // dealer-arta-motor has no BKS-02; a different status would say so.
      const response = await call('GET', '/v1/outlets/BKS-02', await token({ [OTHER]: ROLES.MANAGER }), {
        tenantId: OTHER,
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('OUTLET_NOT_FOUND');
    });
  });

  describe('knowledge documents (T069)', () => {
    const ingestRestricted = (jwt) =>
      call('POST', '/v1/knowledge/documents', jwt, {
        payload: {
          title: 'Perjanjian Waralaba 2026',
          text: 'Pasal satu mengatur bagi hasil waralaba. '.repeat(30),
          restricted: true,
        },
      });

    it('serves one document with the chunks indexed from it (AC-10.8)', async () => {
      const response = await call('GET', '/v1/knowledge/documents/sop-layanan-v4', await asViewer());
      const body = response.json();

      expect(response.statusCode).toBe(200);
      expect(body.title).toBe('SOP Layanan Pelanggan v4');
      expect(body.chunks.length).toBe(body.chunkCount);
      expect(body.chunks[0]).toMatchObject({ page: expect.any(Number), text: expect.any(String) });
    });

    it('refuses a restricted document by the role on the token (AC-10.9)', async () => {
      const manager = await asManager();
      await ingestRestricted(manager);

      const response = await call('GET', '/v1/knowledge/documents/perjanjian-waralaba-2026', manager);

      expect(response.json().error.code).toBe('ROLE_FORBIDDEN');
      expect(response.statusCode).toBe(422);
    });

    it('serves a restricted document to an admin', async () => {
      await ingestRestricted(await asManager());

      const response = await call(
        'GET',
        '/v1/knowledge/documents/perjanjian-waralaba-2026',
        await asAdmin(),
      );

      expect(response.statusCode).toBe(200);
      expect(response.json().chunks.length).toBeGreaterThan(0);
    });

    it('gives another tenant the same 404 as a missing document', async () => {
      const jwt = await token({ [OTHER]: ROLES.ADMIN });

      const foreign = await call('GET', '/v1/knowledge/documents/sop-layanan-v4', jwt, {
        tenantId: OTHER,
      });
      const missing = await call('GET', '/v1/knowledge/documents/tidak-ada', jwt, { tenantId: OTHER });

      expect(foreign.statusCode).toBe(404);
      expect(foreign.json()).toEqual(missing.json());
    });

    it('accepts the added-reviews bucket and reports its count (AC-10.10)', async () => {
      const response = await call('GET', '/v1/reviews?bucket=ditambahkan', await asViewer());
      const body = response.json();

      expect(response.statusCode).toBe(200);
      // Nothing can be added over HTTP, so zero is the honest answer rather
      // than a bucket the API pretends not to know.
      expect(body.counts.ditambahkan).toBe(0);
      expect(body.rows).toEqual([]);
    });
  });

  describe('every domain route is behind auth and a tenant', () => {
    it.each([
      ['GET', '/v1/reviews'],
      ['GET', '/v1/reviews/rev-BKS-02-featured-1'],
      ['POST', '/v1/reviews/rev-BKS-02-featured-1/reply'],
      ['GET', '/v1/themes'],
      ['GET', '/v1/briefing'],
      ['GET', '/v1/tickets'],
      ['POST', '/v1/tickets'],
      ['POST', '/v1/agent/ask'],
      ['GET', '/v1/admin/overview'],
      ['GET', '/v1/outlets'],
      ['GET', '/v1/outlets/BKS-02'],
      ['GET', '/v1/knowledge/documents/sop-layanan-v4'],
    ])('%s %s rejects an anonymous caller', async (method, url) => {
      expect((await call(method, url, null)).statusCode).toBe(401);
    });

    it.each([
      ['GET', '/v1/reviews'],
      ['GET', '/v1/themes'],
      ['GET', '/v1/briefing'],
      ['GET', '/v1/tickets'],
      ['POST', '/v1/agent/ask'],
      ['GET', '/v1/outlets'],
      ['GET', '/v1/outlets/BKS-02'],
    ])('%s %s rejects a request naming no tenant', async (method, url) => {
      const response = await call(method, url, await asViewer(), { tenantId: null });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('TENANT_REQUIRED');
    });

    it.each([
      ['GET', '/v1/reviews'],
      ['GET', '/v1/themes'],
      ['GET', '/v1/briefing'],
    ])('%s %s refuses a tenant the token does not grant (AC-6.1)', async (method, url) => {
      const response = await call(method, url, await asViewer(), { tenantId: OTHER });

      expect(response.statusCode).toBe(403);
      expect(response.json().error.code).toBe('TENANT_FORBIDDEN');
    });
  });
});
