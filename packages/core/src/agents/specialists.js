import { ratingTrend } from '../analytics/ratingTrend.js';
import { flagSystemicThemes, systemicFinding } from '../analytics/systemic.js';
import { themeCluster } from '../analytics/themeCluster.js';
import { findOutlet } from '../domain/outlets.js';
import { themeLabel } from '../domain/themes.js';
import { DEFAULT_LOCALE } from '../i18n/locales.js';
import { localeFactor, localeNumber } from '../i18n/format.js';
import { t } from '../i18n/index.js';
import { ragSearch } from '../knowledge/retrieval.js';
import { cannibalisation } from '../location/cannibalisation.js';
import { locationScore } from '../location/locationScore.js';

/**
 * The specialised agents. Each exposes `run(task)` and returns
 * `{ findings[], sources[], steps[] }` — findings are sentences the supervisor
 * may quote, sources are what makes them quotable, and steps are what the trace
 * panel renders.
 *
 * A finding without at least one source is never produced. That is what lets
 * the supervisor refuse mechanically instead of judging plausibility.
 *
 * A finding's `text` is prose for a reader and nothing downstream may parse it.
 * `answerActions` used to recover the leading theme with a regex over the
 * Indonesian sentence below, which worked only for as long as there was one
 * language; findings now carry `themeId` alongside the text, and the id is what
 * code reads.
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
    label: t(DEFAULT_LOCALE, 'agent.reputation'),
    labelFor: (locale) => t(locale, 'agent.reputation'),

    async run({ tenantId, outletId = null, question, startStep = 1, locale = DEFAULT_LOCALE }) {
      const steps = [];
      const findings = [];
      const sources = [];
      let n = startStep;

      const listed = await gbp.listReviews({ tenantId, outletId, limit: 5000 });
      steps.push(
        step(n++, 'gbp.listReviews', listed, t(locale, 'step.reviewsRead', { count: listed.data.total })),
      );
      const reviews = listed.data.reviews;

      const clustered = await themeCluster({ tenantId, reviews, outletId });
      steps.push(
        step(
          n++,
          'bq.themeCluster',
          clustered,
          t(locale, 'step.themesDetected', { count: clustered.data.themes.length }),
        ),
      );

      const themes = flagSystemicThemes(clustered.data.themes, { locale });
      const leading = themes[0];

      if (leading) {
        const outlet = outletId ? findOutlet(outletId) : null;
        const thisWeek = leading.weekly?.at(-1) ?? 0;

        findings.push({
          agent: 'reputation',
          // The id downstream code reads, beside the prose a reader reads.
          themeId: leading.theme,
          text:
            t(locale, 'finding.leadingTheme', {
              where: outlet
                ? t(locale, 'finding.leadingThemeAt', { outlet: outlet.name })
                : t(locale, 'finding.leadingThemeNetwork'),
              theme: themeLabel(leading.theme, locale),
              count: leading.count,
              thisWeek,
            }) +
            (leading.delta
              ? t(locale, 'finding.leadingThemeRising', { delta: localeFactor(locale, leading.delta) })
              : t(locale, 'finding.leadingThemeFlat')),
          sourceCount: clustered.sources.length,
        });
        sources.push(...clustered.sources.slice(0, 20));

        if (leading.systemic) {
          const finding = systemicFinding(clustered.data.themes, { locale });
          findings.push({
            agent: 'reputation',
            themeId: finding.theme,
            text: `${finding.headline}. ${finding.detail}`,
            sourceCount: clustered.sources.length,
          });
        }
      }

      if (outletId) {
        const trend = await ratingTrend({ tenantId, outletId, reviews });
        steps.push(
          step(
            n++,
            'bq.ratingTrend',
            trend,
            t(locale, 'step.changePoints', { count: trend.data.changePoints.length }),
          ),
        );

        if (trend.data.current !== null) {
          const drop = trend.data.overallDelta;
          findings.push({
            agent: 'reputation',
            text:
              t(locale, 'finding.ratingCurrent', {
                rating: localeNumber(locale, trend.data.current),
              }) +
              (drop !== null
                ? t(locale, 'finding.ratingMoved', {
                    direction: t(locale, drop < 0 ? 'finding.ratingDown' : 'finding.ratingUp'),
                    points: localeNumber(locale, Math.abs(drop)),
                  })
                : t(locale, 'finding.ratingFlat')),
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
    label: t(DEFAULT_LOCALE, 'agent.knowledge'),
    labelFor: (locale) => t(locale, 'agent.knowledge'),

    async run({ tenantId, question, startStep = 1, locale = DEFAULT_LOCALE }) {
      const steps = [];
      const findings = [];
      let n = startStep;

      const found = await ragSearch({ tenantId, query: question, topK: 2, passages });
      steps.push(
        step(
          n++,
          'rag.search',
          found,
          t(locale, 'step.passagesKept', {
            kept: found.data.chunks.length,
            rejected: found.data.rejectedCount,
          }),
        ),
      );

      // Constitution I: below the floor the agent says so rather than
      // paraphrasing the nearest paragraph.
      //
      // The passage inside the quotation marks is the document's own wording and
      // stays in the document's language; only the frame around it is translated.
      for (const chunk of found.data.chunks) {
        findings.push({
          agent: 'knowledge',
          text: t(locale, 'finding.passage', {
            title: chunk.title,
            page: chunk.page,
            text: chunk.text,
          }),
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

export function createLocationAgent({ places, weights = undefined } = {}) {
  return {
    name: 'location',
    label: t(DEFAULT_LOCALE, 'agent.location'),
    labelFor: (locale) => t(locale, 'agent.location'),

    async run({ tenantId, outletId = null, startStep = 1, locale = DEFAULT_LOCALE }) {
      const steps = [];
      const findings = [];
      const sources = [];
      let n = startStep;

      // Without a branch in the question there is no point to score. The agent
      // says so rather than scoring an arbitrary one.
      if (!outletId) {
        return {
          agent: 'location',
          findings: [],
          sources: [],
          steps: [
            {
              n,
              tool: 'location.skip',
              resultSize: 0,
              ms: 0,
              note: t(locale, 'step.noOutlet'),
            },
          ],
          nextStep: n + 1,
        };
      }

      const scored = await locationScore({ tenantId, outletId, places, weights, locale });
      steps.push(
        step(n++, 'bq.locationScore', scored, t(locale, 'step.score', { score: scored.data.total })),
      );
      sources.push(...scored.sources);

      const outlet = findOutlet(outletId);
      const weakest = Object.entries(scored.data.factors).sort((a, b) => a[1] - b[1])[0];

      findings.push({
        agent: 'location',
        text:
          t(locale, 'finding.locationScore', {
            outlet: outlet?.name ?? outletId,
            score: scored.data.total,
            factor: scored.data.labels[weakest[0]].toLowerCase(),
            value: weakest[1],
            competitors: scored.data.competitorCount,
            radius: scored.data.radiusM,
          }) +
          (scored.data.newCompetitorCount > 0
            ? t(locale, 'finding.locationScoreNew', { count: scored.data.newCompetitorCount })
            : t(locale, 'finding.locationScoreFlat')),
        sourceCount: scored.sources.length,
      });

      const cannibal = await cannibalisation({
        tenantId,
        geo: scored.data.geo,
        excludeOutletId: outletId,
        locale,
      });
      steps.push(step(n++, 'bq.cannibalisation', cannibal, cannibal.data.verdict));

      if (cannibal.data.flagged) {
        findings.push({ agent: 'location', text: cannibal.data.verdict, sourceCount: cannibal.sources.length });
        sources.push(...cannibal.sources);
      }

      return { agent: 'location', findings, sources, steps, nextStep: n };
    },
  };
}

/**
 * Kept for agents that genuinely are not built yet. It is registered so routing and the
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
