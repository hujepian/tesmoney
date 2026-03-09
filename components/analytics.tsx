"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
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
} from "recharts";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface AnalyticsProps {
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

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-foreground mb-1">{label}</p>
        <p className="text-sm font-bold text-primary">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export function Analytics({ currentUser }: AnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [incomeVsExpense, setIncomeVsExpense] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const transactions = await api.transactions.list();

      // Category Data
      const categoryMap: any = {};
      transactions
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
        });

      const categoryChart = Object.entries(categoryMap).map(
        ([name, value]: any) => ({
          name,
          value: Number.parseFloat(value.toFixed(2)),
        })
      );
      setCategoryData(categoryChart);

      // Source Data
      const sourceMap: any = {};
      transactions
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          sourceMap[t.source] = (sourceMap[t.source] || 0) + t.amount;
        });

      const sourceChart = Object.entries(sourceMap).map(
        ([name, value]: any) => ({
          name,
          value: Number.parseFloat(value.toFixed(2)),
        })
      );
      setSourceData(sourceChart);

      // Income vs Expense
      const totalIncome = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      setIncomeVsExpense([
        { name: "Pemasukan", value: Number.parseFloat(totalIncome.toFixed(2)) },
        {
          name: "Pengeluaran",
          value: Number.parseFloat(totalExpense.toFixed(2)),
        },
      ]);

      // Monthly Trends
      const monthlyMap: any = {};
      transactions.forEach((t) => {
        const month = t.date.substring(0, 7);
        if (!monthlyMap[month]) {
          monthlyMap[month] = { income: 0, expense: 0 };
        }
        if (t.type === "income") {
          monthlyMap[month].income += t.amount;
        } else {
          monthlyMap[month].expense += t.amount;
        }
      });

      const monthlyChart = Object.entries(monthlyMap)
        .sort(([a]: any) => a)
        .map(([month, data]: any) => ({
          month,
          pemasukan: Number.parseFloat(data.income.toFixed(2)),
          pengeluaran: Number.parseFloat(data.expense.toFixed(2)),
        }));
      setMonthlyData(monthlyChart);
    } catch (error) {
      console.error("Failed to load analytics", error);
    } finally {
      setLoading(false);
    }
  };

  // Expanded palette for better distinction
  const PIE_COLORS = [
    "#6366f1", // Indigo 500
    "#10b981", // Emerald 500
    "#f43f5e", // Rose 500
    "#f59e0b", // Amber 500
    "#06b6d4", // Cyan 500
    "#8b5cf6", // Violet 500
    "#d946ef", // Fuchsia 500
    "#84cc16", // Lime 500
    "#0ea5e9", // Sky 500
    "#ec4899", // Pink 500
    "#14b8a6", // Teal 500
    "#64748b", // Slate 500
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 ml-64 min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 ml-64 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Analisis Keuanganmu.
          </h1>
          <p className="text-muted-foreground mt-1">
            Perhatikan kas pemasukan dan pengeluaranmu.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income vs Expense */}
          <Card className="p-6 border-border/60 col-span-2">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Pemasukan vs Pengeluaran
            </h2>
            {incomeVsExpense[0].value > 0 || incomeVsExpense[1].value > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incomeVsExpense} barSize={50}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--muted-foreground))"
                    strokeOpacity={0.1}
                  />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    className="text-xs"
                    tickFormatter={(value) => `Rp${value / 1000}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {incomeVsExpense.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          index === 0
                            ? "hsl(var(--chart-1))"
                            : "hsl(var(--chart-2))"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground border-2 border-dashed border-muted rounded-xl bg-secondary/30">
                Data tidak tersedia
              </div>
            )}
          </Card>
          {/* Category Pie Chart */}
          <Card className="p-6 border-border/60">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Pengeluaran per Kategori
            </h2>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground border-2 border-dashed border-muted rounded-xl bg-secondary/30">
                Data tidak tersedia
              </div>
            )}
          </Card>

          <Card className="p-6 border-border/60">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Pengeluaran per Sumber Dana
            </h2>
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground border-2 border-dashed border-muted rounded-xl bg-secondary/30">
                Data tidak tersedia
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
