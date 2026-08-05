# Data & Dokumen Konteks AI — LOKUS

Dokumen ini merangkum seluruh data seed dan dokumen yang menjadi **konteks**
bagi tiga agen LOKUS (Reputasi, Lokasi, Pengetahuan) beserta supervisor-nya,
dan golden set yang mengevaluasinya. Semua sumber ada di
`packages/core/src/seed/`, `packages/core/src/domain/`, dan `eval/`.

Prinsip yang berlaku di seluruh data ini (lihat `.specify/memory/constitution.md`):

- **Deterministik** — RNG berseed (`lokus-2026`), byte yang sama di setiap
  mesin dan run.
- **Tenant-scoped** — setiap baris membawa `tenantId`; tidak ada pembacaan
  lintas tenant.
- **Tertelusuri** — setiap angka di layar bisa dilacak balik ke baris data
  yang menghasilkannya; setiap klaim AI menempel sumbernya.

---

## 1. Korpus SOP — konteks RAG (Agen Pengetahuan)

Sumber: [`packages/core/src/seed/documents.js`](../packages/core/src/seed/documents.js)

Vertex AI Search menggantikan lapisan retrieval di produksi, bukan bentuk
datanya — sebuah chunk terindeks mengembalikan triple `{docId, page, text}`
yang sama seperti di bawah ini.

### 1.1 Daftar dokumen (tenant `nusa-retail`)

| docId | Judul | Tipe | Halaman | Status Index | Dibatasi | Diperbarui | Bisa Dikutip? |
|---|---|---|---|---|---|---|---|
| `sop-layanan-v4` | SOP Layanan Pelanggan v4 | PDF | 34 | indexed | tidak | 2026-07-28 | ✅ |
| `nada-brand-2026` | Panduan Nada Brand 2026 | PDF | 12 | indexed | tidak | 2026-06-30 | ✅ |
| `katalog-produk-q3` | Katalog Produk Q3 | XLSX | — | indexed | tidak | 2026-07-21 | ✅ |
| `sop-keluhan-v5-draft` | SOP Penanganan Keluhan (draft v5) | DOCX | 18 | menunggu-tinjauan | tidak | 2026-07-24 | ❌ draf, belum ditinjau |
| `perjanjian-waralaba` | Perjanjian Layanan Waralaba | PDF | 26 | diproses | **ya** | 2026-07-26 | ❌ restricted |
| `notulen-ops-juni` | Notulen Rapat Ops Juni | PDF | 9 | dikecualikan | tidak | 2026-07-02 | ❌ dikecualikan total |

Hanya dokumen berstatus `indexed` yang berkontribusi ke `retrievablePassages()`.

### 1.2 Passage terindeks (unit kutipan aktual)

**`sop-layanan-v4` — SOP Layanan Pelanggan v4**

| Hal. | Isi |
|---|---|
| 12 | Antrean >10 menit wajib ditangani dengan membuka kasir tambahan pada jam sibuk. Manajer cabang memantau panjang antrean setiap hari 17.00–20.00. |
| 13 | Jika kasir tambahan tak bisa dibuka karena keterbatasan staf, arahkan staf floating ke kasir dan laporkan ke area manager hari itu juga. |
| 18 | Kebersihan area belanja diperiksa tiga kali sehari. Lantai kotor/tumpahan wajib dibersihkan maksimal 15 menit setelah dilaporkan. |
| 19 | Ketersediaan barang di rak utama diperiksa tiap pagi sebelum toko buka. Barang habis dipesan ulang hari itu juga dan dicatat di log restock. |
| 21 | Pengembalian barang promo dilayani bila masih dalam 7 hari sejak pembelian, struk asli ada, kemasan tidak rusak permanen. |
| 22 | Barang promo yang sudah dibuka tidak boleh ditukar tunai — hanya barang sejenis atau voucher. Penolakan pelanggan dieskalasi ke area manager hari itu juga; jangan janjikan pengembalian tunai di kasir. |
| 27 | Keluhan sikap staf ditangani manajer cabang lewat coaching shift berikutnya. Permintaan maaf tanpa menyebut nama staf. |
| 30 | Parkir penuh di jam sibuk dilaporkan ke area manager untuk ditinjau kapasitasnya. Cabang tidak boleh menjanjikan penambahan lahan parkir. |
| 31 | Perbedaan harga dengan kompetitor bukan dasar potongan di kasir. Staf mengarahkan ke program promo resmi yang berjalan. |

**`nada-brand-2026` — Panduan Nada Brand 2026**

| Hal. | Isi |
|---|---|
| 3 | Akui masalahnya, sebut tindakan konkret, jangan berjanji tanpa tanggal. Balasan hangat, bertanggung jawab, tidak defensif, tidak menyalahkan pelanggan. |
| 4 | Sapa pelanggan dengan nama bila tersedia. Bahasa Indonesia sopan, tanpa istilah teknis internal (SKU, shrinkage, footfall). |
| 5 | Jangan pernah menjanjikan kompensasi finansial, ganti rugi, voucher, atau potongan harga di balasan publik. Tawaran semacam itu hanya lewat kanal privat setelah persetujuan area manager. |
| 7 | Balasan publik tidak memuat data pribadi (telepon, alamat, nomor pesanan). Ajak lanjut ke kanal privat bila detail diperlukan. |

