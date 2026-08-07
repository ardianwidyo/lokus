# Runbook demo — menjalankan LOKUS tanpa proyek Google Cloud

Dokumen ini untuk orang yang akan menjalankan demo, bukan untuk yang menulis
kodenya. Isinya: cara menyalakan konsol, apa yang bisa ditambahkan secara
langsung di depan juri, dan apa yang harus dilakukan kalau ada yang macet.

**Tidak ada satu pun langkah di sini yang butuh proyek GCP, akun billing, atau
kunci API.** Konsolnya menjalankan seluruh logika domain di browser: supervisor,
routing agen, retrieval RAG, ambang penolakan 0,70, dan keempat guardrail adalah
kode yang sama yang dijalankan API. Hanya adapter Google-nya yang seeded.

---

## 1 · Menyalakan (2 menit, sekali saja)

Butuh **Node.js 20 atau lebih baru**. Periksa dengan `node -v`.

```bash
git clone <repo-url> lokus
cd lokus
npm install
npm run dev
```

Buka **http://localhost:5173**. Pilih **Nusa Retail** dan peran **Area
Manager** di layar 01, lalu konsolnya terbuka penuh — keempat belas layar,
tanpa konfigurasi apa pun.

> Jangan set `VITE_LOKUS_API_URL`. Kalau variabel itu kosong, konsol memakai
> dataset seeded di browser dan tidak memanggil API sama sekali. Itu mode yang
> Anda mau untuk demo di laptop.

### Kalau ingin URL publik, bukan laptop

Repo ini sudah punya workflow GitHub Pages (`.github/workflows/pages.yml`).
Gratis, tanpa billing, tanpa GCP:

1. Di GitHub: **Settings → Pages → Source: GitHub Actions**.
2. Push ke `main`. CI jalan; kalau hijau, Pages otomatis men-deploy.
3. URL-nya muncul di **Actions → Pages → Report the URL**.

Konsol di Pages berperilaku identik dengan yang di laptop, termasuk semua
kemampuan menambah data di bawah ini. Yang perlu diketahui: data yang
ditambahkan tinggal di tab browser, jadi juri yang membuka URL yang sama tidak
melihat apa yang Anda tambahkan — dan itu benar begitu, bukan bug.

---

## 2 · Yang bisa Anda tambahkan di depan juri

Ini bagian yang membuat demo hidup. Konsolnya bukan tayangan; ia bisa diberi
sesuatu yang belum pernah dilihatnya.

### 2.1 · Menambah dokumen SOP — layar 11 `/pengetahuan`

Kartu **Unggah dokumen** di kanan bawah.

1. Isi **Judul dokumen**, mis. `SOP Poin Loyalitas v1`.
2. Isi **Isi dokumen** — tempel teksnya, atau **tarik berkas `.txt`/`.md`** ke
   kotak putus-putus.
3. Klik **Indeks dokumen**.

Yang terjadi: teksnya dipotong 800 token dengan overlap 120, diindeks, dan
tanda terimanya menyebut **jumlah potongan yang sebenarnya**. Barisnya langsung
muncul di tabel dokumen dengan status **Terindeks**, tanpa muat ulang.

Centang **Batasi akses ke peran Admin** sebelum mengindeks untuk menunjukkan
jalur yang berbeda: dokumennya tersimpan, tercatat di tabel sebagai *Menunggu
tinjauan*, dan **tidak akan pernah dikutip agen**. Ini bukan penolakan palsu —
retrieval benar-benar tidak melihatnya.

> Hanya `.txt` dan `.md`. PDF butuh ekstraktor sisi-server; konsol yang berdiri
> sendiri di browser tidak punya itu, dan ia menolak berkas PDF dengan jujur
> alih-alih mengindeks teks berantakan. Kalau juri membawa PDF, salin isinya ke
> kotak teks.

### 2.2 · Menambah review Google — layar 05 `/review`

Di bawah daftar kiri, tombol **+ Tambah review (demo)**.

