"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { api } from "@/lib/api";
import { 
  Loader2, TrendingUp, TrendingDown, Wallet, 
  Shield, Sparkles, Target, Award, AlertTriangle,
  CheckCircle2, Calendar, ArrowUpRight, ArrowDownRight,
  PiggyBank, CreditCard, BarChart3, Lightbulb,
  Activity, Clock, Brain, Zap, Heart, Star
} from "lucide-react";

interface AnalyticsProps {
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

const formatCompactCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    compactDisplay: "short",
  }).format(amount);

// ── Helper: Hitung Financial Health Score ───────────────────────────────────
function calculateHealthScore(data: {
  totalIncome: number;
  totalExpense: number;
  savingsRate: number;
  needsVsWantsRatio: number;
  budgetHealth: number;
}) {
  let score = 0;
  const details = [];

  // Savings Rate (maks 40 poin)
  if (data.savingsRate >= 30) {
    score += 40;
    details.push({ label: "Tabungan Luar Biasa", points: 40, status: "excellent" });
  } else if (data.savingsRate >= 20) {
    score += 30;
    details.push({ label: "Tabungan Sehat", points: 30, status: "good" });
  } else if (data.savingsRate >= 10) {
    score += 20;
    details.push({ label: "Tabungan Cukup", points: 20, status: "warning" });
  } else {
    score += 5;
    details.push({ label: "Tabungan Rendah", points: 5, status: "danger" });
  }

  // Needs vs Wants (maks 30 poin)
  if (data.needsVsWantsRatio <= 30) {
    score += 30;
    details.push({ label: "Keinginan Terkontrol", points: 30, status: "excellent" });
  } else if (data.needsVsWantsRatio <= 50) {
    score += 20;
    details.push({ label: "Keinginan Cukup", points: 20, status: "warning" });
  } else {
    score += 5;
    details.push({ label: "Keinginan Berlebihan", points: 5, status: "danger" });
  }

  // Budget Health (maks 30 poin)
  if (data.budgetHealth >= 90) {
    score += 30;
    details.push({ label: "Budget Disiplin", points: 30, status: "excellent" });
  } else if (data.budgetHealth >= 70) {
    score += 20;
    details.push({ label: "Budget Cukup", points: 20, status: "good" });
  } else {
    score += 5;
    details.push({ label: "Budget Bermasalah", points: 5, status: "danger" });
  }

  return { score: Math.min(100, score), details };
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────
const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d0d1a]/90 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl text-xs">
      {label && <p className="text-white/50 mb-1 font-medium">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color ?? "#fff" }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

