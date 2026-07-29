import { FileText } from 'lucide-react';

/**
 * The AI draft with its source chips. design/UI-GUIDELINES.md, "Blok draft AI":
 * quote indented behind a 2px accent rule, source chips below it.
 *
 * A draft the generator refused to write renders its refusal instead — never a
 * blank space, and never a plausible-looking sentence with nothing behind it.
 */
export function DraftBlock({ draft, tone = 'hangat, bertanggung jawab' }) {
  if (!draft?.drafted) {
    return (
      <div className="draft-block draft-refused">
        <span className="kicker">Draft balasan</span>
        <p className="draft-refusal">Tidak ada di dokumen.</p>
        <p className="state-description">
          {draft?.reason ?? 'Agen tidak menemukan pasal SOP yang cukup dekat untuk menjawab.'}{' '}
          Pertanyaan ini dicatat sebagai celah pengetahuan.
        </p>
      </div>
    );
  }

  return (
    <div className="draft-block">
      <div className="draft-head">
        <span className="kicker">Draft balasan</span>
        <span className="draft-tone">nada: {tone}</span>
      </div>

      <p className="draft-text">{draft.text}</p>

      <ul className="citation-chips">
        {draft.citations.map((citation) => (
          <li key={`${citation.docId}-${citation.page}`}>
            <span className="tag tag-accent citation-chip">
              <FileText size={11} strokeWidth={1.5} aria-hidden="true" />
              {citation.title} · hal. {citation.page}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
