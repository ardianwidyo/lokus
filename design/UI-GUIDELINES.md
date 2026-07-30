# UI Guidelines — LOKUS on the Industry design system

Satu stylesheet: `design/tokens.css`. Impor sekali di entry point. Semua nilai
diambil dari `var(--*)`; jangan pernah menulis hex, nama font, atau angka px
yang sudah punya token.

## Prinsip visual

LOKUS terlihat seperti gambar teknik, bukan dashboard SaaS: ground terang, satu
aksen steel-blue, judul Barlow Condensed di atas badan Barlow, dan setiap kartu,
panel, serta figur diberi bingkai hairline dengan tanda registrasi `+` di empat
sudut.

**Lakukan**

- Setiap kartu/panel/figur: `class="blueprint"` + empat anak
  `<i class="corner tl|tr|bl|br">`.
- Sudut siku (radius 0), latar transparan pada kartu — kartu adalah gambar
  garis, bukan permukaan berisi.
- Satu-satunya objek padat: tombol primer (`.btn-primary`, isian aksen).
- Field steel gelap (`--color-accent-900`) hanya untuk permukaan peta.
- Angka dan judul Barlow Condensed 600; badan teks Barlow.
- Heatmap dan intensitas memakai satu ramp aksen (200 → 900).
- Status memakai bentuk dan tag, bukan merah/hijau.
- Ikon Lucide, stroke-width 1.5, ukuran 13–19px.
- Setiap klaim AI menempelkan chip sumber.

**Hindari**

- Gradien, sudut membulat, kartu berisian abu-abu, shadow tebal.
- Merah/hijau/kuning sebagai warna status; skala pelangi pada heatmap.
- Emoji, ikon tebal, ilustrasi 3D.
- Field gelap di luar peta.
- Angka hiasan yang tidak bisa ditelusuri sumbernya.

## Token yang paling sering dipakai

```css
--color-bg: #f2f2f3;         /* ground */
--color-surface: #e9e9ea;    /* input */
--color-text: #1d1f20;
--color-accent: #5980a6;
--color-divider: color-mix(in srgb, #1d1f20 16%, transparent);

--color-accent-100: #eef6ff;  /* panel keputusan, highlight baris terpilih */
--color-accent-300: #b5d9fd;  /* border panel keputusan */
--color-accent-400: #94bce3;  /* marker di peta, nomor besar */
--color-accent-600: #597ea3;  /* hover tombol primer */
--color-accent-700: #416180;  /* teks aksen ukuran badan (kontras aman) */
--color-accent-900: #1d2d3d;  /* field peta, gelembung chat pengguna */

--color-neutral-200: #e7e7ea; /* skeleton, track bar */
--color-neutral-600: #7a7a7d; /* label kicker */
--color-neutral-700: #5d5d60; /* teks sekunder */

--font-heading: "Barlow Condensed";  --font-body: "Barlow";
--space-1..8: 3.4 6.8 10.2 13.6 20.4 27.2 px
```

Teks berukuran badan dalam warna aksen wajib memakai `--color-accent-700`
(aksen dasar hanya 3:1 — cukup untuk ikon, chrome, dan teks besar).

## Kelas komponen yang tersedia

| Kelas | Untuk |
|---|---|
| `.btn` + `.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-icon` / `.btn-block` | aksi |
| `.tag` + `.tag-accent` / `.tag-neutral` / `.tag-outline` | label kecil, status, chip sumber |
| `.field` + `label`, `.input`, `.radio` + `.dot`, `.seg` + `.seg-opt` | form |
| `.card` + `.card-kicker` / `.card-title` / `.card-body` / `.card-meta` | kartu isi |
| `.nav` + `.nav-brand` | header bar |
| `.table` | tabel data |
| `.dialog-backdrop` + `.dialog` | modal |
| `.blueprint` + `.corner` | bingkai wireframe (wajib pada kartu/panel/figur) |
| `.duotone` | wrapper foto (belum dipakai di produk) |

Di React, `.seg-opt`/`.radio` memakai input asli — pakai `defaultChecked`
(bukan `checked`) atau kendalikan dengan `onChange`, kalau tidak kontrolnya
akan beku.

## Pola khas LOKUS

**Kartu metrik.** Kicker uppercase 10.5px `--color-neutral-600` → angka besar
Barlow Condensed 40px `line-height:.9` → delta 13px di sisi kanan bawah angka →
sparkline SVG `stroke-width:1.5` tanpa isian, tinggi 36–40px.

**Skor lokasi.** Cincin SVG 72px: track `--color-neutral-300` 1.5px, progres
`--color-accent` 4px, angka Barlow Condensed 26px di tengah. Faktor ditampilkan
sebagai daftar label + angka, atau bar 9px dengan track `--color-neutral-200`.

**Kartu review.** Prioritas = `.tag-outline`; tema = `.tag-neutral`; sinyal
agen ("tema naik 3×", "draft siap") = `.tag-accent`. Bintang sebagai teks
`★☆☆☆☆` dengan `letter-spacing:2px`, warna `--color-accent`.