**`katalog-produk-q3` — Katalog Produk Q3**

| Hal. | Isi |
|---|---|
| 1 | Katalog kuartal tiga memuat 1.284 SKU aktif, harga berlaku sejak 1 Juli 2026. |

Total: **14 passage** terindeks lintas 3 dokumen.

Aturan retrieval: jika skor kecocokan < 0.70, agen menjawab "tidak ada di
dokumen" dan mencatat celah pengetahuan — tidak pernah mengarang jawaban.

---

## 2. Data Review Google Business Profile — konteks Agen Reputasi

Sumber: [`packages/core/src/seed/reviews.js`](../packages/core/src/seed/reviews.js)
(generator deterministik, seed `lokus-2026`)

### 2.1 Matriks keluhan (8 minggu, per tema × outlet)

Hanya enam cabang yang listing-nya dikelola tenant yang punya riwayat untuk
dibangkitkan; dua cabang lain ada di §3.1 dan alasannya ada di sana.

| Tema | BKS-02 | CKR-01 | DPK-01 | SRP-03 | BGR-01 | TGR-01 |
|---|---|---|---|---|---|---|
| antrean-kasir | 31 | 9 | 4 | 12 | 3 | 8 |
| kebersihan | 5 | 17 | 2 | 4 | 8 | 3 |
| stok-kosong | 7 | 3 | 22 | 6 | 1 | 2 |
| parkir | 13 | 2 | 6 | 19 | 4 | 7 |
| harga-vs-pesaing | 8 | 7 | 11 | 3 | 2 | 4 |
| keramahan-staf | 2 | 3 | 1 | 2 | 1 | 2 |

### 2.2 Target rating rata-rata per outlet

| Outlet | Target |
|---|---|
| BKS-02 | 3.8 |
| CKR-01 | 4.0 |
| DPK-01 | 3.6 |
| SRP-03 | 4.3 |
| BGR-01 | 4.5 |
| TGR-01 | 4.1 |

### 2.3 Review "featured" (verbatim, dipakai layar 05–06)

| id | Outlet | Tema | Bintang | Penulis | Isi |
|---|---|---|---|---|---|
| rev-BKS-02-featured-1 | BKS-02 | antrean-kasir | 1 | Ratna W. | "Antre 25 menit cuma buat bayar. Kasir dua, yang buka satu. Pegawainya ramah sih, tapi ya capek." |
| rev-DPK-01-featured-1 | DPK-01 | stok-kosong | 2 | Hendra S. | "Stok minuman dingin kosong lagi, sudah tiga kali begini. Rak bagian tengah juga banyak yang habis." |
| rev-CKR-01-featured-1 | CKR-01 | kebersihan | 2 | Melati A. | "Lantainya kotor dan ada bau kurang sedap dekat rak pendingin." |
| rev-SRP-03-featured-1 | SRP-03 | parkir | 3 | Yoga P. | "Barangnya lengkap, tapi parkir motor penuh terus jam pulang kerja." |
| rev-TGR-01-featured-1 | TGR-01 | harga-vs-pesaing | 3 | Nadia R. | "Tokonya nyaman, sayang harga beberapa barang lebih mahal daripada minimarket sebelah." |
| rev-BGR-01-featured-1 (positif) | BGR-01 | — | 5 | Bimo W. | "Kasir cepat walau ramai, stafnya sigap mengarahkan ke kasir tambahan." |

### 2.4 Aturan status balasan (AC-3.1)

- Rating 1–2 bintang → menunggu manusia (`sent` hanya setelah >7 hari, jika
  tidak `none`).
- Rating 3+ → agen boleh mengirim (`draft` dalam 2 hari pertama, lalu `sent`).

Setiap review membawa `source: 'google-business-profile'` dan `sourceUri`.

---

## 3. Data Outlet & Lokasi — konteks Agen Lokasi (GIS)

Sumber: [`packages/core/src/domain/outlets.js`](../packages/core/src/domain/outlets.js)
— koordinat Jabodetabek nyata, dipakai untuk perhitungan jarak & catchment.

| outletId | Nama | Region | Alamat | Manajer | Dibuka | Lat, Lng |
|---|---|---|---|---|---|---|
| BKS-02 | Bekasi Timur | Bekasi | Jl. Chairil Anwar No. 88 | Dwi Kurnia | 2021-03-01 | -6.2383, 107.0011 |
| CKR-01 | Cikarang Jababeka | Cikarang | Jl. Niaga Raya Blok C | Rangga Prasetyo | 2020-08-14 | -6.2797, 107.1518 |
| DPK-01 | Depok Margonda | Depok | Jl. Margonda Raya No. 204 | Sari Wulandari | 2019-11-02 | -6.3742, 106.8294 |
| SRP-03 | Serpong Sektor 7 | Serpong | Ruko Sektor 7 Blok RA | Bayu Nugroho | 2022-01-20 | -6.2924, 106.6741 |
| BGR-01 | Bogor Pajajaran | Bogor | Jl. Raya Pajajaran No. 17 | Intan Permata | 2021-09-06 | -6.5944, 106.8006 |
| TGR-01 | Tangerang Alam Sutera | Tangerang | Jl. Alam Sutera Boulevard | Fajar Ramadhan | 2020-02-11 | -6.2286, 106.6534 |
| KRW-01 | Karawang Galuh Mas | Karawang | Jl. Galuh Mas Raya Blok B | Tri Hastuti | 2026-04-02 | -6.3227, 107.2872 |
| BSD-02 | BSD Grand Boulevard | BSD | Jl. Grand Boulevard Kav. 12 | Anggara Putra | 2026-07-15 | -6.3019, 106.6528 |

