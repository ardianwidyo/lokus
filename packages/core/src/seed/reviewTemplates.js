/**
 * Indonesian review bodies, grouped by the theme they complain about.
 *
 * These are the *input* to theme clustering, not its output. No review object
 * in the dataset carries a pre-assigned theme that the clusterer can read — it
 * has to find the theme in this text, which is what AC-2.1 demands.
 *
 * Several bodies deliberately mention a second topic in passing ("pegawainya
 * ramah sih"), so the clusterer has to weigh signals rather than match one word.
 */
export const COMPLAINT_TEMPLATES = Object.freeze({
  'antrean-kasir': [
    'Antre hampir 20 menit padahal cuma beli dua barang. Kasir yang buka cuma satu.',
    'Jam pulang kantor antrean mengular sampai rak minuman. Tolong tambah kasir.',
    'Sudah tiga kali ke sini selalu ngantri lama. Pegawainya ramah, tapi kasirnya kurang.',
    'Kasir dua tapi yang aktif satu terus. Antrian jadi panjang banget sore hari.',
    'Menunggu lama di kasir, padahal toko lagi tidak terlalu ramai.',
    'Antrean panjang tiap akhir pekan. Sistem antriannya perlu dibenahi.',
  ],
  kebersihan: [
    'Lantai dekat pintu masuk kotor dan lengket, sepertinya jarang dipel.',
    'Area minuman agak jorok, ada sampah bekas kemasan yang dibiarkan.',
    'Kebersihan menurun dibanding tahun lalu. Rak berdebu tebal.',
    'Bau kurang sedap di dekat kasir. Tolong diperiksa kebersihannya.',
    'Tempat sampah penuh dan tidak diganti sampai sore.',
    'Debu di rak makanan ringan cukup mengganggu.',
  ],
  'stok-kosong': [
    'Stok susu UHT kosong lagi. Ini kesekian kalinya saya balik dengan tangan hampa.',
    'Barang promo habis padahal baru jam sepuluh pagi.',
    'Rak roti kosong terus tiap saya datang sore.',
    'Beberapa item kebutuhan harian tidak tersedia sejak pekan lalu.',
    'Kehabisan stok minyak goreng ukuran kecil, padahal itu yang paling dicari.',
    'Stok tidak pernah lengkap. Rak bagian tengah sering kosong.',
  ],
  parkir: [
    'Parkir motor penuh terus, susah dapat tempat waktu jam sibuk.',
    'Lahan parkir sempit dan tidak ada petugas yang mengatur.',
    'Parkiran mobil cuma muat beberapa unit, akhirnya saya parkir di bahu jalan.',
    'Susah keluar dari parkiran karena motor diparkir sembarangan.',
    'Parkir jadi masalah utama di cabang ini, sisanya sudah bagus.',
    'Tidak ada atap di parkiran, kehujanan waktu ambil motor.',
  ],
  'harga-vs-pesaing': [
    'Harga beberapa item lebih mahal dibanding minimarket sebelah.',
    'Selisih harga cukup terasa untuk barang yang sama, sayang sekali.',
    'Promo di sini kalah menarik, tempat lain lebih murah untuk produk sejenis.',
    'Harga naik terus tapi tidak ada promo pengganti.',
    'Mahal untuk ukuran minimarket. Saya bandingkan dengan yang di seberang.',
    'Barang kebutuhan pokok lebih murah di kompetitor sebelah.',
  ],
  'keramahan-staf': [
    'Kasirnya jutek, tidak menyapa sama sekali.',
    'Pelayanan kurang ramah, ditanya malah cuek.',
    'Staf agak judes waktu saya tanya lokasi barang.',
    'Ada petugas yang menjawab dengan nada kasar. Sayang sekali.',
    'Pelayanan tidak seramah cabang lain yang pernah saya kunjungi.',
    'Ditanya baik-baik tapi dijawab cuek sambil main HP.',
  ],
});

/** Positive reviews carry no complaint, so they add no theme to the matrix. */
export const POSITIVE_TEMPLATES = Object.freeze([
  'Lengkap dan dekat rumah. Belanja cepat, tidak ribet.',
  'Tokonya nyaman, penataan barang rapi. Puas belanja di sini.',
  'Pelayanannya cepat dan menyenangkan. Terima kasih.',
  'Selalu jadi tujuan belanja mingguan saya. Tidak pernah mengecewakan.',
  'Harga bersaing dan barangnya lengkap. Recommended.',
  'Buka 24 jam sangat membantu. Kasirnya sigap.',
  'Bersih dan terang. Enak buat belanja malam hari.',
  'Sering ada promo yang benar-benar berguna.',
]);

export const AUTHOR_NAMES = Object.freeze([
  'Agus P.', 'Bunga L.', 'Citra D.', 'Dimas A.', 'Eka S.', 'Fitri N.',
  'Galih R.', 'Hana M.', 'Irfan T.', 'Jihan K.', 'Krisna B.', 'Lestari W.',
  'Maya H.', 'Nanda F.', 'Oki S.', 'Putri A.', 'Rizal M.', 'Sinta P.',
  'Taufik H.', 'Umi K.', 'Vina C.', 'Wahyu D.', 'Yanti S.', 'Zaki R.',
]);
