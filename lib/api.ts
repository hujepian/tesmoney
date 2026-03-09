import { createClient } from "@/lib/supabase/client";

export type Transaction = {
  id: string;
  user_id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  date: string;
  source: string; // Keeping for backward compatibility or display
  wallet_id?: string; // New field
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

const supabase = createClient();

export const api = {
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
};
