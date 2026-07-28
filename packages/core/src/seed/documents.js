/**
 * The seeded SOP corpus.
 *
 * Passages are the unit of retrieval and the unit of citation: every claim the
 * agents make points at a document id and a page number, which is what AC-3.2
 * and AC-4.2 require. Pages are real positions inside the documents named on
 * design/SCREENS.md screens 06, 11 and 12.
 *
 * Vertex AI Search replaces the retrieval, not this shape — an indexed chunk
 * returns the same {docId, page, text} triple.
 */
export const DOCUMENTS = Object.freeze([
  {
    docId: 'sop-layanan-v4',
    tenantId: 'nusa-retail',
    title: 'SOP Layanan Pelanggan v4',
    type: 'PDF',
    pages: 34,
    indexState: 'indexed',
    updatedAt: '2026-07-28',
    restricted: false,
  },
  {
    docId: 'nada-brand-2026',
    tenantId: 'nusa-retail',
    title: 'Panduan Nada Brand 2026',
    type: 'PDF',
    pages: 12,
    indexState: 'indexed',
    updatedAt: '2026-06-30',
    restricted: false,
  },
  {
    docId: 'sop-keluhan-v5-draft',
    tenantId: 'nusa-retail',
    title: 'SOP Penanganan Keluhan (draft v5)',
    type: 'DOCX',
    pages: 18,
    indexState: 'menunggu-tinjauan',
    updatedAt: '2026-07-24',
    restricted: false,
  },
  {
    docId: 'katalog-produk-q3',
    tenantId: 'nusa-retail',
    title: 'Katalog Produk Q3',
    type: 'XLSX',
    pages: null,
    indexState: 'indexed',
    updatedAt: '2026-07-21',
    restricted: false,
  },
  {
    docId: 'perjanjian-waralaba',
    tenantId: 'nusa-retail',
    title: 'Perjanjian Layanan Waralaba',
    type: 'PDF',
    pages: 26,
    indexState: 'diproses',
    updatedAt: '2026-07-26',
    restricted: true,
  },
  {
    docId: 'notulen-ops-juni',
    tenantId: 'nusa-retail',
    title: 'Notulen Rapat Ops Juni',
    type: 'PDF',
    pages: 9,
    indexState: 'dikecualikan',
    updatedAt: '2026-07-02',
    restricted: false,
  },
]);

/**
 * Indexed passages. Only documents whose `indexState` is `indexed` contribute —
 * a draft SOP awaiting review must never be quoted back to a customer, and the
 * excluded minutes must never be retrievable at all.
 */
export const PASSAGES = Object.freeze([
  {
    docId: 'sop-layanan-v4',
    page: 12,
    text: 'Antrean lebih dari 10 menit wajib ditangani dengan membuka kasir tambahan pada jam sibuk. Manajer cabang bertanggung jawab memantau panjang antrean setiap hari pada pukul 17.00 sampai 20.00.',
  },
  {
    docId: 'sop-layanan-v4',
    page: 13,
    text: 'Jika kasir tambahan tidak dapat dibuka karena keterbatasan staf, cabang wajib mengarahkan staf floating ke kasir dan melaporkan kejadian tersebut ke area manager pada hari yang sama.',
  },
  {
    docId: 'sop-layanan-v4',
    page: 18,
    text: 'Kebersihan area belanja diperiksa tiga kali sehari. Lantai yang kotor atau tumpahan wajib dibersihkan paling lambat 15 menit setelah dilaporkan.',
  },
  {
    docId: 'sop-layanan-v4',
    page: 19,
    text: 'Ketersediaan barang pada rak utama diperiksa setiap pagi sebelum toko dibuka. Barang yang habis wajib dipesan ulang pada hari yang sama dan dicatat pada log restock.',
  },
  {
    docId: 'sop-layanan-v4',
    page: 21,
    text: 'Pengembalian barang promo dapat dilayani apabila barang masih dalam masa 7 hari sejak pembelian, struk asli tersedia, dan kemasan tidak rusak permanen.',
  },
  {
    docId: 'sop-layanan-v4',
    page: 22,
    text: 'Barang promo yang sudah dibuka tidak dapat ditukar dengan uang tunai. Penyelesaian yang diizinkan hanya penggantian barang sejenis atau voucher belanja. Jika pelanggan menolak, eskalasi ke area manager pada hari yang sama dan jangan menjanjikan pengembalian tunai di kasir.',
  },
  {
    docId: 'sop-layanan-v4',
    page: 27,
    text: 'Keluhan mengenai sikap staf ditangani oleh manajer cabang melalui coaching pada shift berikutnya. Permintaan maaf disampaikan tanpa menyebut nama staf yang bersangkutan.',
  },
  {
    docId: 'sop-layanan-v4',
    page: 30,
    text: 'Fasilitas parkir yang penuh pada jam sibuk dilaporkan ke area manager untuk ditinjau kapasitasnya. Cabang tidak diperkenankan menjanjikan penambahan lahan parkir kepada pelanggan.',
  },
  {
    docId: 'sop-layanan-v4',
    page: 31,
    text: 'Perbedaan harga dengan kompetitor tidak dijadikan dasar pemberian potongan di kasir. Staf mengarahkan pelanggan ke program promo resmi yang sedang berjalan.',
  },
  {
    docId: 'nada-brand-2026',
    page: 3,
    text: 'Akui masalahnya, sebut tindakan konkret, jangan berjanji tanpa tanggal. Balasan ditulis hangat dan bertanggung jawab, tidak defensif, dan tidak menyalahkan pelanggan.',
  },
  {
    docId: 'nada-brand-2026',
    page: 4,
    text: 'Sapa pelanggan dengan nama bila tersedia. Gunakan bahasa Indonesia yang sopan tanpa istilah teknis internal seperti SKU, shrinkage, atau footfall.',
  },
  {
    docId: 'nada-brand-2026',
    page: 5,
    text: 'Jangan pernah menjanjikan kompensasi finansial, ganti rugi, voucher, atau potongan harga di dalam balasan publik. Tawaran semacam itu hanya disampaikan melalui kanal privat setelah persetujuan area manager.',
  },
  {
    docId: 'nada-brand-2026',
    page: 7,
    text: 'Balasan publik tidak memuat data pribadi pelanggan seperti nomor telepon, alamat, atau nomor pesanan. Ajak pelanggan melanjutkan ke kanal privat bila detail diperlukan.',
  },
  {
    docId: 'katalog-produk-q3',
    page: 1,
    text: 'Katalog produk kuartal tiga memuat 1.284 SKU aktif dengan harga berlaku sejak 1 Juli 2026.',
  },
]);

/** Passages the retrieval layer is allowed to see. */
export function retrievablePassages(tenantId) {
  const indexed = new Set(
    DOCUMENTS.filter((doc) => doc.tenantId === tenantId && doc.indexState === 'indexed').map(
      (doc) => doc.docId,
    ),
  );

  return PASSAGES.filter((passage) => indexed.has(passage.docId)).map((passage) => ({
    ...passage,
    tenantId,
    title: DOCUMENTS.find((doc) => doc.docId === passage.docId).title,
  }));
}

export function findDocument(docId) {
  return DOCUMENTS.find((doc) => doc.docId === docId) ?? null;
}
