"use client";
import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api, type Transaction } from "@/lib/api";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface DashboardProps {
  currentUser: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function Dashboard({ currentUser }: DashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    budgetUsed: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [transactionsData, budgetsData] = await Promise.all([
        api.transactions.list(),
        api.budgets.list(),
      ]);

      const totalIncome = transactionsData
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = transactionsData
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      const balance = totalIncome - totalExpense;

      const budgetUsed = budgetsData.reduce((sum, budget) => {
        const spentForBudget = transactionsData
          .filter((t) => t.type === "expense" && t.category === budget.category)
          .reduce((s, t) => s + t.amount, 0);
        return sum + spentForBudget;
      }, 0);

      setStats({
        totalIncome,
        totalExpense,
        balance,
        budgetUsed,
      });
    } catch (error) {
      toast.error("Gagal memuat data dasbor");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: "Total Pemasukan",
      value: formatCurrency(stats.totalIncome),
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      trend: "+12.5% dari bulan lalu", // Dummy trend for visuals
    },
    {
      label: "Total Pengeluaran",
      value: formatCurrency(stats.totalExpense),
      icon: TrendingDown,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
      trend: "+2.1% dari bulan lalu",
    },
    {
      label: "Saldo Saat Ini",
      value: formatCurrency(stats.balance),
      icon: Wallet,
      color: `text-${stats.balance >= 0 ? "indigo-500" : "rose-500"}`,
      bgColor: `bg-${stats.balance >= 0 ? "indigo-500" : "rose-500"}/10`,
      trend: "Total Aset Bersih",
    },
    {
      label: "Budget Terpakai",
      value: formatCurrency(stats.budgetUsed),
      icon: Target,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      trend: "Total Tracking Budget",
    },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen md:ml-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 md:ml-64 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Ringkasan Keuangan
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Pantau arus kas dan kesehatan finansialmu.
            </p>
          </div>
          <div className="text-sm text-muted-foreground bg-card px-3 py-1 rounded-full border border-border shadow-sm">
            Hari ini: {formatDate(new Date(), { dateStyle: "long" })}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={index}
                className="p-5 hover:shadow-md transition-shadow border-border/60"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`${stat.bgColor} p-2.5 rounded-lg`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  {index < 2 && (
                    <span
                      className={`text-xs flex items-center font-medium ${
                        index === 0
                          ? "text-emerald-600 bg-emerald-50"
                          : "text-rose-600 bg-rose-50"
                      } px-2 py-0.5 rounded-full`}
                    >
                      {index === 0 ? (
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 mr-1" />
                      )}
                      {index === 0 ? "2.5%" : "1.2%"}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {stat.label}
                  </p>
                  {/* text-lg untuk HP, md:text-2xl untuk Desktop */}
<h3 className="text-lg md:text-2xl font-bold text-foreground tracking-tight truncate">
  {stat.value}
</h3>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity & Charts */}
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <Card className="lg:col-span-2 p-6 border-border/60">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Transaksi Terbaru
              </h2>
            </div>
            <RecentTransactions />
          </Card>

          <Card className="p-6 border-border/60">
            <h2 className="text-lg font-semibold text-foreground mb-6">
              Distribusi Pengeluaran
            </h2>
            <SpendingBySource />
          </Card>
        </div>
      </div>
    </div>
  );
}

function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.transactions.list().then((data) => {
      setTransactions(data.reverse());
      setLoading(false);
    });
  }, []);

  if (loading)
    return <p className="text-muted-foreground text-sm">Memuat data...</p>;

  return (
    <div className="space-y-0">
      {transactions.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-muted rounded-xl">
          <p className="text-muted-foreground">Belum ada transaksi</p>
        </div>
      ) : (
        transactions.map((t, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-4 border-b border-border/50 last:border-0 hover:bg-muted/30 px-2 -mx-2 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  t.type === "income"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-rose-100 text-rose-600"
                }`}
              >
                {t.type === "income" ? (
                  <ArrowUpRight className="w-5 h-5" />
                ) : (
                  <ArrowDownRight className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="font-medium text-foreground">{t.description}</p>
                <p className="text-xs text-muted-foreground">
                  {t.category} • {t.source}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p
                className={`font-semibold ${
                  t.type === "income" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {t.type === "income" ? "+" : "-"} {formatCurrency(t.amount)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(t.date, {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SpendingBySource() {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.transactions.list().then((transactions) => {
      const sourceMap: any = {};
      transactions
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          sourceMap[t.source] = (sourceMap[t.source] || 0) + t.amount;
        });

      const sorted = Object.entries(sourceMap)
        .map(([name, amount]: any) => ({ name, amount }))
        .sort((a: any, b: any) => b.amount - a.amount);

      setSources(sorted);
      setLoading(false);
    });
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading)
    return <p className="text-muted-foreground text-sm">Memuat...</p>;

  return (
    <div className="space-y-4">
      {sources.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">Tidak ada data</p>
      ) : (
        sources.map((src: any, i: number) => (
          <div key={i}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-foreground">
                {src.name}
              </span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(src.amount)}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-full rounded-full"
                style={{
                  width: `${
                    (src.amount /
                      sources.reduce((sum: any, s: any) => sum + s.amount, 0)) *
                    100
                  }%`,
                }}
              ></div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
