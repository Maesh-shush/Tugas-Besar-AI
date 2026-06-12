"""
Deteksi kolom fleksibel berdasarkan nama header + isi data.
"""

import re
from typing import Optional

import pandas as pd

COLUMN_PROFILES = {
    "nama_barang": {
        "keywords": [
            (10, "nama barang"),
            (9, "nama produk"),
            (9, "nama item"),
            (8, "nama asli"),
            (7, "product name"),
            (7, "item name"),
            (6, "deskripsi barang"),
            (5, "produk"),
            (4, "barang"),
            (3, "nama"),
            (2, "item"),
        ],
        "exclude": [
            "harga", "price", "rp", "jumlah", "qty", "quantity",
            "tanggal", "date", "tgl", "pj", "satuan", "unit", "sumber",
        ],
        "expect": "text",
        "min_score": 2,
    },
    "harga_beli": {
        "keywords": [
            (10, "harga beli"),
            (10, "harga pembelian"),
            (9, "purchase price"),
            (9, "buy price"),
            (8, "harga satuan beli"),
            (8, "total harga beli"),
            (7, "nilai beli"),
            (7, "biaya beli"),
            (6, "harga pengadaan"),
            (5, "harga unit"),
        ],
        "weak_keywords": [(3, "harga"), (2, "beli"), (2, "biaya"), (2, "nilai")],
        "exclude": [
            "nama", "barang", "item", "produk", "deskripsi", "keterangan",
            "dibeli", "tanggal", "date", "pj", "pasar", "market", "jual",
            "referensi", "sumber", "satuan", "unit", "jumlah", "qty",
        ],
        "expect": "numeric",
        "min_score": 3,
        "min_numeric_ratio": 0.6,
    },
    "harga_pasar": {
        "keywords": [
            (10, "harga pasar"),
            (10, "harga pasaran"),
            (9, "market price"),
            (8, "harga referensi"),
            (8, "harga standar"),
            (7, "harga normal"),
            (6, "referensi harga"),
        ],
        "weak_keywords": [(4, "pasar"), (4, "pasaran"), (3, "market"), (2, "referensi")],
        "exclude": [
            "nama", "barang", "item", "produk", "beli", "jual", "deskripsi",
            "tanggal", "date", "pj", "sumber", "satuan", "jumlah",
        ],
        "expect": "numeric",
        "min_score": 3,
        "min_numeric_ratio": 0.6,
    },
    "jumlah": {
        "keywords": [
            (10, "jumlah barang"),
            (8, "quantity"),
            (7, "jumlah"),
            (6, "qty"),
            (5, "kuantitas"),
            (4, "volume"),
        ],
        "exclude": ["harga", "nama", "tanggal", "pj", "satuan"],
        "expect": "numeric",
        "min_score": 2,
        "min_numeric_ratio": 0.5,
        "optional": True,
    },
    "satuan": {
        "keywords": [
            (8, "satuan"),
            (7, "unit"),
            (5, "uom"),
        ],
        "exclude": ["harga", "nama", "tanggal", "jumlah"],
        "expect": "text",
        "min_score": 2,
        "optional": True,
    },
    "penanggung_jawab": {
        "keywords": [
            (10, "penanggung jawab"),
            (8, "penanggungjawab"),
            (7, "responsible"),
            (6, "pic"),
            (5, "pj"),
            (4, "pengadaan oleh"),
        ],
        "exclude": ["harga", "nama barang", "jumlah", "tanggal"],
        "expect": "text",
        "min_score": 2,
        "optional": True,
    },
    "tanggal": {
        "keywords": [
            (8, "tanggal"),
            (7, "date"),
            (6, "tgl"),
            (5, "waktu"),
        ],
        "exclude": ["harga", "nama", "jumlah"],
        "expect": "any",
        "min_score": 2,
        "optional": True,
    },
    "sumber": {
        "keywords": [
            (8, "sumber"),
            (7, "source"),
            (6, "vendor"),
            (5, "toko"),
            (4, "supplier"),
        ],
        "exclude": ["harga", "nama barang", "jumlah", "tanggal"],
        "expect": "text",
        "min_score": 2,
        "optional": True,
    },
}


def _normalize_header(name: str) -> str:
    return re.sub(r"[_\-\s]+", " ", str(name).lower().strip())


