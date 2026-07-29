import { useCallback, useEffect, useMemo, useState } from 'react';

import { canWrite } from '../app/roles.js';
import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { DraftBlock } from './review/DraftBlock.jsx';
import { ReviewList, Stars } from './review/ReviewList.jsx';

const BUCKETS = [
  { id: 'perlu-tindakan', label: 'Perlu tindakan' },
  { id: 'draft-siap', label: 'Draft siap' },
  { id: 'terkirim', label: 'Terkirim' },
];

/**
 * Screen 05 · Kotak masuk review.
 *
 * 320px list beside a preview panel. Every count in the segmented control is
 * computed from the review rows, not written into the markup.
 */
export function ReviewInboxScreen() {
  const { reputation, role, tenant } = useSession();
  const [bucket, setBucket] = useState('perlu-tindakan');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [notice, setNotice] = useState(null);

  const loadInbox = useCallback(() => reputation.inbox({ bucket }), [reputation, bucket]);
  const { status, data, error, reload } = useAsyncData(loadInbox);

  // Memoised: this array is an effect dependency, and a fresh [] on every
  // render would re-run the selection effect forever.
  const rows = useMemo(() => data?.rows ?? [], [data]);

  // Selecting the first row is the screen's resting state; it must follow the
  // bucket rather than stick to a row that is no longer listed.
  useEffect(() => {
    if (rows.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!rows.some((row) => row.id === selectedId)) setSelectedId(rows[0].id);
  }, [rows, selectedId]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedId) {
      setDetail(null);
      return undefined;
    }
    reputation.reviewDetail(selectedId).then((result) => {
      if (!cancelled) setDetail(result);
    });
    return () => {
      cancelled = true;
    };
  }, [reputation, selectedId]);

  const mayAct = canWrite(role);

  const approve = async (reviewId) => {
    if (!mayAct || !reviewId) return;
    try {
      await reputation.approveAndSend({
        reviewId,
        approvedBy: tenant?.approverEmail ?? 'manajer@nusaretail.co.id',
        role,
      });
      setNotice('Balasan terkirim dan persetujuan tercatat.');
      await reload();
    } catch (failure) {
      setNotice(failure?.message ?? 'Balasan gagal dikirim.');
    }
  };

  return (
    <>
      <div className="inbox-filters">
        {/* Radio inputs, so the control announces itself as a radiogroup —
            a tablist would promise arrow-key semantics these do not have. */}
        <div className="seg" role="radiogroup" aria-label="Saring review">
          {BUCKETS.map((entry) => (
            <label key={entry.id} className="seg-opt">
              <input
                type="radio"
                name="bucket"
                checked={bucket === entry.id}
                onChange={() => setBucket(entry.id)}
              />
              {entry.label} · {data?.counts?.[entry.id] ?? '—'}
            </label>
          ))}
        </div>
      </div>

      <div className="inbox-grid">
        <DataPanel
          status={rows.length === 0 && status === PANEL_STATUS.READY ? PANEL_STATUS.EMPTY : status}
          className="inbox-list-panel"
          kicker={`${data?.counts?.[bucket] ?? 0} ${BUCKETS.find((b) => b.id === bucket).label.toLowerCase()}`}
          meta={<span className="panel-meta">urut prioritas</span>}
          loading={{ message: 'Agen sedang membaca review terbaru…' }}
          empty={{
            title: 'Tidak ada review baru',
            description:
              'Semua review pekan ini sudah dibalas. Agen akan memeriksa lagi malam ini pukul 23.00.',
            onAction: reload,
          }}
          error={{
            title: 'Kotak masuk tak bisa dimuat',
            description: error?.message ?? 'Layanan review tidak menjawab.',
            onRetry: reload,
          }}
        >
          <ReviewList
            rows={rows}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onApprove={approve}
            onEdit={() => setNotice('Ubah teks tersedia di layar 06.')}
          />
          <p className="inbox-hint">↑ ↓ pindah · ⏎ setujui &amp; lanjut · E ubah</p>
        </DataPanel>

        <DataPanel
          status={detail ? PANEL_STATUS.READY : status}
          className="inbox-preview-panel"
          kicker={detail ? `Review · ${detail.review.outletName}` : 'Review'}
          loading={{ message: 'Menyiapkan draft balasan…' }}
          empty={{ title: 'Pilih satu review', description: 'Detail dan draft akan muncul di sini.' }}
          error={{ title: 'Detail tak bisa dimuat', onRetry: reload }}
        >
          {detail ? (
            <>
              <p className="review-meta">
                Google · {detail.review.author} · {detail.review.relative}
              </p>
              <Stars rating={detail.review.rating} />
              <blockquote className="review-quote">{detail.review.text}</blockquote>

              <DraftBlock draft={detail.draft} />

              <div className="state-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => approve(selectedId)}
                  disabled={!mayAct || !detail.draft?.drafted || detail.state === 'sent'}
                >
                  {detail.state === 'sent' ? 'Sudah terkirim' : 'Setujui & kirim ⏎'}
                </button>
                <button type="button" className="btn btn-secondary" disabled={!mayAct}>
                  Ubah teks
                </button>
                <button type="button" className="btn btn-secondary" disabled={!mayAct}>
                  Jadikan tiket
                </button>
                <button type="button" className="btn btn-ghost" disabled={!mayAct}>
                  Abaikan
                </button>
              </div>

              {!mayAct ? (
                <p className="state-note">
                  Peran Anda hanya bisa membaca. Persetujuan balasan dilakukan oleh manajer atau admin.
                </p>
              ) : null}
              {notice ? (
                <p className="state-note" role="status">
                  {notice}
                </p>
              ) : null}

              <p className="inbox-foot">
                <span>{detail.guardrail?.summary ?? 'Guardrail belum dijalankan'}</span>
                <span className="inbox-foot-right">
                  {Math.max(0, rows.length - 1)} tersisa di antrean ini
                </span>
              </p>
            </>
          ) : null}
        </DataPanel>
      </div>
    </>
  );
}
