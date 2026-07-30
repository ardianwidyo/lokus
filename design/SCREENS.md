# Screens — LOKUS (14 layar)

Prototipe: `design/reference/03-aplikasi-14-layar.dc.html` (klik rail kiri untuk
pindah layar). Copy Indonesia di dokumen ini sudah final — pakai apa adanya.

Sejak US-8 konsol punya dua bahasa. Copy Indonesia di dokumen ini tetap **sumber
kebenaran**: ia yang ditulis lebih dulu, dan Inggris adalah terjemahan yang
ditulis terhadapnya, bukan sebaliknya. Kalau keduanya berbeda arti, yang
Indonesia yang benar dan terjemahannya yang salah. Padanan Inggris tinggal di
`web/src/i18n/messages.en.js`, bukan di dokumen ini — satu tempat, supaya tidak
ada dua daftar yang bisa berselisih.

## Shell (semua layar)

- **Rail kiri**, lebar 238px, `border-right: 1px solid var(--color-divider)`,
  scroll sendiri. Isi dari atas: lockup (kotak LOGO 32px + "LOKUS" 18px Barlow
  Condensed + "Local Ops Intelligence" 9px uppercase) · pemilih tenant (kotak
  hairline, ikon rumah 15px aksen, "Nusa Retail" 14px + "42 cabang ·
  Jabodetabek" 10.5px, chevron 13px) · label "14 LAYAR" · 14 item nav.
- **Item nav**: nomor 2 digit 10px `--color-neutral-500` + label 14.5px Barlow
  Condensed, padding `7px 16px`. Aktif: latar `--color-accent-100`, teks
  `--color-accent-900`, `border-left: 2px solid var(--color-accent)`. Hover:
  latar `--color-accent-100`.
- **Pemilih bahasa** di kaki rail, di atas baris keterangan: dua tombol `ID` dan
  `EN` dalam satu kelompok `radiogroup`, 11px Barlow Condensed uppercase, kotak
  hairline seperti `.seg`. Yang aktif memakai latar `--color-accent-100` + teks
  `--color-accent-900`. Tidak ada bendera dan tidak ada dropdown — dua pilihan
  tidak perlu disembunyikan. Di bawah 900px kontrol ini pindah ke header konten,
  sebelah tombol **Jalankan agen**, karena rail tidak tampil.
- **Pemilih tema**, tepat di bawah pemilih bahasa dan berbagi treatment visual
  yang sama persis: dua tombol **Terang** dan **Gelap** dalam satu
  `radiogroup`. Default mengikuti preferensi sistem operasi pembaca sampai
  pembaca memilih sendiri, lalu pilihan itu yang menang selamanya (sama
  seperti bahasa). Sama seperti pemilih bahasa, pindah ke header konten di
  bawah 900px.
- **Kaki rail**: "Prototipe desain · data contoh / Siklus agen terakhir 06.00 WIB"
  11px `--color-neutral-600`.
- **Header konten** (sticky, `padding: 18px 28px`, border bawah): kicker
  "LAYAR 02" + judul layar 26px Barlow Condensed · subjudul 12.5px rata kanan
  (maks 44ch) · tombol primer **Jalankan agen** dengan ikon play 14px.
- **Isi**: `padding: 26px 28px 60px`, kolom flex `gap: 22px`.

Judul & subjudul per layar:

| # | Judul | Subjudul |
|---|---|---|
| 01 | Masuk & pilih tenant | Pemisahan tenant dan peran terlihat sejak layar pertama. |
| 02 | Briefing Pagi | Hasil siklus agen tadi malam, disaring jadi keputusan yang perlu Anda ambil. |
| 03 | Peta jaringan cabang | Skor lokasi dan kesehatan reputasi 42 cabang di satu permukaan. |
| 04 | Detail cabang | Satu cabang: tren rating, tema keluhan, dan konteks sekitarnya. |
| 05 | Kotak masuk review | Triase otomatis: prioritas, tema, dan draft balasan yang menunggu persetujuan. |
| 06 | Draft balasan AI | Balasan yang patuh SOP, dengan kutipan sumber dan pemeriksaan guardrail. |
| 07 | Analisis tema & sentimen | Tema keluhan × cabang sepanjang waktu — memisahkan masalah lokal dari sistemik. |
| 08 | Site Scout | Kandidat lokasi baru, diberi skor dan alasan oleh Agen Lokasi. |
| 09 | Bandingkan lokasi | Dua kandidat berhadapan, faktor demi faktor. |
| 10 | Chat agen | Satu pertanyaan bahasa manusia, dijawab lintas tiga agen — dengan jejak eksekusinya. |
| 11 | Pusat pengetahuan | Dokumen, status indeks, dan celah pengetahuan yang perlu ditutup. |
| 12 | Jawaban bersitasi | Pertanyaan staf cabang dijawab dengan kutipan halaman SOP. |
| 13 | Papan tindakan | Insight ditutup menjadi pekerjaan yang benar-benar selesai. |
| 14 | Admin: model, guardrail, biaya | Bukti kesiapan produksi yang bisa dilihat juri, bukan diklaim. |

---

## 01 · Masuk & pilih tenant

**Layout** dua kolom: kartu masuk 400px + panel tenant fleksibel (min 330px).

Kartu masuk: lockup (LOGO 36px + "LOKUS" 21px + "oleh EBCO" 9.5px uppercase) ·
paragraf "Masuk dengan akun kerja Anda. Akses ke cabang mengikuti peran Anda di
organisasi." · tombol sekunder blok **Lanjutkan dengan Google Workspace** (ikon
16px, konten rata kiri, padding 11px 13px) · pemisah "atau" dengan garis di kedua
sisi · field "Email kerja" placeholder `nama@perusahaan.co.id` · tombol primer
blok **Kirim tautan masuk** · catatan 11.5px "Dilindungi SSO organisasi. LOKUS
tidak menyimpan kata sandi."