**Blok draft AI.** Kutipan draft dengan `padding-left:13px` +
`border-left:2px solid var(--color-accent-400)`. Di bawahnya baris chip sumber
(`.tag-accent` + ikon dokumen 11px). Aksi: primer *Setujui & kirim*, sekunder
*Ubah*, *Minta versi lain*, ghost *Tolak*.

**Chip jejak eksekusi.** `font-family: ui-monospace` 11px, border hairline,
padding 3px 8px, format `01 supervisor.route`. Langkah guardrail memakai border
`--color-accent` dan teks `--color-accent-700`.

**Panel jejak lengkap.** Baris bernomor: nomor Barlow Condensed 12px
`--color-accent-600` (min-width 16px) + nama tool 14px + keterangan 12.5px
`--color-neutral-600`, dipisah `border-top:1px solid var(--color-divider)`.

**Permukaan peta.** Latar `--color-accent-900`. Grid garis
`rgba(242,242,243,.1)`, jalan `.3` tebal 2–2.5px, radius analisis sebagai
lingkaran dashed `#94bce3` 45% opasitas. Marker: kotak 13px = cabang sendiri,
lingkaran r=6 = pesaing, segitiga = kandidat. Label putih Barlow Condensed 17px
+ baris detail 12px `rgba(242,242,243,.62)`. Tanda sudut di atas field gelap
memakai `style="color:rgba(242,242,243,.6)"`.

**Matriks tema × cabang.** `.table`; sel angka memakai latar dari ramp aksen
(200 → 800) dan teks `--color-bg` bila latar ≥ 500. Kolom terakhir sparkline
90×20.

**Baris tiket.** Id tiket Barlow Condensed `--color-accent-700`. Status hanya
empat: `Baru` (`.tag-outline`), `Dikerjakan` (`.tag-accent`), `Menunggu`
(`.tag-neutral`), `Selesai` (`.tag-neutral` + `opacity:.55`).

## Empat state wajib (copy final)

```
Memuat            skeleton 3 bar (70% / 92% / 48%, tinggi 11px, --color-neutral-200)
                  + "Agen sedang membaca 18 review…"
Kosong            "Tidak ada review baru" / "Semua review pekan ini sudah dibalas.
                  Agen akan memeriksa lagi malam ini pukul 23.00." / [Periksa sekarang]
Gagal             "Places API tak menjawab" / "Skor lokasi memakai data tersimpan
                  per 26 Juli. Percobaan ulang otomatis dalam 5 menit."
                  / [Coba lagi] [Lihat log]
Perlu izin        "Hubungkan Business Profile" / "LOKUS butuh akses baca review dan
                  tulis balasan untuk 42 lokasi milik Anda." / [Hubungkan akun]
```

Keempat state ikut bahasa yang dipilih pembaca (US-8). Copy Indonesia di atas
tetap yang final dan yang ditulis lebih dulu; padanan Inggrisnya ada di
`web/src/i18n/messages.en.js` dengan kunci yang sama. Jangan menulis copy state
langsung di komponen — kalau sebuah panel butuh kalimat yang belum ada, kuncinya
ditambahkan ke **kedua** kamus sekaligus, dan test paritas kamus yang memastikan
tidak ada yang tertinggal.

## State interaksi

- Hover tombol primer `--color-accent-600`; press `--color-accent-700`.
- Hover sekunder/ghost: tint `color-mix()` dari teks/aksen (sudah di stylesheet).
- Fokus keyboard: `outline: 2px solid var(--color-accent); outline-offset: 2px`.
  Jangan pernah membiarkan ring biru default.
- Baris tabel hover: tint 4% teks. Baris terpilih: latar
  `--color-accent-100` + `border-left: 2px solid var(--color-accent)`.
- Disabled: opacity .45.

## Responsif

- ≥ 1200px: rail 238px + konten; grid 3–4 kolom.
- 900–1200px: grid turun ke 2 kolom; panel samping (jejak, sumber) pindah ke
  bawah.
- < 900px: rail jadi bottom nav 4 item (Briefing · Peta · Review · Agen), tinggi
  60px, ikon 19px + label 10px; semua grid satu kolom; target sentuh ≥ 44px.

## Prompt siap tempel untuk AI coding agent

> Bangun UI ini dengan React + Vite. Impor `design/tokens.css` dan ambil semua
> warna, font, dan spacing dari `var(--*)`. Setiap kartu, panel, dan figur
> memakai `class="blueprint"` dengan empat anak `<i class="corner tl|tr|bl|br">`.
> Sudut siku, tanpa isian permukaan pada kartu, tanpa gradien, tanpa emoji.
> Judul dan angka Barlow Condensed 600, badan teks Barlow. Ikon Lucide
> stroke-width 1.5. Status memakai tag dan bentuk, bukan warna merah/hijau.
> Heatmap memakai satu ramp aksen. Setiap panel data harus punya empat state
> (memuat, kosong, gagal, perlu izin) dengan copy yang ada di
> `design/UI-GUIDELINES.md`. Setiap klaim AI menempelkan chip sumber. Copy UI
> tidak pernah ditulis langsung di komponen: ia dibaca lewat `useT()` dari
> `web/src/i18n`, dengan Indonesia diambil apa adanya dari `design/SCREENS.md`
> dan Inggris sebagai terjemahannya.
