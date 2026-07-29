# LOKUS — Local Ops Intelligence

Konsol intelijen operasional untuk bisnis bercabang. Tiga agen otonom
(Reputasi, Lokasi, Pengetahuan) plus satu supervisor membaca review Google
Business Profile, data lokasi Places, dan SOP internal; setiap pagi
menghasilkan Briefing Pagi berisi maksimal tiga keputusan yang bisa diambil
area manager.

Submission EBCO AI Hackathon 2026 · Kategori A + B.

> **Status build:** fase P0 (fondasi) dan P1 (reputasi) selesai. Layar 01, 05,
> 06, dan 07 berjalan dengan data contoh. Layar lain masih menampilkan
> placeholder yang menyebutkan fase pembangunnya. Rincian di
> [`specs/001-lokus-core/tasks.md`](specs/001-lokus-core/tasks.md).
>
> README lengkap untuk juri — tabel dampak, gambar arsitektur, URL demo — adalah
> tugas **T054** di fase P5 dan belum ditulis.

## Menjalankan secara lokal

Perlu Node 20 atau lebih baru. Tidak perlu akun Google Cloud, tidak perlu
kredensial apa pun.

```bash
npm install
npm run dev          # buka http://localhost:5173/masuk
```

Konsol berjalan di atas **dataset contoh** yang dihasilkan di dalam browser oleh
`packages/core` — 713 review deterministik di enam cabang. Panel yang memakainya
diberi tag `data contoh`; tidak ada data contoh yang ditampilkan seolah-olah
nyata.

### Yang bisa dicoba sekarang

| Layar | Jalur | Yang bisa diuji |
|---|---|---|
| 01 Masuk & pilih tenant | `/masuk` | Tiga tenant dengan peran masing-masing. Pilih **Klinik Sehat Prima** (peran Viewer) lalu bandingkan dengan **Nusa Retail** (Area Manager) — tombol yang mengubah data hilang untuk viewer. |
| 05 Kotak masuk review | `/review` | Daftar + pratinjau. Panah ↑ ↓ pindah baris, ⏎ setujui & kirim, E buka layar 06. Hitungan tiap tab dihitung dari data, bukan ditulis. |
| 06 Draft balasan AI | `/draft` | Draft, kutipan SOP dengan nomor halaman dan skor, empat pemeriksaan guardrail. |
| 07 Analisis tema | `/tema` | Matriks tema × cabang, sparkline 8 pekan, penanda sistemik dengan jumlah wilayahnya. |

Coba juga: dari layar 05 tekan **E** — URL menjadi `/draft?review=...` dan bisa
dibagikan.

### Perintah lain

```bash
npm test              # 259 test di seluruh workspace
npm run test:coverage # dengan ambang cakupan
npm run lint
npm run build
```

## Struktur

```
packages/core   logika domain: klasterisasi tema, guardrail, draft, dataset contoh
api             Cloud Run + Fastify: Identity Platform, isolasi tenant, RBAC
web             React + Vite: 14 layar di atas design/tokens.css
infra           Terraform: Cloud Run, Firestore, BigQuery, Storage, Secret Manager
specs           spec, plan, tasks — ditulis sebelum kodenya
design          tokens.css, UI-GUIDELINES.md, SCREENS.md
```

## Cara kerja yang dipegang

Empat aturan yang mengikat seluruh kode, dari
[`.specify/memory/constitution.md`](.specify/memory/constitution.md):

- **Bersumber atau diam.** Setiap klaim AI menempel pada review id atau halaman
  SOP. Di bawah keyakinan 0,70 agen menjawab "tidak ada di dokumen" dan mencatat
  celah pengetahuan — bukan mengarang. Draft tanpa pasal SOP yang cukup dekat
  tidak pernah dibuat.
- **Manusia memegang suara publik.** Balasan untuk review bintang 1–2 tidak bisa
  terkirim sebelum manusia bernama menyetujuinya. Aturan ini ditegakkan di tiga
  lapis terpisah supaya satu lapis gagal pun jaminannya utuh.
- **Multi-tenant sejak awal.** Tenant id ikut di setiap query, dokumen, dan baris
  log. Tenant yang tidak diberikan token menghasilkan penolakan yang sama
  dengan tenant yang tidak ada.
- **Empat state di setiap panel data.** Memuat, kosong, gagal, perlu izin —
  bukan tambalan, tapi syarat sebuah tugas dianggap selesai.

## Catatan tentang angka

Angka di layar dihitung dari dataset contoh, bukan disalin dari mockup. Di
beberapa tempat hasilnya berbeda tipis dari angka ilustratif di
`design/SCREENS.md` — yang dihitung yang dipakai, karena setiap angka harus bisa
ditelusuri ke baris yang menghasilkannya.

Matriks tema di layar 07 adalah buktinya: generator menyusun dataset dari
matriks itu, klasterisasi tidak pernah melihat rencananya, dan tetap menemukan
kembali ke-36 selnya dari teks Bahasa Indonesia saja.