Panel tenant: kicker "SETELAH MASUK · PILIH TENANT" lalu tiga baris hairline —
Nusa Retail (42 cabang · minimarket · peran: Area Manager, tag "Terakhir
dibuka", border `--color-accent`) · Klinik Sehat Prima (11 cabang · klinik ·
peran: Viewer, tag "Baca saja") · Dealer Arta Motor (7 cabang · otomotif ·
peran: Admin, tag "Uji coba · 12 hari"). Catatan penutup 12.5px: "Pemisahan
tenant dan peran ditampilkan sejak layar pertama — ini bukti nyata kesiapan
multi-tenant, bukan klaim di slide."

**Perilaku**: memilih tenant menyimpan `tenantId` + `role`, membuang cache, lalu
membuka layar 02. Peran viewer menyembunyikan semua tombol yang mengubah data.

---

## 02 · Briefing Pagi

Satu panel `blueprint` besar berisi **garis waktu semalam**.

Header panel: "Semalam di jaringan Anda" 22px + kanan "23.00 → 06.00 · 7 jam
kerja agen · Rp 61.400" 12.5px.

Garis waktu: `padding-left: 20px`, `border-left: 1px solid var(--color-divider)`.
Tiap simpul biasa: penanda 11px persegi berbingkai aksen di `left:-26px`, waktu
12px `--color-neutral-600`, judul 18px Barlow Condensed, keterangan 13px
`--color-neutral-700`.

Urutan simpul:

1. `23.02` Agen Reputasi membaca 214 review baru — "42 cabang · 7 tema terdeteksi · 3 tema naik dibanding pekan lalu"
2. `23.48` 187 review dibalas otomatis — "semua bintang 3–5 · 27 ditahan untuk persetujuan Anda"
3. **Keputusan 1** (blok aksen)
4. `02.30` Agen Lokasi memindai 42 area cabang — "1.284 POI · 1 pesaing baru ditemukan · 2 cabang berisiko kanibalisasi"
5. **Keputusan 2** (blok aksen)
6. `05.10` Agen Pengetahuan mengindeks 3 dokumen baru — "cakupan jawaban 79% → 82% · 1 celah pengetahuan dilaporkan"
7. **Keputusan 3** (blok aksen)
8. `06.00` Briefing diserahkan — "3 panggilan tool gagal malam ini · semuanya berhasil diulang otomatis"

