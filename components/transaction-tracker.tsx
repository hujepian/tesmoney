"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trash2,
  Plus,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from "lucide-react";
import { api, type Transaction, type Wallet as WalletType } from "@/lib/api";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface TransactionTrackerProps {
  currentUser: string;
}

const EXPENSE_CATEGORIES = [
   "Makanan",
  "Bensin",
  "Hiburan",
  "service motor",
  "fashion",
  "Belanja",
  "buku",
  "pinjol",
  "loundry",
  "langganan",
  "pulsa data",
  "rokok",
  "kopi",
  "e-wallet",
];

const INCOME_CATEGORIES = [
  "Gaji",
  "Freelance",
  "Investasi",
  "Hadiah",
  "Lainnya",
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper to format input value with dots
const formatInputCurrency = (value: string) => {
  const number = value.replace(/\D/g, "");
  return new Intl.NumberFormat("id-ID").format(Number(number) || 0);
};

// Helper to parse formatted input back to number
const parseInputCurrency = (value: string) => {
  return Number(value.replace(/\./g, ""));
};

export function TransactionTracker({ currentUser }: TransactionTrackerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: "expense" as "income" | "expense",
    amount: "", // Now stores formatted string
    category: EXPENSE_CATEGORIES[0],
    description: "",
    wallet_id: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [transactionsData, walletsData] = await Promise.all([
        api.transactions.list(),
        api.wallets.list(),
      ]);

      setTransactions(transactionsData.reverse());
      setWallets(walletsData);

      if (walletsData.length > 0) {
        setFormData((prev) => ({ ...prev, wallet_id: walletsData[0].id }));
      }
    } catch (error) {
      toast.error("Gagal memuat data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const categories =
    formData.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string to reset
    if (value === "") {
      setFormData({ ...formData, amount: "" });
      return;
    }
    const formatted = formatInputCurrency(value);
    setFormData({ ...formData, amount: formatted });
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description || !formData.wallet_id) {
      if (!formData.wallet_id)
        toast.error("Pilih dompet dulu (buat di menu Dompet jika belum ada)");
      return;
    }

    setSubmitting(true);
    try {
      // Find wallet name for backward compatibility
      const selectedWallet = wallets.find((w) => w.id === formData.wallet_id);
      const numericAmount = parseInputCurrency(formData.amount);

      const newTransaction = await api.transactions.add({
        type: formData.type,
        amount: numericAmount,
        category: formData.category,
        description: formData.description,
        date: formData.date,
        source: selectedWallet ? selectedWallet.name : "Unknown", // Backward compatibility
        wallet_id: formData.wallet_id,
      });

      setTransactions([newTransaction, ...transactions]);
      setFormData({
        type: "expense",
        amount: "",
        category: EXPENSE_CATEGORIES[0],
        description: "",
        wallet_id: wallets.length > 0 ? wallets[0].id : "",
        date: new Date().toISOString().split("T")[0],
      });
      toast.success("Transaksi berhasil ditambahkan");
    } catch (error) {
      toast.error("Gagal menambah transaksi");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.transactions.delete(id);
      setTransactions(transactions.filter((t) => t.id !== id));
      toast.success("Transaksi dihapus");
    } catch (error) {
      toast.error("Gagal menghapus transaksi");
      console.error(error);
    }
  };

  return (
    <div className="p-8 ml-64 bg-background min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Transaksi</h1>
          <p className="text-muted-foreground mt-1">
            Dicatat, biar gak boncos.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <Card className="p-6 border-border/60">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Input Transaksi
            </h2>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="flex gap-2 p-1 bg-secondary rounded-lg">
                <label
                  className={`flex-1 flex items-center justify-center gap-2 cursor-pointer py-2 rounded-md text-sm font-medium transition-colors ${
                    formData.type === "expense"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    value="expense"
                    className="hidden"
                    checked={formData.type === "expense"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as "expense" | "income",
                        category: EXPENSE_CATEGORIES[0],
                      })
                    }
                  />
                  <span>Pengeluaran</span>
                </label>
                <label
                  className={`flex-1 flex items-center justify-center gap-2 cursor-pointer py-2 rounded-md text-sm font-medium transition-colors ${
                    formData.type === "income"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    value="income"
                    className="hidden"
                    checked={formData.type === "income"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as "expense" | "income",
                        category: INCOME_CATEGORIES[0],
                      })
                    }
                  />
                  <span>Pemasukan</span>
                </label>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  Jumlah (Rp)
                </label>
                <Input
                  type="text"
                  placeholder="0"
                  value={formData.amount}
                  onChange={handleAmountChange}
                  className="mt-2 bg-background"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  Kategori
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full mt-2 px-3 py-2 rounded-md border border-input bg-background text-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  Dompet
                </label>
                {wallets.length === 0 ? (
                  <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-md text-sm text-rose-600">
                    Belum ada dompet. Silakan buat di menu Dompet dahulu.
                  </div>
                ) : (
                  <select
                    value={formData.wallet_id}
                    onChange={(e) =>
                      setFormData({ ...formData, wallet_id: e.target.value })
                    }
                    className="w-full mt-2 px-3 py-2 rounded-md border border-input bg-background text-sm"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  Keterangan
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: Beli groceries"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  className="mt-2 bg-background"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  Tanggal
                </label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="mt-2 bg-background"
                />
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={submitting || wallets.length === 0}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Tambah
              </Button>
            </form>
          </Card>

          {/* List */}
          <Card className="lg:col-span-2 p-6 border-border/60">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Riwayat ({transactions.length})
            </h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-muted rounded-xl bg-secondary/30">
                  <p className="text-muted-foreground">Belum ada transaksi</p>
                </div>
              ) : (
                transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border border-border/50 rounded-xl hover:bg-muted/30 transition-colors bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.type === "income"
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-rose-100 text-rose-600"
                        }`}
                      >
                        {transaction.type === "income" ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {transaction.description}
                        </p>
                        <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="bg-secondary px-2 py-0.5 rounded-full">
                            {transaction.category}
                          </span>
                          <span className="bg-secondary px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Wallet className="w-3 h-3" />
                            {transaction.source}
                          </span>
                          <span className="py-0.5">
                            {formatDate(transaction.date, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div
                        className={`font-bold ${
                          transaction.type === "income"
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"}{" "}
                        {formatCurrency(transaction.amount)}
                      </div>
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
