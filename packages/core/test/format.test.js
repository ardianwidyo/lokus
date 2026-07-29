import { describe, expect, it } from 'vitest';

import { createSeededGbpAdapter } from '../src/adapters/gbp.js';
import { createReputationAgent } from '../src/agents/specialists.js';
import { createSeededKnowledgeStore } from '../src/knowledge/ingest.js';
import { ragCite } from '../src/knowledge/cite.js';
import { idFactor, idInteger, idNumber } from '../src/lib/format.js';

const TENANT = 'nusa-retail';

describe('Indonesian number formatting', () => {
  it('writes a decimal with a comma', () => {
    expect(idNumber(3.04)).toBe('3,04');
    expect(idNumber(0.7)).toBe('0,70');
  });

  it('respects the requested precision', () => {
    expect(idNumber(3.456, 1)).toBe('3,5');
    expect(idNumber(3, 0)).toBe('3');
  });

  it('passes null through so callers can guard on it', () => {
    expect(idNumber(null)).toBeNull();
    expect(idNumber(undefined)).toBeNull();
    expect(idNumber(Number.NaN)).toBeNull();
  });

  it('keeps a multiplier free of trailing zeros', () => {
    expect(idFactor(3.67)).toBe('3,67');
    expect(idFactor(2)).toBe('2');
  });

  it('groups thousands with a dot', () => {
    expect(idInteger(1_840_000)).toBe('1.840.000');
    expect(idInteger(390)).toBe('390');
  });
});

describe('agent prose uses the same convention as the screens', () => {
  /** A period between two digits is the English convention leaking through. */
  const englishDecimal = /\d+\.\d/;

  it('writes the rating and its movement with commas', async () => {
    const gbp = createSeededGbpAdapter();
    const { data } = await gbp.listReviews({ tenantId: TENANT, limit: 5000 });

    const agent = createReputationAgent({ gbp });
    const result = await agent.run({
      tenantId: TENANT,
      question: 'Kenapa rating cabang Bekasi Timur turun bulan ini?',
      outletId: 'BKS-02',
      reviews: data.reviews,
    });

    const prose = result.findings.map((finding) => finding.text).join(' ');

    expect(prose).toMatch(/Rating berjalan 3,04/);
    expect(prose).not.toMatch(englishDecimal);
  });

  it('writes the refusal thresholds with commas', async () => {
    const store = createSeededKnowledgeStore();
    const { data } = await ragCite({
      tenantId: TENANT,
      question: 'Bagaimana resep rendang padang?',
      passages: store.retrievablePassages(TENANT),
    });

    expect(data.answered).toBe(false);
    expect(data.reason).toMatch(/ambang keyakinan 0,70/);
    expect(data.reason).not.toMatch(englishDecimal);
  });
});
