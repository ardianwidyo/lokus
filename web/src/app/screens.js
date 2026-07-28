/**
 * The 14 screens, in rail order. Titles and subtitles are copied verbatim from
 * design/SCREENS.md — that document is final and this file must not paraphrase
 * it. `railLabel` is the shortened form the left rail shows.
 *
 * `phase` is the phase from specs/001-lokus-core/plan.md that fills the screen
 * in; the shell uses it to say honestly what is not built yet.
 */
export const SCREENS = Object.freeze([
  {
    id: 'masuk',
    path: '/masuk',
    railLabel: 'Masuk',
    title: 'Masuk & pilih tenant',
    subtitle: 'Pemisahan tenant dan peran terlihat sejak layar pertama.',
    phase: 'P0',
    // No tenant is selected yet, so there is nothing to run an agent against.
    showRunAgent: false,
  },
  {
    id: 'briefing',
    path: '/briefing',
    railLabel: 'Briefing Pagi',
    title: 'Briefing Pagi',
    subtitle: 'Hasil siklus agen tadi malam, disaring jadi keputusan yang perlu Anda ambil.',
    phase: 'P4',
  },
  {
    id: 'peta',
    path: '/peta',
    railLabel: 'Peta jaringan',
    title: 'Peta jaringan cabang',
    subtitle: 'Skor lokasi dan kesehatan reputasi 42 cabang di satu permukaan.',
    phase: 'P3',
  },
  {
    id: 'cabang',
    path: '/cabang',
    railLabel: 'Detail cabang',
    title: 'Detail cabang',
    subtitle: 'Satu cabang: tren rating, tema keluhan, dan konteks sekitarnya.',
    phase: 'P3',
  },
  {
    id: 'review',
    path: '/review',
    railLabel: 'Kotak masuk review',
    title: 'Kotak masuk review',
    subtitle: 'Triase otomatis: prioritas, tema, dan draft balasan yang menunggu persetujuan.',
    phase: 'P1',
  },
  {
    id: 'draft',
    path: '/draft',
    railLabel: 'Draft balasan AI',
    title: 'Draft balasan AI',
    subtitle: 'Balasan yang patuh SOP, dengan kutipan sumber dan pemeriksaan guardrail.',
    phase: 'P1',
  },
  {
    id: 'tema',
    path: '/tema',
    railLabel: 'Analisis tema',
    title: 'Analisis tema & sentimen',
    subtitle: 'Tema keluhan × cabang sepanjang waktu — memisahkan masalah lokal dari sistemik.',
    phase: 'P1',
  },
  {
    id: 'site-scout',
    path: '/site-scout',
    railLabel: 'Site Scout',
    title: 'Site Scout',
    subtitle: 'Kandidat lokasi baru, diberi skor dan alasan oleh Agen Lokasi.',
    phase: 'P3',
  },
  {
    id: 'bandingkan',
    path: '/bandingkan',
    railLabel: 'Bandingkan lokasi',
    title: 'Bandingkan lokasi',
    subtitle: 'Dua kandidat berhadapan, faktor demi faktor.',
    phase: 'P3',
  },
  {
    id: 'chat',
    path: '/chat',
    railLabel: 'Chat agen',
    title: 'Chat agen',
    subtitle: 'Satu pertanyaan bahasa manusia, dijawab lintas tiga agen — dengan jejak eksekusinya.',
    phase: 'P4',
  },
  {
    id: 'pengetahuan',
    path: '/pengetahuan',
    railLabel: 'Pusat pengetahuan',
    title: 'Pusat pengetahuan',
    subtitle: 'Dokumen, status indeks, dan celah pengetahuan yang perlu ditutup.',
    phase: 'P2',
  },
  {
    id: 'jawaban',
    path: '/jawaban',
    railLabel: 'Jawaban bersitasi',
    title: 'Jawaban bersitasi',
    subtitle: 'Pertanyaan staf cabang dijawab dengan kutipan halaman SOP.',
    phase: 'P2',
  },
  {
    id: 'tindakan',
    path: '/tindakan',
    railLabel: 'Papan tindakan',
    title: 'Papan tindakan',
    subtitle: 'Insight ditutup menjadi pekerjaan yang benar-benar selesai.',
    phase: 'P4',
  },
  {
    id: 'admin',
    path: '/admin',
    railLabel: 'Admin & biaya',
    title: 'Admin: model, guardrail, biaya',
    subtitle: 'Bukti kesiapan produksi yang bisa dilihat juri, bukan diklaim.',
    phase: 'P5',
  },
]);

/** Two-digit screen number, as the rail and the header kicker show it. */
export function screenNumber(screen) {
  return String(SCREENS.indexOf(screen) + 1).padStart(2, '0');
}

export function findScreenByPath(path) {
  return SCREENS.find((screen) => screen.path === path) ?? null;
}

export const DEFAULT_PATH = SCREENS[0].path;

/**
 * Below 900px the rail becomes a four-item bottom nav
 * (design/UI-GUIDELINES.md, "Responsif").
 */
export const BOTTOM_NAV_IDS = Object.freeze(['briefing', 'peta', 'review', 'chat']);