**Blok keputusan**: `padding: 18px 22px`, latar `--color-accent-100`, border
`--color-accent-300`, penanda kotak padat aksen. Isi: tag outline
"Keputusan N" + "01.14 · Agen Reputasi" 12px aksen-700 · judul 22px
`--color-accent-900` · paragraf 13.5px (maks 88ch) · baris tag netral bukti ·
tombol.

1. **Antrean kasir Bekasi Timur memburuk** — "Muncul di 11 dari 18 review pekan
   ini, naik 3× dari Juni. Rating cabang turun 0,4. Usulan agen: buka kasir kedua
   pukul 17.00–20.00 selama dua pekan, lalu ukur ulang." · tag: rating 3,8 ·
   −0,4 poin · SOP v4 hal. 12 · [Setujui & buat tiket] [Telaah]
2. **Pesaing baru 400 m dari Depok Margonda** — "Sebuah minimarket dibuka
   28 Juni dan jam sibuknya bertumpuk. Skor lokasi Depok turun dari 78 ke 69.
   Usulan agen: geser promo jam sibuk dan tinjau ulang jam operasional." · tag:
   skor 69 · radius 1 km · 6 POI · Places Insight · [Lihat di peta] [Tunda]
3. **SOP keluhan antrean belum menyebut batas waktu** — "37 pertanyaan staf bulan
   ini tidak bisa dijawab dari dokumen yang ada. Usulan agen: tambahkan satu
   klausa batas waktu 10 menit; draft klausa sudah disiapkan." · tag: 37
   pertanyaan · cakupan 82% · draft siap · [Baca draft klausa] [Tugaskan]

Di bawah panel: empat kartu metrik — Rating jaringan **4,21** (+0,08, sparkline
naik) · Belum dibalas **137** (−64, "Target akhir pekan: di bawah 40") · Waktu
balas **4,2 jam** (bar 4%, "Sebelum LOKUS: 9 hari") · Cabang perlu perhatian
**6** dari 42 (bar bertingkat ramp aksen).

**Perilaku**: *Setujui & buat tiket* → layar 13 dengan tiket baru; *Lihat di
peta* → layar 03 terpusat pada Depok; *Baca draft klausa* → layar 11.

---

## 03 · Peta jaringan cabang

Grid `1fr 330px`.

**Peta** (tinggi 520px, latar `--color-accent-900`): grid garis, tiga jalan,
lingkaran radius dashed di sekitar BKS-02, marker sesuai bentuk (5 kotak cabang,
4 lingkaran pesaing, 2 segitiga kandidat). Label: "BKS-02 Bekasi Timur" 17px
putih + "skor 72 · rating 3,8 · 18 review baru" 12px 62% · "DPK-01 · 69" ·
"SRP-03 · 81" · "kandidat · 84" (`#94bce3`). Chip lapisan kiri atas: **Skor
lokasi** (aktif, latar putih 14%), Kesehatan reputasi, Kepadatan pesaing
(outline putih 35%). Legenda kiri bawah dengan tiga bentuk.

**Panel kanan** — daftar "Urut menurut · skor terendah": Depok Margonda 3,6 /
**69** · Bekasi Timur 3,8 / **72** (baris terpilih, latar aksen-100) · Cikarang
Jababeka 4,0 / 74 · Serpong Sektor 7 4,3 / 81 · Bogor Pajajaran 4,5 / 86. Tombol
sekunder blok **Buka detail Bekasi Timur**.

Kartu "Catatan agen lokasi": "Dua cabang berjarak kurang dari 900 m di Depok —
indikasi kanibalisasi. Saya sudah menghitung ulang catchment keduanya; laporan
lengkap ada di Site Scout." + ghost **Buka Site Scout →**.

---

## 04 · Detail cabang

Panel utama (min 420px) + kolom kanan 320px.

Panel utama: kicker "BKS-02 · dibuka Maret 2021" · judul **Bekasi Timur** 30px ·
"Jl. Chairil Anwar No. 88 · Manajer: Dwi Kurnia" 13px · dua angka besar di kanan
— Rating **3,8** ("−0,4 bulan ini"), Skor lokasi **72** ("peringkat 24/42").

