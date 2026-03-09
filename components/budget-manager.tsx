"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { api, type Budget } from "@/lib/api";
import { toast } from "sonner";

interface BudgetManagerProps {
  currentUser: string;
}

interface BudgetWithSpent extends Budget {
  spent: number;
}

const CATEGORIES = [
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

export function BudgetManager({ currentUser }: BudgetManagerProps) {
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: CATEGORIES[0],
    limit: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [budgetsData, transactionsData] = await Promise.all([
        api.budgets.list(),
        api.transactions.list(),
      ]);

      const budgetsWithSpent = budgetsData.map((budget) => {
        const spent = transactionsData
          .filter((t) => t.type === "expense" && t.category === budget.category)
          .reduce((sum, t) => sum + t.amount, 0);
        return { ...budget, spent };
      });

      setBudgets(budgetsWithSpent);
    } catch (error) {
      toast.error("Gagal memuat data budget");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setFormData({ ...formData, limit: "" });
      return;
    }
    const formatted = formatInputCurrency(value);
    setFormData({ ...formData, limit: formatted });
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.limit) return;

    setSubmitting(true);
    try {
      const existing = budgets.find((b) => b.category === formData.category);
      const numericLimit = parseInputCurrency(formData.limit);

      if (existing) {
        await api.budgets.updateLimit(existing.id, numericLimit);
        setBudgets(
          budgets.map((b) =>
            b.id === existing.id ? { ...b, limit_amount: numericLimit } : b
          )
        );
        toast.success("Budget diperbarui");
      } else {
        const newBudget = await api.budgets.add({
          category: formData.category,
          limit_amount: numericLimit,
        });
        setBudgets([...budgets, { ...newBudget, spent: 0 }]);
        toast.success("Budget ditambahkan");
      }

      setFormData({ category: CATEGORIES[0], limit: "" });
    } catch (error) {
      toast.error("Gagal menyimpan budget");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.budgets.delete(id);
      setBudgets(budgets.filter((b) => b.id !== id));
      toast.success("Budget dihapus");
    } catch (error) {
      toast.error("Gagal menghapus budget");
      console.error(error);
    }
  };

  return (
    <div className="p-8 ml-64 bg-background min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Manajemen Budget
          </h1>
          <p className="text-muted-foreground mt-1">
            Jaga pengeluaranmu agar tetap on track.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <Card className="p-6 border-border/60">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Set Budget Bulanan
            </h2>
            <form onSubmit={handleAddBudget} className="space-y-4">
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
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  Batas Maksimal (Rp)
                </label>
                <Input
                  type="text"
                  placeholder="0"
                  value={formData.limit}
                  onChange={handleLimitChange}
                  className="mt-2 bg-background"
                />
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Simpan Budget
              </Button>
            </form>
          </Card>

          {/* List */}
          <Card className="lg:col-span-2 p-6 border-border/60">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Budget Aktif ({budgets.length})
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto w-full pr-2 custom-scrollbar">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : budgets.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-muted rounded-xl bg-secondary/30">
                  <p className="text-muted-foreground">
                    Belum ada budget yang diatur
                  </p>
                </div>
              ) : (
                budgets.map((budget) => {
                  const percentage = (budget.spent / budget.limit_amount) * 100;
                  const isOverBudget = budget.spent > budget.limit_amount;

                  return (
                    <div
                      key={budget.id}
                      className="p-5 border border-border/50 rounded-xl bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {budget.category}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Terpakai:{" "}
                            <span className="text-foreground font-medium">
                              {formatCurrency(budget.spent)}
                            </span>{" "}
                            dari {formatCurrency(budget.limit_amount)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(budget.id)}
                          className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                          <div className="text-right">
                            <span
                              className={`text-xs font-semibold inline-block ${
                                isOverBudget
                                  ? "text-rose-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                              isOverBudget ? "bg-rose-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                        {isOverBudget && (
                          <p className="text-xs text-rose-500 mt-2 font-medium flex items-center gap-1">
                            Over budget sebesar{" "}
                            {formatCurrency(budget.spent - budget.limit_amount)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
