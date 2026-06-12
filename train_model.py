"""
Script training model ML untuk deteksi anomali harga pengadaan.

Jalankan sekali (atau ulangi saat data training diperbarui):
    python train_model.py

Output: model_anomali.pkl (dibaca oleh app.py saat Streamlit dijalankan)
"""

from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data_training.csv"
MODEL_PATH = BASE_DIR / "model_anomali.pkl"

FEATURE_COLS = ["harga_beli", "harga_pasar", "selisih_persen"]


def load_and_prepare(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(
            f"File training tidak ditemukan: {path}\n"
            "Letakkan data_training.csv di folder yang sama dengan train_model.py"
        )

    df = pd.read_csv(path)

    column_map = {
        "Harga Pasaran (Rp)": "harga_pasar",
        "Harga Pasar (Rp)": "harga_pasar",
        "Harga Jual (Rp)": "harga_beli",
        "Harga Beli (Rp)": "harga_beli",
        "Persentase Markup (%)": "selisih_persen",
        "Kategori Markup": "kategori",
        "label": "label",
    }
    df = df.rename(columns={k: v for k, v in column_map.items() if k in df.columns})

    if "harga_pasar" not in df.columns or "harga_beli" not in df.columns:
        raise ValueError(
            "CSV harus memiliki kolom harga pasar dan harga beli/jual. "
            f"Kolom tersedia: {list(df.columns)}"
        )

    df["harga_pasar"] = pd.to_numeric(df["harga_pasar"], errors="coerce")
    df["harga_beli"] = pd.to_numeric(df["harga_beli"], errors="coerce")

    if "selisih_persen" not in df.columns:
        df["selisih_persen"] = (
            (df["harga_beli"] - df["harga_pasar"]) / df["harga_pasar"] * 100
        )
    else:
        df["selisih_persen"] = pd.to_numeric(df["selisih_persen"], errors="coerce")

    if "label" not in df.columns:
        if "kategori" in df.columns:
            df["label"] = df["kategori"].apply(
                lambda x: 1 if "MARKUP" in str(x).upper() or "⚠" in str(x) else 0
            )
        else:
            df["label"] = (df["selisih_persen"] > 20).astype(int)

    df = df.dropna(subset=["harga_beli", "harga_pasar", "selisih_persen", "label"])
    return df


def main():
    print(f"Memuat data dari: {DATA_PATH}")
    df = load_and_prepare(DATA_PATH)

    print(f"Total baris   : {len(df)}")
    print(f"Anomali (1)   : {int(df['label'].sum())}")
    print(f"Valid (0)     : {int((df['label'] == 0).sum())}")

    X = df[FEATURE_COLS]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        random_state=42,
        class_weight="balanced",
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print("\n=== Laporan Klasifikasi (Data Uji) ===")
    print(classification_report(y_test, y_pred, target_names=["Valid", "Anomali"]))

    bundle = {
        "model": model,
        "features": FEATURE_COLS,
        "training_rows": len(df),
    }
    joblib.dump(bundle, MODEL_PATH)
    print(f"\nModel disimpan ke: {MODEL_PATH}")
    print("Siap digunakan oleh: streamlit run app.py")


if __name__ == "__main__":
    main()
