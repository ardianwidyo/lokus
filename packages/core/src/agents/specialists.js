import { ratingTrend } from '../analytics/ratingTrend.js';
import { flagSystemicThemes, systemicFinding } from '../analytics/systemic.js';
import { themeCluster } from '../analytics/themeCluster.js';
import { findOutlet } from '../domain/outlets.js';
import { themeLabel } from '../domain/themes.js';
import { ragSearch } from '../knowledge/retrieval.js';

/**
 * The specialised agents. Each exposes `run(task)` and returns
 * `{ findings[], sources[], steps[] }` — findings are sentences the supervisor
 * may quote, sources are what makes them quotable, and steps are what the trace
 * panel renders.
 *
 * A finding without at least one source is never produced. That is what lets
 * the supervisor refuse mechanically instead of judging plausibility.
 */

function step(n, tool, result, note) {
  return {
    n,
    tool,
    resultSize: Array.isArray(result?.sources) ? result.sources.length : 0,
    ms: result?.latencyMs ?? 0,
    note,
  };
}

export function createReputationAgent({ gbp }) {
  return {
    name: 'reputation',
    label: 'Agen Reputasi',

    async run({ tenantId, outletId = null, question, startStep = 1 }) {
      const steps = [];
      const findings = [];
      const sources = [];
      let n = startStep;

      const listed = await gbp.listReviews({ tenantId, outletId, limit: 5000 });
      steps.push(step(n++, 'gbp.listReviews', listed, `${listed.data.total} review dibaca`));
      const reviews = listed.data.reviews;

      const clustered = await themeCluster({ tenantId, reviews, outletId });
      steps.push(
        step(n++, 'bq.themeCluster', clustered, `${clustered.data.themes.length} tema terdeteksi`),
      );

      const themes = flagSystemicThemes(clustered.data.themes);
      const leading = themes[0];

      if (leading) {
        const outlet = outletId ? findOutlet(outletId) : null;
        const where = outlet ? ` di ${outlet.name}` : ' di jaringan';
        const thisWeek = leading.weekly?.at(-1) ?? 0;

        findings.push({
          agent: 'reputation',
          text:
            `Tema keluhan terbesar${where} adalah ${themeLabel(leading.theme)}: ` +
            `${leading.count} keluhan dalam 8 pekan, ${thisWeek} di antaranya pekan ini` +
            (leading.delta ? `, naik ${leading.delta}× dibanding sebulan lalu.` : '.'),
          sourceCount: clustered.sources.length,
        });
        sources.push(...clustered.sources.slice(0, 20));

        if (leading.systemic) {
          const finding = systemicFinding(clustered.data.themes);
          findings.push({
            agent: 'reputation',
            text: `${finding.headline}. ${finding.detail}`,
            sourceCount: clustered.sources.length,
          });
        }
      }

      if (outletId) {
        const trend = await ratingTrend({ tenantId, outletId, reviews });
        steps.push(
          step(n++, 'bq.ratingTrend', trend, `${trend.data.changePoints.length} titik perubahan`),
        );

        if (trend.data.current !== null) {
          const drop = trend.data.overallDelta;
          findings.push({
            agent: 'reputation',
            text:
              `Rating berjalan ${trend.data.current.toFixed(2)}` +
              (drop !== null
                ? `, ${drop < 0 ? 'turun' : 'naik'} ${Math.abs(drop).toFixed(2)} poin selama 8 pekan.`
                : '.'),
            sourceCount: trend.sources.length,
          });
          sources.push(...trend.sources.slice(0, 20));
        }
      }

      return { agent: 'reputation', findings, sources, steps, nextStep: n, question };
    },
  };
}

export function createKnowledgeAgent({ passages = null } = {}) {
  return {
    name: 'knowledge',
    label: 'Agen Pengetahuan',

    async run({ tenantId, question, startStep = 1 }) {
      const steps = [];
      const findings = [];
      let n = startStep;

      const found = await ragSearch({ tenantId, query: question, topK: 2, passages });
      steps.push(
        step(
          n++,
          'rag.search',
          found,
          `${found.data.chunks.length} kutipan lolos ambang · ${found.data.rejectedCount} ditolak`,
        ),
      );

      // Constitution I: below the floor the agent says so rather than
      // paraphrasing the nearest paragraph.
      for (const chunk of found.data.chunks) {
        findings.push({
          agent: 'knowledge',
          text: `${chunk.title} hal. ${chunk.page}: “${chunk.text}”`,
          sourceCount: 1,
        });
      }

      return {
        agent: 'knowledge',
        findings,
        sources: found.sources,
        steps,
        nextStep: n,
        rejectedCount: found.data.rejectedCount,
      };
    },
  };
}

/**
 * The location agent is not built yet (P3). It is registered so routing and the
 * trace stay honest: the step is recorded, it returns no findings and no
 * sources, and the answer says the perspective is missing rather than quietly
 * omitting it.
 */
export function createUnavailableAgent(name, label, reason) {
  return {
    name,
    label,
    unavailable: true,

    async run({ startStep = 1 }) {
      return {
        agent: name,
        findings: [],
        sources: [],
        steps: [{ n: startStep, tool: `${name}.unavailable`, resultSize: 0, ms: 0, note: reason }],
        nextStep: startStep + 1,
        unavailable: true,
        reason,
      };
    },
  };
}
