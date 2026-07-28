/**
 * The complaint themes and the Indonesian keywords that identify them.
 *
 * AC-2.1: themes are derived from review text, not manual tags. The clustering
 * in `analytics/themeCluster.js` reads only these keywords and the review body
 * — no review in the dataset carries a pre-assigned label that the clusterer is
 * allowed to see.
 *
 * `weight` lets a strong signal ("antre 25 menit") outrank an incidental
 * mention ("pegawainya ramah sih") in the same sentence.
 */
export const THEMES = Object.freeze([
  {
    id: 'antrean-kasir',
    label: 'Antrean kasir',
    keywords: [
      { term: 'antre', weight: 3 },
      { term: 'antri', weight: 3 },
      { term: 'antrean', weight: 3 },
      { term: 'antrian', weight: 3 },
      { term: 'ngantri', weight: 3 },
      { term: 'kasir', weight: 2 },
      { term: 'menunggu lama', weight: 2 },
      { term: 'lama banget', weight: 1 },
    ],
  },
  {
    id: 'kebersihan',
    label: 'Kebersihan',
    keywords: [
      { term: 'kotor', weight: 3 },
      { term: 'jorok', weight: 3 },
      { term: 'kebersihan', weight: 3 },
      { term: 'sampah', weight: 2 },
      { term: 'bau', weight: 2 },
      { term: 'lantai', weight: 1 },
      { term: 'debu', weight: 2 },
    ],
  },
  {
    id: 'stok-kosong',
    label: 'Stok kosong',
    keywords: [
      { term: 'stok', weight: 3 },
      { term: 'kosong', weight: 2 },
      { term: 'habis', weight: 3 },
      { term: 'kehabisan', weight: 3 },
      { term: 'tidak tersedia', weight: 2 },
      { term: 'rak', weight: 1 },
    ],
  },
  {
    id: 'parkir',
    label: 'Parkir',
    keywords: [
      { term: 'parkir', weight: 3 },
      { term: 'parkiran', weight: 3 },
      { term: 'motor susah', weight: 2 },
      { term: 'lahan', weight: 1 },
    ],
  },
  {
    id: 'harga-vs-pesaing',
    label: 'Harga vs pesaing',
    keywords: [
      { term: 'mahal', weight: 3 },
      { term: 'harga', weight: 2 },
      { term: 'lebih murah', weight: 3 },
      { term: 'promo', weight: 1 },
      { term: 'selisih', weight: 2 },
    ],
  },
  {
    id: 'keramahan-staf',
    label: 'Keramahan staf',
    keywords: [
      { term: 'jutek', weight: 3 },
      { term: 'judes', weight: 3 },
      { term: 'kasar', weight: 3 },
      { term: 'tidak ramah', weight: 3 },
      { term: 'cuek', weight: 2 },
      { term: 'pelayanan', weight: 1 },
    ],
  },
]);

const BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]));

export const THEME_IDS = Object.freeze(THEMES.map((theme) => theme.id));

export function findTheme(themeId) {
  return BY_ID.get(themeId) ?? null;
}

export function themeLabel(themeId) {
  return BY_ID.get(themeId)?.label ?? themeId;
}