def parse_number(val) -> Optional[float]:
    """Parse angka dari berbagai format (Rp, titik/koma ribuan)."""
    if pd.isna(val):
        return None
    if isinstance(val, (int, float)):
        return float(val)

    s = str(val).strip()
    if not s:
        return None

    s = re.sub(r"rp\.?\s*", "", s, flags=re.IGNORECASE)
    s = s.replace(" ", "")
    s = re.sub(r"[^\d,.\-]", "", s)
    if not s or s in {"-", ".", ","}:
        return None

    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "." in s:
        parts = s.split(".")
        if len(parts) > 2 or (len(parts) == 2 and len(parts[1]) == 3):
            s = s.replace(".", "")
    elif "," in s:
        parts = s.split(",")
        if len(parts) == 2 and len(parts[1]) <= 2:
            s = s.replace(",", ".")
        else:
            s = s.replace(",", "")

    try:
        return float(s)
    except ValueError:
        return None


def numeric_ratio(series: pd.Series) -> float:
    sample = series.dropna().head(80)
    if len(sample) == 0:
        return 0.0
    ok = sum(1 for v in sample if parse_number(v) is not None)
    return ok / len(sample)


def text_ratio(series: pd.Series) -> float:
    sample = series.dropna().head(80)
    if len(sample) == 0:
        return 0.0
    ok = sum(1 for v in sample if parse_number(v) is None and str(v).strip())
    return ok / len(sample)


def _keyword_score(header: str, keywords: list[tuple[int, str]]) -> int:
    score = 0
    for weight, kw in keywords:
        kw_norm = _normalize_header(kw)
        if kw_norm == header:
            score = max(score, weight + 2)
        elif kw_norm in header:
            score = max(score, weight)
    return score


def _is_excluded(header: str, exclude: list[str]) -> bool:
    return any(ex in header for ex in exclude)


def score_column(series: pd.Series, col_name: str, role: str) -> float:
    profile = COLUMN_PROFILES[role]
    header = _normalize_header(col_name)

    if _is_excluded(header, profile.get("exclude", [])):
        return -1.0

    score = float(_keyword_score(header, profile["keywords"]))

    weak = profile.get("weak_keywords", [])
    if weak and score == 0:
        weak_score = _keyword_score(header, weak)
        min_ratio = profile.get("min_numeric_ratio", 0.6)
        if profile.get("expect") == "numeric" and numeric_ratio(series) >= min_ratio:
            score = float(weak_score)
        elif profile.get("expect") == "text" and weak_score > 0:
            score = float(weak_score) * 0.5

    if score <= 0:
        return 0.0

    expect = profile.get("expect", "any")
    if expect == "numeric":
        ratio = numeric_ratio(series)
        min_ratio = profile.get("min_numeric_ratio", 0.6)
        if ratio < min_ratio:
            score *= ratio / min_ratio
        else:
            score += ratio * 2
    elif expect == "text":
        score += text_ratio(series) * 2

    return score


def detect_columns(df: pd.DataFrame, roles: list[str]) -> dict[str, Optional[str]]:
    """Deteksi kolom terbaik per peran, tanpa duplikasi."""
    assignments: dict[str, Optional[str]] = {r: None for r in roles}
    used_cols: set[str] = set()

    priority = sorted(
        roles,
        key=lambda r: (0 if not COLUMN_PROFILES[r].get("optional") else 1, -len(roles)),
    )

    candidates = []
    for role in roles:
        profile = COLUMN_PROFILES[role]
        for col in df.columns:
            s = score_column(df[col], col, role)
            if s >= profile.get("min_score", 1):
                candidates.append((s, role, col))

    candidates.sort(key=lambda x: x[0], reverse=True)

    for score, role, col in candidates:
        if assignments[role] is not None or col in used_cols:
            continue
        assignments[role] = col
        used_cols.add(col)

    return assignments


def detect_pengadaan_columns(df: pd.DataFrame) -> dict[str, Optional[str]]:
    return detect_columns(
        df, ["nama_barang", "harga_beli", "jumlah", "satuan", "penanggung_jawab", "tanggal"]
    )


def detect_referensi_columns(df: pd.DataFrame) -> dict[str, Optional[str]]:
    return detect_columns(df, ["nama_barang", "harga_pasar", "sumber", "tanggal"])


def get_cell_float(series: pd.Series, index, default: float = 0.0) -> float:
    val = series.loc[index] if index in series.index else series.iloc[index]
    parsed = parse_number(val)
    return parsed if parsed is not None else default
