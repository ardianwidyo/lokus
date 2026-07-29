import { useCallback } from 'react';

import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { Sparkline, intensityStyle } from './theme/Sparkline.jsx';

const OUTLET_COLUMNS = [
  { outletId: 'BKS-02', short: 'Bks' },
  { outletId: 'CKR-01', short: 'Ckr' },
  { outletId: 'DPK-01', short: 'Dpk' },
  { outletId: 'SRP-03', short: 'Srp' },
  { outletId: 'BGR-01', short: 'Bgr' },
  { outletId: 'TGR-01', short: 'Tgr' },
];

/**
 * Screen 07 · Analisis tema & sentimen.
 *
 * The matrix is the argument: one theme per row, one branch per column, and an
 * 8-week trend beside it. Intensity uses a single accent ramp, so a reader
 * compares cells by weight rather than decoding hues.
 *
 * Every cell is a count of clustered reviews. Nothing on this screen is typed
 * in by hand.
 */
export function ThemeAnalysisScreen() {
  const { reputation } = useSession();

  const load = useCallback(() => reputation.themeMatrix(), [reputation]);
  const { status, data, error, reload } = useAsyncData(load);

  const themes = data?.themes ?? [];
  const max = Math.max(1, ...themes.flatMap((theme) => Object.values(theme.byOutlet ?? {})));

  return (
    <>
      <DataPanel
        status={themes.length === 0 && status === PANEL_STATUS.READY ? PANEL_STATUS.EMPTY : status}
        kicker="Tema keluhan × cabang"
        title="Matriks tema, 8 pekan terakhir"
        meta={
          data ? (
            <span className="panel-meta">
              {data.reviewsConsidered} review dianalisis · {data.sourceCount} sitasi
            </span>
          ) : null
        }
        loading={{ message: 'Agen sedang mengelompokkan tema dari teks review…' }}
        empty={{
          title: 'Belum ada tema terdeteksi',
          description:
            'Tidak ada keluhan pada jendela 8 pekan ini. Agen akan memeriksa lagi malam ini pukul 23.00.',
          onAction: reload,
        }}
        error={{
          title: 'Analisis tema tak bisa dimuat',
          description: error?.message ?? 'Layanan analitik tidak menjawab.',
          onRetry: reload,
        }}
      >
        <div className="table-scroll">
          <table className="table theme-matrix">
            <caption className="sr-only">
              Jumlah review keluhan per tema dan cabang selama delapan pekan terakhir
            </caption>
            <thead>
              <tr>
                <th scope="col">Tema keluhan</th>
                {OUTLET_COLUMNS.map((column) => (
                  <th key={column.outletId} scope="col">
                    {column.short}
                  </th>
                ))}
                <th scope="col">Tren 8 pekan</th>
                <th scope="col">Sistemik</th>
              </tr>
            </thead>
            <tbody>
              {themes.map((theme) => (
                <tr key={theme.theme}>
                  <th scope="row">{theme.label}</th>
                  {OUTLET_COLUMNS.map((column) => {
                    const value = theme.byOutlet?.[column.outletId] ?? 0;
                    return (
                      <td
                        key={column.outletId}
                        className="matrix-cell"
                        style={intensityStyle(value, max)}
                      >
                        {value || '—'}
                      </td>
                    );
                  })}
                  <td>
                    <Sparkline
                      values={theme.weekly}
                      label={`${theme.label}: tren 8 pekan, pekan ini ${theme.weekly?.at(-1) ?? 0}`}
                    />
                  </td>
                  <td>
                    {theme.systemic ? (
                      <span className="tag tag-accent" title={theme.systemicReason}>
                        {theme.regionCount} wilayah
                      </span>
                    ) : (
                      <span className="tag tag-neutral" title={theme.systemicReason}>
                        lokal
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataPanel>

      <div className="theme-cards">
        <DataPanel
          status={status}
          kicker="Temuan agen · prioritas jaringan"
          loading={{ message: 'Menilai sebaran wilayah…' }}
          empty={{ title: 'Tidak ada temuan sistemik' }}
          error={{ title: 'Temuan tak bisa dimuat', onRetry: reload }}
        >
          {data?.finding ? (
            <>
              <h3 className="finding-headline">{data.finding.headline}</h3>
              <p className="state-description">{data.finding.detail}</p>
              <ul className="finding-tags">
                <li>
                  <span className="tag tag-neutral">{data.finding.count} keluhan</span>
                </li>
                <li>
                  <span className="tag tag-neutral">{data.finding.regionCount} wilayah</span>
                </li>
                <li>
                  <span className="tag tag-neutral">terburuk: {data.finding.worstOutlet?.name}</span>
                </li>
              </ul>
            </>
          ) : (
            <p className="state-description">
              Tidak ada tema yang menyentuh 4 wilayah. Semua keluhan masih bersifat lokal.
            </p>
          )}
        </DataPanel>

        <DataPanel
          status={status}
          kicker="Sentimen jaringan · 8 pekan"
          loading={{ message: 'Menghitung proporsi review negatif…' }}
          empty={{ title: 'Belum ada data sentimen' }}
          error={{ title: 'Sentimen tak bisa dimuat', onRetry: reload }}
        >
          {data ? (
            <>
              <ul className="sentiment-bars">
                {data.sentimentByWeek.map((share, index) => (
                  <li key={index}>
                    <span
                      className="sentiment-bar"
                      style={{ height: `${Math.max(4, share * 160)}px` }}
                      title={`Pekan ${index + 1}: ${(share * 100).toFixed(0)}% negatif`}
                    />
                  </li>
                ))}
              </ul>
              <p className="state-description">
                Proporsi review negatif per pekan ·{' '}
                {(data.sentimentByWeek[0] * 100).toFixed(0)}% →{' '}
                {(data.sentimentByWeek.at(-1) * 100).toFixed(0)}%
              </p>
            </>
          ) : null}
        </DataPanel>

        <DataPanel
          status={status}
          kicker="Praktik baik terdeteksi"
          loading={{ message: 'Mencari cabang pembanding…' }}
          empty={{ title: 'Belum ada pembanding' }}
          error={{ title: 'Pembanding tak bisa dimuat', onRetry: reload }}
        >
          {data?.bestPractice ? (
            <>
              <h3 className="finding-headline">{data.bestPractice.outletName}</h3>
              <p className="state-description">
                Cabang dengan keluhan “{data.bestPractice.label}” paling sedikit di jaringan (
                {data.bestPractice.count} dalam 8 pekan). Agen mengusulkan menelaah pola kerjanya
                untuk disalin ke cabang terlemah.
              </p>
              <Blueprint className="practice-note">
                <p className="state-description">
                  Usulan ini berdasar perbandingan jumlah keluhan, bukan wawancara lapangan —
                  verifikasi sebelum direplikasi.
                </p>
              </Blueprint>
            </>
          ) : null}
        </DataPanel>
      </div>
    </>
  );
}
