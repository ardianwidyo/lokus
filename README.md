# LOKUS — Local Ops Intelligence

Konsol intelijen operasional untuk bisnis bercabang. Tiga agen otonom
(Reputasi, Lokasi, Pengetahuan) plus satu supervisor membaca review Google
Business Profile, data lokasi Places, dan SOP internal; setiap pagi
menghasilkan Briefing Pagi berisi maksimal tiga keputusan yang bisa diambil
area manager.

Submission EBCO AI Hackathon 2026 · Kategori A + B.

> **Status build:** fase P0 (fondasi), P1 (reputasi), dan P4 (orkestrasi)
> selesai. Tujuh layar berjalan dengan data contoh: 01, 02, 05, 06, 07, 10, 13.
> Layar lain masih placeholder yang menyebutkan fase pembangunnya. Rincian di
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
| 02 Briefing Pagi | `/briefing` | Garis waktu semalam dengan maksimal tiga keputusan. Tekan **Setujui & buat tiket** — tiketnya muncul di layar 13. |
| 05 Kotak masuk review | `/review` | Daftar + pratinjau. Panah ↑ ↓ pindah baris, ⏎ setujui & kirim, E buka layar 06. |
| 06 Draft balasan AI | `/draft` | Draft, kutipan SOP dengan nomor halaman dan skor, empat pemeriksaan guardrail. |
| 07 Analisis tema | `/tema` | Matriks tema × cabang, sparkline 8 pekan, penanda sistemik dengan jumlah wilayahnya. |
| 10 Chat agen | `/chat` | Tanya **"Kenapa rating cabang Bekasi Timur turun bulan ini?"** — jejak eksekusi muncul di dalam jawaban, lengkap dengan biaya. |
| 13 Papan tindakan | `/tindakan` | Empat kolom. Setiap kartu menyebut insight asalnya; kartu selesai membawa dampaknya. |

Dua alur yang paling layak dicoba:

1. Layar 05, tekan **E** — URL jadi `/draft?review=...` dan bisa dibagikan.
2. Layar 10, ajukan pertanyaan lalu tekan **Buat tiket** — buka layar 13 dan
   tiket itu ada di kolom Baru, dengan id run yang melahirkannya.

Coba juga tanya sesuatu yang tidak ada di SOP, misalnya **"resep rendang"**.
Agen menolak menjawab, bukan mengarang.

### Perintah lain

```bash
npm test              # 382 test di seluruh workspace
npm run test:coverage # dengan ambang cakupan
npm run lint
npm run build
```

## Struktur

```
packages/core   logika domain: supervisor, klasterisasi tema, guardrail, draft, tiket
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