Grafik "RATING 12 PEKAN": SVG 620×120, tiga garis grid `--color-neutral-300`,
polyline aksen 2px turun ke kanan, dua titik `--color-accent-800`, garis vertikal
dashed di pekan pesaing buka dengan label "28 Jun · pesaing baru buka" 11px.

"TEMA KELUHAN · 8 PEKAN" sebagai bar horizontal (label 130px + track
`--color-neutral-200` tinggi 14px + angka): Antrean kasir 78% **31** ·
Parkir 33% **13** · Stok kosong 18% **7** · Kebersihan 12% **5** ·
Keramahan staf 6% **2**.

Kolom kanan: mini-peta 200px (radius 1 km, 4 pesaing, label "radius 1 km ·
6 POI · 1 baru sejak 28 Jun") · kartu "Faktor skor lokasi" (Lalu lintas pejalan
88 · Bauran kategori sekitar 76 · Kepadatan pesaing 61 · Ketersediaan parkir 44)
dengan catatan "Parkir adalah penahan terbesar dan juga tema keluhan nomor dua —
dua sinyal berbeda menunjuk hal yang sama." · tombol primer blok **Lihat 18
review baru** dan sekunder blok **Tanya agen soal cabang ini**.

---

## 05 · Kotak masuk review (daftar padat + pratinjau)

Baris filter: segmented control **Perlu tindakan · 24** / Draft siap · 63 /
Terkirim · 187; di kanan tag tema: antrean kasir 31 (outline) · parkir 13 ·
stok 7 · kebersihan 5.

Grid `320px 1fr`, dua panel `blueprint` menempel (panel kanan `border-left: 0`).

**Daftar kiri**: header "24 perlu tindakan" + "urut prioritas". Enam baris,
tiap baris: bintang 12px + waktu 11px di kanan, nama cabang 15px Barlow
Condensed, potongan review 12.5px satu baris (`text-overflow: ellipsis`).
Baris aktif: latar `--color-accent-100` + border-left 2px aksen. Isi: Bekasi
Timur ★1 2 jam (aktif) · Depok Margonda ★2 5 jam · Cikarang Jababeka ★2 6 jam ·
Serpong Sektor 7 ★3 kemarin · Tangerang Alam Sutera ★3 kemarin · Bogor Pajajaran
★5 kemarin (opacity .6). Kaki: "↑ ↓ pindah · ⏎ setujui & lanjut · E ubah".

**Panel kanan**: kicker "REVIEW · BEKASI TIMUR" + "Google · Ratna W. · 2 jam
lalu" · bintang · kutipan 15px "Antre 25 menit cuma buat bayar. Kasir dua, yang
buka satu. Pegawainya ramah sih, tapi ya capek." · tag antrean kasir / jumlah
staf / **tema naik 3×** · blok draft (latar aksen-100, kicker "DRAFT BALASAN" +
"nada: hangat, bertanggung jawab", teks 14.5px, chip "SOP Layanan v4 · hal. 12"
dan "Nada Brand · hal. 3") · tombol [Setujui & kirim ⏎] [Ubah teks] [Jadikan
tiket] [Abaikan] · kaki 12px: "Guardrail lolos 4/4 · Berikutnya: Depok
Margonda" + kanan "23 tersisa di antrean ini".

---

## 06 · Draft balasan AI

Grid `1fr 340px`.

