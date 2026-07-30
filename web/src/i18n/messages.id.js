/**
 * Console copy, Indonesian — the canonical side of the pair.
 *
 * Every string here is taken from `design/SCREENS.md` and
 * `design/UI-GUIDELINES.md`, which are final. When a screen needs a sentence
 * those documents do not have, the document changes first and this file follows
 * — not the other way round.
 *
 * Nested for grouping, read flat: `t('review.emptyTitle')`.
 *
 * What is *not* here: anything a data source produced. Review text, SOP
 * passages, reply drafts, briefing timelines, metric labels and site-scout
 * reasoning all arrive already in the reader's language from
 * `packages/core/src/i18n` (spec.md US-8). A screen that hardcoded one of those
 * would be a second source of truth for it.
 */
export const id = {
  shell: {
    tagline: 'Local Ops Intelligence',
    screenCount: '14 layar',
    navLabel: 'Navigasi layar',
    bottomNavLabel: 'Navigasi utama',
    kicker: 'Layar {number}',
    runAgent: 'Jalankan agen',
    noTenant: 'Belum ada tenant',
    pickTenant: 'Pilih tenant di layar 01',
    tenantMeta: '{count} cabang · {area}',
    footPrototype: 'Prototipe desain · data contoh',
    footLastCycle: 'Siklus agen terakhir 06.00 WIB',
    languageLabel: 'Bahasa konsol',
    languageId: 'ID',
    languageEn: 'EN',
    languageIdFull: 'Bahasa Indonesia',
    languageEnFull: 'English',
    themeLabel: 'Tema konsol',
    themeLight: 'Terang',
    themeDark: 'Gelap',
    themeLightFull: 'Tema terang',
    themeDarkFull: 'Tema gelap',
  },

  bottomNav: {
    briefing: 'Briefing',
    peta: 'Peta',
    review: 'Review',
    chat: 'Agen',
  },

  role: {
    admin: 'Admin',
    manager: 'Area Manager',
    viewer: 'Viewer',
  },

  phase: {
    P0: 'P0 · Fondasi',
    P1: 'P1 · Reputasi',
    P2: 'P2 · Pengetahuan',
    P3: 'P3 · Lokasi',
    P4: 'P4 · Orkestrasi',
    P5: 'P5 · Pengerasan',
  },

  screen: {
    masuk: {
      railLabel: 'Masuk',
      title: 'Masuk & pilih tenant',
      subtitle: 'Pemisahan tenant dan peran terlihat sejak layar pertama.',
    },
    briefing: {
      railLabel: 'Briefing Pagi',
      title: 'Briefing Pagi',
      subtitle: 'Hasil siklus agen tadi malam, disaring jadi keputusan yang perlu Anda ambil.',
    },
    peta: {
      railLabel: 'Peta jaringan',
      title: 'Peta jaringan cabang',
      subtitle: 'Skor lokasi dan kesehatan reputasi 42 cabang di satu permukaan.',
    },
    cabang: {
      railLabel: 'Detail cabang',
      title: 'Detail cabang',
      subtitle: 'Satu cabang: tren rating, tema keluhan, dan konteks sekitarnya.',
    },
    review: {
      railLabel: 'Kotak masuk review',
      title: 'Kotak masuk review',
      subtitle: 'Triase otomatis: prioritas, tema, dan draft balasan yang menunggu persetujuan.',
    },
    draft: {
      railLabel: 'Draft balasan AI',
      title: 'Draft balasan AI',
      subtitle: 'Balasan yang patuh SOP, dengan kutipan sumber dan pemeriksaan guardrail.',
    },
    tema: {
      railLabel: 'Analisis tema',
      title: 'Analisis tema & sentimen',
      subtitle: 'Tema keluhan × cabang sepanjang waktu — memisahkan masalah lokal dari sistemik.',
    },
    'site-scout': {
      railLabel: 'Site Scout',
      title: 'Site Scout',
      subtitle: 'Kandidat lokasi baru, diberi skor dan alasan oleh Agen Lokasi.',
    },
    bandingkan: {
      railLabel: 'Bandingkan lokasi',
      title: 'Bandingkan lokasi',
      subtitle: 'Dua kandidat berhadapan, faktor demi faktor.',
    },
    chat: {
      railLabel: 'Chat agen',
      title: 'Chat agen',
      subtitle:
        'Satu pertanyaan bahasa manusia, dijawab lintas tiga agen — dengan jejak eksekusinya.',
    },
    pengetahuan: {
      railLabel: 'Pusat pengetahuan',
      title: 'Pusat pengetahuan',
      subtitle: 'Dokumen, status indeks, dan celah pengetahuan yang perlu ditutup.',
    },
    jawaban: {
      railLabel: 'Jawaban bersitasi',
      title: 'Jawaban bersitasi',
      subtitle: 'Pertanyaan staf cabang dijawab dengan kutipan halaman SOP.',
    },
    tindakan: {
      railLabel: 'Papan tindakan',
      title: 'Papan tindakan',
      subtitle: 'Insight ditutup menjadi pekerjaan yang benar-benar selesai.',
    },
    admin: {
      railLabel: 'Admin & biaya',
      title: 'Admin: model, guardrail, biaya',
      subtitle: 'Bukti kesiapan produksi yang bisa dilihat juri, bukan diklaim.',
    },
  },

  // design/UI-GUIDELINES.md, "Empat state wajib".
  state: {
    loadingDefault: 'Agen sedang membaca data…',
    emptyDefault: 'Belum ada data',
    emptyAction: 'Periksa sekarang',
    errorDefault: 'Permintaan gagal',
    retry: 'Coba lagi',
    viewLog: 'Lihat log',
    permissionDefault: 'Perlu izin akses',
    connect: 'Hubungkan akun',
    readOnlyConnect: 'Peran Anda hanya bisa membaca. Minta admin tenant untuk menghubungkan akun.',
  },

  common: {
    sampleData: 'data contoh',
    readOnlyApproveReply:
      'Peran Anda hanya bisa membaca. Persetujuan balasan dilakukan oleh manajer atau admin.',
    readOnlyApproveDecision:
      'Peran Anda hanya bisa membaca. Persetujuan keputusan dilakukan oleh manajer atau admin.',
    ticketFailed: 'Tiket gagal dibuat.',
    ticketCreated: 'Tiket {id} dibuat untuk {owner}.',
    ticketCreatedWithDue: 'Tiket {id} dibuat · pemilik {owner} · tenggat {due}.',
    surveyed: ' · survei',
    measured: ' · terukur',
    fromPlaces: ' · dari Places',
    page: 'hal. {page}',
    score: 'skor {score}',
    stars: '{rating} dari 5 bintang',
    passed: 'lolos',
    failed: 'gagal',
  },

  chart: {
    ratingLabel: 'Rating rata-rata per pekan selama {weeks} pekan, dari {from} ke {to}',
    eventLabel: '{day} · {name} buka',
    pointLabel: 'Pekan {week} · {date} · rating {rating} dari {reviews} review',
  },

  placeholder: {
    title: 'Layar ini belum dibangun',
    description: '{subtitle} Panel akan terisi pada fase {phase}.',
  },

  masuk: {
    signInBy: 'oleh EBCO',
    intro: 'Masuk dengan akun kerja Anda. Akses ke cabang mengikuti peran Anda di organisasi.',
    google: 'Lanjutkan dengan Google Workspace',
    connecting: 'Menghubungkan…',
    or: 'atau',
    emailLabel: 'Email kerja',
    emailPlaceholder: 'nama@perusahaan.co.id',
    sendLink: 'Kirim tautan masuk',
    sending: 'Mengirim…',
    linkSent: 'Tautan masuk dikirim ke {email}. Periksa kotak masuk Anda.',
    signInFailed: 'Masuk gagal. Coba lagi.',
    note: 'Dilindungi SSO organisasi. LOKUS tidak menyimpan kata sandi.',

    tenantsKicker: 'Setelah masuk · pilih tenant',
    tenantsLoading: 'Memuat daftar tenant dan peran Anda…',
    tenantsEmptyTitle: 'Belum ada tenant',
    tenantsEmptyDescription:
      'Akun Anda belum ditautkan ke tenant mana pun. Minta admin organisasi menambahkan Anda.',
    tenantsErrorTitle: 'Daftar tenant tak bisa dimuat',
    tenantsErrorRetry: '{message} Percobaan ulang tidak otomatis di layar ini.',
    tenantsErrorFallback:
      'Layanan sesi tidak menjawab. Percobaan ulang tidak otomatis di layar ini.',
    tenantsPermissionTitle: 'Akun ini belum diberi akses tenant',
    tenantsPermissionDescription:
      'LOKUS butuh keanggotaan tenant sebelum bisa menampilkan cabang. Hubungi admin organisasi Anda.',
    tenantOpenFailed: 'Tenant tidak bisa dibuka.',
    tenantNote:
      'Pemisahan tenant dan peran ditampilkan sejak layar pertama — ini bukti nyata kesiapan multi-tenant, bukan klaim di slide.',

    rowLabel: 'Buka {name}, peran {role}',
    rowMeta: '{count} cabang · {segment} · peran: {role}',
    tagLastOpened: 'Terakhir dibuka',
    tagTrial: 'Uji coba · {days} hari',
    tagReadOnly: 'Baca saja',
  },

  briefing: {
    kicker: 'Briefing pagi · {date}',
    kickerPlain: 'Briefing pagi',
    title: 'Semalam di jaringan Anda',
    meta: '{start} → {end} · {reviews} review dibaca · Rp {cost}',
    loading: 'Agen sedang menyusun briefing semalam…',
    emptyTitle: 'Belum ada briefing',
    emptyDescription:
      'Siklus agen berikutnya berjalan malam ini pukul 23.00 dan briefing siap sebelum 06.00.',
    errorTitle: 'Briefing tak bisa dimuat',
    errorFallback: 'Siklus semalam tidak menjawab.',
    decisionTag: 'Keputusan {rank}',
    decisionMeta: '{time} · {agent}',
  },

  peta: {
    layerScore: 'Skor lokasi',
    layerReputation: 'Kesehatan reputasi',
    layerCompetitors: 'Kepadatan pesaing',
    layersLabel: 'Lapisan peta',

    kicker: 'Peta jaringan',
    metaSubset: '{shown} dari {declared} cabang ada di dataset contoh',
    metaAll: '{count} cabang',
    metaPoi: '{count} POI dianalisis',
    loading: 'Agen Lokasi sedang memindai area cabang…',
    emptyTitle: 'Belum ada cabang untuk dipetakan',
    emptyDescription: 'Tenant ini belum punya cabang yang terdaftar.',
    errorTitle: 'Peta tak bisa dimuat',
    errorFallback: 'Layanan lokasi tidak menjawab.',

    legendOutlet: 'Cabang sendiri',
    legendCompetitor: 'Pesaing',
    legendRadius: 'Radius 1 km',

    scoresKicker: 'Urut menurut · skor terendah',
    scoresLoading: 'Menghitung skor lokasi…',
    scoresEmpty: 'Belum ada skor',
    scoresError: 'Skor tak bisa dimuat',
    openDetail: 'Buka detail {name}',

    noteKicker: 'Catatan agen lokasi',
    noteLoading: 'Agen sedang menyusun catatan…',
    noteEmptyTitle: 'Tidak ada temuan',
    noteEmptyDescription: 'Tidak ada cabang berdekatan dan tidak ada pesaing baru pekan ini.',
    noteError: 'Catatan tak bisa dimuat',

    factorsKicker: 'Faktor skor · {name}',

    fieldLabel: 'Peta {outlets} cabang dan {competitors} pesaing',
    competitorTitle: '{name} · buka {date} · {distance} m',
    competitorTitleNoDate: '{name} · {distance} m',
    outletLabel: '{name}, skor {score}',
    labelRatingUnavailable: 'rating belum tersedia',
    labelRating: 'rating {rating}',
    labelCompetitors: '{count} pesaing',
    labelCompetitorsNew: '{count} pesaing · {new} baru',
    labelScore: 'skor {score}',
  },

  radiusMap: {
    label: '{name} dengan {count} pesaing dalam radius {radius} meter',
    competitorTitle: '{name} · {distance} m · buka {date}',
    competitorTitleNoDate: '{name} · {distance} m',
  },

  sparkline: {
    label: 'Tren {weeks} pekan, nilai terakhir {last}',
  },

  cabang: {
    pickerLabel: 'Pilih cabang',
    kicker: '{code} · dibuka {month}',
    kickerPlain: 'Cabang',
    loading: 'Mengumpulkan data cabang…',
    emptyTitle: 'Cabang tidak ditemukan',
    emptyDescription: 'Cabang ini tidak ada, atau tidak termasuk dalam tenant yang sedang aktif.',
    errorTitle: 'Detail cabang tak bisa dimuat',
    errorFallback: 'Layanan cabang tidak menjawab.',
    meta: '{address} · Manajer: {manager}',

    ratingKicker: 'Rating',
    ratingNote: '{delta} vs {weeks} pekan sebelumnya',
    locationScoreKicker: 'Skor lokasi',
    locationScoreNote: 'peringkat {rank} dari {of}',

    trendKicker: 'Rating {weeks} pekan',
    trendKickerPlain: 'Rating',
    trendMeta: '{count} review · pekan terakhir {rating}',
    trendLoading: 'Menghitung rata-rata mingguan…',
    trendEmpty: 'Belum ada review untuk digambar',
    trendError: 'Grafik tak bisa dimuat',
    trendNote:
      '{weeks} pekan adalah seluruh rentang review yang ada — bukan 12. Titik yang lebih besar adalah pekan dengan perubahan ≥ {threshold}.',
    eventOpened: '{name} buka {day} pada jarak {distance} m.',
    eventMoved: 'Pekan itu rating bergerak {from} → {to} ({delta}).',
    eventNotEnough: 'Tidak ada cukup review pekan itu untuk membandingkan.',
    eventCaveat: 'Keduanya terjadi di pekan yang sama; hubungan sebabnya belum diuji.',
    noEvent:
      'Tidak ada pembukaan pesaing tercatat di radius {radius} m selama {weeks} pekan ini, jadi tidak ada garis peristiwa untuk digambar.',

    themesKicker: 'Tema keluhan · {weeks} pekan',
    themesKickerPlain: 'Tema keluhan',
    themesMeta: '{count} keluhan terklasifikasi',
    themesLoading: 'Mengelompokkan keluhan…',
    themesEmptyTitle: 'Tidak ada keluhan terklasifikasi',
    themesEmptyDescription: 'Tidak ada review ≤ 3 bintang yang cocok dengan tema mana pun.',
    themesError: 'Tema tak bisa dimuat',
    themesNote:
      'Persentase adalah bagian dari {complaints} keluhan cabang ini, bukan dari seluruh {reviews} review.',

    nearbyKicker: 'Sekitar cabang',
    nearbyLoading: 'Memindai radius…',
    nearbyEmpty: 'Belum ada data sekitar',
    nearbyError: 'Peta sekitar tak bisa dimuat',
    nearbyNote: 'radius {km} km · {total} pesaing · {fresh} baru',

    factorsKicker: 'Faktor skor lokasi',
    factorsLoading: 'Menghitung faktor…',
    factorsEmpty: 'Belum ada faktor',
    factorsError: 'Faktor tak bisa dimuat',
    crossSignal:
      '{factor} adalah faktor skor terlemah ({value}) dan sekaligus tema keluhan nomor {rank} ({count} keluhan) — dua sinyal berbeda menunjuk hal yang sama.',

    openQueue: 'Lihat {count} review belum dibalas',
    askAgent: 'Tanya agen soal cabang ini',
  },

  review: {
    bucketNeedsAction: 'Perlu tindakan',
    bucketDraftReady: 'Draft siap',
    bucketSent: 'Terkirim',
    filterLabel: 'Saring review',
    listLabel: 'Daftar review',

    kicker: '{count} {bucket}',
    metaPriority: 'urut prioritas',
    loading: 'Agen sedang membaca review terbaru…',
    emptyTitle: 'Tidak ada review baru',
    emptyDescription:
      'Semua review pekan ini sudah dibalas. Agen akan memeriksa lagi malam ini pukul 23.00.',
    errorTitle: 'Kotak masuk tak bisa dimuat',
    errorFallback: 'Layanan review tidak menjawab.',
    hint: '↑ ↓ pindah · ⏎ setujui & lanjut · E ubah',

    previewKicker: 'Review · {outlet}',
    previewKickerPlain: 'Review',
    previewLoading: 'Menyiapkan draft balasan…',
    previewEmptyTitle: 'Pilih satu review',
    previewEmptyDescription: 'Detail dan draft akan muncul di sini.',
    previewErrorTitle: 'Detail tak bisa dimuat',
    reviewMeta: 'Google · {author} · {relative}',

    sent: 'Sudah terkirim',
    approveAndSend: 'Setujui & kirim ⏎',
    editText: 'Ubah teks',
    makeTicket: 'Jadikan tiket',
    dismiss: 'Abaikan',
    replySent: 'Balasan terkirim dan persetujuan tercatat.',
    replyFailed: 'Balasan gagal dikirim.',
    guardrailNotRun: 'Guardrail belum dijalankan',
    remaining: '{count} tersisa di antrean ini',

    draftKicker: 'Draft balasan',
    draftTone: 'nada: {tone}',
    draftRefusal: 'Tidak ada di dokumen.',
    draftRefusalReason: 'Agen tidak menemukan pasal SOP yang cukup dekat untuk menjawab.',
    draftRefusalNote: 'Pertanyaan ini dicatat sebagai celah pengetahuan.',
  },

  draft: {
    checkUnsourced: 'Tanpa klaim tak bersumber',
    checkPersonalData: 'Tanpa data pribadi',
    checkTone: 'Nada sesuai panduan',
    checkCompensation: 'Tanpa janji kompensasi',

    sourceKicker: 'Review asal',
    loading: 'Agen sedang menyusun draft balasan…',
    emptyTitle: 'Tidak ada draft menunggu',
    emptyDescription:
      'Semua review pekan ini sudah dibalas. Agen akan memeriksa lagi malam ini pukul 23.00.',
    errorTitle: 'Draft tak bisa dimuat',
    errorFallback: 'Layanan draft tidak menjawab.',

    reviewMeta: 'Google · {outlet} · {relative}',
    draftTag: 'Draft balasan',
    draftTone: 'Gemini · nada: {tone}',
    refusedTag: 'Agen menolak menjawab',
    refusal: 'Tidak ada di dokumen.',

    approveAndSend: 'Setujui & kirim',
    sent: 'Sudah terkirim',
    editText: 'Ubah teks',
    regenerate: 'Minta versi lain',
    reject: 'Tolak',
    sentReceipt: 'Balasan terkirim. Penyetuju dan waktunya tercatat.',
    sendFailed: 'Balasan gagal dikirim.',
    approvalNote:
      'Balasan tidak pernah terkirim otomatis. Persetujuan manusia wajib untuk semua review bintang 1–2 — aturan ini ditetapkan di halaman Admin.',
    backToInbox: '← Kembali ke kotak masuk',

    sourcesKicker: 'Bersumber pada',
    sourcesLoading: 'Mengambil kutipan SOP…',
    sourcesEmpty: 'Belum ada sumber',
    sourcesError: 'Sumber tak bisa dimuat',
    noSources: 'Draft ini tidak bersandar pada dokumen mana pun, jadi tidak ada yang bisa dikutip.',

    guardrailKicker: 'Pemeriksaan guardrail',
    guardrailLoading: 'Menjalankan pemeriksaan…',
    guardrailEmpty: 'Belum diperiksa',
    guardrailError: 'Pemeriksaan gagal',
  },

  tema: {
    kicker: 'Tema keluhan × cabang',
    title: 'Matriks tema, 8 pekan terakhir',
    meta: '{reviews} review dianalisis · {sources} sitasi',
    loading: 'Agen sedang mengelompokkan tema dari teks review…',
    emptyTitle: 'Belum ada tema terdeteksi',
    emptyDescription:
      'Tidak ada keluhan pada jendela 8 pekan ini. Agen akan memeriksa lagi malam ini pukul 23.00.',
    errorTitle: 'Analisis tema tak bisa dimuat',
    errorFallback: 'Layanan analitik tidak menjawab.',

    caption: 'Jumlah review keluhan per tema dan cabang selama delapan pekan terakhir',
    colTheme: 'Tema keluhan',
    colTrend: 'Tren 8 pekan',
    colSystemic: 'Sistemik',
    regions: '{count} wilayah',
    local: 'lokal',
    sparklineLabel: '{theme}: tren 8 pekan, pekan ini {count}',

    findingKicker: 'Temuan agen · prioritas jaringan',
    findingLoading: 'Menilai sebaran wilayah…',
    findingEmpty: 'Tidak ada temuan sistemik',
    findingError: 'Temuan tak bisa dimuat',
    findingComplaints: '{count} keluhan',
    findingWorst: 'terburuk: {name}',
    noSystemic: 'Tidak ada tema yang menyentuh 4 wilayah. Semua keluhan masih bersifat lokal.',

    sentimentKicker: 'Sentimen jaringan · 8 pekan',
    sentimentLoading: 'Menghitung proporsi review negatif…',
    sentimentEmpty: 'Belum ada data sentimen',
    sentimentError: 'Sentimen tak bisa dimuat',
    sentimentBarLabel: 'Pekan {week}: {share} negatif',
    sentimentNote: 'Proporsi review negatif per pekan · {first} → {last}',

    practiceKicker: 'Praktik baik terdeteksi',
    practiceLoading: 'Mencari cabang pembanding…',
    practiceEmpty: 'Belum ada pembanding',
    practiceError: 'Pembanding tak bisa dimuat',
    practiceDescription:
      'Cabang dengan keluhan “{theme}” paling sedikit di jaringan ({count} dalam 8 pekan). Agen mengusulkan menelaah pola kerjanya untuk disalin ke cabang terlemah.',
    practiceCaveat:
      'Usulan ini berdasar perbandingan jumlah keluhan, bukan wawancara lapangan — verifikasi sebelum direplikasi.',
  },

  scout: {
    kicker: 'Permintaan ke Agen Lokasi',
    loading: 'Agen Lokasi sedang menilai kandidat lokasi…',
    emptyTitle: 'Tidak ada kandidat yang lolos',
    emptyDescription:
      'Semua lokasi yang dipertimbangkan berada di bawah ambang jarak 1,2 km dari cabang yang sudah ada.',
    errorTitle: 'Site Scout tak bisa dimuat',
    errorFallback: 'Layanan lokasi tidak menjawab.',

    statPoi: 'POI dianalisis',
    statPassed: 'Lolos filter',
    statRecommended: 'Direkomendasikan',
    rank: 'Peringkat {rank}',
    compare: 'Bandingkan',
    raiseSurvey: 'Jadikan tiket survei',
    surveyTitle: 'Survei lahan kandidat {name}',
    ownerExpansion: 'Tim Ekspansi',

    rejectedKicker: 'Ditolak filter',
    rejectedNote:
      'Lokasi ini bukan gagal dinilai — skornya bagus. Ia ditolak karena terlalu dekat dengan cabang sendiri, jadi sebagian pelanggannya hanya akan berpindah.',
    foot: 'Kepadatan pesaing dihitung dari Places dalam radius yang tertera; jarak antar cabang sendiri dari perhitungan geografis. Lalu lintas pejalan dan bauran kategori masih berupa survei — ditandai di setiap baris. Bobot keempat faktor bisa diubah di Admin.',
  },

  compare: {
    kicker: 'Bandingkan kandidat',
    meta: '{count} faktor',
    loading: 'Agen Lokasi sedang membandingkan kandidat…',
    emptyTitle: 'Belum ada kandidat untuk dibandingkan',
    emptyDescription: 'Pilih dua kandidat dari Site Scout.',
    emptyAction: 'Buka Site Scout',
    errorTitle: 'Perbandingan tak bisa dimuat',
    errorFallback: 'Layanan lokasi tidak menjawab.',

    caption: 'Perbandingan {a} dan {b}, faktor demi faktor',
    colFactor: 'Faktor',
    colA: 'Kandidat A · direkomendasikan',
    colB: 'Kandidat B',
    conclusion: 'Kesimpulan agen',

    raiseSurvey: 'Ajukan survei {name}',
    swap: 'Ganti kandidat',
    askAgent: 'Tanya agen: “bagaimana kalau target volume?”',
    footMeasured: 'terukur',
    footSurveyed: 'Survei',
    footModel: 'Model',
    foot: 'Baris bertanda {measured} dihitung dari Places dan jarak geografis. {surveyed} berasal dari data lapangan yang belum kami miliki penuh. {model} adalah estimasi: kunjungan/hari ≈ skor lalu lintas × {perPoint}, dibagi 1 + pesaing × {weight}, dengan rentang ±{band}. Angka model bukan hasil pengukuran.',
  },

  chat: {
    intro:
      'Tanya apa saja tentang cabang, review, atau SOP. Setiap jawaban membawa jejak eksekusinya, sumbernya, dan biayanya.',
    answerLabel: 'Jawaban agen',
    agents: 'Supervisor → {agents}',
    answerMeta: '{steps} langkah · {seconds} s · Rp {cost}',
    noSources: 'Tidak ada sumber yang menopang jawaban ini, jadi agen menolak menjawab.',
    working: 'Agen sedang bekerja untuk “{question}”…',
    failed: 'Agen tidak menjawab.',
    inputLabel: 'Pertanyaan untuk agen',
    inputPlaceholder: 'Tanya apa saja tentang cabang, review, lokasi, atau SOP…',
    send: 'Kirim',
    actionsLabel: 'Tindakan untuk jawaban ini',
    ticketOwnerFallback: 'tim ops',

    traceLabel: 'Jejak eksekusi',
    traceKicker: 'Jejak eksekusi lengkap',
    traceMeta: 'run {id}',
    traceEmptyTitle: 'Belum ada jejak',
    traceEmptyDescription: 'Ajukan satu pertanyaan; setiap langkah agen akan tercatat di sini.',
    traceResults: '{count} hasil',
    openTrace: 'Buka trace lengkap di Cloud Trace →',
    ticketCreatedWithDue: 'Tiket {id} dibuat untuk {owner} · tenggat {due}.',

    costKicker: 'Biaya percakapan ini',
    costEmptyTitle: 'Belum ada biaya',
    costEmptyDescription: 'Biaya dihitung per jawaban.',
    costNote:
      '{answers} jawaban · {steps} langkah tool. Batas keras anggaran tenant diatur di halaman Admin.',

    suggestion1: 'Ringkas keluhan pekan ini',
    suggestion2: 'Kenapa rating cabang Bekasi Timur turun bulan ini?',
    suggestion3: 'Apa kata SOP soal refund?',
  },

  kb: {
    indexIndexed: 'Terindeks',
    indexProcessing: 'Diproses',
    indexAwaitingReview: 'Menunggu tinjauan',
    indexExcluded: 'Dikecualikan',
    indexQueued: 'Antre',

    metricDocsKicker: 'Dokumen terindeks',
    metricDocsNote: '{chunks} potongan · dari {documents} dokumen',
    metricCoverageKicker: 'Cakupan jawaban',
    metricCoverageNote: '{answered} dari {probed} tema yang staf tanyakan',
    metricUnansweredKicker: 'Pertanyaan tak terjawab',
    metricUnansweredNote: '{count} celah setelah dikelompokkan',
    metricEmbeddingKicker: 'Model embedding',
    metricEmbeddingNote: '{dimensions} dim · chunk {chunkTokens} token · overlap {overlapTokens}',

    docsKicker: 'Dokumen',
    docsLoading: 'Membaca indeks dokumen…',
    docsEmptyTitle: 'Belum ada dokumen',
    docsEmptyDescription: 'Unggah SOP pertama Anda untuk mulai.',
    docsErrorTitle: 'Indeks tak bisa dimuat',
    docsErrorFallback: 'Layanan pengetahuan tidak menjawab.',

    colDocument: 'Dokumen',
    colType: 'Jenis',
    colPages: 'Halaman',
    colChunks: 'Potongan',
    colIndexState: 'Status indeks',
    colUpdated: 'Diperbarui',
    docsNote:
      'Hanya dokumen bertanda {indexed} yang bisa dikutip agen. Draft yang menunggu tinjauan dan dokumen yang dikecualikan tidak pernah muncul di jawaban.',

    gapsKicker: 'Celah pengetahuan',
    gapsLoading: 'Mengelompokkan pertanyaan tak terjawab…',
    gapsEmptyTitle: 'Belum ada celah tercatat',
    gapsEmptyDescription:
      'Setiap kali agen menolak menjawab, pertanyaannya muncul di sini beserta usulan klausanya.',
    gapsError: 'Celah tak bisa dimuat',
    gapDescription:
      '{occurrences} pertanyaan dari {people} orang tidak bisa dijawab dari dokumen yang ada.',
    gapPeopleUnknown: 'beberapa',
    // The clause itself is a draft destined for an Indonesian SOP, so it is
    // shown as written. The label says so rather than translating it.
    clauseKicker: 'Usulan klausa · draft',
    clauseKickerForeign: 'Usulan klausa · draft (Bahasa Indonesia, untuk SOP)',
    sendToOwner: 'Kirim ke pemilik SOP',
    editClause: 'Ubah draft',
    clauseSent: 'Draft klausa "{theme}" dikirim ke pemilik SOP.',
    noClause: 'Belum diusulkan klausa — pertanyaan ini baru muncul sekali.',
    clauseNote:
      'Klausa di atas adalah {draft}, bukan aturan yang sudah berlaku. Tidak ada yang masuk SOP tanpa persetujuan pemiliknya.',
    clauseNoteEmphasis: 'draft untuk ditinjau manusia',

    uploadKicker: 'Unggah dokumen',
    dropzone: 'Tarik PDF, DOCX, atau XLSX ke sini',
    dropzoneNote: 'maks. 50 MB · dipotong {chunkTokens} token dengan overlap {overlapTokens}',
    restrictLabel: 'Batasi akses ke peran Admin',
    restrictNote: 'Dokumen yang dibatasi tetap disimpan tapi tidak diindeks untuk jawaban umum.',
    seeExample: 'Lihat contoh jawaban bersitasi →',
  },

  answer: {
    defaultQuestion:
      'Pelanggan minta refund barang promo yang sudah dibuka. Boleh atau tidak, dan apa syaratnya?',
    askedByChannel: 'via WhatsApp',
    questionMeta: '{name} · {outlet} · {channel}',

    kickerAnswered: 'Jawaban Agen Pengetahuan',
    kicker: 'Agen Pengetahuan',
    meta: '{sources} sumber · {confidence} · {origin}',
    originGenerated: 'ditulis {model}, lolos cek sitasi',
    originQuoted: 'dikutip apa adanya dari SOP',
    loading: 'Agen sedang mencari pasal yang relevan…',
    emptyTitle: 'Belum ada pertanyaan',
    errorTitle: 'Jawaban tak bisa dimuat',
    errorFallback: 'Layanan pengetahuan tidak menjawab.',

    sendWhatsApp: 'Kirim ke WhatsApp {name}',
    saveFaq: 'Simpan sebagai FAQ',
    wrongAnswer: 'Jawaban ini salah',
    refusedNote:
      'Pertanyaan ini sudah dicatat sebagai celah pengetahuan. Tidak ada jawaban yang dikarang.',
    seeGaps: 'Lihat celah pengetahuan →',

    inputLabel: 'Pertanyaan staf cabang',
    inputPlaceholder: 'Tanya apa saja yang ada di SOP…',
    ask: 'Tanya',
    foot: 'Agen menolak menjawab bila skor kemiripan sumber di bawah {threshold} — dalam kasus itu ia mengatakan “tidak ada di dokumen” dan mencatat pertanyaannya sebagai celah pengetahuan. Tidak ada jawaban yang dikarang.',

    sourcesKicker: 'Sumber',
    sourcesLoading: 'Mengambil kutipan…',
    sourcesEmpty: 'Belum ada sumber',
    sourcesError: 'Sumber tak bisa dimuat',
    openPage: 'Buka halaman {page} →',
    rejectedNote: 'Potongan yang dipertimbangkan tapi tidak dipakai: {count} · semuanya di bawah ambang {threshold}.',
    noSources:
      'Tidak ada kutipan yang lolos ambang, jadi tidak ada sumber untuk ditampilkan. {count} potongan dipertimbangkan dan semuanya ditolak.',
  },

  board: {
    filterAll: 'Semua',
    filterFromAgent: 'Dari agen',
    filterMine: 'Milik saya',
    filterLabel: 'Saring tiket',

    stats: 'Rata-rata waktu tutup tiket: {average} · SLA {sla} hari',
    statsNone: 'belum ada tiket selesai',
    statsDays: '{days} hari',

    kicker: 'Papan tindakan',
    loading: 'Memuat tiket dari insight agen…',
    emptyTitle: 'Belum ada tiket',
    emptyDescription:
      'Setujui satu keputusan di Briefing Pagi atau satu jawaban di Chat agen, dan tiketnya muncul di sini.',
    emptyAction: 'Buka Briefing Pagi',
    errorTitle: 'Papan tak bisa dimuat',
    errorFallback: 'Layanan tiket tidak menjawab.',

    noOwner: 'belum ada pemilik',
    closedIn: 'ditutup {days} hari',
    dueAt: 'tenggat {date}',
    source: 'dari {source} · {id}',
    sourceBriefing: 'keputusan briefing',
    sourceAgent: 'jawaban agen',
    foot: 'Setiap tiket menyimpan tautan ke insight yang melahirkannya dan mencatat dampaknya setelah ditutup. Itu yang membuat LOKUS bisa membuktikan nilai gunanya dengan angka, bukan cerita.',
  },

  admin: {
    modelsKicker: 'Model & infrastruktur',
    modelsLoading: 'Membaca konfigurasi runtime…',
    modelsEmpty: 'Konfigurasi tak tersedia',
    modelsError: 'Konfigurasi tak bisa dimuat',
    modelsNote:
      'Model dipilih per tugas, bukan satu model untuk semua — Flash untuk pekerjaan massal, model penalaran hanya untuk diagnosis.',

    guardrailsKicker: 'Guardrail & kendali manusia',
    guardrailsLoading: 'Membaca kebijakan guardrail…',
    guardrailsEmpty: 'Belum ada guardrail',
    guardrailsError: 'Guardrail tak bisa dimuat',
    enforcedIn: 'ditegakkan di {file}',
    on: 'aktif',
    off: 'nonaktif',
    thresholdNote: 'Ambang keyakinan minimum: {threshold} — di bawah itu agen menjawab “tidak ada di dokumen”.',

    costKicker: 'Biaya per tenant · bulan ini',
    costLoading: 'Menghitung pemakaian anggaran…',
    costEmpty: 'Belum ada biaya tercatat',
    costError: 'Biaya tak bisa dimuat',
    costNote:
      '{used}% dari batas keras {ceiling}. Di atas {degrade}%, agen turun ke mode Flash dan mengirim peringatan.',

    evalKicker: 'Evaluasi agen',
    evalTitle: 'Hasil golden set',
    evalMeta: '{cases} kasus · dijalankan tiap deploy',
    evalLoading: 'Membaca laporan evaluasi…',
    evalEmpty: 'Belum ada hasil evaluasi',
    evalError: 'Hasil evaluasi tak bisa dimuat',
    colMetric: 'Metrik',
    colScore: 'Skor',
    colThreshold: 'Ambang',
    colStatus: 'Status',
    evalNote: 'Laporan dihasilkan {at} oleh {runner}. CI memblokir merge bila satu ambang saja gagal.',

    healthKicker: 'Kesehatan operasional',
    healthLoading: 'Membaca status operasional…',
    healthEmpty: 'Belum ada data operasional',
    healthError: 'Status tak bisa dimuat',
    errorFallback: 'Layanan admin tidak menjawab.',
  },

  /**
   * Domain failures, keyed by the code the API and core actually throw
   * (AC-8.7). A code with no entry falls back to the thrown message, which is
   * Indonesian — readable prose rather than a blank panel or a bare code.
   */
  error: {
    TENANT_FORBIDDEN: 'Akun Anda tidak punya keanggotaan di tenant ini.',
    ROLE_FORBIDDEN: 'Peran Anda tidak boleh melakukan tindakan ini.',
    AUTH_TENANT_CLAIM_MISSING: 'Token Anda belum memuat klaim tenant.',
    AUTH_TOKEN_MISSING: 'Anda belum masuk.',
    TENANT_REQUIRED: 'Permintaan ini tidak menyebutkan tenant.',
    PERMISSION_REQUIRED: 'LOKUS belum diberi izin yang dibutuhkan.',
    NOT_IMPLEMENTED: 'Bagian ini belum tersambung.',
    ALREADY_APPROVED: 'Keputusan ini sudah disetujui dan sudah menjadi tiket.',
    APPROVER_REQUIRED: 'Persetujuan harus mencantumkan identitas penyetujunya.',
    DECISION_REQUIRED: 'Keputusan tidak dikenali.',
    SOURCE_REQUIRED: 'Tiket wajib menautkan insight asalnya.',
    TITLE_REQUIRED: 'Tiket wajib punya judul.',
    NOT_FOUND: 'Data yang diminta tidak ditemukan untuk tenant ini.',
    OUTLET_NOT_FOUND: 'Cabang tidak ditemukan untuk tenant ini.',
    CANDIDATE_NOT_FOUND: 'Kandidat tidak ditemukan untuk dibandingkan.',
    SAME_CANDIDATE: 'Pilih dua kandidat yang berbeda.',
    BUDGET_EXCEEDED: 'Anggaran tenant bulan ini sudah habis.',
    BUCKET_INVALID: 'Saringan review tidak dikenali.',
    QUESTION_REQUIRED: 'Tulis pertanyaannya dulu.',
    INTERNAL: 'Terjadi kesalahan di sisi server.',
  },
};
