export interface Transaction {
  id_transaksi: string;
  id_akun: string;
  nominal: number;
  jenis_transaksi: "keluar" | "masuk";
  deskripsi: string;
  tanggal: string;
}

export interface Anomaly {
  id_transaksi: string;
  id_akun: string;
  nominal: number;
  tingkat_kecurigaan: "Tinggi" | "Sedang" | "Rendah";
  alasan_historis: string;
  alasan_harga_pasar: string;
  estimasi_harga_pasar_wajar: number;
  status_akun: string; // "Dalam Pengawasan"
  admin_notifikasi: string;
  rekomendasi_audit: string;
}

export interface LaporanBerkala {
  judul: string;
  tanggal: string;
  pembukaan: string;
  temuan_utama: string[];
  analisis_distribusi: string;
  rekomendasi_strategis: string[];
  langkah_lanjut: string[];
}

export interface AnalysisResult {
  overallRiskScore: number;
  executiveSummary: string;
  anomalies: Anomaly[];
  laporan_berkala: LaporanBerkala;
}

export interface SystemNotification {
  id: string;
  timestamp: string;
  type: "warning" | "danger" | "info";
  message: string;
  id_akun: string;
  resolved: boolean;
}
