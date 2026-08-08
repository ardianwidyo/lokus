/**
 * Agent-authored copy, Indonesian — the canonical side of the pair.
 *
 * These are the sentences the agents write about what they found: milestone
 * titles, decision bodies, guardrail explanations, comparison conclusions. Every
 * one of them is LOKUS talking about the tenant's data.
 *
 * The register is the one `design/UI-GUIDELINES.md` sets for the whole console:
 * everyday spoken Indonesian, short sentences, no term a branch manager would
 * have to look up. Where a technical term names a real mechanism it survives,
 * glossed in plain words with the term once in brackets.
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
    mix: 'Jenis usaha di sekitar',
    competitors: 'Kepadatan pesaing',
    access: 'Ketersediaan parkir',
  },

  candidateFactor: {
    traffic: 'Lalu lintas pejalan',
    mix: 'Jenis usaha sekitar',
    competitors: 'Pesaing',
    cannibalisation: 'Rebutan pelanggan sendiri',
  },

  origin: {
    measured: 'terukur',
    surveyed: 'survei',
    model: 'perkiraan',
  },

  ticketStatus: {
    baru: 'Baru',
    dikerjakan: 'Dikerjakan',
    menunggu: 'Menunggu',
    selesai: 'Selesai',
  },

  systemic: {
    reasonSystemic: 'Muncul di {count} wilayah: {regions}.',
    reasonLocal: 'Baru di {count} wilayah ({regions}); baru dianggap menyeluruh kalau sudah {threshold}.',
    noRegion: 'tidak ada',
    headline: '{theme} adalah masalah semua cabang, bukan satu cabang',
    detail:
      'Muncul di {count} dari {total} wilayah yang dipantau. Membenahi cabang satu per satu tidak akan cukup — usulan agen: ubah aturannya di SOP pusat.',
  },

  cannibal: {
    verdictNone: 'Tidak ada cabang sendiri untuk dibandingkan.',
    verdictFlagged:
      'Cabang sendiri terdekat {outlet} cuma {km} km — sebagian pelanggannya cuma pindah, bukan pelanggan baru.',
    verdictClear: 'Cabang sendiri terdekat {outlet} {km} km — tidak rebutan pelanggan.',
  },

  scout: {
    request:
      'Cari calon lokasi cabang baru, minimal 1,2 km dari cabang kami sendiri, dengan lalu lintas pejalan tinggi.',
    rejectedReason: 'Cuma {km} km dari {outlet} — di bawah batas {threshold} km.',
    reasoningNoCompetitors: 'Tidak ada minimarket sejenis dalam radius {radius} m.',
    reasoningCompetitors: '{count} pesaing sejenis dalam radius {radius} m.',
    reasoningCannibal:
      'Cabang sendiri terdekat {outlet} cuma {km} km — sebagian pelanggannya cuma pindah, bukan pelanggan baru.',
    reasoningClear: 'Cabang kami yang terdekat {outlet} {km} km — tidak rebutan pelanggan.',
    reasoningPricePlay: 'Cocok kalau strateginya harga, bukan kenyamanan.',
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
    rowVisits: 'Perkiraan kunjungan/hari',
    rowRent: 'Sewa pasaran',
    minimarkets: '{count} minimarket',
    riskCannibalisation: 'rebutan pelanggan sendiri',
    riskMedium: 'risiko sedang',
    riskSafe: 'aman',
    rentUnavailable: 'tidak ada datanya',
    rentRange: 'Rp {low}–{high} jt/bln',
    noFactor: 'tidak ada faktor',
    none: 'tidak ada',
    conclusionCannibal:
      'Terlalu dekat dengan {outlet} ({km} km). Sebagian pemasukannya diambil dari cabang sendiri, jadi angka di atas terlihat lebih bagus dari kenyataannya.',
    conclusionBusyCrowded:
      'Ramainya lebih tinggi, tapi perang harga hampir pasti. Pilih ini cuma kalau siap bersaing harga.',
    conclusionStable:
      'Pemasukannya lebih stabil dan gampang ditebak. Pilih ini kalau yang dikejar margin, bukan ramai.',
    conclusionMixed:
      'Unggul di {won}; kalah di {lost}. Keputusannya tergantung bobot yang Anda pakai di Admin.',
  },

  guardrail: {
    summary: 'Cek pengaman lolos {passed}/{total}',
    unsourcedNoClaim: 'Tidak ada klaim khusus yang butuh sumber.',
    unsourcedCited: 'Klaimnya bersumber pada {pages}.',
    unsourcedFailed: 'Balasan menyebut aturan atau angka tertentu tanpa satu pun sumber.',
    personalDataClean: 'Tidak ada data pribadi pelanggan di dalam balasan.',
    personalDataFound: 'Balasan memuat {found}.',
    toneClean: 'Nada sesuai panduan: mengakui masalah, menyebut tindakan jelas, tidak berjanji berlebihan.',
    toneFound: 'Nada melenceng: {found}.',
    compensationClean: 'Tidak ada janji ganti rugi berupa uang.',
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
      defensive: 'membela diri',
      undatedPromise: 'janji tanpa tanggal',
      internalJargon: 'istilah internal',
    },
  },

  cite: {
    refusal: 'Tidak ada di dokumen.',
    reasonBelowThreshold:
      'Tidak ada kutipan yang mencapai batas kecocokan {threshold}. Yang paling mendekati cuma {best}.',
    reasonModelRefused:
      'Model sudah membaca kutipan yang lolos batas, dan menilai tidak ada yang menjawab pertanyaan ini.',
    confidenceHigh: 'kecocokan tinggi',
    confidenceMedium: 'kecocokan sedang',
  },

  draft: {
    tone: 'hangat, bertanggung jawab',
    refusal: 'tidak ada di dokumen',
    reasonNoPassage: 'Tidak ada pasal SOP yang lolos batas {threshold} untuk tema "{theme}".',
    reasonNoTheme: 'Keluhannya tidak bisa dikenali dari teks review.',
  },

  step: {
    reviewsRead: '{count} review dibaca',
    themesDetected: '{count} tema terdeteksi',
    changePoints: '{count} titik perubahan',
    score: 'skor {score}',
    passagesKept: '{kept} kutipan lolos batas · {rejected} ditolak',
    noOutlet: 'tidak ada cabang yang disebut',
    route: 'maksud {intent} → {agents}',
  },

  finding: {
    leadingThemeNetwork: 'di jaringan',
    leadingThemeAt: 'di {outlet}',
    leadingTheme:
      'Keluhan terbanyak {where} adalah {theme}: {count} keluhan dalam 8 pekan, {thisWeek} di antaranya pekan ini',
    leadingThemeRising: ', naik {delta}× dibanding sebulan lalu.',
    leadingThemeFlat: '.',
    ratingCurrent: 'Rating berjalan {rating}',
    ratingMoved: ', {direction} {points} poin selama 8 pekan.',
    ratingDown: 'turun',
    ratingUp: 'naik',
    ratingFlat: '.',
    passage: '{title} hal. {page}: “{text}”',
    locationScore:
      'Skor lokasi {outlet} adalah {score} dari 100. Yang paling menahan: {factor} di angka {value}, dengan {competitors} pesaing dalam radius {radius} m',
    locationScoreNew: ', {count} di antaranya baru.',
    locationScoreFlat: '.',
  },

  supervisor: {
    leadOutlet: 'Untuk {outlet}, ini yang ditemukan agen:',
    leadNetwork: 'Ini yang ditemukan agen di seluruh jaringan:',
    caveat: 'Catatan: {reason} Jawaban ini belum memperhitungkan hal itu.',
    refusalTitle: 'Tidak ada di dokumen.',
    refusalBody:
      'Agen tidak menemukan satu pun sumber untuk menjawab pertanyaan ini, jadi tidak ada jawaban yang diberikan. Pertanyaannya dicatat sebagai celah pengetahuan.',
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
    repliesUnanswerable: '· {count} belum bisa dibalas: halaman Google-nya belum dikelola akun ini',
    locationSkippedTitle: 'Agen Lokasi tidak dijalankan',
    locationSkippedDetail:
      'Tidak ada sambungan ke Places malam ini, jadi area cabang tidak dipindai.',
    locationTitle: 'Agen Lokasi memindai {count} area cabang',
    locationDetail:
      '{poi} tempat sekitar · {competitors} pesaing baru ditemukan · {pairs} cabang berisiko rebutan pelanggan sendiri',
    knowledgeTitle: 'Agen Pengetahuan memeriksa daftar dokumen',
    knowledgeDetail: 'pertanyaan terjawab {coverage} · {gaps} celah pengetahuan dilaporkan',
    handoverTitle: 'Briefing diserahkan',
    handoverClean: 'tidak ada langkah yang gagal malam ini',
    handoverFailures: '{count} langkah gagal · semuanya berhasil diulang otomatis',

    decisionThemeTitle: '{theme} memburuk di {outlet}',
    decisionThemeBody:
      'Muncul di {thisWeek} review pekan ini di {outlet}, naik {delta}× dibanding sebulan lalu. Totalnya {total} keluhan dalam 8 pekan. Usulan agen: tangani sesuai pasal SOP terkait selama dua pekan, lalu ukur lagi.',
    decisionSystemicBody: '{detail} Cabang terburuk: {outlet}.',
    decisionGapTitle: 'SOP belum menjawab: {question}',
    decisionGapBody:
      '{occurrences} pertanyaan bulan ini tidak bisa dijawab dari dokumen yang ada. Sekarang baru {coverage} pertanyaan yang terjawab. Usulan agen: tambahkan pasal yang menutup celah ini ke SOP pusat.',

    evidenceComplaints: '{count} keluhan',
    evidenceRising: 'naik {delta}×',
    evidenceRegions: '{count} wilayah',
    evidenceLocal: 'satu wilayah',
    evidenceSystemic: 'menyeluruh',
    evidenceQuestions: '{count} pertanyaan',
    evidenceCoverage: 'terjawab {coverage}',

    actionApproveTicket: 'Setujui & buat tiket',
    actionReview: 'Periksa dulu',
    actionReviewSop: 'Lihat draft perubahan SOP',
    actionAssignSopOwner: 'Tugaskan ke pemilik SOP',
    actionReadClause: 'Baca draft pasal',

    probeQueue: 'aturan antrean kasir pada jam sibuk',
    probeCleanliness: 'standar kebersihan area belanja',
    probeStock: 'cara mengisi ulang rak utama',
    probeParking: 'cara menangani parkir penuh',
    probePrice: 'sikap kalau harga beda dengan pesaing',
    probeStaff: 'cara menangani keluhan soal sikap staf',
    probeQueueLimit: 'batas waktu antrean yang wajib dilaporkan',
  },

  admin: {
    modelReasoning: 'Penalaran',
    modelBulk: 'Ringkasan borongan',
    modelEndpoint: 'Alamat model',
    modelRetrieval: 'Pencarian dokumen',
    modelRuntime: 'Tempat agen berjalan',
    modelApiRuntime: 'Tempat API berjalan',
    modelSessions: 'Sesi & catatan langkah',
    modelSearchIndex: 'Indeks pencarian terkelola',
    modelManagedRuntime: 'Tempat agen terkelola',
    pathDeterministic: 'Aturan tetap, tanpa AI',
    retrievalKeyword: 'Pencocokan kata kunci · packages/core',
    runtimeSupervisor: 'Supervisor · packages/core',
    runtimeLocal: 'Node lokal',
    sessionsInMemory: 'Disimpan di memori',

    guardrailApproval: 'Balasan bintang 1–2 wajib disetujui orang',
    guardrailCompensation: 'Larang janji ganti rugi berupa uang',
    guardrailConfidence: 'Tolak menjawab kalau sumbernya di bawah {threshold}',
    guardrailPersonalData: 'Hapus data pribadi sebelum dikirim ke model',

    costModel: 'Model',
    costPlaces: 'Places & Maps',
    costWarehouse: 'BigQuery & Run',

    healthUptime: 'Uptime 30 hari',
    healthLastCycle: 'Siklus malam terakhir',
    healthToolFailures: 'Langkah gagal 7 hari',
    healthToolFailuresNote: 'semua berhasil diulang',
    healthLastDeploy: 'Deploy terakhir',
    healthLastDeployNote: 'CI hijau',

    // US-9. Dua metrik ini hanya sah untuk cabang yang riwayat review-nya utuh.
    coverageMedian: 'Waktu balasan pertama · median',
    coverageWithin: 'Dibalas dalam {hours} jam',
    coverageHours: '{hours} jam',
    coverageNoReplies: 'belum ada balasan terkirim',
    coverageCounted: 'dari {counted} cabang yang riwayatnya utuh',
    coverageExcluded: '{count} cabang tidak dihitung: {names}',
    coverageExcludedNone: 'semua cabang dihitung',
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
    pairsHeadline: 'Ada dua cabang yang terlalu berdekatan',
    pairsBody:
      '{a} dan {b} cuma berjarak {km} km — di bawah batas {threshold} km. Sebagian pelanggan cuma pindah antara keduanya, bukan pelanggan baru. Area tangkapan keduanya sudah dihitung ulang.',
    pairsEvidenceKm: '{km} km',
    pairsEvidenceThreshold: 'batas {threshold} km',
    pairsEvidenceCount: '{count} pasang',
    newCompetitorsHeadline: 'Pesaing baru di sekitar {outlet}',
    newCompetitorsBody:
      '{count} pesaing baru muncul dalam radius {radius}. Skor lokasi {outlet} sekarang {score}, terendah di jaringan. Faktor kepadatan pesaingnya turun ke {factor}.',
    evidenceScore: 'skor {score}',
    evidenceCompetitors: '{count} pesaing',
    evidenceRadius: 'radius {radius}',
  },

  ticket: {
    ownerNetwork: 'Ops Excellence',
    ownerExpansion: 'Tim Ekspansi',
    createdByAgent: 'agen',
    surveyTitle: 'Survei lahan calon lokasi {candidate}',

    'T-119': { title: 'Audit jadwal isi ulang rak minuman' },
    'T-121': { title: 'Tinjau kapasitas parkir motor jam pulang kerja' },
    'T-118': { title: 'Buka kasir kedua 17.00–20.00 selama 2 pekan' },
    'T-116': { title: 'Tiru pola staf floating dari Bogor' },
    'T-120': { title: 'Survei lahan calon lokasi Cibubur Junction', impact: 'menunggu anggaran' },
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
