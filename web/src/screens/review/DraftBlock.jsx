import { FileText } from 'lucide-react';

import { useT } from '../../i18n/index.js';

/**
 * The AI draft with its source chips. design/UI-GUIDELINES.md, "Blok draft AI":
 * quote indented behind a 2px accent rule, source chips below it.
 *
 * A draft the generator refused to write renders its refusal instead — never a
 * blank space, and never a plausible-looking sentence with nothing behind it.
 *
 * `draft.text` and `draft.tone` arrive from the domain already in the right
 * language for what each is: the reply body stays Indonesian because a customer
 * reads it, the tone label follows the console (spec.md AC-8.5).
 */
export function DraftBlock({ draft, tone = null }) {
  const t = useT();

  if (!draft?.drafted) {
    return (
      <div className="draft-block draft-refused">
        <span className="kicker">{t('review.draftKicker')}</span>
        <p className="draft-refusal">{t('review.draftRefusal')}</p>
        <p className="state-description">
          {draft?.reason ?? t('review.draftRefusalReason')} {t('review.draftRefusalNote')}
        </p>
      </div>
    );
  }

  return (
    <div className="draft-block">
      <div className="draft-head">
        <span className="kicker">{t('review.draftKicker')}</span>
        <span className="draft-tone">{t('review.draftTone', { tone: tone ?? draft.tone })}</span>
      </div>

      <p className="draft-text">{draft.text}</p>

      <ul className="citation-chips">
        {draft.citations.map((citation) => (
          <li key={`${citation.docId}-${citation.page}`}>
            <span className="tag tag-accent citation-chip">
              <FileText size={11} strokeWidth={1.5} aria-hidden="true" />
              {citation.title} · {t('common.page', { page: citation.page })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