export function Analytics({ currentUser }: AnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  
  // Data states
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [incomeVsExpense, setIncomeVsExpense] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [needsVsWants, setNeedsVsWants] = useState({ needs: 0, wants: 0, ratio: 0 });
  const [healthScore, setHealthScore] = useState({ score: 0, details: [] as any[] });
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    try {
      const [transactionsData, budgetsData] = await Promise.all([
        api.transactions.list(),
        api.budgets.list(),
      ]);
      setTransactions(transactionsData);
      setBudgets(budgetsData);

      // Process data
      processAnalytics(transactionsData, budgetsData);
    } catch (error) {
      console.error("Failed to load analytics", error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalytics = (transactions: Transaction[], budgets: any[]) => {
    // 1. Income vs Expense
    const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    setIncomeVsExpense([
      { name: "Pemasukan", value: totalIncome },
      { name: "Pengeluaran", value: totalExpense },
    ]);

    // 2. Category breakdown
    const categoryMap: any = {};
    transactions.filter(t => t.type === "expense").forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });
    const categoryArray = Object.entries(categoryMap).map(([name, value]: any) => ({
      name, value,
    })).sort((a, b) => b.value - a.value);
    setCategoryData(categoryArray);
    setTopCategories(categoryArray.slice(0, 5));

    // 3. Source breakdown
    const sourceMap: any = {};
    transactions.filter(t => t.type === "expense").forEach(t => {
      sourceMap[t.source] = (sourceMap[t.source] || 0) + t.amount;
    });
    setSourceData(Object.entries(sourceMap).map(([name, value]: any) => ({
      name, value,
    })));

    // 4. Monthly trends
    const monthlyMap: Record<string, { income: number; expense: number }> = {};
    transactions.forEach(t => {
      const month = t.date?.substring(0, 7);
      if (!month) return;
      if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expense: 0 };
      if (t.type === "income") monthlyMap[month].income += t.amount;
      if (t.type === "expense") monthlyMap[month].expense += t.amount;
    });
    const monthly = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, d]) => ({
        bulan: new Date(month + "-01").toLocaleDateString("id-ID", { month: "short" }),
        Pemasukan: d.income,
        Pengeluaran: d.expense,
        Saldo: d.income - d.expense,
      }));
    setMonthlyData(monthly);

    // 5. Needs vs Wants
    const expenses = transactions.filter(t => t.type === "expense");
    const needsTotal = expenses.filter(t => NEEDS_CATEGORIES.includes(t.category)).reduce((s, t) => s + t.amount, 0);
    const wantsTotal = expenses.filter(t => WANTS_CATEGORIES.includes(t.category)).reduce((s, t) => s + t.amount, 0);
    const total = needsTotal + wantsTotal;
    const ratio = total > 0 ? (wantsTotal / total) * 100 : 0;
    setNeedsVsWants({ needs: needsTotal, wants: wantsTotal, ratio });

    // 6. Budget Health
    let budgetHealth = 100;
    if (budgets.length > 0) {
      const overBudgetCount = budgets.filter(b => {
        const spent = expenses.filter(t => t.category === b.category).reduce((s, t) => s + t.amount, 0);
        return spent > b.limit_amount;
      }).length;
      budgetHealth = ((budgets.length - overBudgetCount) / budgets.length) * 100;
    }

    // 7. Health Score
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    const score = calculateHealthScore({
      totalIncome,
      totalExpense,
      savingsRate,
      needsVsWantsRatio: ratio,
      budgetHealth,
    });
    setHealthScore(score);

    // 8. Generate Insights
    const newInsights: string[] = [];
    
    if (savingsRate < 10) {
      newInsights.push("💰 Rasio tabunganmu di bawah 10%. Coba kurangi pengeluaran tidak penting.");
    } else if (savingsRate >= 20) {
      newInsights.push("🎉 Hebat! Rasio tabunganmu di atas 20%. Terus pertahankan!");
    }
    
    if (ratio > 50) {
      newInsights.push("⚠️ Pengeluaran untuk keinginan melebihi 50%. Saatnya evaluasi prioritas.");
    } else if (ratio <= 30) {
      newInsights.push("✅ Pengeluaran keinginanmu terkontrol dengan baik! Keep it up!");
    }
    
    if (totalExpense > totalIncome) {
      newInsights.push("📉 Pengeluaran melebihi pemasukan. Segera buat anggaran darurat.");
    }
    
    if (categoryArray[0] && categoryArray[0].value > totalExpense * 0.4) {
      newInsights.push(`🎯 Kategori ${categoryArray[0].name} mendominasi ${Math.round((categoryArray[0].value / totalExpense) * 100)}% pengeluaran. Coba cek apakah bisa dihemat.`);
    }
    
    setInsights(newInsights);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const totalIncome = incomeVsExpense.find(d => d.name === "Pemasukan")?.value || 0;
  const totalExpense = incomeVsExpense.find(d => d.name === "Pengeluaran")?.value || 0;
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  const PIE_COLORS = [
    "#818cf8", "#34d399", "#fb923c", "#38bdf8", "#c084fc",
    "#f87171", "#facc15", "#2dd4bf", "#60a5fa", "#f472b6",
  ];

  return (
    <>
      <style>{`
        .analytics-bg {
          background-color: #0d0d1a;
          background-image:
            radial-gradient(ellipse 70% 55% at 15% 5%, rgba(99, 102, 241, 0.22) 0%, transparent 60%),
            radial-gradient(ellipse 55% 45% at 88% 8%, rgba(16, 185, 129, 0.15) 0%, transparent 55%),
            radial-gradient(ellipse 65% 55% at 45% 95%, rgba(244, 63, 94, 0.13) 0%, transparent 60%);
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
        .kpi-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .health-score-circle {
          background: conic-gradient(from 0deg, #10b981 0deg, #10b981 ${healthScore.score * 3.6}deg, #1e293b ${healthScore.score * 3.6}deg);
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        .float-animation {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      <div className="analytics-bg min-h-screen p-4 sm:p-6 lg:p-8 relative">
        {/* Ambient Orbs */}
        <div className="pointer-events-none fixed top-24 right-1/3 w-80 h-80 rounded-full bg-indigo-600/15 blur-3xl animate-pulse" />
        <div className="pointer-events-none fixed bottom-24 left-1/3 w-72 h-72 rounded-full bg-emerald-600/10 blur-3xl animate-pulse delay-1000" />

        <div className="max-w-7xl mx-auto relative">
          
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg float-animation">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-emerald-200 to-teal-300 bg-clip-text text-transparent">
                  Analitik Keuangan
                </h1>
                <p className="text-white/35 text-sm mt-0.5">
                  Visualisasi lengkap performa finansialmu
                </p>
              </div>
            </div>
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="kpi-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <span className="text-[10px] text-white/30">Saldo Aktual</span>
              </div>
              <p className={`text-xl font-bold ${balance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatCurrency(Math.abs(balance))}
              </p>
              <p className="text-[10px] text-white/40 mt-1">
                {balance >= 0 ? "Saldo positif" : "Defisit"}
              </p>
            </div>

            <div className="kpi-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span className="text-[10px] text-white/30">Total Pemasukan</span>
              </div>
              <p className="text-xl font-bold text-white">{formatCurrency(totalIncome)}</p>
            </div>

            <div className="kpi-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-5 h-5 text-rose-400" />
                <span className="text-[10px] text-white/30">Total Pengeluaran</span>
              </div>
              <p className="text-xl font-bold text-white">{formatCurrency(totalExpense)}</p>
            </div>

            <div className="kpi-card rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <PiggyBank className="w-5 h-5 text-emerald-400" />
                <span className="text-[10px] text-white/30">Rasio Tabungan</span>
              </div>
              <p className="text-xl font-bold text-white">{savingsRate.toFixed(1)}%</p>
              <div className="w-full bg-white/10 rounded-full h-1 mt-2">
                <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${Math.min(savingsRate, 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Health Score & Needs vs Wants Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Financial Health Score */}
            <div className="glass-card rounded-2xl p-5 flex items-center gap-5">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle
                    cx="48" cy="48" r="42" fill="none"
                    stroke="url(#scoreGradient)" strokeWidth="8"
                    strokeDasharray={`${(healthScore.score / 100) * 264} 264`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{healthScore.score}</span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Financial Health</h3>
                <p className="text-[11px] text-white/40">Skor kesehatan keuanganmu</p>
                {healthScore.score >= 80 ? (
                  <p className="text-[10px] text-emerald-400 mt-1">Sangat Sehat! 🎉</p>
                ) : healthScore.score >= 60 ? (
                  <p className="text-[10px] text-emerald-400/70 mt-1">Cukup Sehat 💪</p>
                ) : (
                  <p className="text-[10px] text-amber-400 mt-1">Perlu Perhatian ⚠️</p>
                )}
              </div>
            </div>

            {/* Needs vs Wants */}
            <div className="glass-card rounded-2xl p-5 col-span-2">
              <div className="flex items-center gap-2 mb-3">
                {needsVsWants.ratio <= 30 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <h3 className="text-sm font-semibold text-white">Kebutuhan vs Keinginan</h3>
                <span className="text-[10px] text-white/30 ml-auto">Ideal: Keinginan ≤ 30%</span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden mb-3">
                <div className="bg-emerald-500" style={{ width: `${100 - needsVsWants.ratio}%` }} />
                <div className="bg-amber-500" style={{ width: `${needsVsWants.ratio}%` }} />
              </div>
              <div className="flex justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span className="text-white/60">Kebutuhan</span>
                  <span className="text-white font-medium">{formatCurrency(needsVsWants.needs)}</span>
                  <span className="text-white/40">({(100 - needsVsWants.ratio).toFixed(0)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span className="text-white/60">Keinginan</span>
                  <span className="text-white font-medium">{formatCurrency(needsVsWants.wants)}</span>
                  <span className="text-white/40">({needsVsWants.ratio.toFixed(0)}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            {/* Income vs Expense Bar Chart */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Pemasukan vs Pengeluaran
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={incomeVsExpense} barSize={50}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} tickFormatter={(v) => `Rp${v / 1000}k`} width={55} axisLine={false} tickLine={false} />
                  <Tooltip content={<GlassTooltip />} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {incomeVsExpense.map((entry, i) => (
                      <Cell key={i} fill={entry.name === "Pemasukan" ? "#10b981" : "#f43f5e"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly Trends Area Chart */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Tren Bulanan
              </h3>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="bulan" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickFormatter={(v) => `Rp${v / 1000}k`} width={50} axisLine={false} tickLine={false} />
                    <Tooltip content={<GlassTooltip />} />
                    <Area type="monotone" dataKey="Pemasukan" stroke="#10b981" strokeWidth={2} fill="url(#incomeGradient)" />
                    <Area type="monotone" dataKey="Pengeluaran" stroke="#f43f5e" strokeWidth={2} fill="url(#expenseGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-white/25">Belum ada data bulanan</div>
              )}
            </div>
          </div>

          {/* Second Row Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            {/* Top Spending Categories */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                Top 5 Kategori Pengeluaran
              </h3>
              <div className="space-y-3">
                {topCategories.map((cat, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/70">{cat.name}</span>
                      <span className="text-white font-medium">{formatCurrency(cat.value)}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-1.5 rounded-full" style={{ width: `${(cat.value / totalExpense) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spending by Source Pie Chart */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Pengeluaran per Dompet
              </h3>
              {sourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {sourceData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip content={<GlassTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-white/25">Belum ada data</div>
              )}
            </div>
          </div>

          {/* Insights Section */}
          {insights.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                Insights & Rekomendasi
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-white/5 rounded-xl">
                    {insight.includes("⚠️") ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    ) : insight.includes("✅") ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : insight.includes("🎉") ? (
                      <Award className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Brain className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-xs text-white/70 leading-relaxed">{insight}</p>
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