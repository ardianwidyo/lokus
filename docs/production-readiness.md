# Kesiapan Produksi — Apa yang Masih Kurang

Dokumen ini menjawab satu pertanyaan: **kalau besok ada tenant sungguhan yang
membayar, apa saja yang belum siap?**

Ditulis dengan bahasa sederhana. Setiap butir menyebut *apa yang ada sekarang*,
*apa yang kurang*, *kenapa itu penting*, dan *di berkas mana buktinya* — supaya
bisa diperiksa sendiri, bukan dipercaya begitu saja.

Diperiksa terhadap kode per 8 Agustus 2026 (commit `4c950bc`).

---

## Ringkasan dalam satu paragraf

LOKUS **sudah jalan dan bisa didemokan hari ini** — 14 layar hidup, tiga agen
bekerja, jejak eksekusi tampil, tes hijau, Terraform tervalidasi. Yang belum ada
bukan "fitur", tapi **fondasi operasional**: infrastrukturnya belum pernah benar-
benar dinyalakan, login-nya belum nyata, datanya masih hilang setiap kali server
restart, dan sumber data Google-nya belum tersambung. Kira-kira begini
perbandingannya:

| | Status |
|---|---|
| Demo publik (GitHub Pages, data contoh) | ✅ **Siap** — sudah live |
| Aplikasi jalan untuk tim internal | 🟡 **Hampir** — butuh Bagian A1–A3 |
| Aplikasi dipakai tenant membayar | 🔴 **Belum** — butuh seluruh Bagian A + B |

---

## Cara membaca dokumen ini

| Label | Artinya |
|---|---|
| 🔴 **BLOKIR** | Tanpa ini, aplikasi tidak boleh dipakai orang lain. Bukan soal rapi, tapi soal rusak atau bocor. |
| 🟡 **PENTING** | Bisa jalan tanpa ini, tapi masalahnya akan datang dalam hitungan minggu. |
| 🔵 **SUSULAN** | Boleh dikerjakan setelah tenant pertama masuk. |

---

## Bagian A — 🔴 BLOKIR

Tujuh hal ini harus selesai sebelum satu pun tenant nyata masuk.

### A1. Infrastrukturnya belum pernah dinyalakan sama sekali

**Sekarang:** Seluruh Terraform sudah ditulis dan lolos `terraform validate` di
CI — Cloud Run, Firestore, BigQuery, Cloud Storage, Secret Manager, Pub/Sub,
Scheduler, Workload Identity.

**Yang kurang:** `terraform apply` **belum pernah dijalankan**. Alasannya bukan
teknis: akun billing project-nya adalah trial yang sudah tertutup.

**Kenapa penting:** "Tervalidasi" hanya berarti sintaksnya benar. Banyak hal baru
ketahuan saat apply — kuota, urutan pengaktifan API, izin IAM yang kurang satu
baris. Perkirakan 1–2 hari penuh untuk apply pertama yang benar-benar bersih.

