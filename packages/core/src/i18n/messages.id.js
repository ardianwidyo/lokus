/**
 * Agent-authored copy, Indonesian — the canonical side of the pair.
 *
 * These are the sentences the agents write about what they found: milestone
 * titles, decision bodies, guardrail explanations, comparison conclusions. Every
 * one of them is LOKUS talking about the tenant's data.
 *
 * What is deliberately *not* here (spec.md US-8, layer three):
 *   - review text, SOP passages and their quotations — the tenant's own words
 *   - the public reply drafted for a review, and its theme scaffolding, which a
 *     customer reads in Indonesian whatever language the operator reads
 *   - proposed SOP clauses, which are drafts destined for an Indonesian document
 *
 * Nested for grouping, read flat: `t(locale, 'briefing.handover.title')`.
 */
export const id = {
  theme: {
    'antrean-kasir': 'Antrean kasir',
    kebersihan: 'Kebersihan',
    'stok-kosong': 'Stok kosong',
    parkir: 'Parkir',
    'harga-vs-pesaing': 'Harga vs pesaing',
    'keramahan-staf': 'Keramahan staf',
  },

  agent: {
    reputation: 'Agen Reputasi',
    knowledge: 'Agen Pengetahuan',
    location: 'Agen Lokasi',
  },

  factor: {
    traffic: 'Lalu lintas pejalan',
    mix: 'Bauran kategori sekitar',
    competitors: 'Kepadatan pesaing',
    access: 'Ketersediaan parkir',
  },

  candidateFactor: {
    traffic: 'Lalu lintas pejalan',
    mix: 'Bauran kategori',
    competitors: 'Pesaing',
    cannibalisation: 'Kanibalisasi',
  },

  origin: {
    measured: 'terukur',
    surveyed: 'survei',
    model: 'model',
  },

  ticketStatus: {
    baru: 'Baru',
    dikerjakan: 'Dikerjakan',
    menunggu: 'Menunggu',
    selesai: 'Selesai',
  },

  systemic: {
    reasonSystemic: 'Muncul di {count} wilayah: {regions}.',
    reasonLocal: 'Hanya di {count} wilayah ({regions}); ambang sistemik {threshold}.',
    noRegion: 'tidak ada',
    headline: '{theme} adalah masalah sistemik, bukan lokal',
    detail:
      'Muncul di {count} dari {total} wilayah yang dipantau. Perbaikan per cabang tidak akan cukup — usulan agen: ubah aturan terkait di SOP pusat.',
  },

  cannibal: {
    verdictNone: 'Tidak ada cabang sendiri untuk dibandingkan.',
    verdictFlagged:
      'Cabang sendiri terdekat {outlet} hanya {km} km — sebagian pelanggan akan berpindah, bukan bertambah.',
    verdictClear: 'Cabang sendiri terdekat {outlet} {km} km — tidak berebut pelanggan.',
  },

  scout: {
    request:
      'Cari kandidat lokasi baru, minimal 1,2 km dari cabang kami sendiri, dengan lalu lintas pejalan tinggi.',
    rejectedReason: 'Hanya {km} km dari {outlet} — di bawah ambang {threshold} km.',
    reasoningNoCompetitors: 'Tidak ada minimarket sejenis dalam radius {radius} m.',
    reasoningCompetitors: '{count} pesaing sejenis dalam radius {radius} m.',
    reasoningCannibal:
      'Cabang sendiri terdekat {outlet} hanya {km} km — sebagian pelanggan akan berpindah, bukan bertambah.',
    reasoningClear: 'Cabang terdekat kami {outlet} {km} km — tidak berebut pelanggan.',
    reasoningPricePlay: 'Cocok bila strateginya harga, bukan kenyamanan.',
  },

  candidate: {
    'cibubur-junction': {
      name: 'Cibubur Junction · sisi timur',
      context: 'Perkantoran dan dua sekolah dalam radius 600 m',
    },
    'kramat-jati': {
      name: 'Kramat Jati · dekat pasar',
      context: 'Pasar harian dengan arus pejalan tertinggi dari semua kandidat',
    },
    'duren-sawit': {
      name: 'Duren Sawit · jalan utama',
      context: 'Jalan utama perumahan, arus stabil sepanjang hari',
    },
    'pondok-gede': {
      name: 'Pondok Gede · seberang terminal',
      context: 'Terminal dan area transit',
    },
    'bekasi-utara': {
      name: 'Bekasi · Jl. Chairil Anwar utara',
      context: 'Ruas yang sama dengan cabang Bekasi Timur, sisi utara',
    },
  },

  compare: {
    rowLocationScore: 'Skor lokasi',
    rowTraffic: 'Lalu lintas pejalan',
    rowCompetitors: 'Pesaing dalam {radius} m',
    rowNearestOwn: 'Cabang sendiri terdekat',
    rowVisits: 'Estimasi kunjungan/hari',
    rowRent: 'Sewa pasaran',
    minimarkets: '{count} minimarket',
    riskCannibalisation: 'risiko kanibalisasi',
    riskMedium: 'risiko sedang',
    riskSafe: 'aman',
    rentUnavailable: 'tidak tersedia',
    rentRange: 'Rp {low}–{high} jt/bln',
    noFactor: 'tidak ada faktor',
    none: 'tidak ada',
    conclusionCannibal:
      'Terlalu dekat dengan {outlet} ({km} km). Sebagian pendapatannya diambil dari cabang sendiri, jadi angka di atas melebih-lebihkan pertumbuhan.',
    conclusionBusyCrowded:
      'Volume lebih tinggi tapi perang harga hampir pasti. Pilih ini hanya jika siap bersaing harga.',
    conclusionStable:
      'Pendapatan lebih stabil dan mudah diprediksi. Pilih ini jika target margin, bukan volume.',
    conclusionMixed:
      'Unggul pada {won}; tertinggal pada {lost}. Keputusannya bergantung pada bobot yang Anda pakai di Admin.',
  },

  guardrail: {
    summary: 'Guardrail lolos {passed}/{total}',
    unsourcedNoClaim: 'Tidak ada klaim spesifik yang perlu sumber.',
    unsourcedCited: 'Klaim bersumber pada {pages}.',
    unsourcedFailed: 'Balasan menyebut aturan atau angka spesifik tanpa satu pun kutipan sumber.',
    personalDataClean: 'Tidak ada data pribadi pelanggan di dalam balasan.',
    personalDataFound: 'Balasan memuat {found}.',
    toneClean: 'Nada sesuai panduan: mengakui, konkret, tanpa janji berlebihan.',
    toneFound: 'Nada menyimpang: {found}.',
    compensationClean: 'Tidak ada janji kompensasi finansial.',
    compensationFound: 'Balasan menjanjikan {found}.',
    pageRef: '{docId} hal. {page}',
    and: ' dan ',
    // The named patterns, as they appear inside the two "found" messages above.
    personalData: {
      phone: 'nomor telepon',
      email: 'email',
      orderNumber: 'nomor pesanan',
      nationalId: 'NIK',
      homeAddress: 'alamat rumah',
    },
    tone: {
      blamesCustomer: 'menyalahkan pelanggan',
      defensive: 'defensif',
      undatedPromise: 'janji tanpa tanggal',
      internalJargon: 'istilah internal',
    },
  },

  cite: {
    refusal: 'Tidak ada di dokumen.',
    reasonBelowThreshold:
      'Tidak ada kutipan yang mencapai ambang keyakinan {threshold}. Kutipan terdekat hanya {best}.',
    reasonModelRefused:
      'Model membaca kutipan yang lolos ambang dan menilai tidak ada yang menjawab pertanyaan ini.',
    confidenceHigh: 'keyakinan tinggi',
    confidenceMedium: 'keyakinan sedang',
  },

  draft: {
    tone: 'hangat, bertanggung jawab',
    refusal: 'tidak ada di dokumen',
    reasonNoPassage: 'Tidak ada pasal SOP di atas ambang {threshold} untuk tema "{theme}".',
    reasonNoTheme: 'Tema keluhan tidak dikenali dari teks review.',
  },

  step: {
    reviewsRead: '{count} review dibaca',
    themesDetected: '{count} tema terdeteksi',
    changePoints: '{count} titik perubahan',
    score: 'skor {score}',
    passagesKept: '{kept} kutipan lolos ambang · {rejected} ditolak',
    noOutlet: 'tidak ada cabang yang disebut',
    route: 'intent {intent} → {agents}',
  },

  finding: {
    leadingThemeNetwork: 'di jaringan',
    leadingThemeAt: 'di {outlet}',
    leadingTheme:
      'Tema keluhan terbesar {where} adalah {theme}: {count} keluhan dalam 8 pekan, {thisWeek} di antaranya pekan ini',
    leadingThemeRising: ', naik {delta}× dibanding sebulan lalu.',
    leadingThemeFlat: '.',
    ratingCurrent: 'Rating berjalan {rating}',
    ratingMoved: ', {direction} {points} poin selama 8 pekan.',
    ratingDown: 'turun',
    ratingUp: 'naik',
    ratingFlat: '.',
    passage: '{title} hal. {page}: “{text}”',
    locationScore:
      'Skor lokasi {outlet} adalah {score} dari 100. Penahan terbesar: {factor} di angka {value}, dengan {competitors} pesaing dalam radius {radius} m',
    locationScoreNew: ', {count} di antaranya baru.',
    locationScoreFlat: '.',
  },

  supervisor: {
    leadOutlet: 'Untuk {outlet}, ini yang ditemukan agen:',
    leadNetwork: 'Ini yang ditemukan agen di seluruh jaringan:',
    caveat: 'Catatan: {reason} Jawaban ini belum memasukkan sudut pandang tersebut.',
    refusalTitle: 'Tidak ada di dokumen.',
    refusalBody:
      'Agen tidak menemukan satu pun sumber yang bisa menopang jawaban untuk pertanyaan ini, jadi tidak ada jawaban yang diberikan. Pertanyaan ini dicatat sebagai celah pengetahuan.',
    sourceReviews: '{count} review',
    sourceDocument: '{title} hal. {page}',
  },

  action: {
    reportGap: 'Laporkan celah pengetahuan',
    createTicketAt: 'Buat tiket ke manajer {outlet}',
    createTicket: 'Buat tiket tindak lanjut',
    openReviews: 'Lihat {count} review',
    showOnMap: 'Tunjukkan di peta',
    ticketTitleTheme: 'Tindak lanjut keluhan {theme}{where}',
    ticketTitleQuestion: 'Tindak lanjut: {question}',
    ticketWhere: ' di {outlet}',
  },

  briefing: {
    reviewsReadTitle: 'Agen Reputasi membaca {count} review baru',
    reviewsReadDetail:
      '{outlets} cabang · {themes} tema terdeteksi · {rising} tema naik dibanding sebulan lalu',
    repliesTitle: '{count} review dibalas otomatis',
    repliesDetail: 'semua bintang 3–5 · {held} ditahan untuk persetujuan Anda',
    locationSkippedTitle: 'Agen Lokasi tidak dijalankan',
    locationSkippedDetail:
      'Tidak ada adapter Places pada siklus ini, jadi area cabang tidak dipindai.',
    locationTitle: 'Agen Lokasi memindai {count} area cabang',
    locationDetail:
      '{poi} POI · {competitors} pesaing baru ditemukan · {pairs} cabang berisiko kanibalisasi',
    knowledgeTitle: 'Agen Pengetahuan memeriksa indeks dokumen',
    knowledgeDetail: 'cakupan jawaban {coverage} · {gaps} celah pengetahuan dilaporkan',
    handoverTitle: 'Briefing diserahkan',
    handoverClean: 'tidak ada panggilan tool yang gagal malam ini',
    handoverFailures: '{count} panggilan tool gagal · semuanya berhasil diulang otomatis',

    decisionThemeTitle: '{theme} memburuk di {outlet}',
    decisionThemeBody:
      'Muncul di {thisWeek} review pekan ini di {outlet}, naik {delta}× dibanding sebulan lalu. Total {total} keluhan dalam 8 pekan. Usulan agen: tangani sesuai pasal SOP terkait selama dua pekan, lalu ukur ulang.',
    decisionSystemicBody: '{detail} Cabang terburuk: {outlet}.',
    decisionGapTitle: 'SOP belum menjawab: {question}',
    decisionGapBody:
      '{occurrences} pertanyaan bulan ini tidak bisa dijawab dari dokumen yang ada. Cakupan jawaban saat ini {coverage}. Usulan agen: tambahkan klausa yang menutup celah ini ke SOP pusat.',

    evidenceComplaints: '{count} keluhan',
    evidenceRising: 'naik {delta}×',
    evidenceRegions: '{count} wilayah',
    evidenceLocal: 'lokal',
    evidenceSystemic: 'sistemik',
    evidenceQuestions: '{count} pertanyaan',
    evidenceCoverage: 'cakupan {coverage}',

    actionApproveTicket: 'Setujui & buat tiket',
    actionReview: 'Telaah',
    actionReviewSop: 'Lihat draft perubahan SOP',
    actionAssignSopOwner: 'Tugaskan ke pemilik SOP',
    actionReadClause: 'Baca draft klausa',

    probeQueue: 'aturan antrean kasir pada jam sibuk',
    probeCleanliness: 'standar kebersihan area belanja',
    probeStock: 'prosedur restock rak utama',
    probeParking: 'penanganan parkir penuh',
    probePrice: 'sikap terhadap selisih harga kompetitor',
    probeStaff: 'penanganan keluhan sikap staf',
    probeQueueLimit: 'batas waktu antrean yang wajib dilaporkan',
  },

  admin: {
    modelReasoning: 'Penalaran',
    modelBulk: 'Ringkasan massal',
    modelEmbedding: 'Embedding',
    modelRuntime: 'Runtime agen',
    modelRegion: 'Region',
    modelServices: 'Layanan',

    guardrailApproval: 'Balasan bintang 1–2 wajib disetujui manusia',
    guardrailCompensation: 'Larang janji kompensasi finansial',
    guardrailConfidence: 'Tolak menjawab bila sumber < {threshold}',
    guardrailPersonalData: 'Redaksi data pribadi sebelum ke model',

    costModel: 'Model',
    costPlaces: 'Places & Maps',
    costWarehouse: 'BigQuery & Run',

    healthUptime: 'Uptime 30 hari',
    healthLastCycle: 'Siklus malam terakhir',
    healthToolFailures: 'Kegagalan tool 7 hari',
    healthToolFailuresNote: 'semua berhasil retry',
    healthLastDeploy: 'Deploy terakhir',
    healthLastDeployNote: 'CI hijau',
  },

  metric: {
    ratingKicker: 'Rating jaringan',
    ratingNote: 'rata-rata {count} review dalam 8 pekan',
    unansweredKicker: 'Belum dibalas',
    unansweredNote: '{held} menunggu persetujuan Anda',
    repliedKicker: 'Dibalas otomatis',
    repliedNote: 'semua bintang 3–5, tanpa persetujuan manual',
    attentionKicker: 'Cabang perlu perhatian',
    attentionNote: 'dari {count} cabang · rating di bawah {threshold}',
  },

  mapNote: {
    pairsHeadline: 'Dua cabang berdekatan terdeteksi',
    pairsBody:
      '{a} dan {b} hanya berjarak {km} km — di bawah ambang {threshold} km. Sebagian pelanggan berpindah antar keduanya, bukan bertambah. Catchment keduanya sudah dihitung ulang.',
    pairsEvidenceKm: '{km} km',
    pairsEvidenceThreshold: 'ambang {threshold} km',
    pairsEvidenceCount: '{count} pasang',
    newCompetitorsHeadline: 'Pesaing baru di sekitar {outlet}',
    newCompetitorsBody:
      '{count} pesaing baru muncul dalam radius {radius}. Skor lokasi {outlet} kini {score}, terendah di jaringan. Faktor kepadatan pesaing turun ke {factor}.',
    evidenceScore: 'skor {score}',
    evidenceCompetitors: '{count} pesaing',
    evidenceRadius: 'radius {radius}',
  },

  ticket: {
    ownerNetwork: 'Ops Excellence',
    ownerExpansion: 'Tim Ekspansi',
    createdByAgent: 'agen',
    surveyTitle: 'Survei lahan kandidat {candidate}',

    'T-119': { title: 'Audit jadwal restock rak minuman' },
    'T-121': { title: 'Tinjau kapasitas parkir motor jam pulang kerja' },
    'T-118': { title: 'Buka kasir kedua 17.00–20.00 selama 2 pekan' },
    'T-116': { title: 'Replikasi pola staf floating dari Bogor' },
    'T-120': { title: 'Survei lahan kandidat Cibubur Junction', impact: 'menunggu anggaran' },
    'T-114': {
      title: 'Perbarui SOP penanganan keluhan antrean',
      impact: 'keluhan antrean turun 18% di 5 cabang',
    },
    'T-109': {
      title: 'Balas 63 review tertunda Bogor',
      impact: 'rating cabang naik 0,2 poin',
    },
  },
};
