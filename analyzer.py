"""
Modul inferensi ML untuk deteksi anomali harga pengadaan.
Digunakan oleh app.py (Streamlit).
"""

from pathlib import Path
from typing import Optional

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
            f"Selisih harga {selisih:+.1f}% dari harga pasar (ambang: {threshold:.0f}%)."
        )

    pola_pj = ""
    if pj != "-" and pj_anomaly_count >= 2:
        pola_pj = f" PJ '{pj}' memiliki {pj_anomaly_count} item anomali dalam batch ini."

    return (
        f"Model ML mendeteksi anomali (probabilitas: {prob_anomali:.0%}). "
        f"Harga beli melebihi harga pasar sebesar {selisih:.1f}% (ambang: {threshold:.0f}%).{pola_pj}"
    )


def _rule_based_classify(selisih: float, threshold: float) -> tuple[str, Optional[str], str]:
    if selisih > threshold:
        if selisih > 100:
            return "anomali", "tinggi", f"Markup harga sangat tinggi ({selisih:.1f}% di atas pasar)."
        if selisih > 50:
            return "anomali", "sedang", f"Markup harga cukup tinggi ({selisih:.1f}% di atas pasar)."
        return (
            "anomali",
            "rendah",
            f"Harga beli {selisih:.1f}% di atas pasar (melebihi ambang {threshold:.0f}%).",
        )
    return "valid", None, f"Harga beli dalam batas wajar (selisih {selisih:.1f}%)."


def _classify_item(item: dict, model_bundle: Optional[dict], default_threshold: float) -> dict:
    harga_beli = float(item["harga_beli"])
    harga_pasar = float(item["harga_pasar_referensi"])
    selisih = _calc_selisih(harga_beli, harga_pasar)
    threshold = float(item.get("dynamic_threshold", default_threshold))
    pj = item.get("penanggung_jawab", "-")

    ml_ok = (
        model_bundle is not None
        and isinstance(model_bundle, dict)
        and "model" in model_bundle
    )

    if ml_ok:
        try:
            model = model_bundle["model"]
            feature_cols = model_bundle.get("features", FEATURE_COLS)
            X = pd.DataFrame([[harga_beli, harga_pasar, selisih]], columns=feature_cols)
            prob_anomali = float(model.predict_proba(X)[0][1])
            pred_anomali = prob_anomali >= 0.5

            if pred_anomali:
                status = "anomali"
                risiko = _risiko_from_prob(prob_anomali, selisih, threshold)
            else:
                status = "valid"
                risiko = None

            return {
                "nama_barang": item["nama_barang"],
                "status": status,
                "selisih_persen": round(selisih, 2),
                "risiko": risiko,
                "pj": pj,
                "threshold": threshold,
                "prob_anomali": prob_anomali,
                "used_ml": True,
            }
        except Exception:
            pass

    status, risiko, alasan = _rule_based_classify(selisih, threshold)
    return {
        "nama_barang": item["nama_barang"],
        "status": status,
        "selisih_persen": round(selisih, 2),
        "risiko": risiko,
        "alasan": alasan,
        "pj": pj,
        "threshold": threshold,
        "used_ml": False,
    }


def analyze_with_ml(items: list, model_bundle: dict = None, threshold: float = 20) -> list:
    results = [_classify_item(item, model_bundle, threshold) for item in items]

    pj_anomaly_count: dict[str, int] = {}
    for item, result in zip(items, results):
        if result["status"] != "anomali":
            continue
        pj = item.get("penanggung_jawab", "-")
        if pj != "-":
            pj_anomaly_count[pj] = pj_anomaly_count.get(pj, 0) + 1

    for result in results:
        if result.get("used_ml"):
            prob = result.pop("prob_anomali")
            th = result.pop("threshold")
            pj = result.pop("pj")
            result.pop("used_ml")
            if result["status"] == "valid":
                result["alasan"] = _build_alasan("valid", result["selisih_persen"], prob, th, pj, 0)
            else:
                result["alasan"] = _build_alasan(
                    "anomali",
                    result["selisih_persen"],
                    prob,
                    th,
                    pj,
                    pj_anomaly_count.get(pj, 0),
                )
        else:
            result.pop("pj", None)
            result.pop("threshold", None)
            result.pop("used_ml", None)

    return results
