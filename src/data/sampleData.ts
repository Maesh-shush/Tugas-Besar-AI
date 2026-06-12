export interface Transaction {
  id_transaksi: string;
  id_akun: string;
  nominal: number;
  jenis_transaksi: "keluar" | "masuk";
  deskripsi: string;
  tanggal: string; // Format DD-MM-YYYY
}

export const sampleTransactions: Transaction[] = [
  {
    id_transaksi: "TX-2026-001",
    id_akun: "ACC-DIV-UMUM",
    nominal: 145000000,
    jenis_transaksi: "keluar",
    deskripsi: "Pembelian 5 unit Laptop Admin kantor (Intel Core i3, RAM 4GB, SSD 256GB)",
    tanggal: "10-06-2026"
  },
  {
    id_transaksi: "TX-2026-002",
    id_akun: "ACC-DIV-SDM",
    nominal: 250000000,
    jenis_transaksi: "keluar",
    deskripsi: "Konsumsi katering rapat koordinasi & evaluasi triwulan (100 porsi paket nasi kotak)",
    tanggal: "11-06-2026"
  },
  {
    id_transaksi: "TX-2026-003",
    id_akun: "ACC-DIV-SDM",
    nominal: 185000000,
    jenis_transaksi: "keluar",
    deskripsi: "Pengadaan kertas HVS A4 & pulpen kantor bulanan divisi SDM",
    tanggal: "11-06-2026"
  },
  {
    id_transaksi: "TX-2026-004",
    id_akun: "ACC-DIV-KEU",
    nominal: 6500000,
    jenis_transaksi: "keluar",
    deskripsi: "Pembayaran gaji staff administrasi bulan Mei",
    tanggal: "12-06-2026"
  },
  {
    id_transaksi: "TX-2026-005",
    id_akun: "ACC-DIV-MARKET",
    nominal: 85000000,
    jenis_transaksi: "masuk",
    deskripsi: "Penerimaan termin 1 jasa konsultasi pemasaran produk",
    tanggal: "12-06-2026"
  },
  {
    id_transaksi: "TX-2026-006",
    id_akun: "ACC-DIV-LOGISTIK",
    nominal: 75000000,
    jenis_transaksi: "keluar",
    deskripsi: "Pembelian 1 unit Genset Diesel Silent Jepang 10 KVA",
    tanggal: "12-06-2026"
  },
  {
    id_transaksi: "TX-2026-007",
    id_akun: "ACC-DIV-LOGISTIK",
    nominal: 38000000,
    jenis_transaksi: "keluar",
    deskripsi: "Pengadaan 3 unit AC Split 1 PK merk standar nasional",
    tanggal: "13-06-2026"
  },
  {
    id_transaksi: "TX-2026-008",
    id_akun: "ACC-DIV-UMUM",
    nominal: 4200000,
    jenis_transaksi: "keluar",
    deskripsi: "Biaya langganan internet bulanan kantor serat optik 100 Mbps",
    tanggal: "13-06-2026"
  },
  {
    id_transaksi: "TX-2026-009",
    id_akun: "ACC-DIV-MARKET",
    nominal: 150000000,
    jenis_transaksi: "keluar",
    deskripsi: "Sewa booth pameran industri skala kecil selama 3 hari",
    tanggal: "14-06-2026"
  },
  {
    id_transaksi: "TX-2026-010",
    id_akun: "ACC-DIV-KEU",
    nominal: 500000000,
    jenis_transaksi: "masuk",
    deskripsi: "Pencairan dana anggaran belanja operasional korporat triwulan 2",
    tanggal: "15-06-2026"
  }
];

export const sampleCsvString = `id_transaksi,id_akun,nominal,jenis_transaksi,deskripsi,tanggal
TX-2026-001,ACC-DIV-UMUM,145000000,keluar,"Pembelian 5 unit Laptop Admin kantor (Intel Core i3, RAM 4GB, SSD 256GB)",10-06-2026
TX-2026-002,ACC-DIV-SDM,250000000,keluar,"Konsumsi katering rapat koordinasi & evaluasi triwulan (100 porsi paket nasi kotak)",11-06-2026
TX-2026-003,ACC-DIV-SDM,185000000,keluar,"Pengadaan kertas HVS A4 & pulpen kantor bulanan divisi SDM",11-06-2026
TX-2026-004,ACC-DIV-KEU,6500000,keluar,"Pembayaran gaji staff administrasi bulan Mei",12-06-2026
TX-2026-005,ACC-DIV-MARKET,85000000,masuk,"Penerimaan termin 1 jasa konsultasi pemasaran produk",12-06-2026
TX-2026-006,ACC-DIV-LOGISTIK,75000000,keluar,"Pembelian 1 unit Genset Diesel Silent Jepang 10 KVA",12-06-2026
TX-2026-007,ACC-DIV-LOGISTIK,38000000,keluar,"Pengadaan 3 unit AC Split 1 PK merk standar nasional",13-06-2026
TX-2026-008,ACC-DIV-UMUM,4200000,keluar,"Biaya langganan internet bulanan kantor serat optik 100 Mbps",13-06-2026
TX-2026-009,ACC-DIV-MARKET,150000000,keluar,"Sewa booth pameran industri skala kecil selama 3 hari",14-06-2026
TX-2026-010,ACC-DIV-KEU,500000000,masuk,"Pencairan dana anggaran belanja operasional korporat triwulan 2",15-06-2026`;
