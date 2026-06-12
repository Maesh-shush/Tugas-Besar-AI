import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Express
const app = express();
const PORT = 3000;

// Middleware for parsing JSON
app.use(express.json({ limit: "10mb" }));

// Initialize GoogleGenAI client (safe lazy lookup in request, but global instance created here)
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Endpoint to analyze transactions
app.post("/api/analyze", async (req, res) => {
  try {
    const { transactions } = req.body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Data transaksi tidak valid atau kosong.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY belum dikonfigurasi di secrets/lingkungan server.",
      });
    }

    // Call Gemini API and request structured JSON output
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          text: `Anda adalah Auditor Finansial Forensik Senior di Indonesia yang ditugaskan untuk mendeteksi tindak pidana korupsi, pencucian uang, dan penggelembungan dana (mark-up harga) pada pengadaan barang/jasa atau keuangan instansi/perusahaan.

Analisis daftar transaksi berikut dan deteksi anomali berdasarkan dua aspek kritikal:
1. **Pola Tidak Lazim & Perbandingan Historis**: Bandingkan nominal transaksi keluar dengan rentang pengeluaran historis umum (misalnya ATK bulanan ratusan juta, makan minum rapat puluhan juta padahal porsi sedikit - ini tidak wajar).
2. **Penggelembungan Dana (Markup) vs Estimasi Harga Pasar Realtime**: Tinjau deskripsi barang/jasa. Evaluasi apakah harganya masuk akal sesuai pasar saat ini di Indonesia. Jika nominal berkali-kali lipat dari harga wajar (contoh: membeli laptop admin Intel Core i3 senilai Rp 35 juta padahal harga pasar wajar Rp 6-8 juta, atau nasi kotak Rp 1.7 juta/porsi), tandai transaksi tersebut sebagai tindak korupsi (penggelembungan dana).

Setiap transaksi/akun yang dicurigai melakukan korupsi (rekomendasi penandaan status 'Dalam Pengawasan') harus dicantumkan di list 'anomalies' dengan detail analisis, estimasi harga pasar wajar, text auto-notifikasi untuk admin, dan rekomendasi audit komprehensif.

Berikut data transaksi keuangan dalam bentuk JSON:
${JSON.stringify(transactions, null, 2)}
`
        }
      ],
      config: {
        systemInstruction: "Anda adalah sistem audit deteksi korupsi internal berbasis kecerdasan buatan. Selalu analisa data dengan teliti, objektif, dan keluarkan visualisasi data dalam bentuk JSON terstruktur sesuai format skema yang diminta.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallRiskScore: {
              type: Type.INTEGER,
              description: "Skor risiko akumulasi tindak korupsi dari keseluruhan data, nilai 0 sampai 100."
            },
            executiveSummary: {
              type: Type.STRING,
              description: "Ringkasan eksekutif singkat berbahasa Indonesia mengenai kondisi keseluruhan transaksi."
            },
            anomalies: {
              type: Type.ARRAY,
              description: "Daftar transaksi yang terdeteksi mencurigakan/indikasi korupsi/markup tinggi.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id_transaksi: {
                    type: Type.STRING,
                    description: "ID Transaksi yang bermasalah."
                  },
                  id_akun: {
                    type: Type.STRING,
                    description: "ID Akun yang dicurigai."
                  },
                  nominal: {
                    type: Type.NUMBER,
                    description: "Nominal pengeluaran transaksi."
                  },
                  tingkat_kecurigaan: {
                    type: Type.STRING,
                    description: "Tingkat ancaman: 'Tinggi', 'Sedang', atau 'Rendah'."
                  },
                  alasan_historis: {
                    type: Type.STRING,
                    description: "Analisis perbandingan pola historis pengeluaran sejenis yang tidak lazim."
                  },
                  alasan_harga_pasar: {
                    type: Type.STRING,
                    description: "Deteksi penggelembungan dana dengan membandingkan deskripsi barang/jasa dengan harga pasar wajar saat ini di Indonesia."
                  },
                  estimasi_harga_pasar_wajar: {
                    type: Type.NUMBER,
                    description: "Estimasi harga pasar wajar per unit/total transaksi tersebut dalam Rupiah."
                  },
                  status_akun: {
                    type: Type.STRING,
                    description: "Pasti bernilai 'Dalam Pengawasan'."
                  },
                  admin_notifikasi: {
                    type: Type.STRING,
                    description: "Pesan notifikasi otomatis yang sangat mendesak untuk dikirim ke Admin Sistem (contoh: Peringatan! Akun [id_akun] terdeteksi markup harga pada [deskripsi])."
                  },
                  rekomendasi_audit: {
                    type: Type.STRING,
                    description: "Saran tindakan audit forensik internal terperinci untuk membuktikan korupsi."
                  }
                },
                required: [
                  "id_transaksi",
                  "id_akun",
                  "nominal",
                  "tingkat_kecurigaan",
                  "alasan_historis",
                  "alasan_harga_pasar",
                  "estimasi_harga_pasar_wajar",
                  "status_akun",
                  "admin_notifikasi",
                  "rekomendasi_audit"
                ]
              }
            },
            laporan_berkala: {
              type: Type.OBJECT,
              description: "Laporan audit internal berkala yang komprehensif bagi audit internal.",
              properties: {
                judul: { type: Type.STRING, description: "Judul laporan audit resmi." },
                tanggal: { type: Type.STRING, description: "Tanggal pembuatan laporan." },
                pembukaan: { type: Type.STRING, description: "Paragraf pembuka laporan audit berkala." },
                temuan_utama: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Poin-poin temuan anomali dan kecurigaan korupsi yang signifikan."
                },
                analisis_distribusi: {
                  type: Type.STRING,
                  description: "Penjelasan naratif mengenai sebaran dana keluar mencurigakan pada jenis/pos transaksi."
                },
                rekomendasi_strategis: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Rekomendasi preventif bagi manajemen puncak untuk jangka panjang."
                },
                langkah_lanjut: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Tindakan hukum atau pemeriksaan investigatif lapangan yang direkomendasikan segera."
                }
              },
              required: [
                "judul",
                "tanggal",
                "pembukaan",
                "temuan_utama",
                "analisis_distribusi",
                "rekomendasi_strategis",
                "langkah_lanjut"
              ]
            }
          },
          required: [
            "overallRiskScore",
            "executiveSummary",
            "anomalies",
            "laporan_berkala"
          ]
        }
      }
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText);

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("Error analyzing transactions via Gemini:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Gagal melakukan analisis data transaksi.",
    });
  }
});

// Setup Vite Dev server or Production static serving
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite middleware for development...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Setting up static file serving for production...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

setupServer();