Kiri: kartu "REVIEW ASAL" (Google · Bekasi Timur · 2 jam lalu, bintang, kutipan
14.5px) lalu kartu draft — tag aksen "Draft balasan" + "Gemini · nada: hangat,
bertanggung jawab"; teks 15px dengan `border-left: 2px solid
var(--color-accent-400)`:

> Terima kasih sudah memberi tahu, Bu Ratna. Antrean sepanjang itu tidak sesuai
> standar kami. Mulai pekan ini kasir kedua kami buka pada jam 17.00–20.00 di
> Bekasi Timur. Kalau Ibu berkenan menyebutkan tanggal kunjungannya, kami akan
> periksa jadwal shift hari itu dan memperbaikinya.

Tombol: [Setujui & kirim] [Ubah teks] [Minta versi lain] [Tolak] · catatan 12px:
"Balasan tidak pernah terkirim otomatis. Persetujuan manusia wajib untuk semua
review bintang 1–2 — aturan ini ditetapkan di halaman Admin."

Kanan: kartu "BERSUMBER PADA" dengan dua kartu kutipan (ikon dokumen 12px, judul
13.5px, skor 0,88 / 0,81, kutipan 12.5px `--color-neutral-700`):
SOP Layanan v4 hal. 12 — "Antrean lebih dari 10 menit wajib ditangani dengan
membuka kasir tambahan pada jam sibuk." · Nada Brand hal. 3 — "Akui masalahnya,
sebut tindakan konkret, jangan berjanji tanpa tanggal."
Kartu "PEMERIKSAAN GUARDRAIL": Tanpa klaim tak bersumber · Tanpa data pribadi ·
Nada sesuai panduan · Tanpa janji kompensasi — semuanya "lolos"
(`--color-accent-700`).

---

## 07 · Analisis tema & sentimen

Tabel matriks (`.table`): kolom Tema keluhan (160px) + Bekasi, Cikarang, Depok,
Serpong, Bogor, Tangerang + Tren 8 pekan (sparkline 90×20). Sel angka memakai
latar ramp aksen sesuai intensitas; teks putih bila ≥ 500.

| Tema | Bks | Ckr | Dpk | Srp | Bgr | Tgr |
|---|---|---|---|---|---|---|
| Antrean kasir | **31** (800) | 9 (300) | 4 (200) | 12 (400) | 3 (200) | 8 (300) |
| Kebersihan | 5 | **17** (500) | 2 | 4 | 8 | 3 |
| Stok kosong | 7 | 3 | **22** (700) | 6 | 1 | 2 |
| Parkir | 13 (400) | 2 | 6 | **19** (600) | 4 | 7 |
| Harga vs pesaing | 8 | 7 | 11 (400) | 3 | 2 | 4 |
| Keramahan staf | 2 | 3 | 1 | 2 | 1 | 2 |

Tiga kartu di bawah:

- **Temuan agen · prioritas jaringan** — "Antrean kasir adalah masalah sistemik,
  bukan lokal": "Muncul di 5 dari 6 wilayah dan naik di semuanya. Perbaikan per
  cabang tidak akan cukup — usulan agen: ubah aturan pembukaan kasir di SOP
  pusat." + primer **Lihat draft perubahan SOP**.
- **Sentimen jaringan · 8 pekan** — 8 bar naik dari ramp 300 → 700, keterangan
  "Proporsi review negatif per pekan · 12% → 21%".
- **Praktik baik terdeteksi** — "Bogor Pajajaran": "Satu-satunya cabang tanpa
  kenaikan tema antrean. Bedanya: staf floating diarahkan ke kasir pada jam
  17–20. Agen mengusulkan menyalin pola ini ke 5 cabang terlemah." + sekunder
  **Buat 5 tiket replikasi**.

---

## 08 · Site Scout

Panel permintaan: kicker "PERMINTAAN KE AGEN LOKASI" + kutipan 15.5px "Cari 3
kandidat lokasi baru di Jakarta Timur, minimal 1,2 km dari cabang kami sendiri,
dengan lalu lintas pejalan tinggi." + tiga angka: POI dianalisis **1.284** ·
Lolos filter **17** · Direkomendasikan **3**.

Tiga kartu kandidat (kartu peringkat 1 memakai `border-left: 2px solid
var(--color-accent)`), masing-masing: kicker peringkat + nama 21px + skor besar
38px `--color-accent-700`, empat bar faktor (Lalu lintas / Bauran kategori /
Pesaing / Kanibalisasi), paragraf alasan, tombol.

1. **Cibubur Junction · sisi timur** — 84 · 91/86/74/88 — "Perkantoran dan dua
   sekolah dalam radius 600 m, tanpa minimarket sejenis. Cabang terdekat kami
   2,1 km — tidak berebut pelanggan." · [Bandingkan] [Jadikan tiket survei]
2. **Kramat Jati · dekat pasar** — 79 · 95/71/52/80 — "Lalu lintas tertinggi dari
   semua kandidat, tapi empat pesaing sejenis dalam 800 m. Cocok bila
   strateginya harga, bukan kenyamanan." · [Bandingkan] [Simpan]
3. **Duren Sawit · jalan utama** — 73 · 69/78/81/64 — "Paling aman dari pesaing,
   tetapi 1,3 km dari cabang Jatinegara — sebagian pelanggan akan berpindah,
   bukan bertambah." · [Bandingkan] [Simpan]

Catatan kaki (ikon info): "Skor dihitung dari Places Insight (kepadatan &
kategori POI dalam radius), jarak antar cabang sendiri lewat BigQuery GIS, dan
bobot yang bisa Anda ubah di Admin. Setiap angka bisa diklik untuk melihat data
mentahnya — tidak ada skor tanpa jejak."

---

## 09 · Bandingkan lokasi

Satu panel, grid `200px 1fr 1fr`, setiap sel dipisah border hairline. Kolom A
memakai latar `--color-accent-100` dan label "Kandidat A · direkomendasikan".
Baris: skor besar (84 / 79) · Lalu lintas pejalan (91 · perkantoran + 2 sekolah /
**95** · pasar harian) · Pesaing dalam 800 m (**1** minimarket / 4 minimarket) ·
Cabang sendiri terdekat (**2,1 km** · aman / 1,6 km · risiko sedang) · Estimasi
kunjungan/hari (**620–740** / 700–910 · rentang lebih lebar) · Sewa pasaran
(Rp 18–22 jt/bln / **Rp 12–15 jt/bln**) · Kesimpulan agen ("Pendapatan lebih
stabil dan mudah diprediksi. Pilih ini jika target margin, bukan volume." /
"Volume lebih tinggi tapi perang harga hampir pasti. Pilih ini hanya jika siap
bersaing harga."). Angka yang lebih baik dicetak tebal.

Tombol di bawah: [Ajukan survei Kandidat A] [Tambah kandidat ketiga] [Ekspor ke
PDF] ghost [Tanya agen: "bagaimana kalau target volume?"].

---

## 10 · Chat agen (satu kolom, jejak menyatu)

Panel chat `blueprint` (min-height 460px):

- Gelembung pengguna: rata kanan, maks 74%, latar `--color-accent-900`, teks
  `--color-bg`, 14.5px. "Kenapa rating cabang Bekasi Timur turun bulan ini?"
- Jawaban agen: kartu hairline maks 86%. Header: ikon robot 13px + "Supervisor →
  Agen Reputasi + Agen Lokasi" (kicker aksen-700) + kanan "7 langkah · 6,8 s ·
  Rp 412" 11px.
- **Baris chip jejak** (monospace 11px, border hairline): `01 supervisor.route` ·
  `02 gbp.listReviews · 18` · `03 bq.themeCluster · 7` · `04 rag.search · 2` ·
  `05 places.nearby · 6` · `06 bq.ratingTrend` · `07 guardrail.check · lolos`
  (yang terakhir border aksen + teks aksen-700).
- Dua paragraf jawaban 14.5px: penyebab dominan antrean kasir (11 dari 18 review,
  naik 3×), dua faktor bertemu (kasir kedua tidak dibuka + minimarket baru 400 m
  sejak 28 Juni); lalu "SOP Layanan v4 hal. 12 sebenarnya sudah mewajibkan kasir
  tambahan bila antrean melewati 10 menit — jadi ini masalah kepatuhan, bukan
  kebijakan."
- Tag sumber: 18 review · SOP v4 hal. 12 · Places · radius 1 km · 6 POI.
- Tombol: [Buat tiket ke manajer cabang] [Lihat 18 review] [Tunjukkan di peta].
- Pertanyaan lanjutan pengguna + **indikator kerja**: tiga kotak 5px ramp aksen +
  "Agen Reputasi menjalankan bq.themeCluster untuk 42 cabang…".
- Komposer: input "Tanya apa saja tentang cabang, review, lokasi, atau SOP…" +
  tombol primer Kirim (tinggi 36px). Di bawahnya tiga saran sekunder 12.5px:
  "Ringkas keluhan pekan ini" · "Cabang mana paling siap ekspansi?" · "Apa kata
  SOP soal refund?"

Di bawah panel, grid `1fr 320px`: kartu **Jejak eksekusi lengkap** (7 baris
bernomor dengan nama tool dan keterangan, ghost "Buka trace lengkap di Cloud
Trace →") dan kartu **Biaya percakapan ini** ("Rp 412 · 3 panggilan model",
"Anggaran tenant bulan ini terpakai 34%. Batas keras diatur di Admin.").

---

## 11 · Pusat pengetahuan

Empat kartu KPI: Dokumen terindeks **48** ("1.902 potongan · 3 diperbarui tadi
malam") · Cakupan jawaban **82%** (bar) · Pertanyaan tak terjawab **37** ("bulan
ini · 12 soal antrean") · Model embedding **text-embedding-004** ("768 dim ·
chunk 800 token · overlap 120").

Grid `1fr 320px`. Tabel dokumen (Dokumen · Jenis · Halaman · Status indeks ·
Diperbarui): SOP Layanan Pelanggan v4 / PDF / 34 / Terindeks / 28 Jul 2026 ·
Panduan Nada Brand 2026 / PDF / 12 / Terindeks · SOP Penanganan Keluhan (draft
v5) / DOCX / 18 / **Menunggu tinjauan** · Katalog Produk Q3 / XLSX / — /
Terindeks / 21 Jul · Perjanjian Layanan Waralaba / PDF / 26 / **Diproses · 60%**
· Notulen Rapat Ops Juni / PDF / 9 / Dikecualikan / 02 Jul.

Kanan: kartu celah pengetahuan (latar aksen-100) — "Tambahkan klausa batas waktu
antrean": "12 pertanyaan staf bulan ini menanyakan batas waktu antrean yang wajib
dilaporkan. SOP v4 menyebut 'jam sibuk' tanpa angka. Draft klausa: *'Antrean
lebih dari 10 menit wajib dilaporkan ke area manager pada hari yang sama.'*" +
[Kirim ke pemilik SOP] [Ubah draft]. Lalu kartu unggah: dropzone dashed "Tarik
PDF, DOCX, atau XLSX ke sini / maks. 50 MB · diindeks dalam ±2 menit" + checkbox
"Batasi akses ke peran Admin".

---

## 12 · Jawaban bersitasi

Grid `1fr 360px`.

Kiri: kartu pertanyaan ("Dwi Kurnia · Bekasi Timur · via WhatsApp", teks 16.5px
"Pelanggan minta refund barang promo yang sudah dibuka. Boleh atau tidak, dan apa
syaratnya?") · kartu jawaban (tag "Jawaban Agen Pengetahuan" + "2 sumber ·
keyakinan tinggi"), dua paragraf 15px dengan penanda superskrip `[1]` `[2]`
berwarna aksen-700:

> Boleh, dengan tiga syarat: barang promo masih dalam masa 7 hari sejak pembelian
> [1], struk asli ada, dan kemasan tidak rusak permanen. Barang promo yang sudah
> dibuka **tidak** bisa ditukar uang tunai — hanya penggantian barang sejenis
> atau voucher [2].
>
> Jika pelanggan menolak penggantian, eskalasi ke area manager pada hari yang
> sama; jangan menjanjikan pengembalian tunai di kasir [2].

Tombol: [Kirim ke WhatsApp Dwi] [Simpan sebagai FAQ] ghost [Jawaban ini salah].
Catatan kaki: "Agen menolak menjawab bila skor kemiripan sumber di bawah 0,7 —
dalam kasus itu ia mengatakan 'tidak ada di dokumen' dan mencatat pertanyaannya
sebagai celah pengetahuan. Tidak ada jawaban yang dikarang."

Kanan: dua kartu sumber `[1]` SOP Layanan v4 hal. 21 (0,91) dan `[2]` hal. 22
(0,86), masing-masing dengan kutipan dan ghost "Buka halaman N →". Kaki:
"Potongan yang dipertimbangkan tapi tidak dipakai: 4 · semuanya di bawah ambang
0,7."

---

## 13 · Papan tindakan

Baris atas: segmented **Semua · 24** / Dari agen · 19 / Milik saya · 6 · kanan
"Rata-rata waktu tutup tiket: **3,1 hari** · SLA 5 hari".

Empat kolom (`repeat(4,1fr)`), header kolom = nama + jumlah:

- **Baru (5)** — T-119 "Audit jadwal restock rak minuman" (Depok · stok, dibuat
  Agen Reputasi · 5 jam) · T-121 "Tinjau kapasitas parkir motor jam pulang kerja"
  (Serpong · parkir · 1 hari)
- **Dikerjakan (8)** — T-118 "Buka kasir kedua 17.00–20.00 selama 2 pekan"
  (Bekasi Timur · antrean · Dwi Kurnia · tenggat 4 Agt, border-left aksen) ·
  T-116 "Replikasi pola staf floating dari Bogor" (5 cabang · Ops Excellence ·
  tenggat 8 Agt)
- **Menunggu (4)** — T-120 "Survei lahan kandidat Cibubur Junction" (ekspansi ·
  skor 84 · menunggu anggaran · Agen Lokasi)
- **Selesai (7)** — T-114 "Perbarui SOP penanganan keluhan antrean" (ditutup
  3,1 hari · dampak: −18% keluhan) · T-109 "Balas 63 review tertunda Bogor"
  (ditutup 1,2 hari · rating +0,2) — kartu opacity .72

Kartu tiket: id Barlow Condensed 12px aksen-700 · judul 13.5px · tag · baris
meta 11.5px. Catatan kaki (ikon centang): "Setiap tiket menyimpan tautan ke
insight yang melahirkannya dan mencatat dampaknya setelah ditutup. Itu yang
membuat LOKUS bisa membuktikan nilai gunanya dengan angka, bukan cerita."

---

## 14 · Admin: model, guardrail, biaya

Tiga kartu atas:

- **Model & infrastruktur** — Penalaran: Gemini · Vertex AI · Ringkasan massal:
  Gemini Flash · Embedding: text-embedding-004 · Runtime agen: Agent Engine ·
  Region: asia-southeast2 · Layanan: Cloud Run · 2 svc. Catatan: "Model dipilih
  per tugas, bukan satu model untuk semua — Flash untuk 214 review, model
  penalaran hanya untuk diagnosis."
- **Guardrail & kendali manusia** — empat toggle aktif: "Balasan bintang 1–2
  wajib disetujui manusia" · "Larang janji kompensasi finansial" · "Tolak
  menjawab bila sumber < 0,7" · "Redaksi data pribadi sebelum ke model" + field
  "Ambang keyakinan minimum" = 0,70.
- **Biaya per tenant · Juli** — **Rp 1,84 juta**, bar 34%, "34% dari batas keras
  Rp 5,4 juta. Di atas 90%, agen turun ke mode Flash dan mengirim peringatan." +
  rincian Model Rp 1,12 jt · Places & Maps Rp 0,41 jt · BigQuery & Run Rp 0,31 jt.

Dua kartu bawah:

- **Evaluasi agen** ("golden set 60 kasus · dijalankan tiap deploy") — tabel
  Metrik / Skor / Ambang / Status: Ketepatan tema keluhan 0,91 / 0,85 · Sitasi
  benar & relevan 0,94 / 0,90 · Kepatuhan nada brand 0,88 / 0,80 · Halusinasi
  terdeteksi 0,02 / < 0,05 · Latensi p95 7,4 s / < 10 s — semuanya "lolos".
- **Kesehatan operasional** — Uptime 30 hari **99,7%** · Siklus malam terakhir
  **06.02** · Kegagalan tool 7 hari **3** ("semua berhasil retry") · Deploy
  terakhir **v0.9.4** ("CI hijau · 28 Jul 05.11") + empat baris berbutir aksen:
  Terraform · GitHub Actions · Cloud Logging + Trace · Secret Manager.

---

## Variasi yang tidak dipakai (rujukan)

`design/reference/06-variasi-layout.dc.html` menyimpan sembilan variasi layout
untuk layar 02, 05, dan 10. Yang terpasang: **1c** (garis waktu), **1e** (daftar
+ pratinjau), **1h** (jejak menyatu). Sisanya tersedia bila arah berubah.
