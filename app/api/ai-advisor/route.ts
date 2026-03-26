// app/api/ai-advisor/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

// ── Inisialisasi DeepSeek Client (Native) ─────────────────────────────────
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",  // Endpoint resmi DeepSeek
});

// ── Helper Functions ───────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

async function sendWithRetry(messages: any[], maxRetries = 3): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await deepseek.chat.completions.create({
        model: "deepseek-chat",  // Gunakan deepseek-chat (V3.2)
        messages: messages,
        temperature: 0.7,
        max_tokens: 1500,
      });

      return response.choices[0].message.content || "";
    } catch (error: any) {
      // Rate limit (429) - lakukan retry dengan exponential backoff
      const is429 = error?.status === 429 || error?.message?.includes("429");
      // Insufficient balance (402) - jangan retry, langsung lempar error
      const is402 = error?.status === 402 || error?.message?.includes("402");
      
      if (is429 && attempt < maxRetries) {
        const waitTime = Math.min(2 ** attempt * 1000, 10000); // 2s, 4s, 8s, max 10s
        console.warn(`[Maya] Rate limit. Retry ${attempt} dalam ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }
      
      if (is402) {
        throw new Error("INSUFFICIENT_BALANCE");
      }
      
      throw error;
    }
  }
  throw new Error("Gagal mendapatkan respon setelah beberapa kali mencoba.");
}

// ── POST Handler ──────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, financialData, userId } = body;

    // VALIDASI UUID
    if (userId !== undefined && userId !== null) {
      if (!isValidUUID(userId)) {
        return NextResponse.json(
          { error: "Format ID pengguna tidak valid (bukan UUID)." },
          { status: 400 }
        );
      }
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Pesan tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      console.error("DEEPSEEK_API_KEY is not configured");
      return NextResponse.json(
        { error: "AI service not configured. Please contact administrator." },
        { status: 500 }
      );
    }

    // ── Data Keuangan ──────────────────────────────────────────────────────
    const balance = financialData?.balance ?? 0;
    const savingsRate = financialData?.savingsRate ?? 0;
    const categorySummary = financialData?.expenseByCategory
      ? JSON.stringify(financialData.expenseByCategory, null, 2)
      : "Belum ada data";
    const budgetSummary = financialData?.budgets
      ? financialData.budgets
          .map(
            (b: any) =>
              `${b.category}: Rp${b.limit.toLocaleString("id-ID")} (Terpakai: ${b.percentage}%) ${
                b.isOver ? "⚠️ BOCOR" : "✓"
              }`
          )
          .join("\n")
      : "Belum ada budget";

    // ── System Prompt ────────────────────────────────────────────────────────
    const systemPrompt = `Kamu adalah Maya, asisten keuangan pribadi yang ramah dan profesional. 

DATA KEUANGAN USER SAAT INI:
- Saldo: Rp${balance.toLocaleString("id-ID")}
- Rasio Tabungan: ${savingsRate.toFixed(1)}%
- Detail Pengeluaran per Kategori:
${Object.entries(financialData?.expenseByCategory || {})
  .map(([cat, amt]) => `  • ${cat}: Rp${(amt as number).toLocaleString("id-ID")}`)
  .join("\n") || "  • Belum ada data pengeluaran"}

- Status Budget:
${budgetSummary || "  • Belum ada budget yang diset"}

PETUNJUK:
1. Gunakan bahasa Indonesia yang santai namun informatif
2. Berikan analisis singkat dan actionable
3. Jika ada budget yang bocor, berikan solusi konkret
4. Gunakan emoji yang relevan (🍱 untuk makanan, ☕ untuk cafe, 🛍️ untuk belanja)
5. Maksimal 3-4 paragraf
6. Fokus pada insight yang paling penting

Ingat, kamu adalah asisten yang membantu user mencapai kebebasan finansial! 💪`;

    // ── History Chat ────────────────────────────────────────────────────────
    const validMessages = messages.filter(
      (m: any) => m.content && m.content.trim() !== ""
    );

    if (validMessages.length === 0) {
      return NextResponse.json(
        { error: "Semua pesan kosong, tidak ada yang bisa diproses." },
        { status: 400 }
      );
    }

    const lastMessage = validMessages[validMessages.length - 1];
    const userMessage = lastMessage.content.trim();

    if (!userMessage) {
      return NextResponse.json(
        { error: "Isi pesan tidak valid." },
        { status: 400 }
      );
    }

    const chatHistory = [
      { role: "system", content: systemPrompt },
      ...validMessages.slice(0, -1).map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content.slice(0, 2000),
      })),
    ];

    // ── Jalankan Chat ────────────────────────────────────────────────────────
    const text = await sendWithRetry([...chatHistory, { role: "user", content: userMessage }]);

    return new NextResponse(text);

  } catch (error: any) {
    console.error("[Maya] Error Detail:", error);

    // Error 402: Insufficient Balance (khusus untuk DeepSeek native)
    if (error?.message === "INSUFFICIENT_BALANCE" || error?.status === 402) {
      return NextResponse.json(
        {
          error: "💰 Saldo DeepSeek habis. Silakan top up di platform.deepseek.com untuk melanjutkan penggunaan AI.",
          code: "INSUFFICIENT_BALANCE"
        },
        { status: 402 }
      );
    }

    // Error 429: Rate Limit
    if (error?.status === 429 || error?.message?.includes("429")) {
      return NextResponse.json(
        {
          error: "⏳ Terlalu banyak permintaan. Silakan coba lagi dalam beberapa detik.",
        },
        { status: 429 }
      );
    }

    // Error 401: Invalid API Key
    if (error?.status === 401 || error?.message?.includes("API key")) {
      return NextResponse.json(
        {
          error: "🔑 API Key DeepSeek tidak valid. Silakan cek DEEPSEEK_API_KEY di .env.local",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan pada server Maya." },
      { status: error?.status || 500 }
    );
  }
}