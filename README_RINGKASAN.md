# 🔍 Corrupt Detector AI

**Intelligent Procurement Anomaly Detector** — Sistem deteksi potensi korupsi dalam data pengadaan menggunakan Machine Learning lokal.

---

## 📋 Daftar Isi

- [Ringkasan Aplikasi](#ringkasan-aplikasi)
- [Fitur Utama](#fitur-utama)
- [Arsitektur Sistem](#arsitektur-sistem)
- [File-File Utama](#file-file-utama)
- [Cara Menggunakan](#cara-menggunakan)
- [Persyaratan](#persyaratan)
- [Instalasi & Setup](#instalasi--setup)

---

## 📌 Ringkasan Aplikasi

**Corrupt Detector AI** adalah aplikasi web berbasis **Streamlit** yang dirancang untuk mendeteksi anomali harga dalam data pengadaan barang/jasa. Aplikasi ini menggunakan kombinasi:

1. **Machine Learning (Random Forest)** — Model terlatih yang memprediksi probabilitas anomali
2. **Rule-Based Logic** — Sistem aturan berbasis ambang batas harga
3. **Fuzzy Matching** — Pencocokan nama barang yang fleksibel terhadap referensi pasar

### Tujuan:
Mengidentifikasi kemungkinan **markup harga yang mencurigakan** dalam data pembelian yang mungkin mengindikasikan praktik korupsi atau kesalahan proses pengadaan.

---

## ✨ Fitur Utama

### 1. **Upload & Deteksi Kolom Otomatis**
   - Upload dua file CSV/Excel:
     - **File Pengadaan**: Data pembelian dengan kolom Nama Barang, Harga Beli, dsb.
     - **File Referensi**: Harga pasar standar untuk perbandingan
   - Sistem otomatis mendeteksi kolom yang diperlukan dari header file

### 2. **Pencocokan Nama Barang (Fuzzy Matching)**
   - Mencocokkan nama barang di file pengadaan dengan data referensi pasar
   - Menggunakan algoritma **fuzzy matching** dengan skor kecocokan (%)
   - Toleran terhadap variasi penulisan nama barang (simbol, singkatan, spasi, dll)

### 3. **Analisis Harga dengan ML**
   - Model **Random Forest** memprediksi apakah transaksi mencurigakan
   - Mempertimbangkan 3 fitur utama:
     - `harga_beli`: Harga yang dibeli
     - `harga_pasar`: Harga referensi pasar
     - `selisih_persen`: Persentase perbedaan (markup %)
   - Ambang batas dinamis: lebih ketat untuk barang harga rendah (<500K)

### 4. **Klasifikasi & Penentuan Risiko**
   - **Status**: VALID ✅ atau ANOMALI 🚨
   - **Risiko**: TINGGI (prob ≥80% atau markup >100%), SEDANG, atau RENDAH
   - **Alasan**: Penjelasan teknis berbasis prediksi ML dan rule-based

### 5. **Analisis Penanggung Jawab (PJ)**
   - Hitung skor akumulasi anomali per PJ
   - Tandai PJ yang melebihi ambang batas sebagai **FLAGGED** 🚩
   - Identifikasi kemungkinan pola korupsi per individu

### 6. **Dashboard Interaktif**
   - 4 kartu statistik: Total Item, Valid, Anomali, Tidak Ditemukan
   - Detail per item dengan warna-coding
   - Filter hasil (Semua, Anomali saja, Valid saja)
   - Export hasil ke Excel (.xlsx)

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                    app.py (Streamlit UI)                    │
│  ├─ Upload & Preview kedua file                            │
│  ├─ Deteksi kolom otomatis → column_mapper.py             │
│  ├─ Pencocokan nama barang (fuzzy matching)                │
│  └─ Tampil dashboard & hasil analisis                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
        ┌────────────────────────────────┐
        │  analyzer.py (Inferensi ML)    │
        │  ├─ Load model dari .pkl      │
        │  ├─ Hitung selisih_persen     │
        │  ├─ Prediksi ML (prob anomali)│
        │  ├─ Klasifikasi & risiko      │
        │  └─ Fallback rule-based       │
        └────────────────────────────────┘
                         ▲
                         │ membaca
        ┌────────────────────────────────┐
        │  model_anomali.pkl             │
        │  (Random Forest, 100 trees)    │
        │  Training dari data_training   │
        └────────────────────────────────┘
```

**Train Loop** (jalankan sekali atau update saat data training baru):
```
data_training.csv → train_model.py → sklearn RandomForest → model_anomali.pkl
```

---

## 📁 File-File Utama

| File | Deskripsi |
|------|-----------|
| **app.py** | Aplikasi Streamlit utama (UI, logika workflow) — ~25KB |
| **analyzer.py** | Modul inferensi ML untuk prediksi anomali — ~5.7KB |
| **train_model.py** | Script training model dari data_training.csv — ~3.4KB |
| **column_mapper.py** | Deteksi kolom fleksibel berdasarkan header — ~8.6KB |
| **model_anomali.pkl** | Model Random Forest terlatih — ~117KB |
| **data_training.csv** | Data training untuk melatih model — ~142KB |
| **requirements.txt** | Dependency Python (streamlit, pandas, sklearn, dll) |
| **.gitignore** | File yang diabaikan git (cache, environment, dll) |

---

## 🚀 Cara Menggunakan

### Workflow Aplikasi:

1. **Persiapan**
   - Pastikan model sudah ada: `python train_model.py`
   - Jalankan app: `streamlit run app.py`

2. **Upload File**
   - Upload **File 1 (Data Pengadaan)** dengan kolom wajib:
     - `Nama Barang` ✓
     - `Harga Beli (Rp)` ✓
   - Upload **File 2 (Referensi Harga Pasar)** dengan kolom wajib:
     - `Nama Barang` ✓
     - `Harga Pasar (Rp)` ✓
   - Kolom opsional: Jumlah, Satuan, Penanggung Jawab, Tanggal, Sumber

3. **Review Pencocokan**
   - Tabel "Hasil Pencocokan Nama Barang" menunjukkan:
     - Item mana yang berhasil dicocokkan ke referensi
     - Skor kecocokan (%)
     - Item yang tidak ditemukan di referensi

4. **Konfigurasi Ambang Batas** (di sidebar)
   - **Ambang batas selisih (%)**: 5–50% (default 20%)
     - Mempengaruhi level risiko dan rule-based fallback
   - **Sensitivitas pencocokan nama (%)**: 50–100% (default 75%)
     - Tinggi = ketat, Rendah = lentur
   - **Ambang batas flag PJ (Skor)**: 1–10 (default 3)
     - PJ dengan skor ≥ batas akan ditandai 🚩

5. **Jalankan Analisis**
   - Klik tombol **"🚀 Mulai Analisis dengan ML"**
   - Model memprediksi setiap item

6. **Review Hasil**
   - **Ringkasan**: 4 kartu statistik
   - **Analisis PJ**: Tabel skor per Penanggung Jawab
   - **Detail Item**: Lihat alasan anomali per barang
   - **Filter**: Pilih tampilan (Semua, Anomali saja, Valid saja)

7. **Export**
   - Klik **"⬇️ Download Hasil (.xlsx)"**
   - File berisi: Nama, Status, Risiko, Harga, Selisih %, Alasan ML, Info PJ

---

## 📦 Persyaratan

- **Python**: 3.8+
- **Dependency** (lihat `requirements.txt`):
  - `streamlit` — Web framework
  - `pandas` — Manipulasi data
  - `scikit-learn` — ML model
  - `rapidfuzz` — Fuzzy matching
  - `openpyxl` — Export Excel
  - `joblib` — Model serialization

---

## 🔧 Instalasi & Setup

### 1. Clone Repository
```bash
git clone https://github.com/Maesh-shush/Tugas-Besar-AI.git
cd Tugas-Besar-AI
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Train Model (jika belum ada model_anomali.pkl)
```bash
python train_model.py
```

**Output:**
```
Memuat data dari: /path/to/data_training.csv
Total baris   : 1234
Anomali (1)   : 345
Valid (0)     : 889

=== Laporan Klasifikasi (Data Uji) ===
             precision  recall  f1-score  support
       Valid      0.95    0.92      0.93      180
      Anomali      0.88    0.91      0.89      98

Model disimpan ke: /path/to/model_anomali.pkl
Siap digunakan oleh: streamlit run app.py
```

### 4. Jalankan Aplikasi
```bash
streamlit run app.py
```

**Aplikasi akan terbuka di** `http://localhost:8501`

---

## 🧠 Cara Kerja Deteksi Anomali

### Algoritma Klasifikasi:

```
Untuk setiap item:
  1. Hitung selisih_persen = (harga_beli - harga_pasar) / harga_pasar * 100
  
  2. Prediksi ML (gunakan model):
     - Input fitur: [harga_beli, harga_pasar, selisih_persen]
     - Output: prob_anomali (0–1), pred_anomali (True/False)
  
  3. Tentukan status:
     if (pred_anomali OR selisih_persen > dynamic_threshold):
       status = ANOMALI
       risiko = tinggi/sedang/rendah (berdasarkan prob & selisih)
     else:
       status = VALID
       risiko = None
  
  4. Fallback Rule-Based (jika model gagal):
     if selisih_persen > threshold:
       - > 100%: ANOMALI + Risiko TINGGI
       - > 50%:  ANOMALI + Risiko SEDANG
       - > threshold: ANOMALI + Risiko RENDAH
     else:
       VALID
```

### Skor PJ (Penanggung Jawab):
```
Per PJ, hitung skor akumulasi:
  - Item ANOMALI + Risiko TINGGI   → +3 poin
  - Item ANOMALI + Risiko SEDANG   → +2 poin
  - Item ANOMALI + Risiko RENDAH   → +1 poin
  
Jika skor >= threshold_pj:
  PJ ditandai 🚩 FLAGGED (potensi korupsi)
```

---

## 💡 Contoh Input

### File Pengadaan (data_pengadaan.csv)
```csv
Nama Barang,Jumlah,Satuan,Harga Beli (Rp),Penanggung Jawab,Tanggal
Laptop Asus VivoBook,3,Unit,8500000,Ani Rahayu,2026-06-01
Mouse Wireless Logitech,10,Pcs,580000,Dodi Firmansyah,2026-06-02
AC Split 1PK Daikin,4,Unit,5800000,Dodi Firmansyah,2026-06-03
```

### File Referensi (harga_pasar.csv)
```csv
Nama Barang,Harga Pasar (Rp),Sumber,Tanggal Update
Laptop Asus VivoBook,8200000,iBox,2026-06-01
Mouse Wireless Logitech,185000,Shopee,2026-06-01
AC Split 1PK Daikin,3200000,Ace Hardware,2026-06-01
```

### Output Analisis
```
Nama Barang: Laptop Asus VivoBook
Status: ANOMALI 🚨
Selisih: +3.7%
Risiko: RENDAH
Alasan: Harga beli 3.7% di atas pasar (melebihi ambang 20%)

---

Nama Barang: AC Split 1PK Daikin
Status: ANOMALI 🚨
Selisih: +81.3%
Risiko: SEDANG
Alasan: Model ML mendeteksi anomali (probabilitas: 72%). 
        Harga beli melebihi pasar 81.3% (ambang: 20%).
        PJ 'Dodi Firmansyah' memiliki 2 item anomali dalam batch ini.
```

---

## 📊 Model Machine Learning

**Tipe Model**: Random Forest Classifier
- **N Estimators**: 100 pohon keputusan
- **Max Depth**: 12
- **Class Weight**: Balanced (untuk mengatasi imbalance data)
- **Fitur Input**: 
  - `harga_beli`
  - `harga_pasar`
  - `selisih_persen`
- **Output**: Probabilitas anomali (0–1)

**Training Data**: `data_training.csv` (~1200+ baris)
- Labeled dengan kategori VALID atau ANOMALI
- Dipisah 80% training, 20% testing

---

## 🔐 Keamanan & Privacy

- ✅ **Model ML lokal** — Semua data diproses di server lokal, tidak dikirim ke cloud
- ✅ **CSV/Excel lokal** — File input tidak disimpan secara permanen
- ✅ **Export aman** — Hasil hanya di-download ke klien

---

## 📝 Catatan

- Kolom deteksi bersifat **fleksibel** — Menerima variasi nama kolom
- Ambang batas dapat disesuaikan sesuai kebutuhan bisnis
- Model perlu di-**retrain** jika data training diperbarui
- Aplikasi memerlukan **minimal 1 GB RAM** untuk operasi optimal

---

## 👨‍💼 Author

Dikembangkan sebagai **Tugas Besar AI** untuk deteksi anomali dalam data pengadaan.

---

## 📄 Lisensi

Proyek ini adalah proyek pembelajaran.

---

**Selamat menggunakan Corrupt Detector AI!** 🚀
