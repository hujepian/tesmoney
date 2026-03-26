"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trash2, Plus, Loader2,
  ArrowUpRight, ArrowDownRight, Wallet,
  ChevronDown, ChevronUp, Shield, Sparkles,
  AlertTriangle, CheckCircle2
} from "lucide-react";
import { api, type Transaction, type Wallet as WalletType } from "@/lib/api";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface TransactionTrackerProps {
  currentUser: string;
}

// ── KATEGORI PENGELUARAN (DIPISAH: KEBUTUHAN vs KEINGINAN) ─────────────────
const NEEDS_CATEGORIES = [
  "🍱 Makanan",
  "🏠 Sewa/Kontrakan",
  "⚡ Listrik & Air",
  "⛽ Bensin/Transport",
  "📶 Pulsa & Internet",
  "🛠️ Servis Motor/Mobil",
  "💊 Kesehatan",
  "🧺 Laundry",
  "📚 Pendidikan",
  "🔄 Langganan",
];

const WANTS_CATEGORIES = [
  "☕ Ngopi/Cafe",
  "🚬 Rokok",
  "🛍️ Belanja",
  "🎮 Hiburan",
  "🍔 Jajan/Junk Food",
  "💄 Kosmetik",
  "🎁 Hadiah",
  "✈️ Liburan",
  "📱 Gadget",
  "🏋️ Gym/Hobi",
];

const INCOME_CATEGORIES = ["💰 Gaji", "💼 Freelance", "📈 Investasi", "🎁 Hadiah", "📦 Lainnya"];

// ── Format Rupiah dengan titik sebagai pemisah ribuan ────────────────────────
const formatRupiah = (value: number | string): string => {
  const num = typeof value === "string" ? parseInt(value.replace(/\D/g, "")) || 0 : value;
  return new Intl.NumberFormat("id-ID").format(num);
};

const parseRupiah = (value: string): number => {
  return parseInt(value.replace(/\D/g, "")) || 0;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);

