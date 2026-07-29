# Demo Day — 5 menit, LOKUS

Satu alur, tanpa berpindah-pindah tanpa alasan: **keluhan mentah → tema →
keputusan → tindakan yang bisa dibuktikan.**

Jalankan di URL yang sudah ter-deploy, bukan di laptop (konstitusi VII). Buka
tab kedua di `/admin` sebelum mulai supaya tidak perlu menunggu apa pun.

**Peran demo:** masuk sebagai **Nusa Retail · Area Manager**.

---

## 0.00 — 0.30 · Masalahnya

> "Bisnis bercabang di Indonesia punya tiga sinyal berharga yang tidak
> terpakai. Review Google menumpuk tanpa dibalas — median respons pertama
> sembilan hari. Keputusan lokasi diambil tanpa data pesaing. SOP tersebar di
> PDF dan grup chat, jadi tiap cabang berimprovisasi."

Jangan buka apa pun dulu. Biarkan kalimatnya berdiri sendiri.

---

## 0.30 — 1.30 · Layar 02 · Briefing Pagi

Buka `/briefing`.

> "Ini yang dilihat area manager jam tujuh pagi. Bukan dashboard — tiga
> keputusan, itu saja."

Tunjuk garis waktunya, dari atas ke bawah:

> "Jam 23.02 Agen Reputasi membaca 713 review. Jam 05.10 Agen Pengetahuan
> mengukur cakupan SOP. Setiap angka di sini dihitung dari data, bukan
> ditulis di template."

Berhenti di simpul **02.30**:

> "Perhatikan yang ini: *Agen Lokasi tidak dijalankan.* Agen itu belum kami
> bangun. Sistemnya mengatakannya, bukan diam-diam melewatkan satu langkah.
> Itu keputusan desain, bukan bug."

Klik **Setujui & buat tiket** pada Keputusan 1. Tunjukkan tanda terimanya:

> "Tiket T-xxx, pemiliknya Ops Excellence — bukan orang yang menekan tombol —
> dengan tenggat. Keputusan sistemik tidak bisa dipikul satu manajer cabang."

---

## 1.30 — 2.30 · Layar 07 · Analisis tema

Buka `/tema`.

> "Dari mana keputusan tadi datang? Dari sini."

Tunjuk baris **Antrean kasir**:

> "Enam wilayah, delapan pekan. Yang penting: tak satu pun review ini punya
> label tema. Agen menemukannya sendiri dari teks Bahasa Indonesia —
> *'antre 25 menit cuma buat bayar'*."

Tunjuk penanda sistemik:

> "Aturannya menghitung **wilayah**, bukan cabang. Tiga keluhan dari tiga toko
> Bekasi itu masalah lokal. Tiga dari Bekasi, Depok, Serpong itu pola — dan
> jawabannya bukan menegur cabang, tapi mengubah SOP pusat."

---

## 2.30 — 3.30 · Layar 06 · Draft balasan

Buka `/draft`.

> "Turun satu tingkat: satu review, satu balasan."

Tunjuk drafnya, lalu panel kanan:

> "Kalimat tindakannya dibangun **dari** pasal SOP halaman 12 yang terambil,
> bukan dikarang lalu dicarikan pembenaran. Kalau tidak ada pasal yang lolos
> ambang 0,70, agen tidak menulis draft sama sekali."

Tunjuk empat guardrail:

> "Empat pemeriksaan, dan keempatnya ditampilkan — lolos maupun gagal. Kalau
> hanya kegagalan yang muncul, 'tidak ada peringatan' tak bisa dibedakan dari
> 'tidak ada pemeriksaan'."

Satu kalimat yang tidak boleh dilewat:

> "Review bintang 1–2 tidak pernah terkirim tanpa persetujuan manusia
> bernama. Aturan itu ditegakkan di tiga lapis terpisah."

---

## 3.30 — 4.20 · Layar 10 · Chat agen

Buka `/chat`. Ketik:

```
Kenapa rating cabang Bekasi Timur turun bulan ini?
```

Saat jawabannya muncul, tunjuk deretan chip:

> "Jejak eksekusi ada **di dalam** jawaban, bukan di balik tombol. Tujuh
> langkah, tool yang benar-benar dipanggil, latensi, dan biaya per jawaban."

Lalu ketik pertanyaan kedua — ini bagian terpentingnya:

```
Bagaimana resep rendang padang?
```

> "Tidak ada di dokumen. Agen menolak dan mencatatnya sebagai celah
> pengetahuan. Tidak ada jawaban yang dikarang — dan itu bisa Anda uji sendiri
> sekarang juga."

---

## 4.20 — 5.00 · Layar 14 · Admin

Pindah ke tab `/admin`.

> "Terakhir, bukti kesiapan produksi yang bisa diperiksa, bukan diklaim."

Tunjuk tiga hal, cepat:

1. **Guardrail** — "tiap baris menyebut file yang menegakkannya. Bisa dibuka
   di repo."
2. **Biaya** — "34% dari batas keras. Di atas 90% agen turun ke Flash dan
   mengirim peringatan; batas kerasnya menolak panggilan."
3. **Evaluasi** — "60 kasus golden set, lima ambang, semuanya lolos. CI
   memblokir merge kalau satu saja gagal. Angka ini dihasilkan runner, bukan
   diketik."

Tutup:

> "Tiga agen, jejak yang bisa diaudit, dan sistem yang lebih memilih menolak
> daripada mengarang. Terima kasih."

---

## Kalau ada yang tidak jalan

| Gejala | Lakukan |
|---|---|
| Layar kosong / cold start | Muat ulang sekali; Cloud Run scale-to-zero butuh ~3 detik |
| Chat lambat | Lanjut bicara; jawabannya deterministik, pasti muncul |
| Deploy bermasalah | Jalankan lokal: `npm install && npm run dev` — datanya sama persis |
| Waktu habis | Potong bagian 07; alur 02 → 06 → 10 sudah cukup |

## Yang jangan dijanjikan

- Agen Lokasi **belum** ada. Kalau ditanya, katakan itu fase P3 dan tunjukkan
  bahwa sistem sudah mengatakannya sendiri di garis waktu.
- Konsol berjalan di atas **dataset contoh**, bukan review Google sungguhan.
  Adapternya sama; akses API tenant pilot masih menunggu (spec.md Q1).
- Layar 03, 04, 08, 09, 11, 12 masih placeholder yang menyebut fasenya.
