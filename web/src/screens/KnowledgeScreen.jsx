import { useCallback, useState } from 'react';

import { canWrite } from '../app/roles.js';
import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';

const INDEX_LABELS = {
  indexed: 'Terindeks',
  diproses: 'Diproses',
  'menunggu-tinjauan': 'Menunggu tinjauan',
  dikecualikan: 'Dikecualikan',
  antre: 'Antre',
};

/**
 * Screen 11 · Pusat pengetahuan.
 *
 * What the corpus contains, what it can answer, and what it keeps failing to
 * answer. The last of those is the point: a knowledge base that only shows what
 * it has invites the reader to assume it has everything.
 */
export function KnowledgeScreen({ onNavigate }) {
  const { knowledgeSource, role, tenant } = useSession();
  const [receipt, setReceipt] = useState(null);

  const load = useCallback(
    () => knowledgeSource.overview(tenant?.tenantId ?? 'nusa-retail'),
    [knowledgeSource, tenant?.tenantId],
  );
  const { status, data, error, reload } = useAsyncData(load);

  const mayAct = canWrite(role);
  const coveragePercent = data ? Math.round(data.coverage.rate * 100) : 0;

  return (
    <>
      <div className="metric-grid">
        <Blueprint className="metric-card">
          <span className="kicker">Dokumen terindeks</span>
          <span className="metric-value">{data?.stats.indexedCount ?? '—'}</span>
          <span className="metric-note">
            {data ? `${data.stats.chunkCount} potongan · dari ${data.stats.documentCount} dokumen` : ''}
          </span>
        </Blueprint>

        <Blueprint className="metric-card">
          <span className="kicker">Cakupan jawaban</span>
          <span className="metric-value">{data ? `${coveragePercent}%` : '—'}</span>
          <span className="budget-bar" aria-hidden="true">
            <span className="budget-fill" style={{ width: `${coveragePercent}%` }} />
          </span>
          <span className="metric-note">
            {data
              ? `${data.coverage.answered} dari ${data.coverage.probed} tema yang staf tanyakan`
              : ''}
          </span>
        </Blueprint>

        <Blueprint className="metric-card">
          <span className="kicker">Pertanyaan tak terjawab</span>
          <span className="metric-value">{data?.totalUnanswered ?? '—'}</span>
          <span className="metric-note">
            {data ? `${data.gaps.length} celah setelah dikelompokkan` : ''}
          </span>
        </Blueprint>

        <Blueprint className="metric-card">
          <span className="kicker">Model embedding</span>
          <span className="metric-value metric-value-sm">{data?.stats.embeddingModel ?? '—'}</span>
          <span className="metric-note">
            {data
              ? `${data.stats.dimensions} dim · chunk ${data.stats.chunkTokens} token · overlap ${data.stats.overlapTokens}`
              : ''}
          </span>
        </Blueprint>
      </div>

      <div className="kb-grid">
        <DataPanel
          status={status}
          kicker="Dokumen"
          loading={{ message: 'Membaca indeks dokumen…' }}
          empty={{ title: 'Belum ada dokumen', description: 'Unggah SOP pertama Anda untuk mulai.' }}
          error={{
            title: 'Indeks tak bisa dimuat',
            description: error?.message ?? 'Layanan pengetahuan tidak menjawab.',
            onRetry: reload,
          }}
        >
          {data ? (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Dokumen</th>
                    <th scope="col">Jenis</th>
                    <th scope="col">Halaman</th>
                    <th scope="col">Potongan</th>
                    <th scope="col">Status indeks</th>
                    <th scope="col">Diperbarui</th>
                  </tr>
                </thead>
                <tbody>
                  {data.documents.map((doc) => (
                    <tr key={doc.docId}>
                      <th scope="row">{doc.title}</th>
                      <td>{doc.type}</td>
                      <td>{doc.pages ?? '—'}</td>
                      <td>{doc.chunkCount}</td>
                      <td>
                        {/* Retrievable or not is the fact that matters; the
                            label alone would let "menunggu tinjauan" read as
                            searchable. */}
                        <span className={`tag ${doc.retrievable ? 'tag-accent' : 'tag-outline'}`}>
                          {INDEX_LABELS[doc.indexState] ?? doc.indexState}
                        </span>
                      </td>
                      <td>{doc.updatedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <p className="state-note">
            Hanya dokumen bertanda <strong>Terindeks</strong> yang bisa dikutip agen. Draft yang
            menunggu tinjauan dan dokumen yang dikecualikan tidak pernah muncul di jawaban.
          </p>
        </DataPanel>

        <div className="kb-side">
          <DataPanel
            status={data && data.gaps.length === 0 && status === PANEL_STATUS.READY ? PANEL_STATUS.EMPTY : status}
            className="gap-panel"
            kicker="Celah pengetahuan"
            loading={{ message: 'Mengelompokkan pertanyaan tak terjawab…' }}
            empty={{
              title: 'Belum ada celah tercatat',
              description:
                'Setiap kali agen menolak menjawab, pertanyaannya muncul di sini beserta usulan klausanya.',
            }}
            error={{ title: 'Celah tak bisa dimuat', onRetry: reload }}
          >
            {data?.gaps?.length ? (
              <>
                {data.gaps.slice(0, 2).map((gap) => (
                  <div key={gap.theme} className="gap-item">
                    <h3 className="finding-headline">{gap.theme.replace(/-/g, ' ')}</h3>
                    <p className="state-description">
                      {gap.occurrences} pertanyaan dari {gap.askedBy.length || 'beberapa'} orang
                      tidak bisa dijawab dari dokumen yang ada.
                    </p>
                    <p className="gap-question">“{gap.questions[0]}”</p>

                    {gap.proposedClause ? (
                      <>
                        <p className="kicker">Usulan klausa · draft</p>
                        <p className="gap-clause">{gap.proposedClause}</p>
                        <div className="state-actions">
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={!mayAct}
                            onClick={() =>
                              setReceipt(`Draft klausa "${gap.theme}" dikirim ke pemilik SOP.`)
                            }
                          >
                            Kirim ke pemilik SOP
                          </button>
                          <button type="button" className="btn btn-secondary" disabled={!mayAct}>
                            Ubah draft
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="state-note">
                        Belum diusulkan klausa — pertanyaan ini baru muncul sekali.
                      </p>
                    )}
                  </div>
                ))}

                <p className="state-note">
                  Klausa di atas adalah <strong>draft untuk ditinjau manusia</strong>, bukan aturan
                  yang sudah berlaku. Tidak ada yang masuk SOP tanpa persetujuan pemiliknya.
                </p>
              </>
            ) : null}

            {receipt ? (
              <p className="state-note" role="status">
                {receipt}
              </p>
            ) : null}
          </DataPanel>

          <Blueprint className="upload-card">
            <span className="kicker">Unggah dokumen</span>
            <div className="dropzone">
              Tarik PDF, DOCX, atau XLSX ke sini
              <span className="dropzone-note">
                maks. 50 MB · dipotong {data?.stats.chunkTokens ?? 800} token dengan overlap{' '}
                {data?.stats.overlapTokens ?? 120}
              </span>
            </div>
            <label className="radio">
              <input type="checkbox" disabled={!mayAct} />
              <span className="dot" />
              Batasi akses ke peran Admin
            </label>
            <p className="state-note">
              Dokumen yang dibatasi tetap disimpan tapi tidak diindeks untuk jawaban umum.
            </p>
          </Blueprint>

          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => onNavigate?.('/jawaban')}
          >
            Lihat contoh jawaban bersitasi →
          </button>
        </div>
      </div>
    </>
  );
}