Pilih cabang, bintang, nama penulis, lalu tulis teks review seperti pelanggan
menulisnya. Klik **Tambahkan**.

Review itu masuk ke antrean **seperti review lain**: dikelompokkan tema oleh
clusterer dari teksnya sendiri, dibuatkan draft balasan yang bersitasi, dan
tunduk pada aturan yang sama. Barisnya langsung terpilih di panel kanan.

Dua hal yang layak ditunjukkan ke juri:

- Barisnya membawa tag **demo**, dan panel kanan menulis "Ditambahkan di demo"
  alih-alih "Google". Konsolnya tidak pernah mengaku punya data Google yang
  tidak ia punya.
- Pilih cabang **BSD Grand Boulevard** dan coba tambahkan. Ia menolak: cabang
  itu belum punya listing di Google Maps, jadi tidak ada review yang bisa
  ditinggalkan di sana. Itu aturan US-9 yang sama, bukan validasi form.

### 2.3 · Membalas review pelanggan — layar 05 atau 06

Pilih satu review, lihat draftnya di panel kanan, lalu **Setujui & kirim**.

Yang layak ditunjuk: review **bintang 1–2 tidak pernah terkirim tanpa
persetujuan manusia bernama**, dan aturan itu ditegakkan di tiga lapis
terpisah. Layar 06 `/draft` menunjukkan keempat guardrail — lolos maupun gagal —
beserta pasal SOP yang menjadi dasar kalimat tindakannya.

### 2.4 · Bertanya ke agen — layar 10 `/chat`

Ketik pertanyaan bebas. Jejak eksekusinya tampil **di dalam** jawaban: tool yang
benar-benar dipanggil, latensi, dan biaya per jawaban.

Dua pertanyaan yang paling meyakinkan, dan urutannya penting:

1. Tambahkan SOP di 2.1 lebih dulu, lalu tanyakan isinya di sini. Agen
   mengutip dokumen yang **baru saja Anda buat**, lengkap dengan judul dan
   halamannya. Ia tidak bisa menghafal itu.
2. `Bagaimana resep rendang padang?` — agen menolak, mencatatnya sebagai celah
   pengetahuan, dan celah itu muncul di layar 11.

### 2.5 · Mengulang demo

Tombol **Pulihkan data contoh** ada di kartu unggah (layar 11) dan di komposer
review (layar 05). Menekannya menghapus setiap dokumen dan review yang
ditambahkan sesi ini, dan mengembalikan konsol ke dataset contoh — supaya demo
bisa dijalankan lagi untuk juri berikutnya dari keadaan yang sama.

Memuat ulang halaman melakukan hal yang sama, karena data tambahan hanya ada di
memori tab.

---

## 3 · Alur 6 menit yang saya sarankan

Urutannya dipilih supaya setiap langkah memakai hasil langkah sebelumnya.

| Menit | Layar | Lakukan |
|---|---|---|
| 0.0–0.5 | — | Masalahnya: review menumpuk, keputusan lokasi tanpa data, SOP tersebar |
| 0.5–1.5 | 02 `/briefing` | Tiga keputusan, bukan dashboard. Setujui Keputusan 1 → tiket dengan pemilik dan tenggat |
| 1.5–2.5 | 11 `/pengetahuan` | **Tempel SOP baru di depan juri.** Tunjuk jumlah potongan di tanda terima |
| 2.5–3.5 | 05 `/review` | **Tambahkan review** yang menyinggung isi SOP itu. Tunjuk temanya ditemukan, draftnya mengutip SOP yang baru dibuat |
| 3.5–4.5 | 06 `/draft` | Empat guardrail, dan aturan persetujuan manusia untuk bintang 1–2 |
| 4.5–5.5 | 10 `/chat` | Tanyakan isi SOP baru → dikutip. Lalu tanya resep rendang → ditolak |
| 5.5–6.0 | 14 `/admin` | Guardrail, batas biaya, 60 kasus eval yang lolos |

Kalau waktunya mepet, potong menit 3.5–4.5. Rantai **tambah SOP → tambah review
→ agen mengutip SOP baru** adalah inti demonya; jangan itu yang dikorbankan.

