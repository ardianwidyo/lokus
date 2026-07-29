import { useCallback, useState } from 'react';
import { Check, FileText, X } from 'lucide-react';

import { canWrite } from '../app/roles.js';
import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { Stars } from './review/ReviewList.jsx';

/** design/SCREENS.md screen 06 names the four checks in Indonesian. */
const CHECK_LABELS = {
  unsourced_claim: 'Tanpa klaim tak bersumber',
  personal_data: 'Tanpa data pribadi',
  tone_compliance: 'Nada sesuai panduan',
  compensation_promise: 'Tanpa janji kompensasi',
};

/**
 * Screen 06 · Draft balasan AI.
 *
 * The draft on the left, what it stands on to the right: the SOP passages with
 * their retrieval scores and quotes, then the four guardrail results. Reading
 * left to right you see the claim and then its evidence, which is the order a
 * reviewer needs before approving something a customer will read.
 */
export function ReplyDraftScreen({ reviewId, onNavigate }) {
  const { reputation, role } = useSession();
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    if (reviewId) return reputation.reviewDetail(reviewId);

    // No review named: open the first one that needs a human.
    const inbox = await reputation.inbox({ bucket: 'perlu-tindakan' });
    const first = inbox.rows[0];
    return first ? reputation.reviewDetail(first.id) : null;
  }, [reputation, reviewId]);

  const { status, data, error, reload } = useAsyncData(load);
  const mayAct = canWrite(role);

  const send = async () => {
    try {
      await reputation.approveAndSend({
        reviewId: data.review.id,
        approvedBy: 'manajer@nusaretail.co.id',
        role,
      });
      setNotice('Balasan terkirim. Penyetuju dan waktunya tercatat.');
      await reload();
    } catch (failure) {
      setNotice(failure?.message ?? 'Balasan gagal dikirim.');
    }
  };

  const panelStatus = status === PANEL_STATUS.READY && !data ? PANEL_STATUS.EMPTY : status;

  return (
    <div className="draft-grid">
      <DataPanel
        status={panelStatus}
        kicker="Review asal"
        loading={{ message: 'Agen sedang menyusun draft balasan…' }}
        empty={{
          title: 'Tidak ada draft menunggu',
          description:
            'Semua review pekan ini sudah dibalas. Agen akan memeriksa lagi malam ini pukul 23.00.',
          onAction: reload,
        }}
        error={{
          title: 'Draft tak bisa dimuat',
          description: error?.message ?? 'Layanan draft tidak menjawab.',
          onRetry: reload,
        }}
      >
        {data ? (
          <>
            <p className="review-meta">
              Google · {data.review.outletName} · {data.review.relative}
            </p>
            <Stars rating={data.review.rating} />
            <blockquote className="review-quote">{data.review.text}</blockquote>

            <div className="hr" />

            {data.draft?.drafted ? (
              <>
                <div className="draft-head">
                  <span className="tag tag-accent">Draft balasan</span>
                  <span className="draft-tone">Gemini · nada: {data.draft.tone}</span>
                </div>
                <p className="draft-text draft-text-lg">{data.draft.text}</p>
              </>
            ) : (
              <>
                <span className="tag tag-outline">Agen menolak menjawab</span>
                <p className="draft-refusal">Tidak ada di dokumen.</p>
                <p className="state-description">{data.draft?.reason}</p>
              </>
            )}

            <div className="state-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={send}
                disabled={!mayAct || !data.draft?.drafted || data.state === 'sent'}
              >
                {data.state === 'sent' ? 'Sudah terkirim' : 'Setujui & kirim'}
              </button>
              <button type="button" className="btn btn-secondary" disabled={!mayAct}>
                Ubah teks
              </button>
              <button type="button" className="btn btn-secondary" disabled={!mayAct}>
                Minta versi lain
              </button>
              <button type="button" className="btn btn-ghost" disabled={!mayAct}>
                Tolak
              </button>
            </div>

            {notice ? (
              <p className="state-note" role="status">
                {notice}
              </p>
            ) : null}

            <p className="state-note">
              Balasan tidak pernah terkirim otomatis. Persetujuan manusia wajib untuk semua review
              bintang 1–2 — aturan ini ditetapkan di halaman Admin.
            </p>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onNavigate('/review')}
            >
              ← Kembali ke kotak masuk
            </button>
          </>
        ) : null}
      </DataPanel>

      <div className="draft-side">
        <DataPanel
          status={panelStatus}
          kicker="Bersumber pada"
          loading={{ message: 'Mengambil kutipan SOP…' }}
          empty={{ title: 'Belum ada sumber' }}
          error={{ title: 'Sumber tak bisa dimuat', onRetry: reload }}
        >
          {data?.draft?.citations?.length ? (
            <ul className="source-list">
              {data.draft.citations.map((citation) => (
                <li key={`${citation.docId}-${citation.page}`}>
                  <Blueprint className="source-card">
                    <p className="source-title">
                      <FileText size={12} strokeWidth={1.5} aria-hidden="true" />
                      {citation.title} · hal. {citation.page}
                    </p>
                    <p className="source-score">skor {citation.score.toFixed(2)}</p>
                    <p className="source-quote">“{citation.quote}”</p>
                  </Blueprint>
                </li>
              ))}
            </ul>
          ) : (
            <p className="state-description">
              Draft ini tidak bersandar pada dokumen mana pun, jadi tidak ada yang bisa dikutip.
            </p>
          )}
        </DataPanel>

        <DataPanel
          status={panelStatus}
          kicker="Pemeriksaan guardrail"
          meta={data?.guardrail ? <span className="panel-meta">{data.guardrail.summary}</span> : null}
          loading={{ message: 'Menjalankan pemeriksaan…' }}
          empty={{ title: 'Belum diperiksa' }}
          error={{ title: 'Pemeriksaan gagal', onRetry: reload }}
        >
          {data?.guardrail ? (
            <ul className="guardrail-list">
              {data.guardrail.checks.map((check) => (
                <li key={check.name} className={check.passed ? 'is-pass' : 'is-fail'}>
                  <span className="guardrail-icon" aria-hidden="true">
                    {check.passed ? (
                      <Check size={13} strokeWidth={1.5} />
                    ) : (
                      <X size={13} strokeWidth={1.5} />
                    )}
                  </span>
                  <span className="guardrail-text">
                    <span className="guardrail-name">{CHECK_LABELS[check.name] ?? check.name}</span>
                    <span className="guardrail-detail">{check.detail}</span>
                  </span>
                  <span className="guardrail-verdict">{check.passed ? 'lolos' : 'gagal'}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </DataPanel>
      </div>
    </div>
  );
}
