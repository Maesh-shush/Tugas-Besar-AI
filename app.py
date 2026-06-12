import html
import io
import re
import importlib

import joblib
import pandas as pd
import streamlit as st
from rapidfuzz import fuzz, process

import analyzer
importlib.reload(analyzer)
from analyzer import MODEL_PATH, analyze_with_ml
from column_mapper import (
    detect_pengadaan_columns,
    detect_referensi_columns,
    parse_number,
)

def preprocess_name(name: str) -> str:
    """Normalisasi nama barang untuk matching yang lebih baik."""
    name = str(name).lower()
    # hapus tanda baca
    name = re.sub(r'[^\w\s]', '', name)
    # hapus kata umum yang tidak membedakan
    stop_words = ['asli', 'original', 'grade', 'lokal', 'import', 'barang']
    for sw in stop_words:
        name = name.replace(sw, '')
    # normalisasi satuan
    name = re.sub(r'\bpcs\b', 'pc', name)
    name = re.sub(r'\bunit\b', 'pc', name)
    # hapus spasi berlebih
    name = re.sub(r'\s+', ' ', name).strip()
    return name


st.set_page_config(page_title="Corrupt Detector AI", page_icon="🔍", layout="wide")

# Custom CSS styling
st.markdown("""
<style>
    .main-title { font-size:2.2rem; font-weight:700; color:#1F4E79; margin-bottom:0; }
    .sub-title { font-size:1rem; color:#555; margin-top:0; margin-bottom:1.5rem; }
    .stat-card { background:#f8f9fa; border-radius:10px; padding:16px 20px; text-align:center; border-left:5px solid #ccc; }
    .stat-card.total   { border-left-color:#1F4E79; }
    .stat-card.valid   { border-left-color:#28a745; }
    .stat-card.anomaly { border-left-color:#dc3545; }
    .stat-card.notfound{ border-left-color:#ffc107; }
    .stat-label { font-size:0.8rem; color:#888; font-weight:600; text-transform:uppercase; }
    .stat-value { font-size:2rem; font-weight:700; }
    .badge-valid    { background:#d4edda; color:#155724; padding:3px 10px; border-radius:12px; font-size:0.85rem; font-weight:600; }
    .badge-anomali  { background:#f8d7da; color:#721c24; padding:3px 10px; border-radius:12px; font-size:0.85rem; font-weight:600; }
    .badge-notfound { background:#fff3cd; color:#856404; padding:3px 10px; border-radius:12px; font-size:0.85rem; font-weight:600; }
    .result-box { background:#fff; border:1px solid #dee2e6; border-radius:8px; padding:16px; margin-bottom:10px; }
    .result-box.anomali  { border-left:5px solid #dc3545; }
    .result-box.valid    { border-left:5px solid #28a745; }
    .result-box.notfound { border-left:5px solid #ffc107; }
    .item-name { font-size:1rem; font-weight:700; color:#212529; }
    .item-meta { font-size:0.85rem; color:#6c757d; margin-top:4px; }
    .reason-text { margin-top:8px; font-size:0.9rem; color:#333; line-height:1.5; }
    .match-info { font-size:0.8rem; color:#888; margin-top:4px; font-style:italic; }
</style>
""", unsafe_allow_html=True)

st.markdown('<p class="main-title">🔍 Corrupt Detector AI</p>', unsafe_allow_html=True)
st.markdown('<p class="sub-title">Intelligent Procurement Anomaly Detector — Deteksi potensi korupsi menggunakan Machine Learning lokal</p>', unsafe_allow_html=True)
st.divider()

# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("ℹ️ Panduan")
    st.markdown("""
**File 1 — Data Pengadaan:**
- `Nama Barang` *(wajib)*
- `Harga Beli (Rp)` *(wajib)*
- `Jumlah`, `Satuan`, `Penanggung Jawab`, `Tanggal` *(opsional)*

**File 2 — Referensi Harga Pasar:**
- `Nama Barang` *(wajib)*
- `Harga Pasar (Rp)` *(wajib)*
- `Sumber`, `Tanggal Update` *(opsional)*
    """)
    st.divider()
    st.markdown("**🤖 Model ML Lokal**")
    if MODEL_PATH.exists():
        st.success("✅ Model siap (`model_anomali.pkl`)")
    else:
        st.error("❌ Model belum ada. Jalankan `python train_model.py` terlebih dahulu.")

    st.divider()
    threshold = st.slider(
        "Ambang batas selisih (%)", 5, 50, 20, 5,
        help="Mempengaruhi level risiko, teks penjelasan, dan fallback rule-based. Prediksi ML utama memakai probabilitas model.",
    )
    fuzzy_threshold = st.slider("Sensitivitas pencocokan nama (%)", 50, 100, 75, 5)

    st.divider()
    threshold_pj = st.slider(
        "Ambang batas flag PJ (Skor)",
        1, 10, 3, 1,
        help="Penanggung Jawab yang memiliki skor akumulasi anomali >= ambang batas ini akan ditandai bendera merah (flagged). Skor dihitung berdasarkan tingkat risiko anomali barang: Tinggi=3, Sedang=2, Rendah=1."
    )


