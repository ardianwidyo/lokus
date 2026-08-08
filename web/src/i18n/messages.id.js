/**
 * Console copy, Indonesian — the canonical side of the pair.
 *
 * Every string here is taken from `design/SCREENS.md` and
 * `design/UI-GUIDELINES.md`, which are final. When a screen needs a sentence
 * those documents do not have, the document changes first and this file follows
 * — not the other way round.
 *
 * The register is everyday spoken Indonesian, per `design/UI-GUIDELINES.md`
 * "Gaya bahasa": short sentences, active voice, the words an area manager
 * actually uses. A technical term survives only where it names a real feature,
 * and then it is glossed in plain words with the term once in brackets —
 * "cek pengaman (guardrail)" — so the reader understands it and a reviewer can
 * still trace it to the code.
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
    navLabel: 'Pindah layar',
    bottomNavLabel: 'Menu utama',
    kicker: 'Layar {number}',
    runAgent: 'Jalankan agen',
    noTenant: 'Belum ada perusahaan dipilih',
    pickTenant: 'Pilih perusahaan di layar 01',
    tenantMeta: '{count} cabang · {area}',
    footPrototype: 'Prototipe desain · data contoh',
    footLastCycle: 'Agen terakhir bekerja 06.00 WIB',
    languageLabel: 'Bahasa tampilan',
    languageId: 'ID',
    languageEn: 'EN',
    languageIdFull: 'Bahasa Indonesia',
    languageEnFull: 'English',
    themeLabel: 'Warna tampilan',
    themeLight: 'Terang',
    themeDark: 'Gelap',
    themeLightFull: 'Tampilan terang',
    themeDarkFull: 'Tampilan gelap',
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
      title: 'Masuk & pilih perusahaan',
      subtitle: 'Tiap perusahaan punya datanya sendiri, dan peran Anda menentukan apa yang terbuka.',
    },
    briefing: {
      railLabel: 'Briefing Pagi',
      title: 'Briefing Pagi',
      subtitle: 'Hasil kerja agen tadi malam, diringkas jadi keputusan yang perlu Anda ambil.',
    },
    peta: {
      railLabel: 'Peta jaringan',
      title: 'Peta jaringan cabang',
      subtitle: 'Skor lokasi dan kondisi reputasi 42 cabang dalam satu layar.',
    },
    cabang: {
      railLabel: 'Detail cabang',
      title: 'Detail cabang',
      subtitle: 'Satu cabang: naik-turun rating, keluhan yang sering muncul, dan apa yang ada di sekitarnya.',
    },
    review: {
      railLabel: 'Kotak masuk review',
      title: 'Kotak masuk review',
      subtitle: 'Review disortir otomatis: mana yang mendesak, apa keluhannya, dan draft balasan yang menunggu Anda.',
    },
    draft: {
      railLabel: 'Draft balasan AI',
      title: 'Draft balasan AI',
      subtitle: 'Balasan yang mengikuti SOP, lengkap dengan sumbernya dan hasil cek pengaman.',
    },
    tema: {
      railLabel: 'Analisis tema',
      title: 'Analisis tema & sentimen',
      subtitle: 'Keluhan per cabang dari pekan ke pekan — memisahkan masalah satu cabang dari masalah semua cabang.',
    },
    'site-scout': {
      railLabel: 'Site Scout',
      title: 'Site Scout',
      subtitle: 'Calon lokasi cabang baru, diberi skor dan alasannya oleh Agen Lokasi.',
    },
    bandingkan: {
      railLabel: 'Bandingkan lokasi',
      title: 'Bandingkan lokasi',
      subtitle: 'Dua calon lokasi diadu, satu per satu faktornya.',
    },
    chat: {
      railLabel: 'Chat agen',
      title: 'Chat agen',
      subtitle:
        'Tanya pakai bahasa sehari-hari, dijawab tiga agen sekaligus — lengkap dengan langkah kerjanya.',
    },
    pengetahuan: {
      railLabel: 'Pusat pengetahuan',
      title: 'Pusat pengetahuan',
      subtitle: 'Dokumen, status pembacaannya, dan pertanyaan yang belum dijawab SOP.',
    },
    jawaban: {
      railLabel: 'Jawaban bersumber',
      title: 'Jawaban bersumber',
      subtitle: 'Pertanyaan staf cabang dijawab, lengkap dengan halaman SOP-nya.',
    },
    tindakan: {
      railLabel: 'Papan tindakan',
      title: 'Papan tindakan',
      subtitle: 'Temuan agen berubah jadi pekerjaan yang benar-benar dituntaskan.',
    },
    admin: {
      railLabel: 'Admin & biaya',
      title: 'Admin: model, pengaman, biaya',
      subtitle: 'Bukti kesiapan yang bisa dicek sendiri, bukan sekadar diklaim.',
    },
  },

  // design/UI-GUIDELINES.md, "Empat state wajib".
  state: {
    loadingDefault: 'Agen sedang membaca data…',
    emptyDefault: 'Belum ada data',
    emptyAction: 'Periksa sekarang',
    errorDefault: 'Gagal mengambil data',
    retry: 'Coba lagi',
    viewLog: 'Lihat catatan error',
    permissionDefault: 'Perlu izin akses',
    connect: 'Hubungkan akun',
    readOnlyConnect: 'Peran Anda hanya bisa melihat. Minta admin perusahaan yang menghubungkan akunnya.',
  },

  // US-9. Apa yang boleh dilakukan LOKUS atas listing Google sebuah cabang.
  listing: {
    thisBranch: 'cabang ini',
    levelManaged: 'Halaman Google dikelola',
    levelPublic: 'Halaman Google publik',
    levelAbsent: 'Belum ada di Google',

    publicTitle: 'Halaman Google cabang ini belum diklaim akun ini',
    publicDescription:
      'LOKUS bisa membaca review {outlet} lewat Places, tapi tidak bisa membalasnya. Balasan hanya bisa dikirim dari akun yang memegang halaman Google (listing) cabang itu.',
    connect: 'Hubungkan halaman Google',
    ceilingNote:
      'Untuk halaman yang belum diklaim, Google cuma menampilkan maksimal {count} review. Ini batas dari Google, bukan jumlah review cabang ini.',

    absentTitle: 'Cabang ini belum ada di Google Maps',
    absentDescription:
      'Tidak ada yang bisa dibaca maupun dibalas. Daftarkan {outlet} ke Google Business Profile dulu — menghubungkan akun saja tidak akan memunculkannya.',

    cannotReply: 'Cabang ini belum bisa dibalas',
    coverageExcluded:
      '{count} cabang tidak ikut dihitung: riwayat review-nya tidak lengkap atau tidak ada.',
  },

  common: {
    sampleData: 'data contoh',
    readOnlyApproveReply:
      'Peran Anda hanya bisa melihat. Yang menyetujui balasan adalah manajer atau admin.',
    readOnlyApproveDecision:
      'Peran Anda hanya bisa melihat. Yang menyetujui keputusan adalah manajer atau admin.',
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
    ratingLabel: 'Rata-rata rating tiap pekan selama {weeks} pekan, dari {from} ke {to}',
    eventLabel: '{day} · {name} buka',
    pointLabel: 'Pekan {week} · {date} · rating {rating} dari {reviews} review',
  },

  placeholder: {
    title: 'Layar ini belum dibuat',
    description: '{subtitle} Isinya menyusul di fase {phase}.',
  },

  masuk: {
    signInBy: 'oleh EBCO',
    intro: 'Masuk pakai akun kerja Anda. Cabang mana yang bisa dibuka mengikuti peran Anda di kantor.',
    google: 'Lanjutkan dengan Google Workspace',
    connecting: 'Menghubungkan…',
    or: 'atau',
    emailLabel: 'Email kerja',
    emailPlaceholder: 'nama@perusahaan.co.id',
    sendLink: 'Kirim tautan masuk',
    sending: 'Mengirim…',
    linkSent: 'Tautan masuk sudah dikirim ke {email}. Cek kotak masuk Anda.',
    signInFailed: 'Gagal masuk. Coba lagi.',
    note: 'Masuk lewat akun kantor (SSO). LOKUS tidak menyimpan kata sandi Anda.',

    tenantsKicker: 'Setelah masuk · pilih perusahaan',
    tenantsLoading: 'Mengambil daftar perusahaan dan peran Anda…',
    tenantsEmptyTitle: 'Belum ada perusahaan',
    tenantsEmptyDescription:
      'Akun Anda belum dikaitkan ke perusahaan mana pun. Minta admin kantor menambahkan Anda.',
    tenantsErrorTitle: 'Daftar perusahaan gagal diambil',
    tenantsErrorRetry: '{message} Layar ini tidak mencoba ulang sendiri.',
    tenantsErrorFallback:
      'Layanan sesi tidak menjawab. Layar ini tidak mencoba ulang sendiri.',
    tenantsPermissionTitle: 'Akun ini belum diberi akses ke perusahaan mana pun',
    tenantsPermissionDescription:
      'LOKUS perlu Anda terdaftar di satu perusahaan dulu sebelum bisa menampilkan cabang. Hubungi admin kantor Anda.',
    tenantOpenFailed: 'Perusahaan ini tidak bisa dibuka.',
    tenantNote:
      'Data tiap perusahaan (tenant) dipisah, dan peran menentukan apa yang boleh dibuka — terlihat sejak layar pertama, bukan cuma janji di slide.',

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
      'Agen bekerja lagi malam ini pukul 23.00, dan briefingnya siap sebelum pukul 06.00.',
    errorTitle: 'Briefing gagal ditampilkan',
    errorFallback: 'Hasil kerja semalam tidak bisa diambil.',
    decisionTag: 'Keputusan {rank}',
    decisionMeta: '{time} · {agent}',
  },

  peta: {
    layerScore: 'Skor lokasi',
    layerReputation: 'Kondisi reputasi',
    layerCompetitors: 'Kepadatan pesaing',
    layersLabel: 'Lapisan peta',

    kicker: 'Peta jaringan',
    metaSubset: '{shown} dari {declared} cabang ada di data contoh',
    metaAll: '{count} cabang',
    metaPoi: '{count} tempat di sekitar dicek',
    loading: 'Agen Lokasi sedang memindai area cabang…',
    emptyTitle: 'Belum ada cabang untuk dipetakan',
    emptyDescription: 'Perusahaan ini belum punya cabang terdaftar.',
    errorTitle: 'Peta gagal ditampilkan',
    errorFallback: 'Layanan lokasi tidak menjawab.',

    legendOutlet: 'Cabang sendiri',
    legendCompetitor: 'Pesaing',
    legendRadius: 'Radius 1 km',

    scoresKicker: 'Urut dari skor terendah',
    scoresLoading: 'Menghitung skor lokasi…',
    scoresEmpty: 'Belum ada skor',
    scoresError: 'Skor gagal ditampilkan',
    openDetail: 'Buka detail {name}',

    noteKicker: 'Catatan agen lokasi',
    noteLoading: 'Agen sedang menyusun catatan…',
    noteEmptyTitle: 'Tidak ada temuan',
    noteEmptyDescription: 'Tidak ada cabang yang terlalu berdekatan, dan tidak ada pesaing baru pekan ini.',
    noteError: 'Catatan gagal ditampilkan',

    factorsKicker: 'Faktor skor · {name}',

    fieldLabel: 'Peta {outlets} cabang dan {competitors} pesaing',
    competitorTitle: '{name} · buka {date} · {distance} m',
    competitorTitleNoDate: '{name} · {distance} m',
    outletLabel: '{name}, skor {score}',
    labelRatingUnavailable: 'rating belum ada',
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
    label: 'Tren {weeks} pekan, angka terakhir {last}',
  },

  cabang: {
    pickerLabel: 'Pilih cabang',
    kicker: '{code} · dibuka {month}',
    kickerPlain: 'Cabang',
    loading: 'Mengumpulkan data cabang…',
    emptyTitle: 'Cabang tidak ditemukan',
    emptyDescription: 'Cabang ini tidak ada, atau bukan milik perusahaan yang sedang dibuka.',
    errorTitle: 'Detail cabang gagal ditampilkan',
    errorFallback: 'Layanan cabang tidak menjawab.',
    meta: '{address} · Manajer: {manager}',

    ratingKicker: 'Rating',
    ratingNote: '{delta} dibanding {weeks} pekan sebelumnya',
    locationScoreKicker: 'Skor lokasi',
    locationScoreNote: 'peringkat {rank} dari {of}',

    trendKicker: 'Rating {weeks} pekan',
    trendKickerPlain: 'Rating',
    trendMeta: '{count} review · pekan terakhir {rating}',
    trendLoading: 'Menghitung rata-rata mingguan…',
    trendEmpty: 'Belum ada review untuk digambar',
    trendError: 'Grafik gagal ditampilkan',
    trendNote:
      '{weeks} pekan ini adalah semua review yang ada — bukan 12. Titik yang lebih besar menandai pekan dengan perubahan {threshold} atau lebih.',
    eventOpened: '{name} buka {day}, jaraknya {distance} m.',
    eventMoved: 'Pekan itu rating bergerak {from} → {to} ({delta}).',
    eventNotEnough: 'Review pekan itu terlalu sedikit untuk dibandingkan.',
    eventCaveat: 'Keduanya terjadi di pekan yang sama. Belum tentu yang satu menyebabkan yang lain — itu belum diuji.',
    noEvent:
      'Tidak ada pesaing yang tercatat buka dalam radius {radius} m selama {weeks} pekan ini, jadi tidak ada garis peristiwa untuk digambar.',

    themesKicker: 'Tema keluhan · {weeks} pekan',
    themesKickerPlain: 'Tema keluhan',
    themesMeta: '{count} keluhan terkelompokkan',
    themesLoading: 'Mengelompokkan keluhan…',
    themesEmptyTitle: 'Belum ada keluhan yang terkelompokkan',
    themesEmptyDescription: 'Tidak ada review ≤ 3 bintang yang cocok dengan tema mana pun.',
    themesError: 'Tema gagal ditampilkan',
    themesNote:
      'Persennya dihitung dari {complaints} keluhan cabang ini, bukan dari seluruh {reviews} review.',

    nearbyKicker: 'Sekitar cabang',
    nearbyLoading: 'Memindai radius…',
    nearbyEmpty: 'Belum ada data sekitar',
    nearbyError: 'Peta sekitar gagal ditampilkan',
    nearbyNote: 'radius {km} km · {total} pesaing · {fresh} baru',

    factorsKicker: 'Faktor skor lokasi',
    factorsLoading: 'Menghitung faktor…',
    factorsEmpty: 'Belum ada faktor',
    factorsError: 'Faktor gagal ditampilkan',
    crossSignal:
      '{factor} adalah faktor skor paling lemah ({value}) sekaligus keluhan nomor {rank} ({count} keluhan) — dua hal berbeda menunjuk masalah yang sama.',

    openQueue: 'Lihat {count} review yang belum dibalas',
    askAgent: 'Tanya agen soal cabang ini',
  },

  review: {
    bucketNeedsAction: 'Perlu tindakan',
    bucketDraftReady: 'Draft siap',
    bucketSent: 'Terkirim',
    bucketAdded: 'Ditambahkan (demo)',
    filterLabel: 'Saring review',
    listLabel: 'Daftar review',

    kicker: '{count} {bucket}',
    metaPriority: 'urut dari yang mendesak',
    metaNeedsConnection: '{count} menunggu halaman Google dihubungkan',
    loading: 'Agen sedang membaca review terbaru…',
    emptyTitle: 'Tidak ada review baru',
    emptyDescription:
      'Semua review pekan ini sudah dibalas. Agen mengecek lagi malam ini pukul 23.00.',
    addedEmptyTitle: 'Anda belum menambahkan review',
    addedEmptyDescription:
      'Bagian ini cuma berisi review yang Anda tulis sendiri di sesi ini. Pakai [+ Tambah review (demo)] di bawah daftar untuk memberi agen sesuatu yang belum pernah ia lihat.',
    errorTitle: 'Kotak masuk gagal ditampilkan',
    errorFallback: 'Layanan review tidak menjawab.',
    hint: '↑ ↓ pindah · ⏎ setujui & lanjut · E ubah',

    previewKicker: 'Review · {outlet}',
    previewKickerPlain: 'Review',
    previewLoading: 'Menyiapkan draft balasan…',
    previewEmptyTitle: 'Pilih satu review',
    previewEmptyDescription: 'Detail dan draft balasannya muncul di sini.',
    previewErrorTitle: 'Detail gagal ditampilkan',
    reviewMeta: 'Google · {author} · {relative}',

    sent: 'Sudah terkirim',
    approveAndSend: 'Setujui & kirim ⏎',
    editText: 'Ubah teks',
    makeTicket: 'Jadikan tiket',
    dismiss: 'Abaikan',
    replySent: 'Balasan terkirim, dan persetujuan Anda tercatat.',

    demoTag: 'demo',
    reviewMetaDemo: 'Ditambahkan di demo · {author} · {relative}',
    addOpen: '+ Tambah review (demo)',
    addKicker: 'Tambah review · demo',
    addNote:
      'Review yang Anda tulis di sini masuk antrean seperti review lain — dikelompokkan temanya, dibuatkan draft balasan, dan kena aturan yang sama. Bedanya satu: ada tanda demo, karena bukan dari Google.',
    addOutletLabel: 'Cabang',
    addRatingLabel: 'Bintang',
    addAuthorLabel: 'Nama penulis',
    addAuthorPlaceholder: 'Tamu',
    addTextLabel: 'Teks review',
    addTextPlaceholder: 'Tulis keluhan atau pujian seperti pelanggan menulisnya di Google Maps.',
    addSubmit: 'Tambahkan',
    addWorking: 'Menambahkan…',
    addClose: 'Tutup',
    addReceipt: 'Review {id} masuk antrean. Draft balasannya sudah jadi.',
    addFailed: 'Review gagal ditambahkan.',
    replyFailed: 'Balasan gagal dikirim.',
    guardrailNotRun: 'Cek pengaman belum dijalankan',
    remaining: '{count} tersisa di antrean ini',

    draftKicker: 'Draft balasan',
    draftTone: 'nada: {tone}',
    draftRefusal: 'Tidak ada di dokumen.',
    draftRefusalReason: 'Agen tidak menemukan pasal SOP yang cukup cocok untuk menjawabnya.',
    draftRefusalNote: 'Pertanyaan ini dicatat sebagai celah pengetahuan.',
  },

  draft: {
    checkUnsourced: 'Tidak ada klaim tanpa sumber',
    checkPersonalData: 'Tidak ada data pribadi',
    checkTone: 'Nada sesuai panduan',
    checkCompensation: 'Tidak ada janji ganti rugi',

    sourceKicker: 'Review asalnya',
    loading: 'Agen sedang menyusun draft balasan…',
    emptyTitle: 'Tidak ada draft yang menunggu',
    emptyDescription:
      'Semua review pekan ini sudah dibalas. Agen mengecek lagi malam ini pukul 23.00.',
    errorTitle: 'Draft gagal ditampilkan',
    errorFallback: 'Layanan draft tidak menjawab.',

    reviewMeta: 'Google · {outlet} · {relative}',
    draftTag: 'Draft balasan',
    draftTone: 'Gemini · nada: {tone}',
    refusedTag: 'Agen memilih tidak menjawab',
    refusal: 'Tidak ada di dokumen.',

    approveAndSend: 'Setujui & kirim',
    sent: 'Sudah terkirim',
    editText: 'Ubah teks',
    regenerate: 'Minta versi lain',
    reject: 'Tolak',
    sentReceipt: 'Balasan terkirim. Siapa yang menyetujui dan jam berapa sudah tercatat.',
    sendFailed: 'Balasan gagal dikirim.',
    approvalNote:
      'Balasan tidak pernah dikirim otomatis. Review bintang 1–2 wajib disetujui orang dulu — aturannya diatur di halaman Admin.',
    backToInbox: '← Kembali ke kotak masuk',

    sourcesKicker: 'Diambil dari',
    sourcesLoading: 'Mengambil kutipan SOP…',
    sourcesEmpty: 'Belum ada sumber',
    sourcesError: 'Sumber gagal ditampilkan',
    noSources: 'Draft ini tidak mengambil dari dokumen mana pun, jadi tidak ada yang bisa dikutip.',

    // Deliberately unglossed: on layar 14 every rule already names the file it
    // lives in ("diatur di guardrails.js"), which ties the plain word to the
    // code far better than a bracket — and a glossed kicker wraps to two lines
    // here, on top of the summary beside it.
    guardrailKicker: 'Cek pengaman',
    guardrailLoading: 'Menjalankan pengecekan…',
    guardrailEmpty: 'Belum dicek',
    guardrailError: 'Pengecekan gagal',
  },

  tema: {
    kicker: 'Tema keluhan × cabang',
    title: 'Matriks tema, 8 pekan terakhir',
    meta: '{reviews} review dibaca · {sources} sumber dikutip',
    loading: 'Agen sedang mengelompokkan tema dari teks review…',
    emptyTitle: 'Belum ada tema yang terdeteksi',
    emptyDescription:
      'Tidak ada keluhan dalam 8 pekan terakhir. Agen mengecek lagi malam ini pukul 23.00.',
    errorTitle: 'Analisis tema gagal ditampilkan',
    errorFallback: 'Layanan analitik tidak menjawab.',

    caption: 'Jumlah review keluhan per tema dan cabang selama delapan pekan terakhir',
    colTheme: 'Tema keluhan',
    colTrend: 'Tren 8 pekan',
    colSystemic: 'Menyeluruh',
    regions: '{count} wilayah',
    local: 'satu wilayah',
    sparklineLabel: '{theme}: tren 8 pekan, pekan ini {count}',

    findingKicker: 'Temuan agen · prioritas jaringan',
    findingLoading: 'Menilai sebaran wilayah…',
    findingEmpty: 'Tidak ada masalah yang menyeluruh',
    findingError: 'Temuan gagal ditampilkan',
    findingComplaints: '{count} keluhan',
    findingWorst: 'terburuk: {name}',
    noSystemic: 'Tidak ada keluhan yang muncul sampai 4 wilayah. Semuanya masih masalah cabang masing-masing.',

    sentimentKicker: 'Sentimen jaringan · 8 pekan',
    sentimentLoading: 'Menghitung porsi review negatif…',
    sentimentEmpty: 'Belum ada data sentimen',
    sentimentError: 'Sentimen gagal ditampilkan',
    sentimentBarLabel: 'Pekan {week}: {share} negatif',
    sentimentNote: 'Porsi review negatif tiap pekan · {first} → {last}',

    practiceKicker: 'Praktik baik terdeteksi',
    practiceLoading: 'Mencari cabang pembanding…',
    practiceEmpty: 'Belum ada pembanding',
    practiceError: 'Pembanding gagal ditampilkan',
    practiceDescription:
      'Cabang dengan keluhan “{theme}” paling sedikit di jaringan ({count} dalam 8 pekan). Agen mengusulkan mempelajari cara kerjanya, lalu ditiru cabang yang paling lemah.',
    practiceCaveat:
      'Usulan ini cuma dari membandingkan jumlah keluhan, bukan dari turun ke lapangan — cek dulu sebelum ditiru.',
  },

  scout: {
    kicker: 'Permintaan ke Agen Lokasi',
    loading: 'Agen Lokasi sedang menilai calon lokasi…',
    emptyTitle: 'Tidak ada calon lokasi yang lolos',
    emptyDescription:
      'Semua lokasi yang dilihat jaraknya kurang dari 1,2 km dari cabang yang sudah ada.',
    errorTitle: 'Site Scout gagal ditampilkan',
    errorFallback: 'Layanan lokasi tidak menjawab.',

    statPoi: 'Tempat sekitar dicek',
    statPassed: 'Lolos saringan',
    statRecommended: 'Direkomendasikan',
    rank: 'Peringkat {rank}',
    compare: 'Bandingkan',
    raiseSurvey: 'Jadikan tiket survei',
    surveyTitle: 'Survei lahan calon lokasi {name}',
    ownerExpansion: 'Tim Ekspansi',

    rejectedKicker: 'Ditolak saringan',
    rejectedNote:
      'Lokasi ini bukan jelek — skornya bagus. Ditolak karena terlalu dekat dengan cabang sendiri, jadi sebagian pelanggannya cuma pindah, bukan pelanggan baru.',
    foot: 'Kepadatan pesaing dihitung dari data Places dalam radius yang tertulis; jarak antar cabang sendiri dari hitungan peta. Lalu lintas pejalan dan jenis usaha sekitar masih dari survei — ditandai di tiap baris. Bobot keempat faktor bisa Anda ubah di Admin.',
  },

  compare: {
    kicker: 'Bandingkan calon lokasi',
    meta: '{count} faktor',
    loading: 'Agen Lokasi sedang membandingkan calon lokasi…',
    emptyTitle: 'Belum ada calon lokasi untuk dibandingkan',
    emptyDescription: 'Pilih dua calon lokasi dari Site Scout.',
    emptyAction: 'Buka Site Scout',
    errorTitle: 'Perbandingan gagal ditampilkan',
    errorFallback: 'Layanan lokasi tidak menjawab.',

    caption: 'Perbandingan {a} dan {b}, faktor demi faktor',
    colFactor: 'Faktor',
    colA: 'Lokasi A · direkomendasikan',
    colB: 'Lokasi B',
    conclusion: 'Kesimpulan agen',

    raiseSurvey: 'Ajukan survei {name}',
    swap: 'Ganti calon lokasi',
    askAgent: 'Tanya agen: “bagaimana kalau kejar volume?”',
    footMeasured: 'terukur',
    footSurveyed: 'Survei',
    footModel: 'Perkiraan',
    foot: 'Baris bertanda {measured} dihitung dari data Places dan jarak sebenarnya. {surveyed} datang dari survei lapangan yang datanya belum lengkap. {model} adalah hitungan kasar: kunjungan/hari ≈ skor lalu lintas × {perPoint}, dibagi 1 + pesaing × {weight}, dengan meleset ±{band}. Angka perkiraan bukan hasil pengukuran.',
  },

  chat: {
    intro:
      'Tanya apa saja soal cabang, review, atau SOP. Tiap jawaban datang lengkap dengan langkah kerjanya, sumbernya, dan biayanya.',
    answerLabel: 'Jawaban agen',
    agents: 'Supervisor → {agents}',
    answerMeta: '{steps} langkah · {seconds} s · Rp {cost}',
    noSources: 'Tidak ada sumber yang menopang jawaban ini, jadi agen memilih tidak menjawab.',
    working: 'Agen sedang mengerjakan “{question}”…',
    failed: 'Agen tidak menjawab.',
    inputLabel: 'Pertanyaan untuk agen',
    inputPlaceholder: 'Tanya apa saja soal cabang, review, lokasi, atau SOP…',
    send: 'Kirim',
    actionsLabel: 'Tindakan untuk jawaban ini',
    ticketOwnerFallback: 'tim ops',

    traceLabel: 'Langkah kerja agen',
    traceKicker: 'Langkah kerja agen, lengkap',
    traceMeta: 'run {id}',
    traceEmptyTitle: 'Belum ada langkah tercatat',
    traceEmptyDescription: 'Ajukan satu pertanyaan; tiap langkah agen akan tercatat di sini.',
    traceResults: '{count} hasil',
    openTrace: 'Buka catatan lengkapnya di Cloud Trace →',
    ticketCreatedWithDue: 'Tiket {id} dibuat untuk {owner} · tenggat {due}.',

    costKicker: 'Biaya percakapan ini',
    costEmptyTitle: 'Belum ada biaya',
    costEmptyDescription: 'Biaya dihitung tiap jawaban.',
    costNote:
      '{answers} jawaban · {steps} langkah. Batas maksimal biaya tiap perusahaan diatur di halaman Admin.',

    suggestion1: 'Ringkas keluhan pekan ini',
    suggestion2: 'Kenapa rating cabang Bekasi Timur turun bulan ini?',
    suggestion3: 'Apa kata SOP soal refund?',
  },

  kb: {
    indexIndexed: 'Sudah terbaca',
    indexProcessing: 'Sedang diproses',
    indexAwaitingReview: 'Menunggu ditinjau',
    indexExcluded: 'Tidak dipakai',
    indexQueued: 'Antre',
    // Berkasnya ada, isinya belum dibaca. Bukan "sedang diproses" (tidak ada
    // yang sedang berjalan), bukan "tidak dipakai" (tidak ada yang memutuskan).
    indexAwaitingExtraction: 'Belum dibaca',

    metricDocsKicker: 'Dokumen yang terbaca',
    metricDocsNote: '{chunks} potongan · dari {documents} dokumen',
    metricCoverageKicker: 'Pertanyaan yang terjawab',
    metricCoverageNote: '{answered} dari {probed} hal yang biasa ditanya staf',
    metricUnansweredKicker: 'Pertanyaan tak terjawab',
    metricUnansweredNote: '{count} celah setelah dikelompokkan',
    metricEmbeddingKicker: 'Model pembaca dokumen (embedding)',
    metricEmbeddingNote: '{dimensions} dimensi · dipotong tiap {chunkTokens} token · tumpang tindih {overlapTokens}',

    docsKicker: 'Dokumen',
    docsLoading: 'Membaca daftar dokumen…',
    docsEmptyTitle: 'Belum ada dokumen',
    docsEmptyDescription: 'Unggah SOP pertama Anda untuk mulai.',
    docsErrorTitle: 'Daftar dokumen gagal ditampilkan',
    docsErrorFallback: 'Layanan pengetahuan tidak menjawab.',

    colDocument: 'Dokumen',
    colType: 'Jenis',
    colPages: 'Halaman',
    colChunks: 'Potongan',
    colIndexState: 'Status',
    colUpdated: 'Diperbarui',
    colFile: 'Berkas',
    docsNote:
      'Hanya dokumen bertanda {indexed} yang boleh dikutip agen. Draft yang menunggu ditinjau dan dokumen yang tidak dipakai tidak pernah muncul di jawaban.',
    demoTag: 'demo',

    // Unduhan. Labelnya menyebut apa yang benar-benar diberikan, bukan satu
    // kata "Unduh" untuk tiga hal yang berbeda (AC-10.11).
    downloadOriginal: 'Unduh asli',
    downloadIndexed: 'Unduh teks',
    downloadGeneric: 'Unduh',
    downloadWorking: 'Menyiapkan…',
    downloadDocument: 'Unduh berkas {title}',
    fileNotHeld: 'tidak disimpan',
    downloadNotHeldHint:
      'LOKUS tidak menyimpan berkas dokumen ini dan belum punya satu potongan pun darinya, jadi tidak ada yang bisa diunduh.',
    fileNote:
      'Yang bisa diunduh hanya yang benar-benar disimpan LOKUS. "Unduh asli" memberi berkas yang dulu diserahkan, apa adanya. "Unduh teks" memberi teks yang terbaca agen dalam bentuk .txt — bukan berkas aslinya, dan berkasnya memang tidak ada di sini.',
    downloadDoneOriginal: '"{filename}" diunduh — berkas asli, sama persis seperti saat diserahkan.',
    downloadDoneIndexed:
      '"{filename}" diunduh — ini teks yang terbaca agen, bukan berkas asli dokumennya. LOKUS tidak menyimpan berkas aslinya.',
    downloadDoneUnknown: '"{filename}" diunduh.',
    downloadRestricted:
      'Berkas "{title}" ditandai khusus untuk Admin, jadi tidak bisa diunduh dari peran Anda. Mintakan ke admin kalau memang perlu.',
    downloadNotHeld:
      'LOKUS tidak menyimpan berkas untuk "{title}", dan belum ada potongan yang bisa diberikan sebagai gantinya.',
    downloadMissing: 'Dokumen "{title}" tidak ada lagi. Coba muat ulang daftarnya.',
    downloadFailed: 'Berkas gagal diunduh.',

    docContentKicker: 'Isi dokumen · {title}',
    docContentKickerPlain: 'Isi dokumen',
    docContentChunks: '{count} potongan terbaca',
    docContentMeta: '{type} · {pages} halaman · diperbarui {updated}',
    docContentLoading: 'Mengambil potongan dokumen…',
    docContentEmptyTitle: 'Belum ada dokumen yang dibuka',
    docContentEmptyDescription:
      'Tekan nama dokumen di tabel untuk melihat potongan yang benar-benar terbaca — bukan berkas yang Anda unggah, tapi apa yang dibaca agen.',
    docContentErrorTitle: 'Isi dokumen gagal ditampilkan',
    docContentErrorFallback: 'Layanan pengetahuan tidak menjawab.',
    docContentNoChunks:
      'Dokumen ini terdaftar tapi belum menghasilkan satu potongan pun, jadi tidak ada yang bisa dikutip darinya.',
    docContentNotRetrievable:
      'Potongan di bawah tersimpan tapi belum masuk pencarian. Agen tidak akan mengutipnya sampai statusnya berubah.',
    docContentNotRead:
      'Berkas dokumen ini tersimpan utuh dan bisa diunduh, tapi isinya belum pernah dibaca — jadi belum ada potongan, dan agen belum bisa mengutipnya.',
    chunkMeta: 'hal. {page} · {tokens} token',
    docRestrictedTitle: 'Isi dokumen ini dibatasi',
    docRestrictedDescription:
      '"{title}" ditandai khusus untuk Admin, jadi isinya tidak ditampilkan di sini. Barisnya tetap ada supaya Anda tahu dokumen itu ada dan bisa memintanya ke admin.',

    gapsKicker: 'Celah pengetahuan',
    gapsLoading: 'Mengelompokkan pertanyaan yang tak terjawab…',
    gapsEmptyTitle: 'Belum ada celah tercatat',
    gapsEmptyDescription:
      'Tiap kali agen tidak bisa menjawab, pertanyaannya muncul di sini beserta usulan pasalnya.',
    gapsError: 'Celah gagal ditampilkan',
    gapDescription:
      '{occurrences} pertanyaan dari {people} orang tidak bisa dijawab dari dokumen yang ada.',
    gapPeopleUnknown: 'beberapa',
    // The clause itself is a draft destined for an Indonesian SOP, so it is
    // shown as written. The label says so rather than translating it.
    clauseKicker: 'Usulan pasal · draft',
    clauseKickerForeign: 'Usulan pasal · draft (Bahasa Indonesia, untuk SOP)',
    sendToOwner: 'Kirim ke pemilik SOP',
    editClause: 'Ubah draft',
    clauseSent: 'Draft pasal "{theme}" dikirim ke pemilik SOP.',
    noClause: 'Belum ada usulan pasal — pertanyaan ini baru muncul sekali.',
    clauseNote:
      'Pasal di atas masih {draft}, bukan aturan yang sudah berlaku. Tidak ada yang masuk SOP tanpa disetujui pemiliknya.',
    clauseNoteEmphasis: 'draft yang harus ditinjau orang',

    uploadKicker: 'Unggah dokumen',
    dropzone: 'Tarik berkas PDF, DOCX, XLSX, CSV, .txt, atau .md ke sini — atau tempel isinya di bawah',
    dropzoneNote: 'dipotong tiap {chunkTokens} token, tumpang tindih {overlapTokens}',
    uploadDropActive: 'Lepaskan untuk membaca berkasnya',
    uploadTitleLabel: 'Judul dokumen',
    uploadTitlePlaceholder: 'SOP Layanan Kasir v5',
    uploadTextLabel: 'Isi dokumen',
    uploadTextPlaceholder:
      'Tempel isi SOP di sini. Satu pasal per paragraf paling gampang dicari.',
    uploadSubmit: 'Proses dokumen',
    uploadWorking: 'Memproses…',
    uploadReceipt:
      '"{title}" sudah terbaca — {chunks} potongan, {pages} halaman. Agen bisa mengutipnya sekarang.',
    uploadReceiptStored:
      '"{title}" tersimpan sebagai berkas {type} dan bisa diunduh lagi kapan saja. Isinya belum dibaca, jadi belum ada potongan dan agen belum bisa mengutipnya.',
    uploadReceiptRestricted:
      '"{title}" tersimpan dalam {chunks} potongan tapi belum masuk pencarian. Agen tidak akan mengutipnya sampai ditinjau.',
    uploadUnsupported: 'Jenis berkas ini belum bisa disimpan LOKUS. Yang bisa: {types}.',
    uploadTooLarge:
      'Berkas ini lebih dari {limit} MB, jadi ditolak sebelum diunggah. Pecah dokumennya atau kecilkan dulu.',
    pickedReadable: 'Berkas {type} — isinya terbaca, jadi langsung dipotong dan bisa dikutip agen.',
    pickedStored:
      'Berkas {type} — disimpan utuh dan bisa diunduh lagi, tapi isinya belum dibaca. Agen belum bisa mengutipnya sampai ada pembaca dokumen.',
    pickedRemove: 'Ganti berkas',
    uploadFailed: 'Dokumen gagal diproses.',
    uploadReadOnly: 'Peran Anda hanya bisa melihat. Yang menambah dokumen adalah manajer atau admin.',
    reset: 'Pulihkan data contoh',
    resetDone:
      'Kembali ke data contoh. Semua dokumen dan review yang ditambahkan sesi ini sudah dihapus.',
    restrictLabel: 'Batasi akses khusus Admin',
    restrictNote: 'Dokumen yang dibatasi tetap disimpan, tapi tidak dipakai untuk menjawab pertanyaan umum.',
    seeExample: 'Lihat contoh jawaban bersumber →',
  },

  answer: {
    defaultQuestion:
      'Pelanggan minta refund barang promo yang sudah dibuka. Boleh atau tidak, dan apa syaratnya?',
    askedByChannel: 'via WhatsApp',
    questionMeta: '{name} · {outlet} · {channel}',

    kickerAnswered: 'Jawaban Agen Pengetahuan',
    kicker: 'Agen Pengetahuan',
    meta: '{sources} sumber · {confidence} · {origin}',
    originGenerated: 'ditulis {model}, sumbernya sudah dicek',
    originQuoted: 'dikutip apa adanya dari SOP',
    loading: 'Agen sedang mencari pasal yang cocok…',
    emptyTitle: 'Belum ada pertanyaan',
    errorTitle: 'Jawaban gagal ditampilkan',
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
    foot: 'Kalau kecocokan sumbernya di bawah {threshold}, agen memilih tidak menjawab: ia bilang “tidak ada di dokumen” dan mencatat pertanyaannya sebagai celah pengetahuan. Tidak ada jawaban yang dikarang.',

    sourcesKicker: 'Sumber',
    sourcesLoading: 'Mengambil kutipan…',
    sourcesEmpty: 'Belum ada sumber',
    sourcesError: 'Sumber gagal ditampilkan',
    openPage: 'Buka halaman {page} →',
    rejectedNote: 'Potongan yang sempat dilihat tapi tidak dipakai: {count} · semuanya di bawah batas {threshold}.',
    noSources:
      'Tidak ada kutipan yang lolos batas kecocokan, jadi tidak ada sumber untuk ditampilkan. {count} potongan sempat dilihat dan semuanya ditolak.',
  },

  board: {
    filterAll: 'Semua',
    filterFromAgent: 'Dari agen',
    filterMine: 'Milik saya',
    filterLabel: 'Saring tiket',

    stats: 'Rata-rata tiket selesai: {average} · target {sla} hari',
    statsNone: 'belum ada tiket yang selesai',
    statsDays: '{days} hari',

    kicker: 'Papan tindakan',
    loading: 'Mengambil tiket dari temuan agen…',
    emptyTitle: 'Belum ada tiket',
    emptyDescription:
      'Setujui satu keputusan di Briefing Pagi atau satu jawaban di Chat agen, dan tiketnya muncul di sini.',
    emptyAction: 'Buka Briefing Pagi',
    errorTitle: 'Papan gagal ditampilkan',
    errorFallback: 'Layanan tiket tidak menjawab.',

    noOwner: 'belum ada pemilik',
    closedIn: 'selesai dalam {days} hari',
    dueAt: 'tenggat {date}',
    source: 'dari {source} · {id}',
    sourceBriefing: 'keputusan briefing',
    sourceAgent: 'jawaban agen',
    foot: 'Tiap tiket menyimpan tautan ke temuan yang memicunya, dan mencatat hasilnya setelah ditutup. Itu yang membuat manfaat LOKUS bisa dibuktikan dengan angka, bukan cerita.',
  },

  admin: {
    modelsKicker: 'Model & infrastruktur',
    modelsLoading: 'Membaca pengaturan yang sedang jalan…',
    modelsEmpty: 'Pengaturan tidak tersedia',
    modelsError: 'Pengaturan gagal ditampilkan',
    notConnected: 'belum tersambung',

    reasoningKicker: 'Cara agen berpikir',
    reasoningLoading: 'Membaca pilihan yang tersedia…',
    reasoningEmpty: 'Tidak tersedia di mode contoh',
    reasoningEmptyBody:
      'Konsol ini menjalankan semuanya di browser, jadi tidak ada server yang memegang kredensial untuk dipilih. Jalankan lewat API kalau mau menggantinya.',
    reasoningError: 'Cara agen berpikir tidak bisa dibaca',
    reasoningForbidden: 'Hanya Admin yang boleh melihat bagian ini',
    reasoningFailed: 'Pilihan tidak bisa diubah',
    reasoningLocked:
      'Terkunci di proses ini. Set LOKUS_REASONING_SWITCHABLE=true untuk membukanya — pilihan ini berlaku untuk seluruh proses, bukan per perusahaan.',
    reasoningMutable:
      'Berlaku mulai pertanyaan berikutnya, tanpa perlu restart. Pilihan ini berlaku untuk seluruh proses, bukan per perusahaan.',
    pathUnavailable: 'belum diatur',
    path: {
      deterministic: 'Aturan tetap (deterministik)',
      vertex: 'Vertex AI',
      apikey: 'API key (AI Studio)',
    },
    modelsNote:
      'Dibaca dari proses yang sedang jalan, bukan daftar hafalan. Model dipilih sesuai tugasnya — Flash untuk pekerjaan borongan, model penalaran hanya untuk diagnosis. Baris bertanda [belum tersambung] sudah ada di rancangan tapi belum dipakai kode mana pun.',

    guardrailsKicker: 'Pengaman & kendali manusia',
    guardrailsLoading: 'Membaca aturan pengaman…',
    guardrailsEmpty: 'Belum ada pengaman',
    guardrailsError: 'Pengaman gagal ditampilkan',
    enforcedIn: 'diatur di {file}',
    on: 'aktif',
    off: 'nonaktif',
    thresholdNote: 'Batas kecocokan minimum: {threshold}. Di bawah itu agen menjawab “tidak ada di dokumen”.',

    costKicker: 'Biaya per perusahaan · bulan ini',
    costLoading: 'Menghitung pemakaian anggaran…',
    costEmpty: 'Belum ada biaya tercatat',
    costError: 'Biaya gagal ditampilkan',
    costNote:
      '{used}% dari batas maksimal {ceiling}. Lewat {degrade}%, agen pindah ke model yang lebih murah (Flash) dan mengirim peringatan.',

    coverageKicker: 'Cakupan pengukuran respons',
    coverageLoading: 'Menghitung cakupan pengukuran…',
    coverageEmpty: 'Belum ada data untuk diukur',
    coverageError: 'Cakupan pengukuran gagal ditampilkan',
    coverageNote:
      'Dua angka di atas hanya dihitung dari cabang yang riwayat review-nya utuh. Cabang dengan halaman Google publik cuma menampilkan 5 review pilihan Google, dan cabang tanpa halaman Google tidak menampilkan apa pun — ikut menghitungnya akan membuat angka ini terlihat lebih bagus daripada kenyataannya.',

    evalKicker: 'Evaluasi agen',
    evalTitle: 'Hasil golden set',
    evalMeta: '{cases} kasus · dijalankan tiap deploy',
    evalLoading: 'Membaca laporan evaluasi…',
    evalEmpty: 'Belum ada hasil evaluasi',
    evalError: 'Hasil evaluasi gagal ditampilkan',
    colMetric: 'Yang diukur',
    colScore: 'Skor',
    colThreshold: 'Batas minimal',
    colStatus: 'Status',
    evalNote: 'Laporan dibuat {at} oleh {runner}. Kalau satu batas saja tidak tercapai, kode tidak boleh naik.',

    healthKicker: 'Kesehatan operasional',
    healthLoading: 'Membaca status operasional…',
    healthEmpty: 'Belum ada data operasional',
    healthError: 'Status gagal ditampilkan',
    errorFallback: 'Layanan admin tidak menjawab.',
  },

  /**
   * Domain failures, keyed by the code the API and core actually throw
   * (AC-8.7). A code with no entry falls back to the thrown message, which is
   * Indonesian — readable prose rather than a blank panel or a bare code.
   */
  error: {
    TENANT_FORBIDDEN: 'Akun Anda tidak terdaftar di perusahaan ini.',
    ROLE_FORBIDDEN: 'Peran Anda tidak boleh melakukan ini.',
    AUTH_TENANT_CLAIM_MISSING: 'Sesi Anda belum menyebut perusahaan mana. Coba masuk ulang.',
    AUTH_TOKEN_MISSING: 'Anda belum masuk.',
    TENANT_REQUIRED: 'Permintaan ini tidak menyebut perusahaan mana.',
    PERMISSION_REQUIRED: 'LOKUS belum diberi izin yang dibutuhkan.',
    NOT_IMPLEMENTED: 'Bagian ini belum tersambung.',
    ALREADY_APPROVED: 'Keputusan ini sudah disetujui dan sudah jadi tiket.',
    APPROVER_REQUIRED: 'Persetujuan harus menyebut siapa yang menyetujui.',
    DECISION_REQUIRED: 'Keputusan tidak dikenali.',
    SOURCE_REQUIRED: 'Tiket wajib menautkan temuan asalnya.',
    TITLE_REQUIRED: 'Tiket wajib punya judul.',
    NOT_FOUND: 'Data yang diminta tidak ada di perusahaan ini.',
    OUTLET_NOT_FOUND: 'Cabang ini tidak ada di perusahaan ini.',
    CANDIDATE_NOT_FOUND: 'Calon lokasi ini tidak ditemukan untuk dibandingkan.',
    SAME_CANDIDATE: 'Pilih dua calon lokasi yang berbeda.',
    BUDGET_EXCEEDED: 'Anggaran perusahaan ini bulan ini sudah habis.',
    BUCKET_INVALID: 'Saringan review tidak dikenali.',
    QUESTION_REQUIRED: 'Tulis dulu pertanyaannya.',
    INTERNAL: 'Ada masalah di sisi server.',
  },
};
