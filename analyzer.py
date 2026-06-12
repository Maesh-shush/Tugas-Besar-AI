"""
Modul inferensi ML untuk deteksi anomali harga pengadaan.
Digunakan oleh app.py (Streamlit).
"""

from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model_anomali.pkl"

FEATURE_COLS = ["harga_beli", "harga_pasar", "selisih_persen"]


def _calc_selisih(harga_beli: float, harga_pasar: float) -> float:
    if harga_pasar <= 0:
        return 0.0
    return ((harga_beli - harga_pasar) / harga_pasar) * 100


def _risiko_from_prob(prob_anomali: float, selisih: float, threshold: float) -> str:
    if prob_anomali >= 0.8 or selisih >= threshold * 2:
        return "tinggi"
    if prob_anomali >= 0.6 or selisih >= threshold * 1.5:
        return "sedang"
    return "rendah"


def _build_alasan(
    status: str,
    selisih: float,
    prob_anomali: float,
    threshold: float,
    pj: str,
    pj_anomaly_count: int,
) -> str:
    if status == "valid":
        return (
            f"Model ML menilai transaksi valid (probabilitas anomali: {prob_anomali:.0%}). "
            f"Selisih harga {selisih:+.1f}% dari harga pasar (ambang: {threshold}%)."
        )

    pola_pj = ""
    if pj != "-" and pj_anomaly_count >= 2:
        pola_pj = f" PJ '{pj}' memiliki {pj_anomaly_count} item anomali dalam batch ini."

    return (
        f"Model ML mendeteksi anomali (probabilitas: {prob_anomali:.0%}). "
        f"Harga beli melebihi harga pasar sebesar {selisih:.1f}% (ambang: {threshold}%).{pola_pj}"
    )


def analyze_with_ml(items: list, model_bundle: dict, threshold: float = 20) -> list:
    """
    Analisis daftar item pengadaan menggunakan model RandomForest lokal.

    Parameters
    ----------
    items : list[dict]
        Setiap item memiliki: nama_barang, harga_beli, harga_pasar_referensi,
        penanggung_jawab (opsional).
    model_bundle : dict
        Berisi kunci 'model' dan 'features' dari joblib.load().
    threshold : float
        Ambang selisih % untuk penjelasan dan penyesuaian risiko.

    Returns
    -------
    list[dict]
        Format kompatibel dengan UI Streamlit:
        nama_barang, status, selisih_persen, alasan, risiko
    """
    model = model_bundle["model"]
    feature_cols = model_bundle.get("features", FEATURE_COLS)

    # Pre-pass: hitung anomali sementara per PJ berdasarkan selisih (untuk konteks)
    pj_anomaly_count: dict[str, int] = {}
    for item in items:
        harga_beli = float(item["harga_beli"])
        harga_pasar = float(item["harga_pasar_referensi"])
        selisih = _calc_selisih(harga_beli, harga_pasar)
        pj = item.get("penanggung_jawab", "-")
        if selisih > threshold and pj != "-":
            pj_anomaly_count[pj] = pj_anomaly_count.get(pj, 0) + 1

    results = []
    for item in items:
        harga_beli = float(item["harga_beli"])
        harga_pasar = float(item["harga_pasar_referensi"])
        selisih = _calc_selisih(harga_beli, harga_pasar)
        pj = item.get("penanggung_jawab", "-")

        X = pd.DataFrame(
            [[harga_beli, harga_pasar, selisih]], columns=feature_cols
        )
        prob_anomali = float(model.predict_proba(X)[0][1])
        pred_anomali = prob_anomali >= 0.5

        if pred_anomali:
            status = "anomali"
            risiko = _risiko_from_prob(prob_anomali, selisih, threshold)
        else:
            status = "valid"
            risiko = None

        alasan = _build_alasan(
            status, selisih, prob_anomali, threshold, pj, pj_anomaly_count.get(pj, 0)
        )

        results.append({
            "nama_barang": item["nama_barang"],
            "status": status,
            "selisih_persen": round(selisih, 2),
            "alasan": alasan,
            "risiko": risiko,
        })

    return results