# ── Helper functions ───────────────────────────────────────────────────────────
def esc(text) -> str:
    return html.escape(str(text))


def format_rupiah(val):
    try:
        return "Rp {:,}".format(int(val)).replace(",", ".")
    except (ValueError, TypeError):
        return str(val)

def load_file(file):
    return pd.read_csv(file) if file.name.endswith(".csv") else pd.read_excel(file)

def match_harga_pasar(nama_barang, df_ref, col_nama_ref, col_harga_ref, col_sumber_ref, threshold_score):
    nama_input = preprocess_name(nama_barang)
    choices = df_ref[col_nama_ref].astype(str).tolist()
    choices_pre = [preprocess_name(c) for c in choices]
    
    # Exact match setelah preprocessing
    if nama_input in choices_pre:
        idx = choices_pre.index(nama_input)
        matched_name = choices[idx]
        harga = parse_number(df_ref.iloc[idx][col_harga_ref])
        sumber = str(df_ref.iloc[idx][col_sumber_ref]) if col_sumber_ref else "-"
        return harga, matched_name, 100, sumber

    # Fuzzy matching dengan token_set_ratio (lebih toleran)
    result = process.extractOne(nama_input, choices_pre, scorer=fuzz.token_set_ratio)
    if result and result[1] >= threshold_score:
        idx = result[2]
        matched_name = choices[idx]
        harga = parse_number(df_ref.iloc[idx][col_harga_ref])
        sumber = str(df_ref.iloc[idx][col_sumber_ref]) if col_sumber_ref else "-"
        return harga, matched_name, result[1], sumber
    
    return None, None, 0, None

@st.cache_resource(show_spinner="Memuat model ML...")
def load_model_bundle():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model tidak ditemukan di {MODEL_PATH}. "
            "Jalankan: python train_model.py"
        )
    return joblib.load(MODEL_PATH)


# ── Upload Section ────────────────────────────────────────────────────────────
col_up1, col_up2 = st.columns(2)
with col_up1:
    st.markdown("#### 📋 File 1: Data Pengadaan")
    file_pengadaan = st.file_uploader("Upload data pengadaan", type=["xlsx","csv"], key="pengadaan")
with col_up2:
    st.markdown("#### 📊 File 2: Referensi Harga Pasar")
    file_referensi = st.file_uploader("Upload referensi harga pasar", type=["xlsx","csv"], key="referensi")

