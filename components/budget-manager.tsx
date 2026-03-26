"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Trash2, Plus, Loader2, ChevronDown, ChevronUp, 
  Shield, Sparkles, AlertTriangle, CheckCircle2, 
  TrendingUp, TrendingDown, Wallet, Target, PieChart 
} from "lucide-react";
import { api, type Budget } from "@/lib/api";
import { toast } from "sonner";

interface BudgetManagerProps {
  currentUser: string;
}

interface BudgetWithSpent extends Budget {
  spent: number;
}

// ── KATEGORI PENGELUARAN (SAMA DENGAN TRANSACTION-TRACKER) ─────────────────
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

// Gabungan semua kategori
const ALL_CATEGORIES = [...NEEDS_CATEGORIES, ...WANTS_CATEGORIES];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatInputCurrency = (value: string) => {
  const number = value.replace(/\D/g, "");
  return new Intl.NumberFormat("id-ID").format(Number(number) || 0);
};

const parseInputCurrency = (value: string) =>
  Number(value.replace(/\./g, ""));

// Helper: hitung statistik budget
function calculateBudgetStats(budgets: BudgetWithSpent[]) {
  const needsBudgets = budgets.filter(b => NEEDS_CATEGORIES.includes(b.category));
  const wantsBudgets = budgets.filter(b => WANTS_CATEGORIES.includes(b.category));
  
  const needsTotalLimit = needsBudgets.reduce((s, b) => s + b.limit_amount, 0);
  const wantsTotalLimit = wantsBudgets.reduce((s, b) => s + b.limit_amount, 0);
  const needsTotalSpent = needsBudgets.reduce((s, b) => s + b.spent, 0);
  const wantsTotalSpent = wantsBudgets.reduce((s, b) => s + b.spent, 0);
  
  const needsPercentage = needsTotalLimit > 0 ? (needsTotalSpent / needsTotalLimit) * 100 : 0;
  const wantsPercentage = wantsTotalLimit > 0 ? (wantsTotalSpent / wantsTotalLimit) * 100 : 0;
  
  const overBudgetCount = budgets.filter(b => b.spent > b.limit_amount).length;
  const healthyCount = budgets.filter(b => b.spent <= b.limit_amount).length;
  
  return {
    needsTotalLimit, wantsTotalLimit,
    needsTotalSpent, wantsTotalSpent,
    needsPercentage, wantsPercentage,
    overBudgetCount, healthyCount,
    totalBudgets: budgets.length
  };
}

