import { describe, expect, it } from 'vitest';

import { KnowledgeGapLog } from '../src/knowledge/cite.js';
import {
  CLAUSE_PROPOSAL_THRESHOLD,
  classifyGap,
  gapReport,
} from '../src/knowledge/gapReport.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';

const TENANT = 'nusa-retail';

const logWith = (questions) => {
  const log = new KnowledgeGapLog();
  for (const entry of questions) {
    const { q, by = null, times = 1 } = typeof entry === 'string' ? { q: entry } : entry;
    for (let i = 0; i < times; i += 1) log.record({ tenantId: TENANT, question: q, askedBy: by });
  }
  return log;
};

describe('classifying a gap', () => {
  it('uses the same theme vocabulary the review clusterer uses', () => {
    // A gap about queues and a review about queues must land in one bucket,
    // or the two vocabularies drift apart.
    expect(classifyGap('Berapa batas waktu antrean kasir?')).toBe('antrean-kasir');
    expect(classifyGap('Siapa yang bertanggung jawab atas kebersihan lantai?')).toBe('kebersihan');
    expect(classifyGap('Bagaimana kalau stok habis?')).toBe('stok-kosong');
  });

  it('returns nothing for a question that matches no theme', () => {
    expect(classifyGap('Berapa gaji karyawan baru?')).toBeNull();
  });
});

describe('kb.gapReport (T023)', () => {
  it('clusters questions by theme rather than listing them one by one', async () => {
    const log = logWith([
      'Berapa batas waktu antrean?',
      'Kapan kasir tambahan dibuka saat antrean panjang?',
      'Siapa yang bersihkan tumpahan di lantai?',
    ]);

    const { data } = await gapReport({ tenantId: TENANT, gapLog: log });
    const themes = data.gaps.map((gap) => gap.theme);

    expect(themes).toContain('antrean-kasir');
    expect(themes).toContain('kebersihan');
    expect(data.gaps.find((g) => g.theme === 'antrean-kasir').questionCount).toBe(2);
  });

  it('ranks the cluster staff hit most often first', async () => {
    const log = logWith([
      { q: 'Batas waktu antrean?', times: 5 },
      { q: 'Siapa bersihkan lantai kotor?', times: 1 },
    ]);

    const { data } = await gapReport({ tenantId: TENANT, gapLog: log });

    expect(data.gaps[0].theme).toBe('antrean-kasir');
    expect(data.gaps[0].occurrences).toBe(5);
  });

  it('proposes a clause only where the evidence repeats', async () => {
    // A clause written for a one-off question is noise in the SOP.
    const log = logWith([
      { q: 'Batas waktu antrean?', times: CLAUSE_PROPOSAL_THRESHOLD },
      { q: 'Bagaimana kalau lantai kotor?', times: 1 },
    ]);

    const { data } = await gapReport({ tenantId: TENANT, gapLog: log });

    expect(data.gaps.find((g) => g.theme === 'antrean-kasir').proposedClause).toEqual(
      expect.any(String),
    );
    expect(data.gaps.find((g) => g.theme === 'kebersihan').proposedClause).toBeNull();
  });

  it('proposes a measurable clause, not a restatement of the question', async () => {
    const log = logWith([{ q: 'Berapa batas waktu antrean?', times: 3 }]);

    const { data } = await gapReport({ tenantId: TENANT, gapLog: log });

    expect(data.gaps[0].proposedClause).toMatch(/10 menit/);
    expect(data.gaps[0].proposedClause).toMatch(/hari yang sama/);
  });

  it('marks every clause as a draft for a human', async () => {
    const log = logWith([{ q: 'Batas antrean?', times: 3 }]);

    const { data } = await gapReport({ tenantId: TENANT, gapLog: log });

    expect(data.clausesAreDrafts).toBe(true);
    expect(data.gaps[0].isDraft).toBe(true);
  });

  it('names who kept hitting the gap, so the report points at a person', async () => {
    const log = logWith([
      { q: 'Batas antrean?', by: 'Dwi Kurnia' },
      { q: 'Batas antrean?', by: 'Sari Wulandari' },
    ]);

    const { data } = await gapReport({ tenantId: TENANT, gapLog: log });

    expect(data.gaps[0].askedBy).toEqual(['Dwi Kurnia', 'Sari Wulandari']);
  });

  it('buckets an off-topic question rather than dropping it', async () => {
    const log = logWith(['Berapa gaji karyawan baru?']);

    const { data } = await gapReport({ tenantId: TENANT, gapLog: log });

    expect(data.gaps[0].theme).toBe('lain');
  });

  it('cites nothing, because absence has no passage to point at', async () => {
    const result = await gapReport({ tenantId: TENANT, gapLog: logWith(['apa saja']) });

    expect(result.sources).toEqual([]);
  });

  it('reports an empty state rather than failing with no gaps', async () => {
    const { data } = await gapReport({ tenantId: TENANT, gapLog: new KnowledgeGapLog() });

    expect(data.gaps).toEqual([]);
    expect(data.totalQuestions).toBe(0);
  });

  it('works with no log at all', async () => {
    const { data } = await gapReport({ tenantId: TENANT });

    expect(data.gaps).toEqual([]);
  });

  it('reports only the calling tenant\'s gaps', async () => {
    const log = new KnowledgeGapLog();
    log.record({ tenantId: TENANT, question: 'Milik Nusa' });

    const { data } = await gapReport({ tenantId: 'dealer-arta-motor', gapLog: log });

    expect(data.gaps).toEqual([]);
  });

  it('refuses without a tenant id', async () => {
    await expect(gapReport({ gapLog: new KnowledgeGapLog() })).rejects.toBeInstanceOf(
      TenantScopeError,
    );
  });
});