---

## 4 · Kalau ada yang macet

| Gejala | Lakukan |
|---|---|
| `npm install` gagal | Periksa `node -v` ≥ 20. Hapus `node_modules` dan `package-lock.json`, ulangi |
| Port 5173 dipakai | `npm run dev -- --port 5174` |
| Layar kosong setelah masuk | Muat ulang sekali. Kalau tetap, hapus session storage lewat DevTools → Application |
| Unggah menolak berkas | Berkasnya bukan `.txt`/`.md`. Salin isinya ke kotak teks |
| Review tidak bisa ditambahkan | Cabangnya L0 atau L1 — pesannya menyebutkan alasannya. Pilih Bekasi Timur |
| Dokumen baru tidak dikutip agen | Skornya di bawah ambang 0,70. Pakai pertanyaan yang memakai kata-kata dari dokumen itu |
| Chat lambat | Lanjut bicara; jawabannya deterministik dan pasti muncul |
| Semua kacau | Tekan **Pulihkan data contoh**, atau muat ulang halaman |

---

## 5 · Yang jangan dijanjikan ke juri

Kejujuran soal ini justru menambah nilai, bukan mengurangi — juri menghargai
sistem yang tahu batasnya sendiri.

- Konsolnya berjalan di atas **dataset contoh**, bukan review Google sungguhan.
  Adapternya sama persis; akses API tenant pilot masih menunggu (spec.md Q1).
- Review dan dokumen yang Anda tambahkan **bukan data Google**, dan konsolnya
  menandainya begitu. Jangan menyebutnya "review yang baru masuk".
- Median waktu respons di layar 14 dihitung dari fixture enam jam, jadi angka
  itu **bukan bukti kecepatan agen**. README menyebutkan hal yang sama.
- Grafik layar 04 menggambar 8 pekan, bukan 12: 8 pekan adalah seluruh rentang
  review yang ada, dan layarnya mengatakan itu.
- Terraform di `infra/` belum pernah di-`apply` ke proyek nyata. Ia bagian dari
  bukti kesiapan produksi, bukan klaim bahwa sistemnya sedang berjalan di
  Cloud Run.

---

## 6 · Kalau ingin menjalankan dengan API (opsional)

Tidak perlu untuk demo, tapi berguna kalau juri bertanya apakah lapisan auth,
tenant isolation, dan RBAC benar-benar ada. Tetap tanpa GCP:

```bash
# Terminal 1
GOOGLE_CLOUD_PROJECT=demo LOKUS_AUTH_MODE=dev \
  LOKUS_ALLOWED_ORIGINS=http://localhost:5173 \
  npm run dev --workspace api

# Terminal 2
VITE_LOKUS_API_URL=http://localhost:8080 npm run dev --workspace web
```

Sekarang setiap permintaan browser melewati `authenticate → withTenant →
requireRole` yang sungguhan. Perlu diketahui: komposer review dan kontrol
pulihkan-data **tidak muncul** dalam mode ini, karena datanya dipegang API dan
konsol tidak berhak membuangnya. Unggah SOP tetap bekerja lewat
`POST /v1/knowledge/documents`.

Untuk menjalankan penalaran Gemini yang sungguhan alih-alih jalur
deterministik, ambil kunci gratis di <https://aistudio.google.com/apikey> —
kunci AI Studio tidak butuh akun billing — dan set `GEMINI_API_KEY` di proses
API. Tanpa kunci, semuanya tetap berjalan lewat jalur deterministik, dan itulah
yang dilayani demo publik.

---

## 7 · Memeriksa bahwa semuanya benar sebelum naik panggung

```bash
npm test          # 1.055 test: core 500, api 145, web 391, eval 19
npm run eval      # 60 kasus golden set, lima ambang
npm run lint
```

Jalankan sekali di pagi hari demo. Kalau `npm run eval` lulus, klaim di layar 14
bisa Anda ucapkan tanpa ragu — angkanya dihasilkan runner itu, bukan diketik.
