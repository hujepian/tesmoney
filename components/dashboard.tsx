"use client";

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Calendar,
  PiggyBank,
  CreditCard,
  Sparkles,
  Zap,
  Heart,
  Shield,
  Activity,
  DollarSign,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DashboardProps {
  currentUser: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  date: string;
  source: string;
  wallet_id: string;
}

interface Budget {
  id: string;
  category: string;
  limit_amount: number;
}

// ── Kategori Kebutuhan vs Keinginan ─────────────────────────────────────────
const NEEDS_CATEGORIES = [
  "🍱 Makanan", "🏠 Sewa/Kontrakan", "⚡ Listrik & Air", "⛽ Bensin/Transport",
  "📶 Pulsa & Internet", "🛠️ Servis Motor/Mobil", "💊 Kesehatan", "🧺 Laundry",
  "📚 Pendidikan", "🔄 Langganan",
];

const WANTS_CATEGORIES = [
  "☕ Ngopi/Cafe", "🚬 Rokok", "🛍️ Belanja", "🎮 Hiburan", "🍔 Jajan/Junk Food",
  "💄 Kosmetik", "🎁 Hadiah", "✈️ Liburan", "📱 Gadget", "🏋️ Gym/Hobi",
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatCompact = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
  return `${v}`;
};

// ── Custom Tooltip ───────────────────────────────────────────────────────────
const DailyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d0d1a]/90 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl text-xs">
      <p className="text-white/50 mb-1.5 font-medium">Hari ke-{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

function getMonthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function Dashboard({ currentUser }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    savingsRate: 0,
  });

  // Navigasi bulan untuk chart harian
  const today = new Date();
  const [chartYear, setChartYear] = useState(today.getFullYear());
  const [chartMonth, setChartMonth] = useState(today.getMonth());
  const [dailyData, setDailyData] = useState<
    { day: string; Pengeluaran: number; Pemasukan: number }[]
  >([]);

  // Additional stats
  const [needsVsWants, setNeedsVsWants] = useState({ needs: 0, wants: 0, ratio: 0 });
  const [budgetHealth, setBudgetHealth] = useState({ healthy: 0, over: 0, total: 0 });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (transactions.length > 0) {
      buildDailyChart(transactions, chartYear, chartMonth);
    }
  }, [chartYear, chartMonth, transactions]);

  const loadDashboardData = async () => {
    try {
      const [transactionsData, budgetsData] = await Promise.all([
        api.transactions.list(),
        api.budgets.list(),
      ]);

      setTransactions(transactionsData);
      setBudgets(budgetsData);

      // Basic stats
      const totalIncome = transactionsData.filter((t: Transaction) => t.type === "income").reduce((s: number, t: Transaction) => s + t.amount, 0);
      const totalExpense = transactionsData.filter((t: Transaction) => t.type === "expense").reduce((s: number, t: Transaction) => s + t.amount, 0);
      const balance = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

      setStats({ totalIncome, totalExpense, balance, savingsRate });

      // Needs vs Wants
      const expenses = transactionsData.filter((t: Transaction) => t.type === "expense");
      const needsTotal = expenses.filter((t: Transaction) => NEEDS_CATEGORIES.includes(t.category)).reduce((s: number, t: Transaction) => s + t.amount, 0);
      const wantsTotal = expenses.filter((t: Transaction) => WANTS_CATEGORIES.includes(t.category)).reduce((s: number, t: Transaction) => s + t.amount, 0);
      const total = needsTotal + wantsTotal;
      const ratio = total > 0 ? (wantsTotal / total) * 100 : 0;
      setNeedsVsWants({ needs: needsTotal, wants: wantsTotal, ratio });

      // Budget Health
      let healthyCount = 0;
      let overCount = 0;
      budgetsData.forEach((b: Budget) => {
        const spent = expenses.filter((t: Transaction) => t.category === b.category).reduce((s: number, t: Transaction) => s + t.amount, 0);
        if (spent <= b.limit_amount) healthyCount++;
        else overCount++;
      });
      setBudgetHealth({ healthy: healthyCount, over: overCount, total: budgetsData.length });

      // Recent Transactions (last 5)
      const recent = [...transactionsData]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
      setRecentTransactions(recent);

      buildDailyChart(transactionsData, chartYear, chartMonth);
    } catch {
      toast.error("Gagal memuat data dasbor");
    } finally {
      setLoading(false);
    }
  };

  const buildDailyChart = (transactions: Transaction[], year: number, month: number) => {
    const days = getDaysInMonth(year, month);
    const map: Record<string, { income: number; expense: number }> = {};

    transactions.forEach((t) => {
      const d = t.date?.substring(0, 10);
      if (!d) return;
      const [ty, tm] = d.split("-").map(Number);
      if (ty !== year || tm - 1 !== month) return;
      if (!map[d]) map[d] = { income: 0, expense: 0 };
      if (t.type === "income") map[d].income += t.amount;
      if (t.type === "expense") map[d].expense += t.amount;
    });

    const data = Array.from({ length: days }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      return {
        day: `${dayNum}`,
        fullDate: dateStr,
        Pengeluaran: map[dateStr]?.expense ?? 0,
        Pemasukan: map[dateStr]?.income ?? 0,
      };
    });

    setDailyData(data);
  };

  const prevMonth = () => {
    if (chartMonth === 0) {
      setChartYear(y => y - 1);
      setChartMonth(11);
    } else {
      setChartMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    const isCurrentMonth = chartYear === today.getFullYear() && chartMonth === today.getMonth();
    if (isCurrentMonth) return;
    if (chartMonth === 11) {
      setChartYear(y => y + 1);
      setChartMonth(0);
    } else {
      setChartMonth(m => m + 1);
    }
  };

  const isCurrentMonth = chartYear === today.getFullYear() && chartMonth === today.getMonth();
  const monthlyExpense = dailyData.reduce((s, d) => s + d.Pengeluaran, 0);
  const monthlyIncome = dailyData.reduce((s, d) => s + d.Pemasukan, 0);
  const activeDays = dailyData.filter((d) => d.Pengeluaran > 0 || d.Pemasukan > 0).length;
  const avgDailyExpense = activeDays > 0 ? monthlyExpense / activeDays : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        .dashboard-bg {
          background-color: #0d0d1a;
          background-image:
            radial-gradient(ellipse 80% 60% at 10% 0%, rgba(99, 102, 241, 0.2) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 90% 10%, rgba(16, 185, 129, 0.15) 0%, transparent 55%),
            radial-gradient(ellipse 70% 60% at 50% 100%, rgba(244, 63, 94, 0.12) 0%, transparent 60%);
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.11);
          transition: all 0.3s ease;
        }
        .glass-card:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
        }
        .stat-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1);
          transition: all 0.3s ease;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%);
        }
        .insight-badge {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        .float-animation {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      <div className="dashboard-bg min-h-screen p-4 sm:p-6 lg:p-8 relative">
        {/* Ambient Orbs */}
        <div className="pointer-events-none fixed top-20 left-1/4 w-80 h-80 rounded-full bg-indigo-600/15 blur-3xl animate-pulse" />
        <div className="pointer-events-none fixed bottom-20 right-1/4 w-72 h-72 rounded-full bg-emerald-600/10 blur-3xl animate-pulse delay-1000" />

        <div className="max-w-7xl mx-auto relative space-y-5 sm:space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg float-animation">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-emerald-200 to-teal-300 bg-clip-text text-transparent">
                  Dashboard
                </h1>
              </div>
              <p className="text-white/35 text-sm">Ringkasan keuangan Anda secara real-time</p>
            </div>
            <div className="glass-card px-4 py-2 rounded-full flex items-center gap-2 self-start sm:self-auto">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-white/60">
                {formatDate(new Date(), { dateStyle: "long" })}
              </span>
            </div>
          </div>

          {/* Main Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Income Card */}
            <div className="stat-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-emerald-400/20 p-2 rounded-xl">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Total Pemasukan</p>
              <p className="text-lg font-bold text-white mt-1">{formatCurrency(stats.totalIncome)}</p>
            </div>

            {/* Expense Card */}
            <div className="stat-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-rose-400/20 p-2 rounded-xl">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                </div>
                <ArrowDownRight className="w-3 h-3 text-rose-400" />
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Total Pengeluaran</p>
              <p className="text-lg font-bold text-white mt-1">{formatCurrency(stats.totalExpense)}</p>
            </div>

            {/* Balance Card */}
            <div className="stat-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`${stats.balance >= 0 ? 'bg-indigo-400/20' : 'bg-rose-400/20'} p-2 rounded-xl`}>
                  <Wallet className={`w-4 h-4 ${stats.balance >= 0 ? 'text-indigo-400' : 'text-rose-400'}`} />
                </div>
                <Sparkles className="w-3 h-3 text-white/30" />
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Saldo Bersih</p>
              <p className={`text-lg font-bold mt-1 ${stats.balance >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                {formatCurrency(Math.abs(stats.balance))}
              </p>
            </div>

            {/* Savings Rate Card */}
            <div className="stat-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-amber-400/20 p-2 rounded-xl">
                  <PiggyBank className="w-4 h-4 text-amber-400" />
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${stats.savingsRate >= 20 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {stats.savingsRate >= 20 ? 'Sehat' : 'Perhatian'}
                </span>
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Rasio Tabungan</p>
              <p className="text-lg font-bold text-white mt-1">{stats.savingsRate.toFixed(1)}%</p>
              <div className="w-full bg-white/10 rounded-full h-1 mt-2">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1 rounded-full" style={{ width: `${Math.min(stats.savingsRate, 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Secondary Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Needs vs Wants */}
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                {needsVsWants.ratio <= 30 ? (
                  <Shield className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <h3 className="text-xs font-semibold text-white">Kebutuhan vs Keinginan</h3>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden mb-3">
                <div className="bg-emerald-500" style={{ width: `${100 - needsVsWants.ratio}%` }} />
                <div className="bg-amber-500" style={{ width: `${needsVsWants.ratio}%` }} />
              </div>
              <div className="flex justify-between text-[10px]">
                <div className="flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5 text-emerald-400" />
                  <span className="text-white/50">Kebutuhan</span>
                  <span className="text-white">{formatCurrency(needsVsWants.needs)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  <span className="text-white/50">Keinginan</span>
                  <span className="text-white">{formatCurrency(needsVsWants.wants)}</span>
                </div>
              </div>
              {needsVsWants.ratio > 50 && (
                <p className="text-[9px] text-amber-400/70 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Keinginan terlalu tinggi, coba kurangi 10-20%
                </p>
              )}
            </div>

            {/* Budget Health */}
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-white">Kesehatan Budget</h3>
              </div>
              {budgetHealth.total > 0 ? (
                <>
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] text-white/40">On Track</span>
                    <span className="text-xs font-bold text-emerald-400">{budgetHealth.healthy}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] text-white/40">Over Budget</span>
                    <span className="text-xs font-bold text-rose-400">{budgetHealth.over}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 mt-1">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(budgetHealth.healthy / budgetHealth.total) * 100}%` }} />
                  </div>
                  <p className="text-[9px] text-white/30 mt-2">
                    {budgetHealth.healthy} dari {budgetHealth.total} budget terjaga
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-white/40 text-center py-4">Belum ada budget yang diset</p>
              )}
            </div>

            {/* Quick Insight */}
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-semibold text-white">Quick Insight</h3>
              </div>
              <div className="space-y-2">
                {stats.savingsRate < 10 ? (
                  <div className="insight-badge rounded-lg p-2">
                    <p className="text-[10px] text-emerald-400/80">💡 Coba hemat 5% lebih banyak untuk tabungan</p>
                  </div>
                ) : stats.savingsRate >= 20 ? (
                  <div className="insight-badge rounded-lg p-2">
                    <p className="text-[10px] text-emerald-400/80">🎉 Tabunganmu luar biasa! Terus pertahankan!</p>
                  </div>
                ) : null}
                
                {needsVsWants.ratio > 50 && (
                  <div className="insight-badge rounded-lg p-2">
                    <p className="text-[10px] text-amber-400/80">⚠️ Kurangi keinginan, fokus pada kebutuhan utama</p>
                  </div>
                )}
                
                {stats.balance < 0 && (
                  <div className="insight-badge rounded-lg p-2">
                    <p className="text-[10px] text-rose-400/80">📉 Defisit! Segera evaluasi pengeluaran</p>
                  </div>
                )}
                
                {stats.savingsRate >= 10 && stats.savingsRate < 20 && needsVsWants.ratio <= 50 && (
                  <div className="insight-badge rounded-lg p-2">
                    <p className="text-[10px] text-emerald-400/80">✅ Keuangan cukup sehat, tingkatkan tabungan!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Daily Activity Chart */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Aktivitas Harian
                </h2>
                <p className="text-[10px] text-white/35 mt-0.5">Pemasukan & pengeluaran per hari</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-white/80 min-w-[130px] text-center">
                  {getMonthLabel(chartYear, chartMonth)}
                </span>
                <button
                  onClick={nextMonth}
                  disabled={isCurrentMonth}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Monthly Summary */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-white/5 rounded-xl px-3 py-2 text-center">
                <p className="text-[9px] text-white/35 mb-1">Pemasukan</p>
                <p className="text-xs font-bold text-emerald-400">{formatCurrency(monthlyIncome)}</p>
              </div>
              <div className="bg-white/5 rounded-xl px-3 py-2 text-center">
                <p className="text-[9px] text-white/35 mb-1">Pengeluaran</p>
                <p className="text-xs font-bold text-rose-400">{formatCurrency(monthlyExpense)}</p>
              </div>
              <div className="bg-white/5 rounded-xl px-3 py-2 text-center">
                <p className="text-[9px] text-white/35 mb-1">Rata-rata/hari</p>
                <p className="text-xs font-bold text-amber-400">{formatCurrency(avgDailyExpense)}</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-white/40">Pemasukan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="text-[10px] text-white/40">Pengeluaran</span>
              </div>
            </div>

            {/* Chart */}
            {dailyData.some((d) => d.Pengeluaran > 0 || d.Pemasukan > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dailyData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  {isCurrentMonth && (
                    <ReferenceLine
                      x={String(today.getDate())}
                      stroke="rgba(255,255,255,0.2)"
                      strokeDasharray="4 4"
                      label={{ value: "Hari ini", position: "top", fill: "rgba(255,255,255,0.3)", fontSize: 9 }}
                    />
                  )}
                  <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={formatCompact} width={40} />
                  <Tooltip content={<DailyTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="Pemasukan" stroke="#10b981" strokeWidth={2} fill="url(#gradIncome)" dot={false} activeDot={{ r: 4, fill: "#10b981" }} />
                  <Area type="monotone" dataKey="Pengeluaran" stroke="#f43f5e" strokeWidth={2} fill="url(#gradExpense)" dot={false} activeDot={{ r: 4, fill: "#f43f5e" }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center gap-2 border border-dashed border-white/10 rounded-xl">
                <DollarSign className="w-8 h-8 text-white/20" />
                <p className="text-white/25 text-sm">Tidak ada transaksi di bulan ini</p>
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          {recentTransactions.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">Transaksi Terbaru</h2>
              </div>
              <div className="space-y-2">
                {recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === "income" ? "bg-emerald-400/20" : "bg-rose-400/20"}`}>
                        {t.type === "income" ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{t.description}</p>
                        <p className="text-[10px] text-white/40">{formatDate(t.date, { day: "numeric", month: "short" })} • {t.category}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold ${t.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                      {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// Tambahkan AlertTriangle yang belum diimport
const AlertTriangle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);