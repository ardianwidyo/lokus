# CLAUDE.md — LOKUS

Konteks untuk Claude Code. Baca ini sebelum menulis kode apa pun.

## Apa yang dibangun

LOKUS — konsol intelijen operasional untuk bisnis bercabang. Tiga agen otonom
(Reputasi, Lokasi, Pengetahuan) + satu supervisor. Setiap malam agen membaca
review Google Business Profile, data lokasi Places, dan SOP internal; setiap
pagi menghasilkan Briefing Pagi berisi maksimal tiga keputusan yang bisa
diambil area manager.

Ini submission EBCO AI Hackathon 2026, Kategori A + B. Tenggat submission
11 Agustus 2026. Tim non-developer — Anda yang menulis hampir seluruh kode.

## Baca berkas ini dulu, dalam urutan ini

1. `.specify/memory/constitution.md` — prinsip yang tidak boleh dilanggar
2. `specs/001-lokus-core/spec.md` — user story + acceptance criteria
3. `specs/001-lokus-core/plan.md` — stack, kontrak agen, data model, fase
4. `specs/001-lokus-core/tasks.md` — T001–T059, 46 tugas (setiap tugas menunjuk AC)
5. `design/UI-GUIDELINES.md` + `design/SCREENS.md` — aturan visual + 14 layar
6. `design/tokens.css` — satu-satunya sumber nilai warna/tipografi/spacing

## Aturan kerja

- **Spec dulu, kode kemudian.** Jangan mengubah perilaku tanpa mengubah
  `spec.md` di commit terpisah lebih dahulu.
- **Kerjakan per fase**, jangan melompat: P0 → P1 → P4 → P5 wajib; P2 dan P3
  boleh lebih sempit tapi harus tetap bisa didemokan (keduanya membawa poin
  tema bonus).
- **Satu tugas = satu commit** dengan prefix id-nya, mis.
  `feat(T014): brand-voice reply draft grounded in SOP`.
- **Jangan menulis nilai desain sendiri.** Impor `design/tokens.css` dan pakai
  `var(--color-*)`, `var(--space-*)`, `var(--font-*)`. Tidak ada hex baru,
  tidak ada sudut membulat, tidak ada gradien.
- **Setiap panel data punya empat state**: loading, empty, error,
  needs-permission. Tanpa itu tugas belum selesai.
- **Setiap klaim AI menempel sumbernya** (id review / halaman SOP / respons
  Places). Kalau skor retrieval < 0.70, agen menjawab "tidak ada di dokumen"
  dan mencatat celah pengetahuan. Jangan pernah mengarang.
- **Jangan taruh secret di repo.** Secret Manager saja; `.env.example` boleh.
- **Tenant id ikut di setiap query, dokumen, dan baris log.** Tidak ada
  pembacaan lintas tenant, bahkan untuk admin.
- **Jangan tambah dependency besar** tanpa alasan yang ditulis di plan.md.

## Stack (jangan diganti tanpa alasan)

React + Vite (web) · Cloud Run + Fastify (api) · Vertex AI Agent Engine (agen) ·
Gemini untuk penalaran, Gemini Flash untuk pekerjaan massal · Vertex AI Search
(RAG) · BigQuery + GIS · Firestore · Places API (New) · Business Profile
Performance API · Terraform · GitHub Actions · region `asia-southeast2`.

## Definition of done per tugas

1. Kode jalan di `npm run dev` tanpa error konsol.
2. Empat state UI ada (kalau tugasnya menyentuh panel data).
3. Tenant isolation terjaga.
4. Ada test atau kasus eval yang membuktikannya (`eval/golden_set.jsonl`).
5. Commit memakai prefix id tugas.

## Yang membuat submission ini menang (jangan dikorbankan)

| Kriteria | Poin | Bukti yang harus ada di repo |
|---|---|---|
| Kemanfaatan | 35 | tabel dampak di README dengan angka before/after |
| Keragaman teknologi | 20 | stack di plan.md benar-benar terpakai, bukan disebut |
| Kompleksitas | 20 | supervisor + tool calling + RAG bersitasi + GIS, dan **jejak eksekusi tampil di UI** |
| Production readiness | 25 | Terraform, CI hijau, eval lulus ambang, batas biaya, empat state UI |
| SDD (Spec Kit) | 8 | commit spec **sebelum** commit kode, tautan keduanya di README |
| Tema terpilih | 8 | ketiga agen benar-benar berjalan di demo |

Salah satu juri adalah AI yang membaca repo ini. README, spec, dan nama file
adalah antarmuka ke juri itu: judul jelas, angka konkret, klaim yang bisa
diverifikasi.

## Bahasa

UI dan copy: **Bahasa Indonesia** (sudah final di `design/SCREENS.md`, pakai
apa adanya). Kode, komentar, commit message, dan dokumen teknis: **English**.