export function BudgetManager({ currentUser }: BudgetManagerProps) {
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [activeCategoryGroup, setActiveCategoryGroup] = useState<"needs" | "wants">("needs");
  const [formData, setFormData] = useState({ 
    category: NEEDS_CATEGORIES[0], 
    limit: "" 
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [budgetsData, transactionsData] = await Promise.all([
        api.budgets.list(),
        api.transactions.list(),
      ]);
      const budgetsWithSpent = budgetsData.map((budget) => ({
        ...budget,
        spent: transactionsData
          .filter((t) => t.type === "expense" && t.category === budget.category)
          .reduce((sum, t) => sum + t.amount, 0),
      }));
      setBudgets(budgetsWithSpent);
    } catch (error) {
      toast.error("Gagal memuat data budget");
    } finally {
      setLoading(false);
    }
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setFormData({ ...formData, limit: v === "" ? "" : formatInputCurrency(v) });
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.limit) {
      toast.error("Masukkan batas budget");
      return;
    }

    setSubmitting(true);
    try {
      const existing = budgets.find((b) => b.category === formData.category);
      const numericLimit = parseInputCurrency(formData.limit);

      if (existing) {
        await api.budgets.updateLimit(existing.id, numericLimit);
        setBudgets(budgets.map((b) =>
          b.id === existing.id ? { ...b, limit_amount: numericLimit } : b
        ));
        toast.success("Budget diperbarui");
      } else {
        const newBudget = await api.budgets.add({
          category: formData.category,
          limit_amount: numericLimit,
        });
        setBudgets([...budgets, { ...newBudget, spent: 0 }]);
        toast.success("Budget ditambahkan");
      }
      setFormData({ category: NEEDS_CATEGORIES[0], limit: "" });
      setFormOpen(false);
    } catch {
      toast.error("Gagal menyimpan budget");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.budgets.delete(id);
      setBudgets(budgets.filter((b) => b.id !== id));
      toast.success("Budget dihapus");
    } catch {
      toast.error("Gagal menghapus budget");
    }
  };

  const getCategoryType = (category: string) => {
    if (NEEDS_CATEGORIES.includes(category)) return "needs";
    if (WANTS_CATEGORIES.includes(category)) return "wants";
    return null;
  };

  const stats = calculateBudgetStats(budgets);

  return (
    <>
      <style>{`
        .budget-bg {
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
        .glass-btn-primary {
          background: rgba(99,102,241,0.85);
          color: #fff;
          border: 1px solid rgba(99,102,241,0.4);
          transition: background .15s;
        }
        .glass-btn-primary:hover:not(:disabled) { background: rgba(99,102,241,1); }
        .glass-btn-primary:disabled { opacity: .45; cursor: not-allowed; }
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
        /* Layout desktop */
        @media (min-width: 1024px) {
          .budget-layout {
            display: grid;
            grid-template-columns: 360px 1fr;
            gap: 1.5rem;
            align-items: start;
          }
          .form-column {
            position: sticky;
            top: 1.5rem;
          }
        }
        /* Perbaikan mobile untuk statistik */
        @media (max-width: 640px) {
          .budget-stats {
            flex-direction: column !important;
            gap: 0.75rem !important;
          }
          .budget-stats > div {
            width: 100% !important;
          }
        }
      `}</style>

      <div className="budget-bg min-h-screen p-4 sm:p-6 lg:p-8 relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none fixed top-20 left-1/4 w-72 h-72 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="pointer-events-none fixed bottom-28 right-1/4 w-60 h-60 rounded-full bg-emerald-600/8 blur-3xl" />

        <div className="max-w-7xl mx-auto relative">

          {/* Header */}
          <div className="mb-5 sm:mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent">
                  Manajemen Budget
                </h1>
                <p className="text-white/35 text-sm mt-0.5">
                  Jaga pengeluaranmu agar tetap on track.
                </p>
              </div>
            </div>
          </div>

          {/* Layout Desktop: Grid 2 Kolom */}
          <div className="budget-layout">
            
            {/* ── Kolom Kiri: Form Input Budget (sticky di desktop) ── */}
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
                    <span className="font-semibold text-white text-sm">
                      Set Budget Bulanan
                    </span>
                  </div>
                  {formOpen
                    ? <ChevronUp className="w-4 h-4 text-white/40" />
                    : <ChevronDown className="w-4 h-4 text-white/40" />}
                </button>

                <div className={`${formOpen ? "block" : "hidden"} lg:block p-4 sm:p-6 pt-0 lg:pt-6`}>
                  <h2 className="text-sm sm:text-base font-semibold text-white mb-4 hidden lg:block">
                    Set Budget Bulanan
                  </h2>

                  <form onSubmit={handleAddBudget} className="space-y-4">
                    
                    {/* Group Toggle: Needs vs Wants */}
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
                        {(activeCategoryGroup === "needs" ? NEEDS_CATEGORIES : WANTS_CATEGORIES).map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Batas Maksimal */}
                    <div>
                      <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
                        Batas Maksimal (Rp)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formData.limit}
                        onChange={handleLimitChange}
                        className="glass-input w-full mt-2 px-3 py-2.5 rounded-xl text-sm"
                      />
                      {formData.limit && (
                        <p className="text-[10px] text-white/30 mt-1">
                          {parseInputCurrency(formData.limit).toLocaleString("id-ID")} Rupiah
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="glass-btn-primary w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                    >
                      {submitting
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Plus className="w-4 h-4" />}
                      Simpan Budget
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* ── Kolom Kanan: Statistik + Daftar Budget ── */}
            <div className="space-y-4">
              
              {/* ── Statistik Budget Overview ── */}
              {budgets.length > 0 && (
                <div className="glass-card rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <PieChart className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                      Overview Budget
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Shield className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] text-white/40">Kebutuhan</span>
                      </div>
                      <p className="text-lg font-bold text-white">
                        {formatCurrency(stats.needsTotalLimit)}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-white/40">Terpakai</span>
                        <span className="text-[10px] text-emerald-400">
                          {formatCurrency(stats.needsTotalSpent)}
                        </span>
                        <span className="text-[10px] text-white/30">
                          ({stats.needsPercentage.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] text-white/40">Keinginan</span>
                      </div>
                      <p className="text-lg font-bold text-white">
                        {formatCurrency(stats.wantsTotalLimit)}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-white/40">Terpakai</span>
                        <span className="text-[10px] text-amber-400">
                          {formatCurrency(stats.wantsTotalSpent)}
                        </span>
                        <span className="text-[10px] text-white/30">
                          ({stats.wantsPercentage.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between pt-2 border-t border-white/10">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] text-white/40">On Track</span>
                      <span className="text-xs font-medium text-white">{stats.healthyCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      <span className="text-[10px] text-white/40">Over Budget</span>
                      <span className="text-xs font-medium text-rose-400">{stats.overBudgetCount}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Daftar Budget ── */}
              <div className="glass-card rounded-2xl p-4 sm:p-6">
                <h2 className="text-sm sm:text-base font-semibold text-white mb-4">
                  Budget Aktif
                  <span className="ml-2 text-xs font-normal text-white/35">
                    ({budgets.length} kategori)
                  </span>
                </h2>

                <div className="space-y-3 max-h-[60vh] lg:max-h-[calc(100vh-420px)] overflow-y-auto pr-1 custom-scrollbar">
                  {loading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-7 h-7 animate-spin text-white/40" />
                    </div>
                  ) : budgets.length === 0 ? (
                    <div className="glass-empty flex items-center justify-center py-12 rounded-xl">
                      <p className="text-white/25 text-sm">Belum ada budget yang diatur</p>
                    </div>
                  ) : (
                    budgets.map((budget) => {
                      const percentage = (budget.spent / budget.limit_amount) * 100;
                      const isOver = budget.spent > budget.limit_amount;
                      const categoryType = getCategoryType(budget.category);
                      
                      return (
                        <div
                          key={budget.id}
                          className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all duration-200 border border-white/5 hover:border-white/10"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {categoryType === "needs" ? (
                                  <Shield className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Sparkles className="w-4 h-4 text-amber-400" />
                                )}
                                <h3 className="font-semibold text-white text-sm sm:text-base">
                                  {budget.category}
                                </h3>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                  categoryType === "needs" ? "badge-needs" : "badge-wants"
                                }`}>
                                  {categoryType === "needs" ? "Kebutuhan" : "Keinginan"}
                                </span>
                              </div>
                              <p className="text-xs text-white/40">
                                Terpakai:{" "}
                                <span className={`font-medium ${isOver ? "text-rose-400" : "text-white"}`}>
                                  {formatCurrency(budget.spent)}
                                </span>{" "}
                                dari {formatCurrency(budget.limit_amount)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDelete(budget.id)}
                              className="p-2 hover:bg-rose-500/10 text-white/40 hover:text-rose-400 rounded-lg transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div>
                            <div className="flex justify-between mb-1.5">
                              <span className="text-[10px] text-white/40">Progress</span>
                              <span className={`text-[10px] font-semibold ${isOver ? "text-rose-400" : "text-emerald-400"}`}>
                                {percentage.toFixed(0)}%
                              </span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isOver ? "bg-gradient-to-r from-rose-500 to-rose-400" : "bg-gradient-to-r from-emerald-500 to-teal-400"
                                }`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                            {isOver && (
                              <p className="text-[10px] text-rose-400 mt-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Over budget: {formatCurrency(budget.spent - budget.limit_amount)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
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