import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  FileText,
  LayoutDashboard,
  Bell,
  UploadCloud,
  Trash2,
  Plus,
  Edit2,
  Download,
  Search,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Play,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ArrowRight
} from "lucide-react";
import { Transaction, Anomaly, LaporanBerkala, AnalysisResult, SystemNotification } from "./types";
import { sampleTransactions, sampleCsvString } from "./data/sampleData";
import { defaultAnalysisResult } from "./data/mockAnalysis";

export default function App() {
  // Navigation & Tabs state
  const [activeTab, setActiveTab] = useState<"dashboard" | "transactions" | "monitoring" | "reports">("dashboard");
  
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem("sentinel_transactions");
    return saved ? JSON.parse(saved) : sampleTransactions;
  });

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(() => {
    const saved = localStorage.getItem("sentinel_analysis");
    return saved ? JSON.parse(saved) : defaultAnalysisResult;
  });

  const [notifications, setNotifications] = useState<SystemNotification[]>(() => {
    const saved = localStorage.getItem("sentinel_notifications");
    if (saved) return JSON.parse(saved);
    
    // Default initial alerts based on default anomalies
    return defaultAnalysisResult.anomalies.map((anom, idx) => ({
      id: `NOTIF-${idx}-${Date.now()}`,
      timestamp: "12 Juni 2026, 09:42:01",
      type: anom.tingkat_kecurigaan === "Tinggi" ? "danger" : "warning",
      message: anom.admin_notifikasi,
      id_akun: anom.id_akun,
      resolved: false
    }));
  });

  // UI state
  const [selectedTxId, setSelectedTxId] = useState<string | null>(() => {
    return defaultAnalysisResult.anomalies[0]?.id_transaksi || null;
  });
  
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);
  const [apiSuccessMessage, setApiSuccessMessage] = useState<string | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  // Manual Transaction input states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTx, setNewTx] = useState<Omit<Transaction, "id_transaksi">>({
    id_akun: "ACC-DIV-UMUM",
    nominal: 15000000,
    jenis_transaksi: "keluar",
    deskripsi: "Pembelian ATK dan kertas printer",
    tanggal: "12-06-2026"
  });

  // Edit states
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Form search states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"semua" | "keluar" | "masuk">("semua");
  const [filterRisk, setFilterRisk] = useState<"semua" | "diawasi" | "aman">("semua");

  // CSV text custom import state
  const [csvInputText, setCsvInputText] = useState("");
  const [showCsvBox, setShowCsvBox] = useState(false);

  // Auto-slide messages during loading
  const loadingMessages = [
    "Mengupload paket transaksi korporat ke engine audit...",
    "Menganalisis anomali historis pada masing-masing akun pengeluaran...",
    "Memeriksa penggelembungan dana (mark-up) dengan estimasi harga pasar wajar...",
    "Menilai tingkat risiko korupsi indikatif menggunakan algoritma LLM...",
    "Menyusun notifikasi pelaporan administratif & draf audit internal...",
    "Finalisasi laporan berkala untuk internal auditor..."
  ];

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingStep((prev) => {
          if (prev < loadingMessages.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1500);
      return () => clearInterval(interval);
    } else {
      setLoadingStep(0);
    }
  }, [isLoading]);

  // Persists states
  useEffect(() => {
    localStorage.setItem("sentinel_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    if (analysis) {
      localStorage.setItem("sentinel_analysis", JSON.stringify(analysis));
    }
  }, [analysis]);

  useEffect(() => {
    localStorage.setItem("sentinel_notifications", JSON.stringify(notifications));
  }, [notifications]);

  // Reset to default sample state
  const handleResetData = () => {
    if (window.confirm("Apakah Anda yakin ingin menyetel ulang data kembali ke transaksi contoh awal?")) {
      setTransactions(sampleTransactions);
      setAnalysis(defaultAnalysisResult);
      const initialNotifs = defaultAnalysisResult.anomalies.map((anom, idx) => ({
        id: `NOTIF-${idx}-${Date.now()}`,
        timestamp: "12 Juni 2026, 09:42:01",
        type: anom.tingkat_kecurigaan === "Tinggi" ? "danger" : "warning",
        message: anom.admin_notifikasi,
        id_akun: anom.id_akun,
        resolved: false
      }));
      setNotifications(initialNotifs);
      setSearchTerm("");
      setFilterType("semua");
      setFilterRisk("semua");
      setApiSuccessMessage("Data berhasil disetel ulang ke contoh awal.");
      setTimeout(() => setApiSuccessMessage(null), 3500);
    }
  };

  // CSV Drag and drop helper
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // CSV Parser
  const parseCsvData = (text: string) => {
    try {
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        alert("File CSV tidak valid atau baris terlalu pendek.");
        return;
      }

      // Read cleaner headers
      const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
      
      const parsed: Transaction[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        
        // Match comma-separated values, honoring embedded quotes
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
        const values = matches.map(v => v.trim().replace(/^["']|["']$/g, ""));
        
        const row: any = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || "";
        });

        // Mapping standard variables
        const rawNominal = row.nominal || row.amount || row.value || "0";
        const nominalValue = parseFloat(rawNominal.replace(/[^0-9.-]/g, "")) || 0;
        
        const rawJenis = row.jenis_transaksi || row.jenis || row.type || "keluar";
        const cleanJenis = (rawJenis.toLowerCase().includes("masuk") || rawJenis.toLowerCase() === "in") ? "masuk" : "keluar";

        const idTx = row.id_transaksi || row.id_transaction || row.id || `TX-${1000 + Math.floor(Math.random() * 9000)}`;
        const idAkun = row.id_akun || row.id_account || row.account || "ACC-UNKNOWN";
        const deskripsiMsg = row.deskripsi || row.description || "Tanpa deskripsi pengadaan";
        const tgl = row.tanggal || row.date || "12-06-2026";

        parsed.push({
          id_transaksi: idTx,
          id_akun: idAkun,
          nominal: nominalValue,
          jenis_transaksi: cleanJenis,
          deskripsi: deskripsiMsg,
          tanggal: tgl,
        });
      }

      if (parsed.length > 0) {
        setTransactions(parsed);
        setApiSuccessMessage(`Sukses mengimpor ${parsed.length} transaksi dari file CSV.`);
        setShowCsvBox(false);
        setTimeout(() => setApiSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      alert("Gagal membaca struktur berkas CSV. Silakan cek format kolom.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".csv")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target && typeof event.target.result === "string") {
            parseCsvData(event.target.result);
          }
        };
        reader.readAsText(file);
      } else {
        alert("Harap unggah file teks bereksistensi .csv saja.");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === "string") {
          parseCsvData(event.target.result);
        }
      };
      reader.readAsText(file);
    }
  };

  // Perform Gemini AI Audit
  const handleRunAudit = async () => {
    setIsLoading(true);
    setApiErrorMessage(null);
    setApiSuccessMessage(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactions })
      });

      const body = await res.json();
      
      if (body.success && body.data) {
        const result: AnalysisResult = body.data;
        setAnalysis(result);
        
        // Generate new admin notifications based on discovered anomalies
        const newNotifs: SystemNotification[] = result.anomalies.map((anom, idx) => ({
          id: `NOTIF-GEN-${idx}-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString("id-ID") + ", " + new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }),
          type: anom.tingkat_kecurigaan === "Tinggi" ? "danger" : "warning",
          message: anom.admin_notifikasi,
          id_akun: anom.id_akun,
          resolved: false
        }));

        setNotifications(prev => [...newNotifs, ...prev]);
        
        // Select first anomaly as default view
        if (result.anomalies.length > 0) {
          setSelectedTxId(result.anomalies[0].id_transaksi);
        }

        setApiSuccessMessage("Audit forensik berbasis AI berhasil dijalankan secara realtime menggunakan Gemini.");
        setTimeout(() => setApiSuccessMessage(null), 4000);
      } else {
        // Fallback simulation when API key is missing or server error
        setIsApiKeyMissing(true);
        simulateAiAudit();
      }
    } catch (e: any) {
      console.error(e);
      // Fallback local simulation
      simulateAiAudit();
    } finally {
      setIsLoading(false);
    }
  };

  // Simulated Audit logic for local-offline use so user can always test the tool
  const simulateAiAudit = () => {
    // Generate dynamic anomalies based on rules
    // Find expenses that are exceptionally large: e.g. nominal greater than a certain threshold or has suspicious keyword
    const detectedAnomalies: Anomaly[] = [];
    let processedExpenseSum = 0;
    let computedOverallRisk = 20;

    transactions.forEach((tx) => {
      if (tx.jenis_transaksi === "keluar") {
        processedExpenseSum += tx.nominal;
        const descMatch = tx.deskripsi.toLowerCase();

        // 1. Laptop Check
        if (descMatch.includes("laptop") || descMatch.includes("computer") || descMatch.includes("pc")) {
          // Normal laptop price is 6-15jt. Let's say max budget 15jt per unit.
          // Extract count
          const unitMatch = tx.deskripsi.match(/(\d+)\s*unit/i);
          const unitCount = unitMatch ? parseInt(unitMatch[1]) : 1;
          const pricePerUnit = tx.nominal / unitCount;
          
          if (pricePerUnit > 12000000) {
            const estimasiWajar = 7500000 * unitCount;
            detectedAnomalies.push({
              id_transaksi: tx.id_transaksi,
              id_akun: tx.id_akun,
              nominal: tx.nominal,
              tingkat_kecurigaan: pricePerUnit > 25000000 ? "Tinggi" : "Sedang",
              alasan_historis: `Pengeluaran perolehan perangkat IT komputer tercatat sebesar Rp ${pricePerUnit.toLocaleString("id-ID")} per unit. Ini merupakan peningkatan di luar diagram histori korporasi.`,
              alasan_harga_pasar: `Tolak ukur harga pasar Indonesia untuk spesifikasi sejenis bernilai wajar maksimum Rp 7.500.000 /unit. Ditemukan indikasi penggelembungan / mark-up harga sekitar Rp ${(pricePerUnit - 7500000).toLocaleString("id-ID")}/unit.`,
              estimasi_harga_pasar_wajar: estimasiWajar,
              status_akun: "Dalam Pengawasan",
              admin_notifikasi: `ALERT: Indikasi Mark-Up komputer terdeteksi di Akun ${tx.id_akun}. Nominal Rp ${tx.nominal.toLocaleString("id-ID")} (Estimasi Harga Wajar: Rp ${estimasiWajar.toLocaleString("id-ID")}).`,
              rekomendasi_audit: "Selidiki kontrak kerja sama pengadaan dan panggil penyedia barang digital terkait untuk membuktikan orisinalitas faktur."
            });
          }
        }
        // 2. Food/Catering Check
        else if (descMatch.includes("katering") || descMatch.includes("makan") || descMatch.includes("konsumsi") || descMatch.includes("nasi")) {
          // Normal nasi box is 30-50rb.
          const porsiMatch = tx.deskripsi.match(/(\d+)\s*porsi/i);
          const porsiCount = porsiMatch ? parseInt(porsiMatch[1]) : 50;
          const costPerPorsi = tx.nominal / porsiCount;

          if (costPerPorsi > 120000) {
            const estimasiWajar = 50000 * porsiCount;
            detectedAnomalies.push({
              id_transaksi: tx.id_transaksi,
              id_akun: tx.id_akun,
              nominal: tx.nominal,
              tingkat_kecurigaan: "Tinggi",
              alasan_historis: `Biaya katering rapat triwulan ${tx.id_akun} melompat 800% melewati koridor pengeluaran operasional standard kami.`,
              alasan_harga_pasar: `Penyajian seharga Rp ${costPerPorsi.toLocaleString("id-ID")} per porsi sangat tidak wajar untuk porsi nasi kotak biasa di Indonesia. Harga katering porsi komplit premium berskala Rp 45.000 - Rp 60.000.`,
              estimasi_harga_pasar_wajar: estimasiWajar,
              status_akun: "Dalam Pengawasan",
              admin_notifikasi: `PERINGATAN: Penggelembungan dana konsumsi rapat terdeteksi di Unit ${tx.id_akun} senilai Rp ${tx.nominal.toLocaleString("id-ID")} (TX-2026-002).`,
              rekomendasi_audit: "Verifikasi jumlah riil peserta rapat dan mintalah jaminan autentik dari pemilik jasa katering."
            });
          }
        }
        // 3. Office Stationary Check
        else if (descMatch.includes("hvs") || descMatch.includes("kertas") || descMatch.includes("atk") || descMatch.includes("pulpen")) {
          if (tx.nominal > 15000000) {
            const estimasiWajar = 5000000;
            detectedAnomalies.push({
              id_transaksi: tx.id_transaksi,
              id_akun: tx.id_akun,
              nominal: tx.nominal,
              tingkat_kecurigaan: "Sedang",
              alasan_historis: `Volume nominal ATK Rp ${tx.nominal.toLocaleString("id-ID")} mendatangi angka historis ekstrem. Biasanya tidak pernah melebihi Rp 5.000.000 / bulan per divisi.`,
              alasan_harga_pasar: `Estimasi persediaan kertas dan pulpen bulanan untuk 1 divisi wajarnya hanya membutuhkan anggaran Rp 4.000.000 s.d Rp 6.000.000. Sisa dana patut diinvestigasi karena berisiko kwitansi palsu.`,
              estimasi_harga_pasar_wajar: estimasiWajar,
              status_akun: "Dalam Pengawasan",
              admin_notifikasi: `NOTIF: Transaksi ATK tidak wajar pada akun ${tx.id_akun} senilai Rp ${tx.nominal.toLocaleString("id-ID")}. Tindakan inventaris diperlukan.`,
              rekomendasi_audit: "Cek ketersediaan fisik stok kertas HVS dan pulpen di ruang logistik secara mendadak."
            });
          }
        }
        // 4. General excessive single expense
        else if (tx.nominal > 100000000 && !descMatch.includes("gaji") && !descMatch.includes("anggaran")) {
          const estimasiWajar = tx.nominal * 0.6; // assuming 40% markup
          detectedAnomalies.push({
            id_transaksi: tx.id_transaksi,
            id_akun: tx.id_akun,
            nominal: tx.nominal,
            tingkat_kecurigaan: tx.nominal > 300000000 ? "Tinggi" : "Sedang",
            alasan_historis: `Akun ini memicu pembebanan anggaran darurat di atas batas rata-rata historis pengeluaran triwulan berjalan.`,
            alasan_harga_pasar: `Penyalahgunaan kwitansi pengeluaran atau kesepakatan kolusif terindikasi pada jasa eksternal terkait deskripsi: "${tx.deskripsi}"`,
            estimasi_harga_pasar_wajar: estimasiWajar,
            status_akun: "Dalam Pengawasan",
            admin_notifikasi: `WARNING: Transaksi jumbo mencurigakan di Akun ${tx.id_akun} senilai Rp ${tx.nominal.toLocaleString("id-ID")}`,
            rekomendasi_audit: "Periksa korespondensi email dengan pihak vendor penyuplai untuk membendung kesepakatan komisi haram."
          });
        }
      }
    });

    if (detectedAnomalies.length > 0) {
      computedOverallRisk = Math.min(40 + detectedAnomalies.length * 15, 95);
    }

    const compiledLaporan: LaporanBerkala = {
      judul: "LAPORAN AUDIT INTERNAL — DETEKSI FRAUD INTERNAL",
      tanggal: new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }),
      pembukaan: "Berdasarkan rujukan saringan digital sistem Sentinel Analytics, draf ini merupakan evaluasi forensik independen terhadap transaksi janggal yang diunggah. Audit telah menguji dan mencocokkan anomali historis serta mark-up harga barang di pasar Indonesia.",
      temuan_utama: detectedAnomalies.map((anom, i) => `${i + 1}. Transaksi ${anom.id_transaksi} oleh akun ${anom.id_akun} terindikasi kemahalan harga sebesar Rp ${(anom.nominal - anom.estimasi_harga_pasar_wajar).toLocaleString("id-ID")}.`),
      analisis_distribusi: `Dari total pengeluaran keuangan yang dianalisis, rasio korelasi potensi penyimpangan dana didominasi oleh segmen pengadaan logistik instansi serta penunjang ATK kantor.`,
      rekomendasi_strategis: [
        "Mewajibkan setiap pembebanan kas di atas Rp 10.000.000 disertai dengan 3 penawaran harga pembanding dari vendor berbeda.",
        "Merekam tanda terima fisik pengadaan barang lengkap dengan foto dokumentasi koordinat GPS.",
        "Mengadopsi otomatisasi ambang batas anggaran pada aplikasi keuangan Sentinel ini secara preventif."
      ],
      langkah_lanjut: [
        "Memanggil bendahara pengeluaran terkait untuk klarifikasi transaksi mencurigakan.",
        "Memberikan pembekuan sementara atau penahanan dana pada transaksi yang berstatus sangat mencurigakan.",
        "Menyerahkan salinan digital Sentinel Report ini ke komite pengawas disiplin internal."
      ]
    };

    const simulatedResult: AnalysisResult = {
      overallRiskScore: computedOverallRisk,
      executiveSummary: `Ditemukan ${detectedAnomalies.length} transaksi janggal dengan total nominal mencurigakan sebesar Rp ${detectedAnomalies.reduce((a, b) => a + b.nominal, 0).toLocaleString("id-ID")}. Nilai penyimpangan mark-up harga pasar diestimasi berjumlah Rp ${detectedAnomalies.reduce((a, b) => a + (b.nominal - b.estimasi_harga_pasar_wajar), 0).toLocaleString("id-ID")}.`,
      anomalies: detectedAnomalies,
      laporan_berkala: compiledLaporan
    };

    setAnalysis(simulatedResult);

    // Apply auto system notification trigger matching requirement 4
    const newNotifs: SystemNotification[] = detectedAnomalies.map((anom, idx) => ({
      id: `NOTIF-SIM-${idx}-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString("id-ID") + ", 12 Juni 2026",
      type: anom.tingkat_kecurigaan === "Tinggi" ? "danger" : "warning",
      message: anom.admin_notifikasi,
      id_akun: anom.id_akun,
      resolved: false
    }));

    setNotifications(prev => [...newNotifs, ...prev]);

    if (detectedAnomalies.length > 0) {
      setSelectedTxId(detectedAnomalies[0].id_transaksi);
    } else {
      setSelectedTxId(null);
    }

    setApiSuccessMessage("Audit Selesai. Hasil deteksi dihitung menggunakan Mesin Aturan Auditor Forensik Sandbox.");
    setTimeout(() => setApiSuccessMessage(null), 5000);
  };

  // Resolve notification
  const handleResolveNotif = (notifId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notifId ? { ...n, resolved: true } : n)
    );
  };

  // Add new manual transaction
  const handleAddTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `TX-2026-${String(transactions.length + 1).padStart(3, "0")}`;
    const newRecord: Transaction = {
      id_transaksi: id,
      ...newTx
    };
    
    setTransactions(prev => [newRecord, ...prev]);
    setShowAddModal(false);
    setApiSuccessMessage(`Transaksi baru ${id} berhasil didaftarkan.`);
    setTimeout(() => setApiSuccessMessage(null), 3000);
  };

  // Delete transaction
  const handleDeleteTransaction = (id: string) => {
    if (window.confirm(`Hapus transaksi ${id}?`)) {
      setTransactions(prev => prev.filter(t => t.id_transaksi !== id));
      if (selectedTxId === id) setSelectedTxId(null);
    }
  };

  // Save edited transaction
  const handleSaveEditTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    setTransactions(prev =>
      prev.map(t => t.id_transaksi === editingTx.id_transaksi ? editingTx : t)
    );
    setEditingTx(null);
    setApiSuccessMessage(`Transaksi ${editingTx.id_transaksi} berhasil diupdate.`);
    setTimeout(() => setApiSuccessMessage(null), 3000);
  };

  // Filter transactions based on rules
  const filteredTransactions = transactions.filter((tx) => {
    const sTerm = searchTerm.toLowerCase();
    const matchesSearch =
      tx.id_transaksi.toLowerCase().includes(sTerm) ||
      tx.id_akun.toLowerCase().includes(sTerm) ||
      tx.deskripsi.toLowerCase().includes(sTerm);

    const matchesType =
      filterType === "semua" || tx.jenis_transaksi === filterType;

    let matchesRisk = true;
    const isAnomalous = analysis?.anomalies.some((anom) => anom.id_transaksi === tx.id_transaksi);
    if (filterRisk === "diawasi") {
      matchesRisk = !!isAnomalous;
    } else if (filterRisk === "aman") {
      matchesRisk = !isAnomalous;
    }

    return matchesSearch && matchesType && matchesRisk;
  });

  // Derived stats
  const totalNominalKeluar = transactions
    .filter(t => t.jenis_transaksi === "keluar")
    .reduce((sum, t) => sum + t.nominal, 0);

  const totalNominalMasuk = transactions
    .filter(t => t.jenis_transaksi === "masuk")
    .reduce((sum, t) => sum + t.nominal, 0);

  // Total calculated markups
  const totalEstimatedMarkup = analysis
    ? analysis.anomalies.reduce((sum, anom) => sum + (anom.nominal - anom.estimasi_harga_pasar_wajar), 0)
    : 0;

  // Accounts under supervision count
  const supervisedAccountsCount = analysis
    ? Array.from(new Set(analysis.anomalies.map(a => a.id_akun))).length
    : 0;

  // Currently selected transaction details
  const selectedTxObj = transactions.find(t => t.id_transaksi === selectedTxId);
  const selectedAnomalyObj = analysis?.anomalies.find(a => a.id_transaksi === selectedTxId);

  return (
    <div className="w-full h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden" id="sentinel-app-root">
      
      {/* HEADER */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm shrink-0" id="sentinel-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
            <span className="rotate-12 translate-y-[-1px]">S</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              SENTINEL <span className="text-indigo-600">Analytics</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-none">
              Sistem Deteksi Korupsi Terpadu
            </p>
          </div>
        </div>

        {/* Top bar information and status */}
        <div className="flex items-center gap-4">
          {/* Offline/Online System Notification status */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
            <div className={`w-2.5 h-2.5 rounded-full ${isApiKeyMissing ? "bg-amber-500" : "bg-green-500 animate-pulse"}`}></div>
            <span className="text-xs font-semibold text-slate-600">
              {isApiKeyMissing ? "AI Engine Sandbox Mode" : "AI Engine Active (Gemini)"}
            </span>
          </div>

          <button
            onClick={handleRunAudit}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-lg shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Saring Ulang Transaksi keuangan Anda untuk menganalisis risiko terbaru"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>JALANKAN AUDIT AI</span>
          </button>

          <button
            onClick={handleResetData}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Reset ke Data Contoh Asli"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* DUAL DIVISION: SIDEBAR & MAIN FIELD */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDE NAV BAR */}
        <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-1 shrink-0" id="sentinel-sidebar">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100">
            Menu Utama
          </div>
          
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "dashboard"
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-indigo-600" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("transactions")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors relative ${
              activeTab === "transactions"
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-500" />
            <span>Daftar Transaksi</span>
            <span className="absolute right-3 bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {transactions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("monitoring")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors relative ${
              activeTab === "monitoring"
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span>Daftar Pengawasan</span>
            {supervisedAccountsCount > 0 && (
              <span className="absolute right-3 bg-red-100 text-red-650 text-[10px] font-bold px-2 py-0.5 rounded-md">
                {supervisedAccountsCount} Akun
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "reports"
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Laporan Berkala Audit</span>
          </button>

          {/* ACTIVE ALERTS SUMMARY TILE */}
          <div className="mt-4 p-3 bg-indigo-950 text-white rounded-xl flex flex-col gap-1 shadow-inner">
            <h3 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-1">
              <span className="bg-red-500 w-2 h-2 rounded-full animate-ping"></span>
              Alert Admin Berjalan
            </h3>
            <p className="text-lg font-bold font-mono text-white mt-1">
              {notifications.filter(n => !n.resolved).length} <span className="text-xs text-slate-300">Aktif</span>
            </p>
            <p className="text-[10px] text-indigo-200 leading-normal">
              Notifikasi dikirim langsung ke sistem admin setiap kali anomali 'Dalam Pengawasan' terpicu.
            </p>
          </div>

          <div className="mt-auto pt-4 border-t border-slate-100">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${
                dragActive
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <UploadCloud className="w-6 h-6 mx-auto text-slate-400 mb-1" />
              <p className="text-[11px] font-bold text-slate-700">Unggah File CSV</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Format: id_transaksi, id_akun, nominal, jenis_transaksi, deskripsi, tanggal</p>
              <input
                type="file"
                accept=".csv"
                id="sidebar-csv-file-selector"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label
                htmlFor="sidebar-csv-file-selector"
                className="px-2 py-1 mt-2 inline-block bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] rounded border border-slate-300 cursor-pointer"
              >
                Pilih File CSV
              </label>
            </div>
            
            <button
              onClick={() => setShowCsvBox(true)}
              className="mt-2 w-full text-center text-xs text-indigo-600 hover:text-indigo-800 font-medium tracking-tight"
            >
              Atau Paste CSV Text Manan
            </button>
          </div>
        </aside>

        {/* CONTAINER UTAMA DYNAMIC SESUAI TAB */}
        <main className="flex-1 p-6 overflow-y-auto flex flex-col gap-6" id="sentinel-main-field">
          
          {/* TOAST NOTIFIKASI SUKSES / ERROR */}
          {apiSuccessMessage && (
            <div className="bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors rounded-xl p-4 flex items-start gap-3 shadow-sm shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-800">Operasi Sukses</p>
                <p className="text-xs text-emerald-700 mt-0.5">{apiSuccessMessage}</p>
              </div>
              <button onClick={() => setApiSuccessMessage(null)} className="ml-auto text-emerald-400 hover:text-emerald-600 text-xs font-bold">✕</button>
            </div>
          )}

          {apiErrorMessage && (
            <div className="bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors rounded-xl p-4 flex items-start gap-3 shadow-sm shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-800">Peringatan Audit</p>
                <p className="text-xs text-rose-700 mt-0.5">{apiErrorMessage}</p>
              </div>
              <button onClick={() => setApiErrorMessage(null)} className="ml-auto text-rose-400 hover:text-rose-600 text-xs font-bold">✕</button>
            </div>
          )}

          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === "dashboard" && (
            <div className="flex flex-col gap-6">
              
              {/* UPPER GREETING SECTION & SUMMARY METRICS */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">DASHBOARD RISK INTELLIGENCE</h2>
                  <p className="text-xs text-slate-500">
                    Pemantauan ketaatan anggaran realtime berbasis visual korelasi harga pasar dan perbandingan audit historis.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs bg-indigo-50 border border-indigo-100 rounded-lg p-2 font-semibold text-indigo-700">
                  <Calendar className="w-4 h-4" />
                  <span>Periode Analisis: Juni 2026</span>
                </div>
              </div>

              {/* THREE MAIN BENTO CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* METRICS CARD 1 */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow transition-shadow">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Transaksi Diperiksa</span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Realtime</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-4">
                    <span className="text-3xl font-black text-slate-800">{transactions.length}</span>
                    <span className="text-xs font-bold text-green-600 font-mono">+100%</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Debit Keluar: <span className="font-mono text-slate-700 font-bold">Rp {totalNominalKeluar.toLocaleString("id-ID")}</span>
                  </p>
                </div>

                {/* METRICS CARD 2 */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow transition-shadow">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Deteksi Selisih Mark-up</span>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-mono">Kemahalan Harga</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-3xl font-black text-amber-600">
                      Rp {totalEstimatedMarkup.toLocaleString("id-ID")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">Selisih Pasar</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Dari {analysis?.anomalies.length || 0} anomali pengeluaran terbukti janggal.
                  </p>
                </div>

                {/* METRICS CARD 3: AUDITED LEVEL INDICATOR */}
                <div className="bg-red-650 text-white p-5 rounded-xl flex flex-col justify-between shadow-md relative overflow-hidden bg-red-600">
                  <div className="flex justify-between items-start z-10">
                    <span className="text-xs font-black text-red-100 uppercase tracking-wider">STATUS AKUN PENYIMPANG</span>
                    <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded">High Risk Alert</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-4 z-10">
                    <span className="text-3xl font-black">{supervisedAccountsCount} Akun</span>
                    <span className="text-xs font-bold bg-white/20 px-1.5 py-0.5 rounded font-mono">Dalam Pengawasan</span>
                  </div>
                  <p className="text-[11px] text-red-100 mt-1 z-10">
                    Notifikasi darurat terkirim langsung ke admin korporasi.
                  </p>
                  {/* Decorative background shape */}
                  <div className="absolute right-[-10px] bottom-[-20px] w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                </div>

              </div>

              {/* SECOND GRID BLOCK: CHART, METRIC RISK GAUGE, RECENT TABLE */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-core-grid">
                
                {/* SUB GRID: GAUGES & RISK STATUS */}
                <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
                  <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Risk Score Dashboard</span>
                  </h3>

                  {/* SVG GAUGE CHART */}
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="relative w-40 h-24 flex items-center justify-center">
                      {/* Semi circle arc */}
                      <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 50">
                        {/* Gray background arc */}
                        <path
                          d="M10,45 A35,35 0 0,1 90,45"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="8"
                          strokeLinecap="round"
                        />
                        {/* Colored progress arc */}
                        <path
                          d="M10,45 A35,35 0 0,1 90,45"
                          fill="none"
                          stroke={analysis && analysis.overallRiskScore > 70 ? "#e11d48" : analysis && analysis.overallRiskScore > 40 ? "#f59e0b" : "#10b981"}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray="125"
                          strokeDashoffset={125 - (125 * (analysis?.overallRiskScore || 0)) / 100}
                        />
                      </svg>
                      {/* Inner Text display */}
                      <div className="text-center mt-6">
                        <span className="text-3xl font-black font-mono text-slate-800">
                          {analysis?.overallRiskScore || 0}%
                        </span>
                        <p className="text-[10px] text-slate-400 font-black uppercase mt-1">Skor Risiko Akumulasi</p>
                      </div>
                    </div>

                    <div className="text-center px-4 mt-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${
                        analysis && analysis.overallRiskScore > 75 
                          ? "bg-rose-600" 
                          : analysis && analysis.overallRiskScore > 40 
                            ? "bg-amber-500" 
                            : "bg-emerald-600"
                      }`}>
                        {analysis && analysis.overallRiskScore > 75 
                          ? "BAHAYA - KORUPSI TINGGI" 
                          : analysis && analysis.overallRiskScore > 40 
                            ? "RISIKO SEDANG - RE-AUDIT" 
                            : "AMAN / RISIKO RENDAH"}
                      </span>
                    </div>
                  </div>

                  {/* MINI INSIGHT LOG */}
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs leading-relaxed text-slate-600 flex flex-col gap-2">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                      <Info className="w-3.5 h-3.5 text-indigo-600" />
                      Ringkasan Eksekutif AI:
                    </p>
                    <p className="italic">
                      "{analysis?.executiveSummary || "Belum ada analisis transaksi yang terekam. Silakan jalankan audit berbasis AI terlebih dahulu."}"
                    </p>
                  </div>

                  {/* VISUAL MINI HISTORICAL PATTERN DEVIATION */}
                  <div className="border border-slate-100 rounded-lg p-3">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Simulasi Lonjakan Anggaran Divisi (Historis)</p>
                    <div className="h-16 flex items-end gap-2 pt-2 border-b border-slate-200">
                      <div className="flex-1 bg-slate-200 h-[15%] rounded-t" title="Februari: Normal"></div>
                      <div className="flex-1 bg-slate-200 h-[22%] rounded-t" title="Maret: Normal"></div>
                      <div className="flex-1 bg-slate-200 h-[19%] rounded-t" title="April: Normal"></div>
                      <div className="flex-1 bg-slate-200 h-[25%] rounded-t" title="Mei: Normal"></div>
                      <div className="flex-1 bg-rose-500 h-[92%] rounded-t animate-pulse" title="Juni: Lonjakan ekstrim ATK/Katering"></div>
                    </div>
                    <div className="flex justify-between text-[8px] font-bold text-slate-400 mt-1 uppercase">
                      <span>Feb-Mei Rerata: Rp 45jt</span>
                      <span className="text-rose-600 font-black">Juni Realisasi: Rp 580jt</span>
                    </div>
                  </div>

                </div>

                {/* THE TRANSACTION DATAGRID FOR RECENT ITEMS */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">Analisis Transaksi Terkini</h3>
                        <p className="text-[11.5px] text-slate-400">Pilih baris transaksi untuk melihat audit forensik pasar wajar.</p>
                      </div>
                      <button
                        onClick={() => setActiveTab("transactions")}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <span>Lihat Semua</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID / Akun</th>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Deskripsi Pengadaan</th>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nominal</th>
                            <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status Audit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {transactions.slice(0, 5).map((tx) => {
                            const isAnomalous = analysis?.anomalies.some((anom) => anom.id_transaksi === tx.id_transaksi);
                            const anomalyObj = analysis?.anomalies.find((anom) => anom.id_transaksi === tx.id_transaksi);
                            const isSelected = selectedTxId === tx.id_transaksi;

                            return (
                              <tr
                                key={tx.id_transaksi}
                                onClick={() => setSelectedTxId(tx.id_transaksi)}
                                className={`cursor-pointer transition-colors text-xs ${
                                  isSelected 
                                    ? "bg-indigo-50/70 border-l-4 border-indigo-600 font-medium" 
                                    : "hover:bg-slate-50"
                                }`}
                              >
                                <td className="px-5 py-3">
                                  <div className="font-mono font-bold text-slate-800">{tx.id_transaksi}</div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.id_akun}</div>
                                </td>
                                <td className="px-5 py-3">
                                  <div className="text-slate-800 font-normal line-clamp-1 max-w-[240px] italic">
                                    "{tx.deskripsi}"
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">
                                    {tx.tanggal} • {tx.jenis_transaksi}
                                  </div>
                                </td>
                                <td className="px-5 py-3 font-mono font-bold text-slate-800">
                                  Rp {tx.nominal.toLocaleString("id-ID")}
                                </td>
                                <td className="px-5 py-3 text-right">
                                  {isAnomalous ? (
                                    <div className="inline-flex flex-col items-end">
                                      <span className="px-2 py-0.5 bg-red-100 text-red-650 rounded text-[10px] font-bold text-red-700 leading-none">
                                        DIAWASI ({anomalyObj?.tingkat_kecurigaan})
                                      </span>
                                      <span className="text-[8px] text-rose-500 font-bold mt-1 uppercase tracking-wide">
                                        Mark-up
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold leading-none">
                                      AMAN
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 font-medium text-center">
                    Menampilkan 5 transaksi terbaru dari total {transactions.length} unit data di memori.
                  </div>
                </div>

              </div>

              {/* INTEGRATED DETAIL TEMUAN ANOMALI COLLAPSIBLE DRAWER IN DASHBOARD */}
              {selectedTxId && selectedTxObj && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" id="dashboard-audit-details">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4 mb-4 gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center border border-amber-200 text-amber-600">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">
                          Detail Audit Forensik & Real-time Market: <span className="font-mono text-indigo-600 font-black">{selectedTxObj.id_transaksi}</span>
                        </h4>
                        <p className="text-[11px] text-slate-400 font-semibold tracking-tight uppercase">
                          Akun Terkait: <span className="text-slate-600 font-mono font-bold">{selectedTxObj.id_akun}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">Klasifikasi AI:</span>
                      {selectedAnomalyObj ? (
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg text-white ${
                          selectedAnomalyObj.tingkat_kecurigaan === "Tinggi" ? "bg-red-600" : "bg-amber-500"
                        }`}>
                          DALAM PENGAWASAN ({selectedAnomalyObj.tingkat_kecurigaan})
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-bold bg-green-600 text-white rounded-lg">
                          TRANSAKSI AMAN
                        </span>
                      )}
                    </div>
                  </div>

                  {/* DETAILS MAIN GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* COL 1: TRANSAKSI DATA */}
                    <div className="flex flex-col gap-4">
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Deskripsi Nota Transaksi:</span>
                        <p className="text-xs font-bold text-slate-700 mt-1 italic">
                          "{selectedTxObj.deskripsi}"
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tanggal</span>
                            <span className="font-mono font-bold text-slate-700">{selectedTxObj.tanggal}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Aliran Transaksi</span>
                            <span className={`font-bold uppercase ${selectedTxObj.jenis_transaksi === "keluar" ? "text-rose-600" : "text-emerald-600"}`}>
                              {selectedTxObj.jenis_transaksi}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nominal Terbayar</span>
                            <span className="font-mono text-sm font-black text-slate-900">
                              Rp {selectedTxObj.nominal.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* COL 2: REAL-TIME MARKET AUDIT */}
                    <div className="p-4 rounded-lg bg-red-50 border border-red-100 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-red-700 font-black uppercase tracking-widest">Real-time Market Audit</span>
                          <span className="text-[9px] bg-red-200 text-red-800 font-bold px-1.5 py-0.5 rounded uppercase">
                            {selectedAnomalyObj ? "Markup Delta" : "Valid"}
                          </span>
                        </div>
                        
                        <div className="mt-4 flex items-center justify-around gap-4 border-b border-red-200 pb-4">
                          <div className="text-center">
                            <span className="text-[9px] text-slate-500 uppercase block font-semibold">Harga Tertera</span>
                            <span className="text-sm font-black text-rose-600 font-mono">
                              Rp {selectedTxObj.nominal.toLocaleString("id-ID")}
                            </span>
                          </div>

                          <div className="text-center border-l border-red-200 pl-4">
                            <span className="text-[9px] text-slate-500 uppercase block font-semibold">Harga Pasar Wajar</span>
                            <span className="text-sm font-black text-green-600 font-mono">
                              Rp {(selectedAnomalyObj?.estimasi_harga_pasar_wajar || selectedTxObj.nominal).toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 text-xs text-red-850 leading-relaxed text-red-800">
                          <span className="font-bold uppercase tracking-wider text-[9px] block mb-1">Evaluasi Finansial Forensik:</span>
                          <p className="italic">
                            "{selectedAnomalyObj?.alasan_harga_pasar || "Sistem audit pasar tidak mendeteksi deviasi/mark-up harga pada transaksi ini. Anggaran yang dibayarkan dinilai logis sesuai harga pasar normal di Indonesia."}"
                          </p>
                        </div>
                      </div>

                      {selectedAnomalyObj && (
                        <div className="bg-red-600/10 p-2 rounded border border-red-200 text-center mt-3 text-[10px] font-black text-rose-700 font-mono uppercase tracking-wide">
                          Potensi Kemahalan: Rp {(selectedTxObj.nominal - selectedAnomalyObj.estimasi_harga_pasar_wajar).toLocaleString("id-ID")}
                        </div>
                      )}
                    </div>

                    {/* COL 3: ARUS PENYIMPANGAN HISTORIS DAN REKOMENDASI AUDIT */}
                    <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-indigo-700 font-black uppercase tracking-widest block">Analisis Historis Akun</span>
                        <p className="text-xs text-indigo-900 leading-normal mt-2 italic">
                          "{(selectedAnomalyObj?.alasan_historis || "Pengeluaran se-divisi tercatat stabil dan sesuai dengan koridor rata-rata historis bulanan instansi.")}"
                        </p>

                        <span className="text-[10px] text-indigo-700 font-black uppercase tracking-widest block mt-4">Rekomendasi Investigasi Audit</span>
                        <p className="text-xs text-slate-700 leading-normal mt-1 italic text-slate-600">
                          "{(selectedAnomalyObj?.rekomendasi_audit || "Tidak diperlukan audit investigatif mendalam. Pertahankan pelaporan kuitansi standar bulanan.")}"
                        </p>
                      </div>

                      {/* ACTION TRIGGERS */}
                      <div className="mt-4 pt-4 border-t border-indigo-200/50 flex gap-2">
                        <button
                          onClick={() => {
                            if (selectedAnomalyObj) {
                              alert(`Notifikasi Admin Berhasil Dikirim Ulang:\n\nKepada: Admin Sistem Keuangan\nSubjek: INDIKASI FRAUD / MARKUP ${selectedAnomalyObj.id_transaksi}\n\nPesan: ${selectedAnomalyObj.admin_notifikasi}`);
                            } else {
                              alert("Transaksi ini dalam kategori AMAN. Tidak diperlukan notifikasi admin darurat.");
                            }
                          }}
                          className="flex-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-[10px] tracking-wide uppercase transition-colors"
                        >
                          Kirim Notifikasi Admin
                        </button>

                        <button
                          onClick={() => {
                            alert(`Dicatat dalam audit log:\n\nTransaksi ${selectedTxObj.id_transaksi} berstatus investigasi aktif.`);
                          }}
                          className="bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold px-3 py-2 rounded-lg uppercase tracking-wide transition-colors"
                        >
                          Tandai Investigasi
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: DAFTAR TRANSAKSI DENGAN CRUD & FILTER */}
          {activeTab === "transactions" && (
            <div className="flex flex-col gap-6">
              
              {/* INTERACTIVE COMPONENT HEADER */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">MANAJEMEN & DAFTAR TRANSAKSI</h2>
                  <p className="text-xs text-slate-500">
                    Tambahkan, edit, hapus, atau import data transaksi kas korporasi di bawah ini untuk disaring oleh engine audit AI.
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow transition-all hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Daftarkan Transaksi</span>
                  </button>

                  <button
                    onClick={() => {
                      const element = document.createElement("a");
                      const file = new Blob([sampleCsvString], {type: 'text/plain'});
                      element.href = URL.createObjectURL(file);
                      element.download = "sentinel_sample_transaksi.csv";
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-650 text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                    title="Unduh file format standar CSV kami sebagai panduan impor"
                  >
                    <Download className="w-4 h-4" />
                    <span>Format CSV</span>
                  </button>
                </div>
              </div>

              {/* FILTERING CONTROLS FOR GRID */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between" id="transactions-filters">
                <div className="relative w-full md:w-80">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Cari ID, Akun, atau Deskripsi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Aliran:</span>
                    <select
                      value={filterType}
                      onChange={(e: any) => setFilterType(e.target.value)}
                      className="bg-slate-50 border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs font-medium focus:outline-none"
                    >
                      <option value="semua">Semua Aliran</option>
                      <option value="keluar">Hanya Keluar</option>
                      <option value="masuk">Hanya Masuk</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Filter Risiko:</span>
                    <select
                      value={filterRisk}
                      onChange={(e: any) => setFilterRisk(e.target.value)}
                      className="bg-slate-50 border border-slate-200 py-1.5 px-2.5 rounded-lg text-xs font-medium focus:outline-none"
                    >
                      <option value="semua">Semua Status</option>
                      <option value="diawasi">Dalam Pengawasan</option>
                      <option value="aman">Terbukti Aman</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* CSV CUSTOM RAW TEXT INPUT FORM */}
              {showCsvBox && (
                <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-700">
                  <div className="flex justify-between items-center pb-2 mb-3 border-b border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Tempel Data CSV Anda:</h3>
                    <button onClick={() => setShowCsvBox(false)} className="text-xs hover:text-red-400">Tutup</button>
                  </div>
                  <textarea
                    rows={5}
                    value={csvInputText}
                    onChange={(e) => setCsvInputText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500"
                    placeholder="id_transaksi,id_akun,nominal,jenis_transaksi,deskripsi,tanggal&#10;TX-990,ACC-X,45000000,keluar,Pembelian Laptop,12-06-2026"
                  />
                  <div className="mt-3 flex justify-between items-center">
                    <button
                      onClick={() => setCsvInputText(sampleCsvString)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-indigo-300 px-3 py-1.5 rounded"
                    >
                      Gunakan Dataset Template
                    </button>
                    <button
                      onClick={() => {
                        if (!csvInputText.trim()) {
                          alert("Harap isikan teks CSV.");
                          return;
                        }
                        parseCsvData(csvInputText);
                      }}
                      className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-1.5 rounded"
                    >
                      Impor Sekarang
                    </button>
                  </div>
                </div>
              )}

              {/* TABLE CONTAINER FOR DATAGRID */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold">
                      <tr>
                        <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Transaksi</th>
                        <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Id Akun</th>
                        <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                        <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aliran Jenis</th>
                        <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Deskripsi Rincian Nota</th>
                        <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nominal (Rupiah)</th>
                        <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status AI</th>
                        <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-10 bg-slate-50 text-slate-450 italic font-medium">
                            Tidak ditemukan transaksi yang lolos saringan filter ini.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((tx) => {
                          const isAnomalous = analysis?.anomalies.some((anom) => anom.id_transaksi === tx.id_transaksi);
                          const anomObj = analysis?.anomalies.find((anom) => anom.id_transaksi === tx.id_transaksi);

                          return (
                            <tr key={tx.id_transaksi} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-4 font-mono font-bold text-indigo-700">
                                {tx.id_transaksi}
                              </td>
                              <td className="px-5 py-4 font-mono font-bold text-slate-700">
                                {tx.id_akun}
                              </td>
                              <td className="px-5 py-4 text-slate-600 font-medium">
                                {tx.tanggal}
                              </td>
                              <td className="px-5 py-4">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  tx.jenis_transaksi === "keluar" 
                                    ? "bg-rose-100 text-rose-700" 
                                    : "bg-green-100 text-green-700"
                                }`}>
                                  {tx.jenis_transaksi.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-5 py-4 max-w-[280px]">
                                <p className="text-slate-800 italic truncate" title={tx.deskripsi}>
                                  "{tx.deskripsi}"
                                </p>
                              </td>
                              <td className="px-5 py-4 font-mono font-bold text-slate-800">
                                Rp {tx.nominal.toLocaleString("id-ID")}
                              </td>
                              <td className="px-5 py-4">
                                {isAnomalous ? (
                                  <div className="flex flex-col">
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold leading-none">
                                      DIAWASI ({anomObj?.tingkat_kecurigaan})
                                    </span>
                                    <span className="text-[8px] text-red-500 font-bold mt-1 uppercase tracking-wider">
                                      Selisih Rp {(tx.nominal - (anomObj?.estimasi_harga_pasar_wajar || 0)).toLocaleString("id-ID")}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold leading-none">
                                    AMAN
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => setEditingTx(tx)}
                                    className="p-1 px-1.5 text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded"
                                    title="Edit Transaksi"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTransaction(tx.id_transaksi)}
                                    className="p-1 px-1.5 text-red-600 hover:bg-red-50 border border-slate-200 rounded"
                                    title="Hapus Transaksi"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-semibold">
                  <span>Menampilkan {filteredTransactions.length} dari total {transactions.length} baris transaksi.</span>
                  
                  {analysis && (
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                      <span className="text-red-600 font-black">Saring Ulang Audit AI disarankan bila ada perubahan anggaran.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* INLINE EDIT MODE DI BAWAH JIKA DIPILIH */}
              {editingTx && (
                <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100" id="edit-tx-container">
                  <div className="flex justify-between items-center pb-2 mb-4 border-b border-indigo-200">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 inline-flex items-center gap-1">
                      <Edit2 className="w-4 h-4" />
                      <span>Edit Transaksi: {editingTx.id_transaksi}</span>
                    </h3>
                    <button onClick={() => setEditingTx(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">✕ Batal</button>
                  </div>

                  <form onSubmit={handleSaveEditTransaction} className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-1">ID Akun</label>
                      <input
                        type="text"
                        value={editingTx.id_akun}
                        onChange={(e) => setEditingTx({ ...editingTx, id_akun: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-1">Tanggal</label>
                      <input
                        type="text"
                        value={editingTx.tanggal}
                        onChange={(e) => setEditingTx({ ...editingTx, tanggal: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-xs focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-1">Jenis</label>
                      <select
                        value={editingTx.jenis_transaksi}
                        onChange={(e: any) => setEditingTx({ ...editingTx, jenis_transaksi: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-none"
                      >
                        <option value="keluar">KELUAR</option>
                        <option value="masuk">MASUK</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-1">Nominal (Rupiah)</label>
                      <input
                        type="number"
                        value={editingTx.nominal}
                        onChange={(e) => setEditingTx({ ...editingTx, nominal: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-xs focus:outline-none"
                        required
                      />
                    </div>

                    <div className="md:col-span-1 flex items-end">
                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-xs"
                      >
                        Simpan Pemutakhiran
                      </button>
                    </div>

                    <div className="md:col-span-5">
                      <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-1">Deskripsi Pengadaan Barang & Jasa</label>
                      <input
                        type="text"
                        value={editingTx.deskripsi}
                        onChange={(e) => setEditingTx({ ...editingTx, deskripsi: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 italic focus:outline-none"
                        placeholder="Contoh: Pembelian Laptop admin 5 unit"
                        required
                      />
                    </div>
                  </form>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: DAFTAR PENGAWASAN & NOTIFIKASI ADMIN */}
          {activeTab === "monitoring" && (
            <div className="flex flex-col gap-6">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">DAFTAR PENGAWASAN EKSTREM</h2>
                  <p className="text-xs text-slate-500">
                    Akun yang tercurigai melakukan tindak korupsi diprioritaskan statusnya sebagai 'Dalam Pengawasan'. Kumpulan alert terkirim ke admin terekam di bawah.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-rose-50 text-rose-700 font-semibold text-xs py-2 px-3 border border-rose-100 rounded-lg">
                  <Bell className="w-4 h-4 text-rose-600 animate-bounce" />
                  <span>Sistem Otomatis Terhubung Admin Utama</span>
                </div>
              </div>

              {/* LIST OF SUPERVISED ACCOUNTS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="monitoring-split-layout">
                
                {/* ACCOUNT PROFILE LIST UNDER MONITORING STATEMENT (2 COLS) */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-red-600" />
                    <span>Akun Dalam Status 'Dalam Pengawasan'</span>
                  </h3>

                  {analysis && analysis.anomalies.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analysis.anomalies.map((anom) => {
                        const originalTx = transactions.find(t => t.id_transaksi === anom.id_transaksi);
                        return (
                          <div
                            key={anom.id_transaksi}
                            className="bg-white rounded-xl border border-rose-150 shadow-sm p-5 hover:shadow transition-shadow relative overflow-hidden border-l-4 border-rose-500"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <span className="font-mono text-xs font-black text-rose-700 px-2 py-0.5 bg-rose-50 rounded">
                                {anom.id_akun}
                              </span>
                              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded text-white ${
                                anom.tingkat_kecurigaan === "Tinggi" ? "bg-red-600" : "bg-amber-500"
                              }`}>
                                {anom.tingkat_kecurigaan} RISK
                              </span>
                            </div>

                            <div className="space-y-2 text-xs">
                              <p className="text-slate-500">
                                Transaksi: <span className="font-mono font-bold text-slate-700">{anom.id_transaksi}</span>
                              </p>
                              <p className="font-bold text-slate-800 italic">
                                "{originalTx ? originalTx.deskripsi : 'Pengadaan'}"
                              </p>
                              
                              <div className="p-2.5 bg-slate-50 rounded border border-slate-150 mt-2">
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Analisis Forensik AI:</span>
                                <p className="text-[11px] text-slate-700 leading-normal mt-0.5">
                                  {anom.alasan_harga_pasar}
                                </p>
                              </div>
                              
                              <p className="text-[11px] text-slate-600 leading-normal">
                                <span className="font-bold text-slate-700 block mt-2 text-[10px] uppercase tracking-wide">Langkah Audit Direkomandasikan:</span>
                                {anom.rekomendasi_audit}
                              </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[11px]">
                              <div>
                                <span className="text-slate-400">Total Nominal:</span>
                                <span className="font-mono font-bold ml-1 text-slate-800">Rp {anom.nominal.toLocaleString("id-ID")}</span>
                              </div>
                              <span className="text-red-600 font-bold uppercase tracking-wider text-[9px] bg-red-100/50 px-1.5 py-0.5 rounded">
                                Status: {anom.status_akun}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white p-10 text-center rounded-xl border border-slate-200 italic text-slate-400">
                      Sistem belum mendeteksi adanya kasus korupsi ataupun markup yang menempatkan akun tertentu 'Dalam Pengawasan'. Semua transaksi tampak aman.
                    </div>
                  )}
                </div>

                {/* NOTIFICATIONS LOG FEED SENT TO SYSTEM ADMIN PANEL (1 COL) */}
                <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 mb-4 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2">
                        <Bell className="w-4 h-4 text-indigo-600" />
                        <span>Notifikasi Terkirim (Admin)</span>
                      </span>
                      <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {notifications.filter(n => !n.resolved).length} Baru
                      </span>
                    </h3>

                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-10">
                          Belum ada log notifikasi sistem yang terkirim.
                        </p>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3 rounded-lg border text-xs relative transition-all ${
                              notif.resolved 
                                ? "bg-slate-50 border-slate-200 opacity-60" 
                                : notif.type === "danger" 
                                  ? "bg-rose-50 border-rose-150 text-rose-950" 
                                  : "bg-amber-50 border-amber-150 text-amber-950"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-1 text-[9px] font-semibold">
                              <span className="font-mono text-slate-400">{notif.timestamp}</span>
                              {!notif.resolved && (
                                <span className="bg-rose-500 w-2 h-2 rounded-full absolute top-2 right-2 animate-ping"></span>
                              )}
                            </div>
                            
                            <p className={`text-[11px] leading-relaxed ${notif.resolved ? "line-through text-slate-400" : ""}`}>
                              {notif.message}
                            </p>

                            <div className="mt-2.5 pt-2 border-t border-slate-200/50 flex justify-between items-center">
                              <span className="font-mono text-[9px] bg-slate-200/50 px-1.5 py-0.5 rounded text-slate-600">
                                Akun: {notif.id_akun}
                              </span>
                              
                              {!notif.resolved ? (
                                <button
                                  onClick={() => handleResolveNotif(notif.id)}
                                  className="text-[9px] bg-slate-800 hover:bg-indigo-600 text-white font-bold px-2 py-0.5 rounded flex items-center gap-0.5"
                                >
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Tandai Selesai</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-green-600 font-bold inline-flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Tuntas</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-center font-medium leading-normal">
                    Setiap alert anomali otomatis dikirim menggunakan webhook administratif untuk tindakan cepat tanggap darurat internal AUDIT.
                  </div>
                </div>

              </div>
              
            </div>
          )}

          {/* TAB 4: LAPORAN BERKALA AUDIT INTERNAL */}
          {activeTab === "reports" && (
            <div className="flex flex-col gap-6">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">LAPORAN BERKALA INTERNAL</h2>
                  <p className="text-xs text-slate-500">
                    Otorisasi naskah pelaporan anomali keuangan komprehensif yang siap dinilai oleh dewan direksi atau komite pengawas eksternal.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!analysis?.laporan_berkala) return;
                      const rep = analysis.laporan_berkala;
                      const textReport = `
=== ${rep.judul} ===
Tanggal: ${rep.tanggal}

1. PENDAHULUAN
${rep.pembukaan}

2. TEMUAN ANOMALI UTAMA
${rep.temuan_utama.join("\n")}

3. ANALISIS DISTRIBUSI ANOMALI
${rep.analisis_distribusi}

4. REKOMENDASI PREVENTIF STRATEGIS
${rep.rekomendasi_strategis.join("\n")}

5. TINGKAT LANJUT HUKUM & AUDIT FISIK DEPARTEMEN
${rep.langkah_lanjut.join("\n")}

Dibuat otomatis oleh Sentinel Analytics Corporate Governance System via Gemini AI.
`;
                      navigator.clipboard.writeText(textReport);
                      alert("Teks laporan berhasil disalin (Copy) ke clipboard Anda.");
                    }}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg shadow"
                  >
                    <Download className="w-4 h-4" />
                    <span>Salin Laporan Text</span>
                  </button>
                  
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg"
                  >
                    <span>Cetak PDF Laporan</span>
                  </button>
                </div>
              </div>

              {/* REPORT EXCLUSIVE DOCUMENT PREVIEW */}
              {analysis && analysis.laporan_berkala ? (
                <div className="bg-white rounded-xl border border-slate-300 shadow-lg p-8 max-w-4xl mx-auto text-slate-900 leading-relaxed font-serif" id="audit-report-document">
                  
                  {/* CORPORATE DOCUMENT MASTER HEADER */}
                  <div className="text-center border-b-4 border-slate-800 pb-6 mb-8 text-sans font-sans">
                    <h1 className="text-2xl font-black tracking-tight text-slate-800">SENTINEL INTERNAL FINANCIAL REGULATOR</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Audit Keuangan Daerah dan Investigasi Forensik Indonesia</p>
                    <div className="flex justify-between items-center text-xs mt-6 text-slate-500 border-t border-slate-100 pt-3">
                      <span>Status Dokumen: <strong className="text-red-600">RAHASIA / SANGAT PENTING</strong></span>
                      <span>Tanggal Output: <strong>{analysis.laporan_berkala.tanggal}</strong></span>
                    </div>
                  </div>

                  {/* TITLE */}
                  <div className="mb-6 font-sans">
                    <h2 className="text-lg font-black text-slate-800 text-center tracking-wide uppercase leading-normal">
                      {analysis.laporan_berkala.judul}
                    </h2>
                  </div>

                  {/* SECTIONS */}
                  <div className="space-y-6 text-sm">
                    
                    {/* SECTION 1: PENDAHULUAN */}
                    <div>
                      <h4 className="font-bold text-slate-800 font-sans border-b border-slate-200 pb-1 mb-2 uppercase tracking-wide text-xs">
                        I. PENDAHULUAN & AMANAT PENYASARAN
                      </h4>
                      <p className="indent-8 text-justify">
                        {analysis.laporan_berkala.pembukaan}
                      </p>
                    </div>

                    {/* SECTION 2: TEMUAN EXTREM */}
                    <div>
                      <h4 className="font-bold text-slate-800 font-sans border-b border-slate-200 pb-1 mb-2 uppercase tracking-wide text-xs">
                        II. HASIL IDENTIFIKASI TEMUAN ANOMALI UTAMA
                      </h4>
                      <p className="mb-2">
                        Berdasarkan saringan perbandingan harga pasar waktu nyata digital (real-time market cross-check) serta deviasi historis bulanan, auditor mendeteksi anomali kritis berikut:
                      </p>
                      <ul className="list-disc pl-5 space-y-1.5 text-justify">
                        {analysis.laporan_berkala.temuan_utama.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>

                    {/* SECTION 3: ANALISIS DISTRIBUSI */}
                    <div>
                      <h4 className="font-bold text-slate-800 font-sans border-b border-slate-200 pb-1 mb-2 uppercase tracking-wide text-xs">
                        III. ANALISIS GEOGRAFIS DAN URGENSI DISTRIBUSI
                      </h4>
                      <p className="text-justify">
                        {analysis.laporan_berkala.analisis_distribusi}
                      </p>
                    </div>

                    {/* SECTION 4: REKOMENDASI STRATEGIS */}
                    <div>
                      <h4 className="font-bold text-slate-800 font-sans border-b border-slate-200 pb-1 mb-2 uppercase tracking-wide text-xs">
                        IV. REKOMENDASI PREVENTIF JANGKA PANJANG (BIRO PATUH)
                      </h4>
                      <p className="mb-2">
                        Guna mereduksi risiko pengulangan markup anggaran pada masa mendatang, dewan direksi direkomendasikan mengimplementasikan langkah mitigasi:
                      </p>
                      <ul className="list-decimal pl-5 space-y-1.5 text-justify">
                        {analysis.laporan_berkala.rekomendasi_strategis.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>

                    {/* SECTION 5: LANGKAH LANJUT */}
                    <div>
                      <h4 className="font-bold text-slate-800 font-sans border-b border-slate-200 pb-1 mb-2 uppercase tracking-wide text-xs">
                        V. TINDAKAN HUKUM DAN INVESTIGASI LAPANGAN SEGERA
                      </h4>
                      <p className="mb-2">
                        Audit menyarankan agar pimpinan korporat segera mendelegasikan perintah berikut dalam kurun waktu 3x24 jam:
                      </p>
                      <ol className="list-decimal pl-5 space-y-1.5 text-justify">
                        {analysis.laporan_berkala.langkah_lanjut.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>

                  </div>

                  {/* SIGNATURE BLOCK */}
                  <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 text-xs font-sans">
                    <div className="text-center">
                      <p className="text-slate-400">Verifikator Kepatuhan Sistem:</p>
                      <div className="h-16 flex items-center justify-center">
                        <span className="font-serif italic font-bold text-indigo-600 block transform rotate-3 text-sm">
                          Sentinel Analytics AI Engine
                        </span>
                      </div>
                      <p className="font-bold text-slate-700">Sentinel Bot Inspector</p>
                      <p className="text-slate-400">Kode Cert: AI-FRACT-9921</p>
                    </div>

                    <div className="text-center border-l border-slate-200">
                      <p className="text-slate-400">Auditor Forensik Finansial Senior:</p>
                      <div className="h-16 flex items-center justify-center text-slate-400">
                        <span className="text-[10px] italic">Tanda Tangan Elektronik Tersemat</span>
                      </div>
                      <p className="font-bold text-slate-700">{localStorage.getItem("sentinel_user_name") || "Alimaskan Ferry, CFE"}</p>
                      <p className="text-slate-400">NIP: 19830612 201103 1 002</p>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-white p-10 text-center rounded-xl border border-slate-200 italic text-slate-400">
                  Pelaporan Audit belum siap. Silakan klik tombol 'Jalankan Audit AI' di header bagian atas untuk melengkapi laporan berkala internal secara rapi.
                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/* ALERT BOTTOM BAR FOOTER (NOTIFIKASI AKTIF PADA SYSTEM ACCOUNTS) */}
      <footer className="h-10 bg-slate-900 border-t border-slate-800 px-6 flex items-center text-white text-[11px] tracking-wide shrink-0 font-sans justify-between text-slate-300" id="sentinel-footer">
        <div className="flex items-center">
          <span className="font-black text-rose-500 animate-pulse uppercase flex items-center gap-1 mr-3 shrink-0">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>ALARM UTAMA:</span>
          </span>
          <div className="truncate text-slate-300 max-w-[280px] sm:max-w-[480px] md:max-w-[700px] italic">
            {notifications.length > 0 ? (
              <span>Notifikasi Aktif pada akun <strong className="font-mono text-white text-xs bg-red-950 px-1.5 py-0.5 rounded border border-red-800">{notifications[0].id_akun}</strong>: "{notifications[0].message}"</span>
            ) : (
              <span>Sistem dalam kondisi kondusif. Tidak ada anomali korupsi aktif sejauh ini.</span>
            )}
          </div>
        </div>
        <span className="ml-auto opacity-50 shrink-0 hidden sm:inline">
          Koneksi Sinkronisasi Aman @ AI Studio
        </span>
      </footer>

      {/* MODAL WINDOW FOR ADDING NEW manual transaction FOR EASIER SANDBOX PLAYGROUND */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 text-xs text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-1.5">
                <Plus className="w-5 h-5 text-indigo-600" />
                <span>Pendaftaran Transaksi Manual</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded bg-slate-100 hover:bg-slate-250 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTransactionSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-1">ID Akun</label>
                  <input
                    type="text"
                    value={newTx.id_akun}
                    onChange={(e) => setNewTx({ ...newTx, id_akun: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-mono focus:outline-none focus:bg-white"
                    placeholder="ACC-DIV-UMUM"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-1">Tanggal</label>
                  <input
                    type="text"
                    value={newTx.tanggal}
                    onChange={(e) => setNewTx({ ...newTx, tanggal: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:outline-none text-slate-600"
                    placeholder="DD-MM-YYYY"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-1">Jenis Aliran</label>
                  <select
                    value={newTx.jenis_transaksi}
                    onChange={(e: any) => setNewTx({ ...newTx, jenis_transaksi: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:outline-none"
                  >
                    <option value="keluar">KELUAR (Pengadaan / Belanja)</option>
                    <option value="masuk">MASUK (Anggaran / Jasa)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-1">Nominal (Rupiah)</label>
                  <input
                    type="number"
                    value={newTx.nominal}
                    onChange={(e) => setNewTx({ ...newTx, nominal: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-mono focus:outline-none text-slate-900 font-bold"
                    placeholder="Contoh: 145000000"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px] mb-1">Deskripsi & Kuantitas Barang/Jasa</label>
                <input
                  type="text"
                  value={newTx.deskripsi}
                  onChange={(e) => setNewTx({ ...newTx, deskripsi: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg focus:outline-none italic"
                  placeholder="Pembelian 5 unit Laptop Admin (Core i3, SSD 256)"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Coba tuliskan deskripsi barang dengan harga sengaja ditinggikan (misal: nasi kotak Rp 1.5 juta per porsi) untuk menguji kecerdasan audit pendeteksi korupsi AI.
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-4 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md"
                >
                  Daftarkan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL PAGE LOADER BLOCK DURING ENGINE ANALYSIS */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center z-50 p-6 text-white text-center">
          <div className="relative w-24 h-24 flex items-center justify-center mb-6">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <ShieldAlert className="w-7 h-7 text-indigo-400 absolute animate-pulse" />
          </div>

          <h3 className="text-lg font-black tracking-tight text-white mb-2 uppercase">
            SENTINEL ENGINE SECURE SCANNING
          </h3>
          <p className="text-xs text-indigo-300 font-mono tracking-widest uppercase mb-6 animate-pulse">
            {loadingMessages[loadingStep]}
          </p>

          <div className="w-64 bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
            <div
              className="bg-indigo-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${((loadingStep + 1) / loadingMessages.length) * 100}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-slate-400">Sedang menghubungi Google Gemini - Harap tunggu beberapa menter</span>
        </div>
      )}

    </div>
  );
}