Aturan tema sistemik (AC-2.2): tema dianggap sistemik bila muncul di ≥4 region
berbeda (`regionCount`).

### 3.1 Level listing per outlet (spec US-9)

Sumber: [`packages/core/src/seed/listings.js`](../packages/core/src/seed/listings.js).
Berkas itu berisi **respons API-nya**, bukan level-nya; level diturunkan
`deriveListingLevel` dari respons tersebut — sama seperti yang akan dilakukan
adapter Google atas respons sungguhan.

| outletId | Business Profile v4 | Places | Level | Review terbaca | Boleh dibalas |
|---|---|---|---|---|---|
| BKS-02 … TGR-01 (6 cabang) | ada | ada | `managed` | riwayat penuh | ya |
| KRW-01 | tidak ada | ada | `public` | maks. 5 (batas Places) | tidak |
| BSD-02 | tidak ada | tidak ada | `absent` | tidak ada | tidak |

Dua kolom terakhir yang menentukan perilaku konsol: matriks keluhan di §2.1
hanya berlaku untuk enam cabang `managed`, dan metrik waktu respons di layar 14
hanya dihitung untuk mereka — dua sisanya disebut namanya sebagai pengecualian.

---

## 4. Tiket Kerja — jejak keputusan → aksi

Sumber: [`packages/core/src/seed/tickets.js`](../packages/core/src/seed/tickets.js)

Setiap tiket membawa `sourceInsightId` yang menautkannya ke insight/briefing
penyebabnya; tiket `selesai` membawa `impact` bernilai angka sebagai bukti
dampak.

| id | Judul (tema) | Outlet | Status | Sumber | Dibuat oleh |
|---|---|---|---|---|---|
| T-119 | stok-kosong | Depok Margonda | baru | agent_run (`insight-seed-stok-depok`) | Agen Reputasi |
| T-121 | parkir | Serpong Sektor 7 | baru | agent_run (`insight-seed-parkir-serpong`) | Agen Reputasi |
| T-118 | antrean-kasir | Bekasi Timur | dikerjakan | briefing_decision (`insight-seed-antrean-bekasi`) | manajer@nusaretail.co.id |
| T-116 | antrean-kasir (jaringan) | — | dikerjakan | briefing_decision (`insight-seed-praktik-bogor`) | manajer@nusaretail.co.id |
| T-120 | ekspansi | — | menunggu | agent_run (`insight-seed-scout-cibubur`) | Agen Lokasi |
| T-114 | antrean-kasir (jaringan) | — | selesai | briefing_decision (`insight-seed-sop-antrean`) | manajer@nusaretail.co.id |
| T-109 | backlog | Bogor Pajajaran | selesai | agent_run (`insight-seed-backlog-bogor`) | Agen Reputasi |

---

## 5. Golden Set Evaluasi

Sumber: [`eval/golden_set.jsonl`](../eval/golden_set.jsonl) — 60 kasus uji,
lima kategori:

| Kategori | Jumlah kasus | Yang diuji |
|---|---|---|
| `theme` | 24 | Klasifikasi teks keluhan mentah ke salah satu dari 6 tema |
| `citation` | 12 | Akurasi kutipan `{docId, page}` untuk pertanyaan SOP/brand voice |
| `brand_voice` | 10 | Draf balasan lolos 4 guardrail dan tidak menjanjikan kompensasi |
| `refusal` | 8 | Agen menolak pertanyaan di luar cakupan (resep, cuaca, target penjualan, dll.) |
| `isolation` | 6 | Query lintas-tenant (`klinik-sehat-prima`, `dealer-arta-motor`) selalu kembali kosong |

---

## Peta sumber → dokumen kode

| Domain | File sumber |
|---|---|
| SOP & passage RAG | `packages/core/src/seed/documents.js` |
| Retrieval / sitasi | `packages/core/src/knowledge/retrieval.js`, `cite.js`, `groundedWriter.js`, `gapReport.js`, `ingest.js` |
| Review GBP | `packages/core/src/seed/reviews.js`, `reviewTemplates.js` |
| Outlet & GIS | `packages/core/src/domain/outlets.js` |
| Tema keluhan | `packages/core/src/domain/themes.js` |
| Tiket | `packages/core/src/seed/tickets.js` |
| Golden set eval | `eval/golden_set.jsonl`, `eval/run_eval.mjs` |
