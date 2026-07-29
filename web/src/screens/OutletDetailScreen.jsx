import { useCallback, useMemo, useState } from 'react';

import { useSession } from '../app/SessionContext.jsx';
import { useAsyncData } from '../app/useAsyncData.js';
import { Blueprint } from '../components/Blueprint.jsx';
import { DataPanel, PANEL_STATUS } from '../components/states/index.js';
import { RadiusMap } from './outlet/RadiusMap.jsx';
import { RatingChart, formatDay } from './outlet/RatingChart.jsx';

const DEFAULT_OUTLET = 'BKS-02';

/**
 * Screen 04 · Detail cabang.
 *
 * One branch read across all three agents at once. The screen exists for the
 * moment where two independent signals point at the same thing — a weak score
 * factor and a leading complaint theme — and that sentence is only worth
 * writing when the data actually says it, so it is composed from the numbers
 * rather than stored as copy.
 */
export function OutletDetailScreen({ onNavigate, query }) {
  const { outletSource, tenant } = useSession();
  const tenantId = tenant?.tenantId ?? 'nusa-retail';
  const [chosen, setChosen] = useState(null);

  const outletId = chosen ?? query?.get('outlet') ?? DEFAULT_OUTLET;

  const loadList = useCallback(() => outletSource.list(tenantId), [outletSource, tenantId]);
  const loadDetail = useCallback(
    () => outletSource.detail(tenantId, outletId),
    [outletSource, tenantId, outletId],
  );

  const branches = useAsyncData(loadList);
  const detail = useAsyncData(loadDetail);
  const { data, error, reload } = detail;

  // The service answers `null` for a branch this tenant cannot see. That is an
  // empty result, not a ready one: rendering ready with no data would leave a
  // header of dashes and no explanation.
  const status =
    detail.status === PANEL_STATUS.READY && !data ? PANEL_STATUS.EMPTY : detail.status;

  const insight = useMemo(() => crossSignal(data), [data]);

  return (
    <>
      {/* Outside the panel on purpose: the picker is its own request, and a
          branch that fails to load must not also take away the only control
          that could get the reader to a branch that works. */}
      {branches.data ? (
        <div className="outlet-picker" role="radiogroup" aria-label="Pilih cabang">
          {branches.data.map((row) => (
            <label key={row.outletId} className="map-layer">
              <input
                type="radio"
                name="outlet"
                checked={row.outletId === outletId}
                onChange={() => setChosen(row.outletId)}
              />
              {row.name}
            </label>
          ))}
        </div>
      ) : null}

      <DataPanel
        status={status}
        className="outlet-header"
        kicker={data ? `${data.outlet.code} · dibuka ${monthYear(data.outlet.openedAt)}` : 'Cabang'}
        loading={{ message: 'Mengumpulkan data cabang…' }}
        empty={{
          title: 'Cabang tidak ditemukan',
          description: 'Cabang ini tidak ada, atau tidak termasuk dalam tenant yang sedang aktif.',
        }}
        error={{
          title: 'Detail cabang tak bisa dimuat',
          description: error?.message ?? 'Layanan cabang tidak menjawab.',
          onRetry: reload,
        }}
      >
        {data ? (
          <div className="outlet-headline">
            <div>
              <h2 className="outlet-name">{data.outlet.name}</h2>
              <p className="outlet-meta">
                {data.outlet.address} · Manajer: {data.outlet.manager}
              </p>
            </div>

            <div className="outlet-figures">
              <Blueprint className="figure">
                <span className="kicker">Rating</span>
                <span className="figure-value">{comma(data.rating.mean)}</span>
                <span className="figure-note">
                  {signed(data.rating.delta)} vs {data.rating.blockWeeks} pekan sebelumnya
                </span>
              </Blueprint>
              <Blueprint className="figure">
                <span className="kicker">Skor lokasi</span>
                <span className="figure-value">{data.location.score}</span>
                <span className="figure-note">
                  peringkat {data.location.rank} dari {data.location.of}
                </span>
              </Blueprint>
            </div>
          </div>
        ) : null}
      </DataPanel>

      <div className="outlet-grid">
        <div className="outlet-main">
          <DataPanel
            status={status}
            kicker={data ? `Rating ${data.trend.weeks} pekan` : 'Rating'}
            meta={
              data ? (
                <span className="panel-meta">
                  {data.rating.reviewCount} review · pekan terakhir{' '}
                  {comma(data.rating.latestWeekRating)}
                </span>
              ) : null
            }
            loading={{ message: 'Menghitung rata-rata mingguan…' }}
            empty={{ title: 'Belum ada review untuk digambar' }}
            error={{ title: 'Grafik tak bisa dimuat', onRetry: reload }}
          >
            {data ? (
              <>
                <RatingChart
                  points={data.trend.points}
                  changePoints={data.trend.changePoints}
                  event={data.event}
                  weeks={data.trend.weeks}
                />

                <p className="state-note">
                  {data.trend.weeks} pekan adalah seluruh rentang review yang ada — bukan 12.
                  Titik yang lebih besar adalah pekan dengan perubahan ≥ 0,15.
                </p>

                {data.event ? (
                  <p className="state-description">
                    <strong>{data.event.name}</strong> buka {formatDay(data.event.openedAt)} pada
                    jarak {data.event.distanceM} m.{' '}
                    {data.event.ratingMoved
                      ? `Pekan itu rating bergerak ${comma(data.event.ratingMoved.from)} → ${comma(
                          data.event.ratingMoved.to,
                        )} (${signed(data.event.ratingMoved.delta)}).`
                      : 'Tidak ada cukup review pekan itu untuk membandingkan.'}{' '}
                    Keduanya terjadi di pekan yang sama; hubungan sebabnya belum diuji.
                  </p>
                ) : (
                  <p className="state-note">
                    Tidak ada pembukaan pesaing tercatat di radius {data.nearby.radiusM} m selama{' '}
                    {data.trend.weeks} pekan ini, jadi tidak ada garis peristiwa untuk digambar.
                  </p>
                )}
              </>
            ) : null}
          </DataPanel>

          <DataPanel
            status={
              data && data.themes.length === 0 && status === PANEL_STATUS.READY
                ? PANEL_STATUS.EMPTY
                : status
            }
            kicker={data ? `Tema keluhan · ${data.trend.weeks} pekan` : 'Tema keluhan'}
            meta={
              data ? (
                <span className="panel-meta">{data.complaintCount} keluhan terklasifikasi</span>
              ) : null
            }
            loading={{ message: 'Mengelompokkan keluhan…' }}
            empty={{
              title: 'Tidak ada keluhan terklasifikasi',
              description: 'Tidak ada review ≤ 3 bintang yang cocok dengan tema mana pun.',
            }}
            error={{ title: 'Tema tak bisa dimuat', onRetry: reload }}
          >
            {data?.themes.length ? (
              <>
                <ul className="theme-bars">
                  {data.themes.map((theme) => (
                    <li key={theme.theme}>
                      <span className="theme-bar-label">{theme.label}</span>
                      <span className="factor-track" aria-hidden="true">
                        <span
                          className="factor-fill"
                          style={{ width: `${Math.round(theme.share * 100)}%` }}
                        />
                      </span>
                      <span className="theme-bar-share">{Math.round(theme.share * 100)}%</span>
                      <span className="theme-bar-count">{theme.count}</span>
                    </li>
                  ))}
                </ul>
                <p className="state-note">
                  Persentase adalah bagian dari {data.complaintCount} keluhan cabang ini, bukan dari
                  seluruh {data.rating.reviewCount} review.
                </p>
              </>
            ) : null}
          </DataPanel>
        </div>

        <div className="outlet-side">
          <DataPanel
            status={status}
            kicker="Sekitar cabang"
            loading={{ message: 'Memindai radius…' }}
            empty={{ title: 'Belum ada data sekitar' }}
            error={{ title: 'Peta sekitar tak bisa dimuat', onRetry: reload }}
          >
            {data ? (
              <>
                <RadiusMap
                  outlet={data.outlet}
                  pois={data.nearby.pois}
                  radiusM={data.nearby.radiusM}
                />
                <p className="state-note">
                  radius {data.nearby.radiusM / 1000} km · {data.nearby.total} pesaing ·{' '}
                  {data.nearby.newSinceCount} baru
                </p>
              </>
            ) : null}
          </DataPanel>

          <DataPanel
            status={status}
            kicker="Faktor skor lokasi"
            loading={{ message: 'Menghitung faktor…' }}
            empty={{ title: 'Belum ada faktor' }}
            error={{ title: 'Faktor tak bisa dimuat', onRetry: reload }}
          >
            {data ? (
              <>
                <ul className="factor-list">
                  {Object.entries(data.location.factors).map(([key, value]) => (
                    <li key={key}>
                      <span className="factor-label">
                        {data.location.factorLabels[key]}
                        <span className="factor-origin">
                          {data.location.surveyedFactors.includes(key) ? ' · survei' : ' · terukur'}
                        </span>
                      </span>
                      <span className="factor-track" aria-hidden="true">
                        <span className="factor-fill" style={{ width: `${value}%` }} />
                      </span>
                      <span className="factor-value">{value}</span>
                    </li>
                  ))}
                </ul>

                {insight ? <p className="state-description">{insight}</p> : null}
              </>
            ) : null}
          </DataPanel>

          {data ? (
            <>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => onNavigate?.('/review')}
              >
                Lihat {data.queue.unreplied} review belum dibalas
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => onNavigate?.('/chat')}
              >
                Tanya agen soal cabang ini
              </button>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

/**
 * The sentence design/SCREENS.md writes by hand — "parking is the biggest drag
 * and also the second complaint theme" — derived instead of asserted, so it
 * only appears on a branch where it is true.
 */
function crossSignal(data) {
  if (!data) return null;

  const [weakestKey] = Object.entries(data.location.factors)
    .filter(([key]) => key !== 'competitors')
    .sort((a, b) => a[1] - b[1])[0] ?? [];
  if (!weakestKey) return null;

  const themeForFactor = { access: 'parkir', traffic: null, mix: 'harga-vs-pesaing' };
  const themeId = themeForFactor[weakestKey];
  if (!themeId) return null;

  const rank = data.themes.findIndex((theme) => theme.theme === themeId);
  if (rank < 0) return null;

  const factorLabel = data.location.factorLabels[weakestKey].toLowerCase();
  const theme = data.themes[rank];

  return (
    `${capitalise(factorLabel)} adalah faktor skor terlemah (${data.location.factors[weakestKey]}) ` +
    `dan sekaligus tema keluhan nomor ${rank + 1} (${theme.count} keluhan) — dua sinyal berbeda ` +
    'menunjuk hal yang sama.'
  );
}

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function monthYear(iso) {
  const [year, month] = String(iso).split('-');
  return `${MONTHS[Number(month) - 1] ?? ''} ${year}`.trim();
}

function comma(value) {
  return value === null || value === undefined ? '—' : value.toFixed(2).replace('.', ',');
}

function signed(value) {
  if (value === null || value === undefined) return '—';
  return `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(2).replace('.', ',')}`;
}
