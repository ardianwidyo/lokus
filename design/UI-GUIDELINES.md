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
- Field steel gelap (`--color-accent-surface`) hanya untuk permukaan peta.
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
--color-bg: #f8f9ff;         /* ground */
--color-surface: #eff4ff;    /* input */
--color-text: #0b1c30;
--color-accent: #0058be;
--color-divider: color-mix(in srgb, #0b1c30 22%, transparent);

--color-accent-100: #eff6ff;  /* panel keputusan, highlight baris terpilih */
--color-accent-300: #bbd7ff;  /* border panel keputusan */
--color-accent-400: #8ebafb;  /* nomor besar, border-left blok draft */
--color-accent-600: #0058be;  /* hover tombol primer */
--color-accent-700: #004395;  /* teks aksen ukuran badan (kontras aman) */
--color-accent-900: #001a42;  /* text-on-tint (panel keputusan, item rail aktif) */

--color-neutral-200: #eaf0fd; /* skeleton, track bar */
--color-neutral-600: #767b84; /* label kicker */
--color-neutral-700: #595d67; /* teks sekunder */

--font-heading: "Barlow Condensed";  --font-body: "Barlow";
--space-1..8: 3.4 6.8 10.2 13.6 20.4 27.2 px
```

Nilai warna di atas diambil dari ekspor Stitch
(`design/reference/lokusstitch.html`); tipografi, spacing, dan radius **belum**
ikut — lihat "Yang belum ikut" di bawah.

Teks berukuran badan dalam warna aksen tetap memakai `--color-accent-700`.
Aksen dasar sendiri sekarang sudah 6.37:1 di atas ground (palet lama hanya
4.30:1), jadi aturan ini kini soal konsistensi, bukan lagi batas yang dipaksa
palet.

Semua token di atas ikut berbalik nilai antara tema terang dan gelap — lihat
"Tema terang / gelap" di bawah. Tiga token TIDAK ikut berbalik, karena
perannya bukan pasangan latar/teks yang mengikuti tema, melainkan satu
permukaan aksen yang sengaja tetap sama di kedua tema:

```css
--color-accent-surface: #213145;          /* field peta, gelembung chat pengguna */
--color-on-accent-surface: #eaf1ff;       /* label di atas field peta */
--color-on-accent-surface-muted: #8ebafb; /* marker & radius di atas field peta */
--color-scrim: rgba(34, 43, 62, .5);      /* latar belakang dialog */
```

Ketiganya diambil dari pasangan `inverse-surface` / `inverse-on-surface` milik
Stitch, yang memang perannya sama persis.

## Yang belum ikut dari Stitch

Penyegaran ini **hanya warna**. Yang sengaja dibiarkan:

| Aspek | Stitch | LOKUS sekarang |
|---|---|---|
| Tipografi | Inter | Barlow / Barlow Condensed |
| Radius | 2–12 px | 0 pada komponen (rangka blueprint) |
| Warna status | hijau/amber/merah eksplisit | belum ada token status |
| Tema gelap | tidak dikirim sama sekali | turunan sendiri |

Stitch juga memakai gradien dan `backdrop-filter` pada beberapa kartu; keduanya
masih dilarang di daftar "Jangan" di atas dan tidak diadopsi.

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

**Permukaan peta.** Latar `--color-accent-surface` — tetap sama di kedua tema
(lihat "Token yang paling sering dipakai" di atas). Grid garis
`color-mix(in srgb, var(--color-on-accent-surface) 10%, transparent)`, jalan
`.3` tebal 2–2.5px, radius analisis sebagai lingkaran dashed
`var(--color-on-accent-surface-muted)` 45% opasitas. Marker: kotak 13px =
cabang sendiri, lingkaran r=6 = pesaing, segitiga = kandidat. Label
`--color-on-accent-surface` Barlow Condensed 17px + baris detail 12px
`color-mix(in srgb, var(--color-on-accent-surface) 62%, transparent)`. Tanda
sudut di atas field gelap memakai `style="color:rgba(255,255,255,.6)"` — tetap
putih di kedua tema, karena field itu sendiri tidak berubah.

**Matriks tema × cabang.** `.table`; sel angka memakai latar dari ramp aksen
(200 → 800) dan teks `--color-bg` bila latar ≥ 500. Kolom terakhir sparkline
90×20.

**Baris tiket.** Id tiket Barlow Condensed `--color-accent-700`. Status hanya
empat: `Baru` (`.tag-outline`), `Dikerjakan` (`.tag-accent`), `Menunggu`
(`.tag-neutral`), `Selesai` (`.tag-neutral` + `opacity:.55`).

## Gaya bahasa

Pembaca konsol ini adalah area manager, bukan engineer. Copy ditulis dengan
bahasa sehari-hari: kalimat pendek, kalimat aktif, sapaan "Anda", dan kata yang
memang dipakai orang di lapangan.

**Lakukan**

- Satu kalimat satu gagasan. Kalau ada dua, pecah jadi dua kalimat.
- Kata kerja biasa: "gagal ditampilkan", bukan "tak bisa dimuat"; "diatur di",
  bukan "ditegakkan di"; "batas maksimal", bukan "batas keras".
- Sebut apa yang terjadi, bukan istilah prosesnya: "Review disortir otomatis",
  bukan "Triase otomatis".

**Istilah teknis** hanya bertahan kalau ia menamai fitur yang benar-benar ada.
Kalau bertahan, ia ditulis dengan kata awam lebih dulu dan istilah aslinya
sekali dalam kurung, di tempat pertama ia muncul di layar itu:

| Ditulis | Bukan |
|---|---|
| Cek pengaman | Pemeriksaan guardrail |
| Aturan tetap (deterministik) | Deterministik |
| Model pembaca dokumen (embedding) | Model embedding |
| Data tiap perusahaan (tenant) dipisah | Pemisahan tenant |
| Rebutan pelanggan sendiri | Kanibalisasi |
| Tempat di sekitar | POI |
| Langkah kerja agen | Jejak eksekusi |
| Batas kecocokan | Ambang keyakinan |
| Masalah semua cabang | Masalah sistemik |

Kalau sebuah istilah sudah punya tautan yang lebih kuat ke kodenya, tanda kurung
tidak perlu. Layar 14 menyebut file penegaknya di tiap baris ("diatur di
`guardrails.js`"), jadi "Cek pengaman" di layar 06 dibiarkan polos — nama file
lebih bisa diverifikasi daripada glosarium, dan kicker yang panjang jadi dua
baris di kolom sempit.

Menyederhanakan bahasa tidak boleh mengubah klaimnya. Angka, ambang, sumber,
dan syarat tetap disebut lengkap — "Kalau kecocokan sumbernya di bawah 0,70,
agen memilih tidak menjawab" sama tepatnya dengan kalimat lamanya, hanya lebih
mudah dibaca. Kalau penyederhanaan menghilangkan syarat, penyederhanaannya yang
salah.

Aturan ini berlaku untuk kedua bahasa. Inggris mengikuti Indonesia, dengan
register yang sama — "safety checks (guardrails)", bukan "guardrail checks".

## Empat state wajib (copy final)

```
Memuat            skeleton 3 bar (70% / 92% / 48%, tinggi 11px, --color-neutral-200)
                  + "Agen sedang membaca 18 review…"
Kosong            "Tidak ada review baru" / "Semua review pekan ini sudah dibalas.
                  Agen mengecek lagi malam ini pukul 23.00." / [Periksa sekarang]
Gagal             "Places API tidak menjawab" / "Skor lokasi memakai data tersimpan
                  per 26 Juli. Agen mencoba lagi otomatis dalam 5 menit."
                  / [Coba lagi] [Lihat catatan error]
Perlu izin        "Hubungkan Business Profile" / "LOKUS perlu izin membaca review dan
                  mengirim balasan untuk 42 lokasi milik Anda." / [Hubungkan akun]
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

## Tema terang / gelap

LOKUS punya dua tema, dipilih pembaca, bukan ditentukan sistem operasinya
saja. `web/src/theme` (mengikuti bentuk `web/src/i18n` untuk bahasa persis):
`ThemeProvider`/`useTheme` menyimpan pilihan, `themeStorage.js` membaca/menulis
`localStorage` kunci `lokus.theme` (default ke `prefers-color-scheme` saat
belum pernah memilih), dan `ThemeSwitcher` adalah dua radio dalam satu
`radiogroup` — sama seperti `LanguageSwitcher`, dipasang di footer rail dan di
header konten di bawah 900px.

Mekanismenya satu atribut: `ThemeProvider` menulis
`<html data-theme="light|dark">`, dan `design/tokens.css` mendefinisikan
seluruh ramp warna dua kali — sekali di `:root`, sekali di
`:root[data-theme="dark"]`. Karena setiap komponen sudah membaca `var(--*)`,
tidak ada komponen yang perlu tahu temanya sendiri; mengganti tema mengganti
warna di seluruh aplikasi lewat CSS saja.

Aturan buat token baru: **jangan** memakai `--color-bg` atau `--color-text`
sebagai proksi "putih"/"gelap" yang tetap — keduanya berbalik nilai per tema.
Untuk elemen yang sengaja permanen gelap (permukaan peta, gelembung chat
pengguna), pakai `--color-accent-surface` +
`--color-on-accent-surface`/`--color-on-accent-surface-muted`, yang memang
tidak berbalik. Setiap ramp/pasangan baru yang ditambahkan wajib punya kasus
kontras di `web/test/accessibility.test.jsx`, satu untuk tema terang dan satu
untuk tema gelap.

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
> dan Inggris sebagai terjemahannya. Aplikasi punya tema terang dan gelap,
> dipilih pembaca lewat `web/src/theme` (`ThemeSwitcher`, bentuknya sama
> dengan `LanguageSwitcher`) — jangan pernah menulis warna literal, karena
> `design/tokens.css` sudah mendefinisikan kedua tema lewat token yang sama.