// ── Helper: kelompokkan per bulan ───────────────────────────────────────────
function groupByMonth(transactions: Transaction[]) {
  const map = new Map<string, Transaction[]>();
  transactions.forEach((t) => {
    const key = t.date?.substring(0, 7) ?? "unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  });
  return Array.from(map.entries()).map(([key, items]) => {
    const [year, month] = key.split("-").map(Number);
    const label = new Date(year, month - 1, 1).toLocaleDateString("id-ID", {
      month: "long", year: "numeric",
    });
    const totalIncome = items.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = items.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { label, items, totalIncome, totalExpense };
  });
}

// ── Helper: hitung total kebutuhan dan keinginan ──────────────────────────────
function calculateNeedsVsWants(transactions: Transaction[]) {
  const expenses = transactions.filter(t => t.type === "expense");
  const needs = expenses.filter(t => NEEDS_CATEGORIES.includes(t.category));
  const wants = expenses.filter(t => WANTS_CATEGORIES.includes(t.category));
  const needsTotal = needs.reduce((s, t) => s + t.amount, 0);
  const wantsTotal = wants.reduce((s, t) => s + t.amount, 0);
  const total = needsTotal + wantsTotal;
  const needsPercent = total > 0 ? (needsTotal / total) * 100 : 0;
  const wantsPercent = total > 0 ? (wantsTotal / total) * 100 : 0;
  const isHealthy = wantsPercent <= 30;
  
  return { needsTotal, wantsTotal, total, needsPercent, wantsPercent, isHealthy };
}

export function TransactionTracker({ currentUser }: TransactionTrackerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [activeCategoryGroup, setActiveCategoryGroup] = useState<"needs" | "wants">("needs");
  const [formData, setFormData] = useState({
    type: "expense" as "income" | "expense",
    amount: "",
    category: NEEDS_CATEGORIES[0],
    description: "",
    wallet_id: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [transactionsData, walletsData] = await Promise.all([
        api.transactions.list(),
        api.wallets.list(),
      ]);
      const sorted = [...transactionsData].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setTransactions(sorted);
      setWallets(walletsData);
      if (walletsData.length > 0)
        setFormData((prev) => ({ ...prev, wallet_id: walletsData[0].id }));
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const needsVsWants = calculateNeedsVsWants(transactions);

  const getCategories = () => {
    if (formData.type === "income") return INCOME_CATEGORIES;
    if (activeCategoryGroup === "needs") return NEEDS_CATEGORIES;
    return WANTS_CATEGORIES;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = parseRupiah(rawValue);
    const formattedValue = numericValue === 0 ? "" : formatRupiah(numericValue);
    setFormData({ ...formData, amount: formattedValue });
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount) {
      toast.error("Masukkan jumlah nominal");
      return;
    }
    if (!formData.description) {
      toast.error("Masukkan keterangan");
      return;
    }
    if (!formData.wallet_id) {
      toast.error("Pilih dompet");
      return;
    }
    
    setSubmitting(true);
    try {
      const selectedWallet = wallets.find((w) => w.id === formData.wallet_id);
      const amountValue = parseRupiah(formData.amount);
      
      const newTransaction = await api.transactions.add({
        type: formData.type,
        amount: amountValue,
        category: formData.category,
        description: formData.description,
        date: formData.date,
        source: selectedWallet?.name ?? "Unknown",
        wallet_id: formData.wallet_id,
      });
      
      setTransactions(
        [newTransaction, ...transactions].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      );
      
      setFormData({
        type: "expense",
        amount: "",
        category: NEEDS_CATEGORIES[0],
        description: "",
        wallet_id: wallets[0]?.id ?? "",
        date: new Date().toISOString().split("T")[0],
      });
      
      toast.success("Transaksi berhasil ditambahkan");
      setFormOpen(false);
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Gagal menambah transaksi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.transactions.delete(id);
      setTransactions(transactions.filter((t) => t.id !== id));
      toast.success("Transaksi dihapus");
    } catch {
      toast.error("Gagal menghapus transaksi");
    }
  };

  const getCategoryType = (category: string) => {
    if (NEEDS_CATEGORIES.includes(category)) return "needs";
    if (WANTS_CATEGORIES.includes(category)) return "wants";
    return null;
  };

  return (
    <>
      <style>{`
        .tx-bg {
          background-color: #0d0d1a;
          background-image:
            radial-gradient(ellipse 75% 55% at 8%  2%,  rgba(99, 102,241,0.22) 0%,transparent 58%),
            radial-gradient(ellipse 55% 45% at 90% 8%,  rgba(16, 185,129,0.14) 0%,transparent 55%),
            radial-gradient(ellipse 60% 50% at 50% 98%, rgba(244,63, 94, 0.12) 0%,transparent 58%);
        }
        .glass-card {
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.11);
        }
        .glass-row {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          transition: background .15s;
        }
        .glass-row:hover { background: rgba(255,255,255,0.08); }
        .glass-input {
          background: rgba(255,255,255,0.07) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          color: #fff !important;
        }
        .glass-input::placeholder { color: rgba(255,255,255,0.25); }
        .glass-input:focus { border-color: rgba(99,102,241,0.5) !important; outline: none; }
        .glass-select {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          color: #e2e8f0;
        }
        .glass-select option { background: #1a1f2e; color: #e2e8f0; }
        .glass-toggle-active {
          background: rgba(255,255,255,0.12);
          color: #fff;
        }
        .glass-toggle-inactive { color: rgba(255,255,255,0.35); }
        .glass-toggle-inactive:hover { color: rgba(255,255,255,0.65); }
        .glass-month-divider {
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .glass-empty {
          background: rgba(255,255,255,0.03);
          border: 1px dashed rgba(255,255,255,0.1);
        }
        .glass-btn-primary {
          background: rgba(99,102,241,0.85);
          color: #fff;
          border: 1px solid rgba(99,102,241,0.4);
          transition: background .15s;
        }
        .glass-btn-primary:hover:not(:disabled) { background: rgba(99,102,241,1); }
        .glass-btn-primary:disabled { opacity: .45; cursor: not-allowed; }
        .glass-no-wallet {
          background: rgba(244,63,94,0.1);
          border: 1px solid rgba(244,63,94,0.25);
          color: #fda4af;
        }
        .badge-needs {
          background: rgba(16, 185, 129, 0.15);
          color: #6ee7b7;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .badge-wants {
          background: rgba(245, 158, 11, 0.15);
          color: #fcd34d;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .category-group-btn {
          transition: all 0.2s ease;
        }
        .category-group-btn-active {
          background: rgba(99, 102, 241, 0.25);
          border-color: rgba(99, 102, 241, 0.5);
          color: #a5b4fc;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.4);
          border-radius: 10px;
        }
        /* Layout desktop: 2 kolom dengan lebar tetap */
        @media (min-width: 1024px) {
          .transaction-layout {
            display: grid;
            grid-template-columns: 360px 1fr;
            gap: 1.5rem;
            align-items: start;
          }
          .form-column {
            position: sticky;
            top: 1.5rem;
          }
          .history-column {
            min-width: 0;
          }
        }
        /* Perbaikan tampilan mobile untuk statistik Needs vs Wants */
        @media (max-width: 640px) {
          .needs-wants-stats {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.75rem !important;
          }
          .needs-wants-stats > div {
            width: 100% !important;
          }
          .needs-wants-progress {
            margin: 0.5rem 0 !important;
          }
        }
      `}</style>

      <div className="tx-bg min-h-screen p-4 sm:p-6 lg:p-8 relative">
        <div className="pointer-events-none fixed top-20 left-1/4 w-72 h-72 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="pointer-events-none fixed bottom-28 right-1/4 w-60 h-60 rounded-full bg-emerald-600/8 blur-3xl" />

        <div className="max-w-7xl mx-auto relative">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="mb-5 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Transaksi</h1>
            <p className="text-white/35 text-sm mt-0.5">Dicatat, biar gak boncos.</p>
          </div>

          {/* Layout Desktop: Grid 2 Kolom */}
          <div className="transaction-layout">
            
            {/* ── Kolom Kiri: Form Input Transaksi (sticky di desktop) ── */}
            <div className="form-column">
              <div className="glass-card rounded-2xl overflow-hidden">
                <button
                  className="lg:hidden w-full flex items-center justify-between p-4 text-left"
                  onClick={() => setFormOpen(!formOpen)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-indigo-300" />
                    </div>
                    <span className="font-semibold text-white text-sm">Tambah Transaksi</span>
                  </div>
                  {formOpen
                    ? <ChevronUp className="w-4 h-4 text-white/40" />
                    : <ChevronDown className="w-4 h-4 text-white/40" />}
                </button>

                <div className={`${formOpen ? "block" : "hidden"} lg:block p-4 sm:p-6 pt-0 lg:pt-6`}>
                  <h2 className="text-sm sm:text-base font-semibold text-white mb-4 hidden lg:block">
                    Input Transaksi
                  </h2>

                  <form onSubmit={handleAddTransaction} className="space-y-4">
                    {/* Tipe toggle */}
                    <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      {(["expense", "income"] as const).map((type) => (
                        <label
                          key={type}
                          className={`flex-1 flex items-center justify-center cursor-pointer py-2 rounded-lg text-sm font-medium transition-all ${
                            formData.type === type ? "glass-toggle-active" : "glass-toggle-inactive"
                          }`}
                        >
                          <input
                            type="radio"
                            value={type}
                            className="hidden"
                            checked={formData.type === type}
                            onChange={() =>
                              setFormData({
                                ...formData,
                                type,
                                category: type === "income" ? INCOME_CATEGORIES[0] : NEEDS_CATEGORIES[0],
                                amount: "",
                              })
                            }
                          />
                          {type === "expense" ? "Pengeluaran" : "Pemasukan"}
                        </label>
                      ))}
                    </div>

                    {/* Jumlah */}
                    <div>
                      <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Jumlah (Rp)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formData.amount}
                        onChange={handleAmountChange}
                        className="glass-input w-full mt-2 px-3 py-2.5 rounded-xl text-sm"
                      />
                    </div>

                    {/* Kategori */}
                    {formData.type === "expense" ? (
                      <div>
                        <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Kategori</label>
                        
                        <div className="flex gap-2 mt-2 mb-3">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCategoryGroup("needs");
                              setFormData({ ...formData, category: NEEDS_CATEGORIES[0] });
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-all category-group-btn ${
                              activeCategoryGroup === "needs" 
                                ? "category-group-btn-active border-indigo-500/50 text-indigo-300" 
                                : "border-white/10 text-white/40 hover:text-white/60"
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            Kebutuhan
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCategoryGroup("wants");
                              setFormData({ ...formData, category: WANTS_CATEGORIES[0] });
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-all category-group-btn ${
                              activeCategoryGroup === "wants" 
                                ? "category-group-btn-active border-amber-500/50 text-amber-300" 
                                : "border-white/10 text-white/40 hover:text-white/60"
                            }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            Keinginan
                          </button>
                        </div>
                        
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="glass-select w-full px-3 py-2.5 rounded-xl text-sm"
                        >
                          {getCategories().map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Kategori</label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="glass-select w-full mt-2 px-3 py-2.5 rounded-xl text-sm"
                        >
                          {INCOME_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Dompet */}
                    <div>
                      <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Dompet</label>
                      {wallets.length === 0 ? (
                        <div className="glass-no-wallet mt-2 p-3 rounded-xl text-xs">
                          Belum ada dompet. Buat di menu Dompet dahulu.
                        </div>
                      ) : (
                        <select
                          value={formData.wallet_id}
                          onChange={(e) => setFormData({ ...formData, wallet_id: e.target.value })}
                          className="glass-select w-full mt-2 px-3 py-2.5 rounded-xl text-sm"
                        >
                          {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      )}
                    </div>

                    {/* Keterangan */}
                    <div>
                      <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Keterangan</label>
                      <input
                        type="text"
                        placeholder="Contoh: Beli groceries"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="glass-input w-full mt-2 px-3 py-2.5 rounded-xl text-sm"
                      />
                    </div>

                    {/* Tanggal */}
                    <div>
                      <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Tanggal</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="glass-input w-full mt-2 px-3 py-2.5 rounded-xl text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || wallets.length === 0}
                      className="glass-btn-primary w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                    >
                      {submitting
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Plus className="w-4 h-4" />}
                      Tambah
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* ── Kolom Kanan: Statistik + Riwayat Transaksi ── */}
            <div className="history-column space-y-4">
              
              {/* ── Statistik Needs vs Wants - Responsive ─────────────────── */}
              {transactions.filter(t => t.type === "expense").length > 0 && (
                <div className="glass-card rounded-2xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Kebutuhan vs Keinginan</span>
                      {needsVsWants.isHealthy ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Sehat
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Keinginan Terlalu Banyak
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/30">Ideal: Keinginan ≤ 30%</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="flex h-2 rounded-full overflow-hidden mb-4">
                    <div 
                      className="bg-emerald-500 transition-all duration-500"
                      style={{ width: `${needsVsWants.needsPercent}%` }}
                    />
                    <div 
                      className="bg-amber-500 transition-all duration-500"
                      style={{ width: `${needsVsWants.wantsPercent}%` }}
                    />
                  </div>
                  
                  {/* Stats - Responsive: row di desktop, column di mobile */}
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-4 needs-wants-stats">
                    <div className="flex items-center justify-between sm:justify-start gap-3 bg-white/5 rounded-lg p-2.5 sm:p-2 sm:bg-transparent">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-xs text-white/60">Kebutuhan</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white">{formatCurrency(needsVsWants.needsTotal)}</span>
                        <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          {needsVsWants.needsPercent.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-start gap-3 bg-white/5 rounded-lg p-2.5 sm:p-2 sm:bg-transparent">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <span className="text-xs text-white/60">Keinginan</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white">{formatCurrency(needsVsWants.wantsTotal)}</span>
                        <span className="text-[11px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                          {needsVsWants.wantsPercent.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Riwayat Transaksi ── */}
              <div className="glass-card rounded-2xl p-4 sm:p-6">
                <h2 className="text-sm sm:text-base font-semibold text-white mb-4">
                  Riwayat
                  <span className="ml-2 text-xs font-normal text-white/35">
                    ({transactions.length} transaksi)
                  </span>
                </h2>

                <div className="space-y-5 max-h-[60vh] lg:max-h-[calc(100vh-320px)] overflow-y-auto pr-1 custom-scrollbar">
                  {loading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-7 h-7 animate-spin text-white/40" />
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="glass-empty flex items-center justify-center py-12 rounded-xl">
                      <p className="text-white/25 text-sm">Belum ada transaksi</p>
                    </div>
                  ) : (
                    groupByMonth(transactions).map(({ label, items, totalIncome, totalExpense }) => (
                      <div key={label}>

                        {/* Header bulan */}
                        <div className="flex items-center justify-between mb-2.5 pb-2 glass-month-divider">
                          <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                            {label}
                          </span>
                          <div className="flex items-center gap-2.5 text-xs font-medium">
                            {totalIncome > 0 && (
                              <span className="text-emerald-400">
                                +{formatCurrency(totalIncome)}
                              </span>
                            )}
                            {totalExpense > 0 && (
                              <span className="text-rose-400">
                                −{formatCurrency(totalExpense)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Item transaksi */}
                        <div className="space-y-2">
                          {items.map((transaction) => {
                            const categoryType = transaction.type === "expense" ? getCategoryType(transaction.category) : null;
                            return (
                              <div
                                key={transaction.id}
                                className="glass-row flex items-center justify-between p-3 sm:p-4 rounded-xl"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    transaction.type === "income"
                                      ? "bg-emerald-400/15 text-emerald-300"
                                      : categoryType === "needs"
                                        ? "bg-emerald-400/15 text-emerald-300"
                                        : "bg-amber-400/15 text-amber-300"
                                  }`}>
                                    {transaction.type === "income"
                                      ? <ArrowUpRight className="w-4 h-4" />
                                      : categoryType === "needs"
                                        ? <Shield className="w-4 h-4" />
                                        : <Sparkles className="w-4 h-4" />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-white/85 text-sm truncate">
                                      {transaction.description}
                                    </p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                        categoryType === "needs" ? "badge-needs" : categoryType === "wants" ? "badge-wants" : "text-white/40"
                                      }`}
                                      style={!categoryType && transaction.type !== "income" ? { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" } : {}}>
                                        {transaction.category}
                                      </span>
                                      <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded-full text-white/40 items-center gap-1"
                                            style={{ background: "rgba(255,255,255,0.07)" }}>
                                        <Wallet className="w-2.5 h-2.5 inline mr-0.5" />
                                        {transaction.source}
                                      </span>
                                      <span className="text-[10px] text-white/30 py-0.5">
                                        {formatDate(transaction.date, { day: "numeric", month: "short" })}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
                                  <span className={`font-bold text-sm whitespace-nowrap ${
                                    transaction.type === "income" ? "text-emerald-400" : "text-rose-400"
                                  }`}>
                                    {transaction.type === "income" ? "+" : "−"}{formatCurrency(transaction.amount)}
                                  </span>
                                  <button
                                    onClick={() => handleDelete(transaction.id)}
                                    className="p-1.5 rounded-lg text-white/25 hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}