**Bukti:** [docs/deploy.md:17-21](docs/deploy.md#L17-L21) — *"has never been applied,
because the project's billing account is a closed trial."*

**Yang harus dilakukan:**
1. Aktifkan akun billing yang hidup di Google Cloud.
2. `cd infra && terraform init -backend-config=backend.hcl && terraform apply`.
3. Isi versi untuk setiap secret (lihat [docs/deploy.md](docs/deploy.md) langkah 2)
   — Cloud Run menolak start kalau secret yang di-mount belum punya versi.
4. Set 5 repository variable di GitHub supaya workflow deploy tidak di-skip.

---

### A2. Login belum nyata — belum ada orang yang benar-benar bisa masuk

**Sekarang:** Lapisan verifikasi token **sudah lengkap dan sudah dites**:
tanda tangan, issuer, audience, klaim tenant, klaim role, penolakan lintas tenant.

**Yang kurang:** Identity Platform belum diaktifkan, belum ada tenant, belum ada
user. Dan di sisi konsol, tombol "Masuk dengan Google" serta "Kirim tautan masuk"
masih melempar `NOT_IMPLEMENTED` secara sengaja.

**Kenapa penting:** Tanpa ini, satu-satunya cara masuk adalah mode `dev` yang
menerima token palsu berbentuk `dev:<user>:<tenant>:<role>`. Mode itu sudah
dipagari dengan benar (server **menolak start** kalau `NODE_ENV=production`), jadi
ini bukan lubang keamanan — tapi artinya **belum ada pintu masuk yang sah sama
sekali**.

**Bukti:**
- [api/src/auth/verifyIdToken.js](api/src/auth/verifyIdToken.js) — verifier sudah siap
- [api/src/auth/devPrincipal.js:44-49](api/src/auth/devPrincipal.js#L44-L49) — pagar `NODE_ENV=production`
- [web/src/data/httpSources.js:37-44](web/src/data/httpSources.js#L37-L44) — SSO masih `NOT_IMPLEMENTED`
- [api/src/repositories/tenantDirectory.js](api/src/repositories/tenantDirectory.js) — daftar tenant masih ditulis di kode

**Yang harus dilakukan:**
1. Aktifkan Identity Platform + multi-tenancy di project.
2. Buat tenant pertama, undang user, isi klaim `tenantId` dan `roles` lewat
   custom claims.
3. Pasang Firebase Auth SDK di konsol supaya `signInWithGoogle` benar-benar
   menghasilkan token, menggantikan `createDevTokenProvider`.
4. Ganti `createSeededTenantDirectory` dengan versi Firestore.

---

### A3. Semua data hilang setiap kali server restart

**Sekarang:** API menyimpan semuanya di memori proses — jejak agen, tiket,
dokumen pengetahuan, draft balasan, angka pemakaian biaya.

**Yang kurang:** Firestore, BigQuery, dan Cloud Storage sudah dibuat di
Terraform, tapi **belum ada satu baris kode pun yang memanggilnya**. Paket
`@google-cloud/firestore`, `@google-cloud/bigquery`, dan `@google-cloud/storage`
tidak ada di dependency API.

**Kenapa penting:** Cloud Run mematikan instance yang menganggur. Artinya:
tiket yang dibuat manajer siang tadi hilang sore hari. Dokumen yang diunggah
hilang. Riwayat persetujuan balasan — yang justru wajib disimpan menurut
AC-3.1 — hilang. Ini bukan bug kecil, ini membuat aplikasinya tidak bisa
dipercaya.

**Bukti:**
- [api/src/services/index.js:80-85](api/src/services/index.js#L80-L85) — komentarnya
  menyebut sendiri: *"Everything is in-memory today"*
- `createMemoryRunStore`, `createMemoryTicketStore`, `createMemoryWarehouse`
- [api/package.json](api/package.json) — tidak ada satu pun paket `@google-cloud/*`

**Kabar baiknya:** desainnya sudah benar. Setiap penyimpanan berada di balik satu
antarmuka (`putLanding`, `mergeReviews`, `get`, `save`), jadi menggantinya
mengubah **satu berkas** — `api/src/services/index.js` — dan bukan yang lain.
Yang perlu ditulis adalah implementasi Firestore/BigQuery/Storage-nya sendiri.

**Perkiraan:** 3–5 hari kerja.

---

### A4. Data Google belum tersambung — semua angkanya masih sintetis

**Sekarang:** 718 review, 8 cabang, dan POI pesaing dihasilkan generator
deterministik di `packages/core/src/seed`.

**Yang kurang:** Adapter Business Profile dan Places yang asli. Ini **disengaja
dan jujur** — adapter Google-nya melempar error kalau dipanggil tanpa kredensial,
bukan mengarang jawaban.

**Kenapa penting:** Ini yang membedakan "demo yang meyakinkan" dari "produk".
Dan hambatannya bukan koding:

| Yang dibutuhkan | Hambatan | Perkiraan waktu |
|---|---|---|
| **Places API (New)** | Cuma butuh API key + billing | 1 hari |
| **Business Profile Performance API** | Harus mengajukan akses ke Google dan **disetujui** | 2–8 minggu, di luar kendali kita |

**Bukti:** [packages/core/src/adapters/gbp.js:11-16](packages/core/src/adapters/gbp.js#L11-L16),
[packages/core/src/adapters/places.js:6-10](packages/core/src/adapters/places.js#L6-L10)

**Yang harus dilakukan sekarang juga:** ajukan akses Business Profile API
**hari ini**, karena antreannya panjang dan tidak bisa dipercepat dengan menulis
kode.

---

### A5. Siklus malam hari menembak alamat yang tidak ada

**Sekarang:** Terraform sudah membuat Cloud Scheduler yang jalan 23:00 WIB,
mengirim ke Pub/Sub, dengan retry dan dead-letter queue. Rapi.

**Yang kurang:** Pub/Sub mendorong ke `POST /v1/internal/nightly-cycle` —
dan **route itu tidak ada di API**. Route yang terdaftar hanya `/healthz`,
`/v1/session`, `/v1/reviews`, `/v1/themes`, `/v1/briefing`, `/v1/knowledge`,
`/v1/outlets`, `/v1/agent`, `/v1/runs`, `/v1/tickets`, `/v1/map`, `/v1/scout`,
`/v1/compare`, `/v1/admin`.

**Kenapa penting:** Briefing Pagi adalah fitur nomor satu produk ini (AC-1.1).
Kalau ini di-apply apa adanya, setiap malam pesannya 404, dicoba lima kali,
lalu masuk dead-letter — dan paginya briefing tidak ada.

**Bukti:** [infra/scheduler.tf:51](infra/scheduler.tf#L51) menunjuk ke endpoint itu;
`grep -rn "internal/nightly-cycle" api/src` tidak menemukan apa pun.

**Yang harus dilakukan:** tambahkan route `/v1/internal/nightly-cycle` yang
(a) memverifikasi OIDC token dari service account scheduler, (b) memanggil
`runNightlyCycle` yang **sudah ada** di `packages/core`, (c) idempoten kalau
pesannya dikirim dua kali. Logikanya sudah ada — yang kurang tinggal pintunya.

**Perkiraan:** setengah hari.

---

### A6. Alarm menyala, tapi tidak ada yang mendengar

**Sekarang:** Ada dua alert policy — siklus malam gagal, dan tenant melewati 90%
budget.

**Yang kurang:** Keduanya **tidak punya `notification_channels`**. Di Google
Cloud, alert tanpa notification channel akan tercatat di konsol Monitoring dan
tidak mengirim apa pun ke siapa pun.

**Kenapa penting:** Percuma memasang alarm kebakaran yang tidak berbunyi. Dan
justru dua kejadian inilah yang paling perlu diketahui cepat: briefing tidak
terbit, dan tagihan membengkak.

**Bukti:** [infra/scheduler.tf:102-170](infra/scheduler.tf#L102-L170) — tidak ada
field `notification_channels` di kedua policy.

**Yang harus dilakukan:** tambahkan `google_monitoring_notification_channel`
(email dan/atau Slack), lalu rujuk ID-nya dari kedua policy. Sekitar 20 baris
Terraform.

---

### A7. PDF dan DOCX bisa diunggah, tapi isinya tidak pernah terbaca

**Sekarang:** Unggah dokumen sudah jalan sampai ke penyimpanan. File `.txt`
dan `.md` langsung dipecah jadi chunk dan bisa dicari. PDF/DOCX disimpan utuh
dengan status `menunggu-ekstraksi`.

**Yang kurang:** Ekstraksi teksnya itu sendiri (tugas **T020**). Sampai itu ada,
PDF selamanya berstatus menunggu — 0 chunk, tidak bisa dicari, tidak masuk
hitungan cakupan.

**Kenapa penting:** Hampir semua SOP di dunia nyata berbentuk PDF atau DOCX.
Tanpa ekstraksi, Agen Pengetahuan hanya bisa membaca dokumen yang sudah
diketik ulang jadi teks polos — dan itu bukan produk.

**Kabar baiknya:** konsolnya **jujur** soal ini. Statusnya tertulis di layar,
bukan disembunyikan. Jadi ini utang yang terlihat, bukan yang mengejutkan.

**Bukti:** [specs/001-lokus-core/tasks.md](specs/001-lokus-core/tasks.md) T020 dan T071.

---

## Bagian B — 🟡 PENTING

Bisa jalan tanpa ini, tapi masalahnya akan datang cepat.

### B1. Tidak ada pembatasan laju permintaan (rate limiting)

API tidak memakai `@fastify/rate-limit` atau sejenisnya. Satu klien yang error —
atau satu orang iseng dengan token yang sah — bisa memanggil `/v1/agent/ask`
ribuan kali. Setiap panggilan itu memanggil Gemini, dan setiap panggilan Gemini
ada harganya. Batas biaya per tenant di
[packages/core/src/cost/budget.js](packages/core/src/cost/budget.js) memang
menahan tagihan, tapi baru setelah uangnya keluar.

**Yang perlu:** `@fastify/rate-limit`, dihitung per tenant dan per user, dengan
angka yang lebih ketat untuk route yang memanggil model.

### B2. Tidak ada batas biaya di tingkat Google Cloud

Batas biaya sudah ada **di dalam kode** (turun ke Flash di 90%, tolak di 100%).
Tapi tidak ada `google_billing_budget` di Terraform. Kalau ada yang salah di
luar jalur yang dihitung kode itu — misalnya Places API dipanggil berlebihan —
tidak ada rem terakhir.

### B3. Tidak ada rencana cadangan dan pemulihan

Firestore sudah punya `delete_protection` untuk prod, dan bucket dokumen sudah
punya versioning. Tapi:
- Point-in-time recovery Firestore belum diaktifkan
- Belum ada jadwal export terjadwal
- **Belum pernah ada latihan restore** — dan cadangan yang belum pernah
  dipulihkan belum bisa disebut cadangan

### B4. Log belum diatur retensi dan tujuannya

Log sudah terstruktur dan **selalu membawa tenant id** (bagus, dan itu memenuhi
Konstitusi IV). Tapi belum ada log sink ke BigQuery, belum ada kebijakan retensi,
dan belum ada pemisahan mana log audit (siapa menyetujui balasan apa) dari log
biasa. Untuk tenant berbayar, jejak audit biasanya diminta.

### B5. Pencarian dokumen masih pencocokan kata kunci

`plan.md` menyebut Vertex AI Search. Yang berjalan sekarang adalah skoring kata
kunci di `packages/core`. Untuk 60 dokumen contoh ini cukup; untuk ratusan SOP
nyata, kualitas jawabannya akan turun dan ambang 0,70 akan lebih sering menolak
padahal jawabannya ada.

### B6. Belum ada uji end-to-end dan uji beban

Ada 27 berkas tes komponen di [web/test/](web/test/) dan 13 di
[api/test/](api/test/), dengan ambang coverage yang ditegakkan di CI — itu
kuat. Yang belum ada:
- Tes E2E yang benar-benar membuka browser dan menjalankan alur nyata
  (Playwright). Sekarang alurnya diverifikasi manual lewat
  [docs/demo-runbook.md](docs/demo-runbook.md).
- Uji beban. Belum ada yang tahu API ini sanggup berapa permintaan per detik.
- Eval hanya menguji jalur deterministik. Jalur Vertex (`LOKUS_REASONING=vertex`)
  hanya disentuh satu *smoke test* di CI, tidak diukur terhadap 60 kasus golden set.

### B7. Belum ada prosedur ketika terjadi masalah

Ada runbook untuk **demo**, belum ada runbook untuk **insiden**: siapa yang
dihubungi, bagaimana cara rollback (perintahnya sudah ada di deploy.md, tapi
belum ada kriteria kapan dipakai), berapa lama target pemulihan, dan bagaimana
memberi tahu tenant.

---

## Bagian C — 🔵 SUSULAN

### C1. Domain sendiri
Sekarang URL-nya `*.run.app` dan `github.io`. Tenant berbayar akan
mengharapkan alamat sendiri + sertifikat.

### C2. Kepatuhan hukum dan privasi
Belum ada kebijakan privasi, syarat layanan, atau perjanjian pemrosesan data.
LOKUS memproses review pelanggan yang berisi nama dan keluhan — itu data pribadi
menurut UU PDP. Perlu ditetapkan: berapa lama data disimpan, di mana
(sudah dipilih `asia-southeast2`, bagus), dan apa yang terjadi saat tenant
berhenti berlangganan.

### C3. Onboarding tenant masih manual
Membuat tenant baru sekarang berarti mengubah kode
([tenantDirectory.js](api/src/repositories/tenantDirectory.js)) lalu deploy ulang.
Untuk tenant kedua ini masih bisa diterima; untuk tenant kesepuluh tidak.

### C4. Header keamanan bisa lebih ketat
[web/nginx.conf](web/nginx.conf) sudah bagus — CSP, `nosniff`,
`Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`. Dua catatan
kecil: belum ada `Strict-Transport-Security`, dan `connect-src` masih
`https://*.run.app` (mengizinkan **semua** layanan Cloud Run, bukan hanya milik
kita) — sebaiknya dipersempit ke URL API sendiri setelah URL-nya tetap.

### C5. Belum ada uptime check dan target ketersediaan
Deploy sudah mengecek `/healthz` sekali setelah rollout — itu bagus. Tapi tidak
ada yang memeriksanya lima menit kemudian, dan belum ada angka SLO yang
disepakati.

---

## Checklist ringkas

| # | Butir | Level | Perkiraan |
|---|---|---|---|
| A1 | Billing aktif + `terraform apply` pertama | 🔴 | 1–2 hari |
| A2 | Identity Platform + login nyata di konsol | 🔴 | 2–3 hari |
| A3 | Firestore / BigQuery / Cloud Storage benar-benar dipakai | 🔴 | 3–5 hari |
| A4 | Ajukan akses Business Profile API + kunci Places | 🔴 | ajukan **sekarang**, tunggu 2–8 minggu |
| A5 | Route `/v1/internal/nightly-cycle` | 🔴 | 0,5 hari |
| A6 | Notification channel untuk kedua alert | 🔴 | 1 jam |
| A7 | Ekstraksi teks PDF/DOCX (T020) | 🔴 | 1–2 hari |
| B1 | Rate limiting per tenant | 🟡 | 0,5 hari |
| B2 | `google_billing_budget` di Terraform | 🟡 | 1 jam |
| B3 | PITR + export terjadwal + latihan restore | 🟡 | 1 hari |
| B4 | Log sink, retensi, pemisahan log audit | 🟡 | 1 hari |
| B5 | Vertex AI Search menggantikan pencarian kata kunci | 🟡 | 2–3 hari |
| B6 | E2E Playwright + uji beban + eval jalur Vertex | 🟡 | 2–3 hari |
| B7 | Runbook insiden | 🟡 | 0,5 hari |
| C1–C5 | Domain, legal, onboarding, header, SLO | 🔵 | menyusul |

**Total Bagian A:** sekitar **8–13 hari kerja**, ditambah waktu tunggu
persetujuan Google yang tidak bisa dipercepat.

---

## Urutan yang disarankan

Kerjakan berurutan, karena setiap tahap membuka tahap berikutnya.

**Minggu 0 — kirim sekarang, tidak perlu koding**
Ajukan akses Business Profile API (A4). Aktifkan akun billing (A1). Keduanya
adalah waktu tunggu, dan waktu tunggu harus dimulai paling awal.

**Minggu 1 — nyalakan fondasinya**
A1 apply → A6 notification channel (satu jam, dan sejak itu semua kesalahan
berikutnya akan terlihat) → A5 route nightly cycle.

**Minggu 2 — buat datanya bertahan**
A3 Firestore/BigQuery/Storage. Ini pekerjaan terbesar, tapi hanya menyentuh
satu berkas wiring karena antarmukanya sudah dipisahkan sejak awal.

**Minggu 3 — buka pintunya**
A2 Identity Platform + login nyata, dan A7 ekstraksi dokumen.

**Minggu 4 — kencangkan**
Seluruh Bagian B, dengan B1 (rate limiting) dan B2 (billing budget) lebih dulu,
karena keduanya melindungi dompet.

---

## Cara memeriksa sendiri

Semua klaim di atas bisa diverifikasi dengan perintah, bukan dengan percaya:

```bash
# A3 — apakah ada klien Google Cloud sama sekali?
grep -r "@google-cloud" api/package.json packages/core/package.json

# A5 — apakah route nightly cycle ada?
grep -rn "internal/nightly-cycle" api/src

# A6 — apakah alert punya tujuan notifikasi?
grep -n "notification_channel" infra/*.tf

# B1 — apakah ada rate limiting?
grep -rn "rate-limit\|rateLimit" api/

# Yang sudah benar-benar jalan:
npm test          # seluruh workspace
npm run eval      # 60 kasus golden set terhadap 5 ambang konstitusi
```

---

## Yang sudah baik, dan jangan dibongkar

Supaya dokumen ini tidak terbaca lebih suram dari kenyataannya — beberapa hal di
repo ini sudah setingkat produksi dan sebaiknya dipertahankan apa adanya:

- **Isolasi tenant** ditegakkan di tiga lapis dan dites tersendiri
  ([api/test/tenantIsolation.test.js](api/test/tenantIsolation.test.js))
- **Deploy tanpa kunci service account** — Workload Identity Federation dengan
  `attribute_condition` yang mengikat ke satu repositori
- **Tidak ada satu pun secret di repo**, dan CI punya gate yang menolaknya
- **CI menegakkan ambang**, bukan sekadar melaporkan angka: lint, coverage,
  `terraform validate`, `terraform fmt`, dan 5 ambang kualitas eval
- **Mode dev auth menolak start di production** — pagar yang benar, di tempat
  yang benar
- **Setiap panel data punya empat state**, dan itu dites
  ([web/test/fourStates.test.jsx](web/test/fourStates.test.jsx))
- **Konsolnya jujur** soal apa yang belum tersambung, alih-alih menyamarkannya
  sebagai fitur yang bekerja

Kejujuran itu, kebetulan, adalah alasan dokumen ini bisa ditulis dengan spesifik.
