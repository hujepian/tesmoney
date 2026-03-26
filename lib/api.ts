import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────
export type Transaction = {
  id: string;
  user_id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: string;
  source: string;
  wallet_id?: string;
  created_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  category: string;
  limit_amount: number;
  created_at: string;
};

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  created_at: string;
};

export type Wallet = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  initial_balance: number;
  color: string;
  created_at: string;
};

// ✅ Tipe untuk chat messages — conversation_id wajib ada (NOT NULL di DB)
export type ChatMessage = {
  id?: string;
  role: string;
  content: string;
  user_id: string;
  conversation_id: string;
  created_at?: string;
};

// ✅ Tipe untuk conversation
export type Conversation = {
  id: string;
  user_id: string;
  created_at: string;
};

const supabase = createClient();

export const api = {
  // ── Transactions ────────────────────────────────────────────────────────────
  transactions: {
    list: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    },
    add: async (
      transaction: Omit<Transaction, "id" | "user_id" | "created_at">
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("transactions")
        .insert([{ ...transaction, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      return data as Transaction;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
  },

  // ── Budgets ─────────────────────────────────────────────────────────────────
  budgets: {
    list: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Budget[];
    },
    add: async (budget: Omit<Budget, "id" | "user_id" | "created_at">) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("budgets")
        .insert([{ ...budget, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      return data as Budget;
    },
    updateLimit: async (id: string, limit_amount: number) => {
      const { error } = await supabase
        .from("budgets")
        .update({ limit_amount })
        .eq("id", id);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
    },
  },

  // ── Goals ───────────────────────────────────────────────────────────────────
  goals: {
    list: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Goal[];
    },
    add: async (
      goal: Omit<Goal, "id" | "user_id" | "created_at" | "current_amount">
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("goals")
        .insert([{ ...goal, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      return data as Goal;
    },
    updateAmount: async (id: string, current_amount: number) => {
      const { error } = await supabase
        .from("goals")
        .update({ current_amount })
        .eq("id", id);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
  },

  // ── Wallets ─────────────────────────────────────────────────────────────────
  wallets: {
    list: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Wallet[];
    },
    add: async (wallet: Omit<Wallet, "id" | "user_id" | "created_at">) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("wallets")
        .insert([{ ...wallet, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      return data as Wallet;
    },
    update: async (id: string, updates: Partial<Wallet>) => {
      const { error } = await supabase
        .from("wallets")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from("wallets").delete().eq("id", id);
      if (error) throw error;
    },
  },

  // ── Chat (Maya AI) ──────────────────────────────────────────────────────────
  chat: {
    /**
     * ✅ BARU: Ambil conversation yang sudah ada, atau buat baru jika belum ada.
     * Diperlukan karena kolom conversation_id di ai_chat_messages NOT NULL.
     */
    getOrCreateConversation: async (userId: string) => {
  if (!userId || userId === "null") throw new Error("User ID tidak valid");

  // 1. Coba cari yang sudah ada
  const { data: existing, error: fetchError } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing;

  // 2. Jika tidak ada, buat baru dan langsung ambil hasilnya
  const { data: newConv, error: insertError } = await supabase
    .from("ai_conversations")
    .insert([{ user_id: userId }])
    .select("id")
    .single();

  if (insertError) {
    console.error("Gagal membuat percakapan:", insertError);
    throw insertError;
  }
  return newConv;
},
    /**
     * ✅ DIPERBARUI: getHistory sekarang menerima conversationId opsional.
     * Jika diberikan, hanya ambil pesan dari conversation tersebut.
     */
    getHistory: async (conversationId?: string | null) => {
      let query = supabase
        .from("ai_chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(15); // Hemat token: ambil 15 pesan terakhir saja

      // Filter berdasarkan conversation jika tersedia
      if (conversationId) {
        query = query.eq("conversation_id", conversationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    /**
     * ✅ DIPERBARUI: saveMessage sekarang wajib menyertakan conversation_id.
     * Sesuai NOT NULL constraint di tabel ai_chat_messages.
     */
    saveMessage: async (msg: {
  role: string;
  content: string;
  user_id: string;
  conversation_id: string;
}) => {
  // Validasi tambahan: Jika conversation_id adalah string "null" atau kosong, cegah insert.
  if (!msg.conversation_id || msg.conversation_id === "null") {
    console.error("❌ Terdeteksi attempt insert dengan UUID invalid:", msg.conversation_id);
    throw new Error("Conversation ID tidak valid (null string)");
  }

  const { data, error } = await supabase
    .from("ai_chat_messages")
    .insert([msg])
    .select(); // Tambahkan select untuk melihat hasil insert
  
  if (error) throw error;
  return data;
},

    /**
     * Hapus semua history chat.
     * Jika conversationId diberikan, hanya hapus pesan di conversation tersebut.
     */
    clearHistory: async (conversationId?: string | null) => {
      let query = supabase
        .from("ai_chat_messages")
        .delete();

      if (conversationId) {
        // ✅ Hapus hanya pesan di conversation ini (lebih aman)
        query = query.eq("conversation_id", conversationId);
      } else {
        // Fallback: hapus semua (perilaku lama)
        query = query.not("id", "is", null);
      }

      const { error } = await query;
      if (error) throw error;
    },
  },
};