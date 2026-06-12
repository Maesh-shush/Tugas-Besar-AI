# Corrupt Detector AI — Machine Learning Lokal

Deteksi anomali harga pengadaan barang menggunakan **RandomForest** (scikit-learn), tanpa API eksternal.

## Struktur Project

```
├── app.py              # Aplikasi Streamlit (entry point deploy)
├── analyzer.py         # Fungsi prediksi ML
├── train_model.py      # Script training model
├── data_training.csv   # Data historis untuk training
├── model_anomali.pkl   # Model hasil training (wajib ada untuk deploy)
└── requirements.txt    # Dependensi Python
```

## Setup Lokal

```bash
pip install -r requirements.txt
python train_model.py
streamlit run app.py
```

## Deploy ke Streamlit Cloud (GitHub)

1. **Push seluruh folder ini ke GitHub** — pastikan file berikut ikut ter-commit:
   - `app.py`
   - `analyzer.py`
   - `model_anomali.pkl` ← **penting**, tanpa ini app error di cloud
   - `requirements.txt`

2. Buka [share.streamlit.io](https://share.streamlit.io) → **New app**

3. Isi konfigurasi:
   | Field | Nilai |
   |-------|-------|
   | Repository | repo GitHub Anda |
   | Branch | `main` |
   | Main file path | `app.py` (sesuaikan jika di subfolder) |

4. Klik **Deploy** — tidak perlu API key atau secret environment.

### Jika repo punya subfolder

Jika file ada di `Tugas-Besar-AI-main/Tugas-Besar-AI-main/`, set Main file path ke:
```
Tugas-Besar-AI-main/Tugas-Besar-AI-main/app.py
```

## Retrain Model (Opsional)

Ganti atau tambah data di `data_training.csv`, lalu:

```bash
python train_model.py
```

Commit ulang `model_anomali.pkl` ke GitHub agar Streamlit Cloud memakai model terbaru.

### Format `data_training.csv`

Minimal kolom:
- `Harga Pasaran (Rp)` atau `harga_pasar`
- `Harga Jual (Rp)` atau `harga_beli`
- `Kategori Markup` (untuk label otomatis) atau kolom `label` (0/1)