if file_pengadaan and file_referensi:
    try:
        df_pengadaan = load_file(file_pengadaan)
        df_referensi = load_file(file_referensi)
    except Exception as e:
        st.error("Gagal membaca file: " + str(e))
        st.stop()

    cols_pengadaan = detect_pengadaan_columns(df_pengadaan)
    cols_referensi = detect_referensi_columns(df_referensi)

    col_nama      = cols_pengadaan.get("nama_barang")
    col_beli      = cols_pengadaan.get("harga_beli")
    col_jml       = cols_pengadaan.get("jumlah")
    col_sat       = cols_pengadaan.get("satuan")
    col_pj        = cols_pengadaan.get("penanggung_jawab")
    col_tgl       = cols_pengadaan.get("tanggal")
    col_nama_ref  = cols_referensi.get("nama_barang")
    col_harga_ref = cols_referensi.get("harga_pasar")
    col_sumber_ref = cols_referensi.get("sumber")

    if not col_nama or not col_beli:
        st.error("❌ Kolom wajib tidak ditemukan di file pengadaan: Nama Barang & Harga Beli")
        with st.expander("Kolom yang terdeteksi di file pengadaan"):
            st.write(list(df_pengadaan.columns))
        st.stop()
    if not col_nama_ref or not col_harga_ref:
        st.error("❌ Kolom wajib tidak ditemukan di file referensi: Nama Barang & Harga Pasar")
        with st.expander("Kolom yang terdeteksi di file referensi"):
            st.write(list(df_referensi.columns))
        st.stop()

    st.success("✅ File pengadaan: **" + str(len(df_pengadaan)) + " item** | File referensi: **" + str(len(df_referensi)) + " item**")

    with st.expander("🔎 Kolom yang terdeteksi otomatis", expanded=False):
        st.markdown("**File Pengadaan**")
        st.dataframe(pd.DataFrame([
            {"Peran": "Nama Barang", "Kolom Terdeteksi": col_nama},
            {"Peran": "Harga Beli", "Kolom Terdeteksi": col_beli},
            {"Peran": "Jumlah", "Kolom Terdeteksi": col_jml or "-"},
            {"Peran": "Satuan", "Kolom Terdeteksi": col_sat or "-"},
            {"Peran": "Penanggung Jawab", "Kolom Terdeteksi": col_pj or "-"},
            {"Peran": "Tanggal", "Kolom Terdeteksi": col_tgl or "-"},
        ]), use_container_width=True, hide_index=True)
        st.markdown("**File Referensi**")
        st.dataframe(pd.DataFrame([
            {"Peran": "Nama Barang", "Kolom Terdeteksi": col_nama_ref},
            {"Peran": "Harga Pasar", "Kolom Terdeteksi": col_harga_ref},
            {"Peran": "Sumber", "Kolom Terdeteksi": col_sumber_ref or "-"},
        ]), use_container_width=True, hide_index=True)

    # ── State Resetting if inputs change ──────────────────────────────────────────
    # Create a unique key representing current uploaded files and parameters
    file_pengadaan_id = f"{file_pengadaan.name}_{file_pengadaan.size}"
    file_referensi_id = f"{file_referensi.name}_{file_referensi.size}"
    current_config_key = f"{file_pengadaan_id}|{file_referensi_id}|{threshold}|{fuzzy_threshold}"
    
    if "last_config_key" not in st.session_state:
        st.session_state.last_config_key = current_config_key
        
    # If the inputs change, clear old cached analysis results from session state
    if st.session_state.last_config_key != current_config_key:
        if "analysis_results" in st.session_state:
            del st.session_state.analysis_results
        st.session_state.last_config_key = current_config_key

    with st.expander("👁️ Preview kedua file", expanded=False):
        t1, t2 = st.tabs(["Data Pengadaan", "Referensi Harga Pasar"])
        with t1: st.dataframe(df_pengadaan, use_container_width=True)
        with t2: st.dataframe(df_referensi, use_container_width=True)

    st.divider()
    st.subheader("🔗 Hasil Pencocokan Nama Barang")

    matches = []
    for _, row in df_pengadaan.iterrows():
        nama = str(row[col_nama])
        harga_pasar, nama_match, score, sumber = match_harga_pasar(
            nama, df_referensi, col_nama_ref, col_harga_ref, col_sumber_ref, fuzzy_threshold)
        harga_beli = parse_number(row[col_beli]) or 0.0
        matches.append({
            "nama_beli":  nama,
            "harga_beli": harga_beli,
            "harga_pasar": harga_pasar,
            "nama_match": nama_match,
            "score":      score,
            "sumber":     sumber,
            "pj":         str(row[col_pj])  if col_pj  else "-",
            "tgl":        str(row[col_tgl]) if col_tgl else "-",
            "jumlah":     row[col_jml]      if col_jml else "-",
            "satuan":     str(row[col_sat]) if col_sat else "-",
        })

    not_found = [m for m in matches if m["harga_pasar"] is None]

    preview_rows = []
    for m in matches:
        preview_rows.append({
            "Nama di Pengadaan":     m["nama_beli"],
            "Cocok dengan Referensi": m["nama_match"] or "❌ Tidak ditemukan",
            "Skor Kecocokan (%)":    m["score"] if m["score"] > 0 else "-",
            "Harga Pasar (Rp)":      format_rupiah(m["harga_pasar"]) if m["harga_pasar"] else "-",
            "Sumber":                m["sumber"] or "-",
        })
    st.dataframe(pd.DataFrame(preview_rows), use_container_width=True, hide_index=True)

    if not_found:
        st.warning("⚠️ " + str(len(not_found)) + " item tidak ditemukan di referensi: " + ", ".join([m["nama_beli"] for m in not_found]))

    st.divider()

    # Trigger button to start analysis
    start_analysis = st.button("🚀 Mulai Analisis dengan ML", type="primary", use_container_width=True)
    
    items_to_analyze = [m for m in matches if m["harga_pasar"] is not None]
    
    if start_analysis:
        if not items_to_analyze:
            st.error("Tidak ada item yang bisa dianalisis (seluruh barang tidak memiliki referensi pasar).")
            st.stop()

        for m in items_to_analyze:
            harga_pasar = m["harga_pasar"]
            m["dynamic_threshold"] = threshold * 1.5 if harga_pasar < 500000 else threshold

        with st.spinner("🤖 Model ML sedang menganalisis..."):
            try:
                model_bundle = load_model_bundle()
                data_list = []
                for m in items_to_analyze:
                    data_list.append({
                        "nama_barang": m["nama_beli"],
                        "harga_beli": m["harga_beli"],
                        "harga_pasar_referensi": m["harga_pasar"],
                        "sumber_referensi": m["sumber"],
                        "jumlah": m["jumlah"],
                        "satuan": m["satuan"],
                        "penanggung_jawab": m["pj"],
                        "dynamic_threshold": m["dynamic_threshold"],
                    })

                results = analyze_with_ml(data_list, model_bundle, threshold)
                st.session_state.analysis_results = results
                st.session_state.analysis_config_key = current_config_key
                st.success("✅ Analisis selesai!")
            except FileNotFoundError as e:
                st.error(f"❌ {e}")
            except Exception as e:
                st.error("Error ML: " + str(e))
    elif items_to_analyze and "analysis_results" not in st.session_state:
        st.info("👆 Klik **Mulai Analisis dengan ML** untuk menjalankan deteksi anomali.")

    # Display results if they exist in st.session_state
    if "analysis_results" in st.session_state:
        results = st.session_state.analysis_results
        
        stale_results = (
            len(results) != len(items_to_analyze)
            or st.session_state.get("analysis_config_key") != current_config_key
        )
        if stale_results:
            st.warning("⚠️ Parameter atau data berubah. Klik tombol **Mulai Analisis dengan ML** untuk memperbarui hasil.")
            st.stop()

        # Calculate PJ anomaly scores
        pj_stats = {}
        for m, r in zip(items_to_analyze, results):
            pj = m["pj"]
            if pj == "-":
                continue
            
            if pj not in pj_stats:
                pj_stats[pj] = {
                    "total_items": 0,
                    "anomalies": 0,
                    "score": 0
                }
                
            pj_stats[pj]["total_items"] += 1
            status = r.get("status", "valid")
            
            if status == "anomali":
                pj_stats[pj]["anomalies"] += 1
                risiko = str(r.get("risiko", "rendah")).lower()
                weight = {"tinggi": 3, "sedang": 2, "rendah": 1}.get(risiko, 1)
                pj_stats[pj]["score"] += weight

        total   = len(matches)
        anomali = sum(1 for r in results if r.get("status") == "anomali")
        valid   = sum(1 for r in results if r.get("status") == "valid")
        nf      = len(not_found)

        st.subheader("📊 Ringkasan Hasil")
        c1, c2, c3, c4 = st.columns(4)
        for col_st, label, val, color, css in [
            (c1, "Total Item",         total,   "#1F4E79", "total"),
            (c2, "✅ Valid",            valid,   "#28a745", "valid"),
            (c3, "🚨 Anomali",         anomali, "#dc3545", "anomaly"),
            (c4, "⚠️ Tidak Ditemukan", nf,      "#856404", "notfound"),
        ]:
            with col_st:
                st.markdown(
                    '<div class="stat-card ' + css + '">'
                    '<div class="stat-label">' + label + '</div>'
                    '<div class="stat-value" style="color:' + color + '">' + str(val) + '</div>'
                    '</div>',
                    unsafe_allow_html=True
                )

        # ── PJ Analysis Section ──────────────────────────────────────────────────
        st.divider()
        st.subheader("👤 Analisis Penanggung Jawab (PJ)")
        if pj_stats:
            pj_rows = []
            flagged_pjs = []
            for pj, stat in pj_stats.items():
                score = stat["score"]
                status_pj = "🚩 FLAGGED" if score >= threshold_pj else "✅ AMAN"
                if score >= threshold_pj:
                    flagged_pjs.append(pj)
                pj_rows.append({
                    "Penanggung Jawab": pj,
                    "Total Item": stat["total_items"],
                    "Item Anomali": stat["anomalies"],
                    "Skor Anomali": score,
                    "Status": status_pj
                })
            
            if flagged_pjs:
                st.error(f"⚠️ **Perhatian!** Ada {len(flagged_pjs)} Penanggung Jawab yang melebihi ambang batas skor anomali:")
                cols_pj = st.columns(min(len(flagged_pjs), 4))
                for idx, p in enumerate(flagged_pjs):
                    with cols_pj[idx % min(len(flagged_pjs), 4)]:
                        st.markdown(
                            f'<div style="background:#f8d7da; border: 1px solid #f5c6cb; border-radius:10px; padding:12px; margin-bottom:10px; border-left:5px solid #dc3545;">'
                            f'<div style="font-size:1rem; font-weight:700; color:#721c24;">🚩 {esc(p)}</div>'
                            f'<div style="font-size:0.85rem; color:#721c24; margin-top:4px;">'
                            f'Skor Akumulasi: <b>{pj_stats[p]["score"]}</b> (Batas: {threshold_pj})<br>'
                            f'Item Anomali: <b>{pj_stats[p]["anomalies"]} / {pj_stats[p]["total_items"]}</b>'
                            f'</div>'
                            f'</div>',
                            unsafe_allow_html=True
                        )
            else:
                st.success("✅ Seluruh Penanggung Jawab berada di bawah ambang batas skor anomali (Aman).")
                
            with st.expander("📊 Lihat Tabel Lengkap Skor PJ", expanded=False):
                st.dataframe(pd.DataFrame(pj_rows), use_container_width=True, hide_index=True)
        else:
            st.info("Informasi Penanggung Jawab tidak tersedia pada data pengadaan.")

        st.divider()
        filter_opt = st.radio("Tampilkan:", ["Semua","Anomali saja","Valid saja","Tidak Ditemukan"], horizontal=True)
        st.subheader("📋 Detail Hasil per Item")

        for i, (m, r) in enumerate(zip(items_to_analyze, results)):
            status  = r.get("status", "valid")
            if filter_opt == "Anomali saja"    and status != "anomali": continue
            if filter_opt == "Valid saja"       and status != "valid":   continue
            if filter_opt == "Tidak Ditemukan":                          continue

            selisih = r.get("selisih_persen", 0)
            alasan  = r.get("alasan", "-")
            risiko  = r.get("risiko")

            badge = '<span class="badge-anomali">🚨 ANOMALI</span>' if status == "anomali" \
                    else '<span class="badge-valid">✅ VALID</span>'

            risiko_html = ""
            if risiko:
                warna = {"tinggi":"#dc3545","sedang":"#fd7e14","rendah":"#ffc107"}.get(risiko.lower(), "#999")
                risiko_html = ' &nbsp;|&nbsp; <span style="color:' + warna + ';font-weight:700">Risiko: ' + risiko.upper() + '</span>'

            pj_html = ""
            if m["pj"] != "-":
                pj_score = pj_stats.get(m["pj"], {}).get("score", 0)
                if pj_score >= threshold_pj:
                    pj_html = (
                        f'&nbsp;|&nbsp; 👤 PJ: <span style="color:#dc3545;font-weight:bold;">'
                        f'🚩 {esc(m["pj"])} (Skor: {pj_score})</span>'
                    )
                else:
                    pj_html = f'&nbsp;|&nbsp; 👤 PJ: <b>{esc(m["pj"])}</b>'

            tgl_html = f'&nbsp;|&nbsp; 📅 {esc(m["tgl"])}' if m["tgl"] != "-" else ""

            st.markdown(
                '<div class="result-box ' + esc(status) + '">'
                '<div class="item-name">' + str(i + 1) + '. ' + esc(m["nama_beli"]) + ' &nbsp;' + badge + risiko_html + '</div>'
                '<div class="item-meta">'
                '💰 Harga Beli: <b>' + format_rupiah(m["harga_beli"]) + '</b> &nbsp;|&nbsp; '
                '📊 Harga Pasar: <b>' + format_rupiah(m["harga_pasar"]) + '</b> &nbsp;|&nbsp; '
                '📈 Selisih: <b>' + '{:+.1f}'.format(selisih) + '%</b>'
                + pj_html + tgl_html +
                '</div>'
                '<div class="match-info">🔗 Cocok dengan: <i>"' + esc(m["nama_match"]) + '"</i> ('
                + str(m["score"]) + '%) — Sumber: ' + esc(m["sumber"]) + '</div>'
                '<div class="reason-text">💬 <i>' + esc(alasan) + '</i></div>'
                '</div>',
                unsafe_allow_html=True
            )

        if filter_opt in ["Semua", "Tidak Ditemukan"] and not_found:
            st.markdown("---")
            for m in not_found:
                pj_html = f'&nbsp;|&nbsp; 👤 PJ: <b>{esc(m["pj"])}</b>' if m["pj"] != "-" else ""
                st.markdown(
                    '<div class="result-box notfound">'
                    '<div class="item-name">⚠️ ' + esc(m["nama_beli"]) + ' &nbsp;<span class="badge-notfound">TIDAK DITEMUKAN</span></div>'
                    '<div class="item-meta">💰 Harga Beli: <b>' + format_rupiah(m["harga_beli"]) + '</b>' + pj_html + '</div>'
                    '<div class="reason-text">💬 <i>Nama barang tidak ditemukan di referensi harga pasar.</i></div>'
                    '</div>',
                    unsafe_allow_html=True
                )

        st.divider()
        st.subheader("📥 Export Hasil")

        export_rows = []
        for m, r in zip(items_to_analyze, results):
            pj_name = m["pj"]
            pj_score = pj_stats.get(pj_name, {}).get("score", 0) if pj_name != "-" else 0
            pj_flag = "FLAGGED" if pj_score >= threshold_pj else "AMAN" if pj_name != "-" else "-"
            export_rows.append({
                "Nama Barang":           m["nama_beli"],
                "Nama Cocok (Referensi)": m["nama_match"],
                "Harga Beli (Rp)":       m["harga_beli"],
                "Harga Pasar (Rp)":      m["harga_pasar"],
                "Selisih (%)":           r.get("selisih_persen", 0),
                "Status":                r.get("status","").upper(),
                "Risiko":                r.get("risiko", "-") or "-",
                "Keterangan ML":         r.get("alasan",""),
                "Penanggung Jawab":      pj_name,
                "Skor Anomali PJ":       pj_score,
                "Status Flag PJ":        pj_flag,
            })
        for m in not_found:
            export_rows.append({
                "Nama Barang":           m["nama_beli"],
                "Nama Cocok (Referensi)": "TIDAK DITEMUKAN",
                "Harga Beli (Rp)":       m["harga_beli"],
                "Harga Pasar (Rp)":      "-",
                "Selisih (%)":           "-",
                "Status":                "TIDAK DITEMUKAN",
                "Risiko":                "-",
                "Keterangan ML":         "Tidak ada data referensi",
                "Penanggung Jawab":      m["pj"],
                "Skor Anomali PJ":       "-",
                "Status Flag PJ":        "-",
            })

        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            pd.DataFrame(export_rows).to_excel(writer, index=False, sheet_name="Hasil Analisis")
        buf.seek(0)
        st.download_button(
            "⬇️ Download Hasil (.xlsx)", data=buf,
            file_name="hasil_analisis_pricescan.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            use_container_width=True
        )

else:
    st.info("👆 Upload kedua file di atas untuk memulai analisis")
    st.subheader("📌 Contoh Format")
    t1, t2 = st.tabs(["File Pengadaan", "File Referensi Harga Pasar"])
    with t1:
        st.dataframe(pd.DataFrame({
            "Nama Barang":      ["Laptop Asus VivoBook","Mouse Wireless Logitech","AC Split 1PK Daikin"],
            "Jumlah":           [3, 10, 4],
            "Satuan":           ["Unit","Pcs","Unit"],
            "Harga Beli (Rp)":  [8500000, 580000, 5800000],
            "Penanggung Jawab": ["Ani Rahayu","Dodi Firmansyah","Dodi Firmansyah"],
        }), use_container_width=True, hide_index=True)
    with t2:
        st.dataframe(pd.DataFrame({
            "Nama Barang":      ["Laptop Asus VivoBook","Mouse Wireless Logitech","AC Split 1PK Daikin"],
            "Harga Pasar (Rp)": [8200000, 185000, 3200000],
            "Sumber":           ["iBox","Shopee","Ace Hardware"],
        }), use_container_width=True, hide_index=True)
