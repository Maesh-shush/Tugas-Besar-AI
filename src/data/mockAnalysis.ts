import { AnalysisResult } from "../types";

export const defaultAnalysisResult: AnalysisResult = {
  overallRiskScore: 82,
  executiveSummary: "Ditemukan indikasi kuat penggelembungan dana (mark-up) masif pada transaksi pengadaan komputer dan biaya katering koordinasi. Dua divisi utama (Divisi Umum dan Divisi SDM) terindikasi memiliki pola pengeluaran yang tidak wajar dibandingkan historis bulanan kantor, dengan total potensi kemahalan harga pasar mencapai lebih dari Rp 320.000.000.",
  anomalies: [
    {
      id_transaksi: "TX-2026-001",
      id_akun: "ACC-DIV-UMUM",
      nominal: 145000000,
      tingkat_kecurigaan: "Tinggi",
      alasan_historis: "Pengadaan hardware komputer mengalami peningkatan nominal sebesar 340% dari anggaran belanja bulanan divisi umum.",
      alasan_harga_pasar: "Pembelian 5 unit Laptop Admin Intel Core i3 dihargai Rp 29.000.000 per unit. Estimasi harga pasar wajar di Indonesia untuk spesifikasi tersebut berkisar antara Rp 6.000.000 s.d Rp 7.500.000 per unit. Terjadi indikasi penggelembungan dana (mark-up) sebesar ~300%.",
      estimasi_harga_pasar_wajar: 35000000,
      status_akun: "Dalam Pengawasan",
      admin_notifikasi: "Peringatan Darurat! Akun ACC-DIV-UMUM terdeteksi melakukan transaksi mencurigakan penggelembungan dana Laptop Admin (TX-2026-001). Nilai markup diestimasi mencapai IDR 110.000.000.",
      rekomendasi_audit: "Lakukan audit forensik terhadap vendor pemenang pengadaan laptop, telusuri bukti kuitansi fiktif, serta cek fisik unit laptop yang diserahterimakan."
    },
    {
      id_transaksi: "TX-2026-002",
      id_akun: "ACC-DIV-SDM",
      nominal: 250000000,
      tingkat_kecurigaan: "Tinggi",
      alasan_historis: "Biaya katering rapat triwulan biasanya berkisar di antara Rp 10.000.000 hingga Rp 15.000.000. Transaksi kali ini melonjak tajam melebihi batas batas toleransi anggaran standard korporasi.",
      alasan_harga_pasar: "Nominal Rp 250.000.000 untuk 100 porsi paket nasi kotak berarti biaya per porsi mencapai Rp 2.500.000. Harga pasar paket nasi kotak katering premium berkisar Rp 45.000 - Rp 60.000 per porsi. Terdapat selisih markup ekstrim yang tidak logis.",
      estimasi_harga_pasar_wajar: 6000000,
      status_akun: "Dalam Pengawasan",
      admin_notifikasi: "Peringatan Darurat! Akun ACC-DIV-SDM terdeteksi menggelembungkan dana konsumsi katering rapat koordinasi (TX-2026-002) senilai IDR 250.000.000 dengan selisih luar biasa.",
      rekomendasi_audit: "Panggil kepala divisi terkait dan mintalah list tanda tangan panitia koordinasi, lakukan konfirmasi langsung kepada nama katering yang tertulis di invoice."
    },
    {
      id_transaksi: "TX-2026-003",
      id_akun: "ACC-DIV-SDM",
      nominal: 185000000,
      tingkat_kecurigaan: "Sedang",
      alasan_historis: "Pengadaan kertas HVS A4 & pulpen kantor senilai Rp 185.000.000 untuk satu divisi dalam jangka satu bulan sangat janggal. Konsumsi ATK normal div SDM hanya berkisar Rp 4.000.000 s.d Rp 8.000.000.",
      alasan_harga_pasar: "Satu divisi kantor umumnya mengonsumsi maksimal 20 rim kertas HVS (Rp 1.000.000) dan beberapa kotak pulpen (Rp 500.000) per bulan. Kuantitas nominal Rp 185 juta terindikasi mengandung penimbunan atau kuintansi pengeluaran palsu.",
      estimasi_harga_pasar_wajar: 8000000,
      status_akun: "Dalam Pengawasan",
      admin_notifikasi: "Notifikasi Kriminal! Akun ACC-DIV-SDM memproses pengadaan ATK abnormal senilai IDR 185.000.000 bulanan (TX-2026-003). Tindakan investigasi fisik ATK diperlukan.",
      rekomendasi_audit: "Lakukan inventarisasi fisik di gudang penyimpanan kantor divisi SDM guna memverifikasi apakah kertas dan pulpen memang benar-benar ada secara fisik dengan jumlah ratusan dus."
    }
  ],
  laporan_berkala: {
    judul: "LAPORAN AUDIT INTERNAL BERKALA — DETEKSI FRAUD DAN FRAKSIONAL MARKUP",
    tanggal: "12 Juni 2026",
    pembukaan: "Berdasarkan amanat pengawasan keuangan internal perusahaan dan merujuk pada integrasi sistem kecerdasan buatan pemantau korupsi Sentinel Analytics, kami telah melaksanakan analisis forensik terhadap seluruh aliran dana keluar pada periode Juni 2026. Laporan ini disusun serapi mungkin sebagai rujukan audit lapangan komprehensif.",
    temuan_utama: [
      "Indikasi penggelembungan harga (markup) laptop kerja karyawan pada Divisi Umum senilai Rp 110.000.000 net markup (selisih pasar 314%).",
      "Katering katering fiktif atau ekstrim markup senilai Rp 244.000.000 pada Divisi SDM dalam acara katering koordinasi triwulan.",
      "Abnormalitas alokasi belanja ATK (Alat Tulis Kantor) sebesar Rp 185.000.000 untuk keperluan administrasi bulanan satu divisi."
    ],
    analisis_distribusi: "Distribusi penyimpangan dana terkonsentrasi sangat tinggi pada urusan pengadaan jasa katering (55.4%) dan urusan pengadaan penunjang peralatan digital kantor (32.1%). Selebihnya merupakan sirkulasi aset penunjang fisik yang perlu pengawasan substantif.",
    rekomendasi_strategis: [
      "Mengimplementasikan e-Procurement tersentralisasi dengan batas pagu otomatis yang terkunci oleh sistem, sehingga divisi tidak dapat menginput harga di luar rentang pasar umum.",
      "Menyusun standar harga pasar baku daerah (Price List Master) untuk instansi korporat yang divalidasi berkala setiap semester.",
      "Melakukan rotasi rutin pada pejabat pembuat komitmen (PPK) atau bagian Purchasing divisi setiap 12 bulan demi memutus rantai nepotisme vendor lokal."
    ],
    langkah_lanjut: [
      "Membekukan sementara sirkulasi pencairan dana anggaran sisa belanja divisi SDM hingga seluruh bukti pendukung transaksi TX-2026-002 diklarifikasi secara rinci.",
      "Mengirim surat panggilan serta permintaan dokumen penawaran harga asli dari vendor laptop admin untuk mencocokkan nomor seri fisik dangan faktur pajak.",
      "Melaporkan berkas audit forensik digital Sentinel Analytics ini ke Komite Audit Pusat guna koordinasi penindakan indisipliner."
    ]
  }
};
