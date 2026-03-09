"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { Trash2, Plus, CheckCircle2, Loader2, Trophy } from "lucide-react";
import { api, type Goal } from "@/lib/api";
import { toast } from "sonner";

interface GoalsManagerProps {
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

// Helper to format input value with dots
const formatInputCurrency = (value: string) => {
  const number = value.replace(/\D/g, "");
  return new Intl.NumberFormat("id-ID").format(Number(number) || 0);
};

// Helper to parse formatted input back to number
const parseInputCurrency = (value: string) => {
  return Number(value.replace(/\./g, ""));
};

export function GoalsManager({ currentUser }: GoalsManagerProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGoal, setNewGoal] = useState({
    name: "",
    targetAmount: "",
    deadline: "",
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await api.goals.list();
      setGoals(data);
    } catch (error) {
      toast.error("Gagal memuat target");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTargetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setNewGoal({ ...newGoal, targetAmount: "" });
      return;
    }
    const formatted = formatInputCurrency(value);
    setNewGoal({ ...newGoal, targetAmount: formatted });
  };

  const addGoal = async () => {
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.deadline) {
      toast.error("Silakan isi semua field");
      return;
    }

    try {
      const numericTarget = parseInputCurrency(newGoal.targetAmount);
      const goal = await api.goals.add({
        name: newGoal.name,
        target_amount: numericTarget,
        deadline: newGoal.deadline,
      });

      setGoals([goal, ...goals]);
      setNewGoal({ name: "", targetAmount: "", deadline: "" });
      toast.success("Target berhasil ditambahkan");
    } catch (error) {
      toast.error("Gagal menambah target");
      console.error(error);
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      await api.goals.delete(id);
      setGoals(goals.filter((g) => g.id !== id));
      toast.success("Target dihapus");
    } catch (error) {
      toast.error("Gagal menghapus target");
      console.error(error);
    }
  };

  const updateGoalAmount = async (id: string, amount: number) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    // Ensure we don't exceed target or go below 0
    const newAmount = Math.max(0, Math.min(amount, goal.target_amount));

    try {
      await api.goals.updateAmount(id, newAmount);
      setGoals(
        goals.map((g) =>
          g.id === id ? { ...g, current_amount: newAmount } : g
        )
      );
      toast.success("Progress diperbarui");
    } catch (error) {
      toast.error("Gagal memperbarui progress");
      console.error(error);
    }
  };

  return (
    <div className="p-8 ml-64 bg-background min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Financial Goals
          </h1>
          <p className="text-muted-foreground mt-1">
            Wujudkan impianmu satu per satu.
          </p>
        </div>

        {/* Add New Goal */}
        <Card className="p-6 mb-8 border-border/60 bg-gradient-to-r from-indigo-50/50 to-bg-background">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Buat Target Baru
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Nama target (misal: Beli Laptop)"
              value={newGoal.name}
              onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
              className="bg-background"
            />
            <Input
              placeholder="Target jumlah (Rp)"
              type="text"
              value={newGoal.targetAmount}
              onChange={handleTargetAmountChange}
              className="bg-background"
            />
            <Input
              placeholder="Deadline"
              type="date"
              value={newGoal.deadline}
              onChange={(e) =>
                setNewGoal({ ...newGoal, deadline: e.target.value })
              }
              className="bg-background"
            />
            <Button
              onClick={addGoal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Tambah
            </Button>
          </div>
        </Card>

        {/* Goals List */}
        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : goals.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-muted rounded-xl bg-secondary/30">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">
                Belum ada target. Mulai buat target pertamamu!
              </p>
            </div>
          ) : (
            goals.map((goal) => (
              <GoalItem
                key={goal.id}
                goal={goal}
                onUpdateAmount={updateGoalAmount}
                onDelete={deleteGoal}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface GoalItemProps {
  goal: Goal;
  onUpdateAmount: (id: string, amount: number) => void;
  onDelete: (id: string) => void;
}

function GoalItem({ goal, onUpdateAmount, onDelete }: GoalItemProps) {
  const [inputAmount, setInputAmount] = useState("");

  const getProgressPercentage = (goal: Goal) => {
    return (goal.current_amount / goal.target_amount) * 100;
  };

  const isGoalCompleted = (goal: Goal) => {
    return goal.current_amount >= goal.target_amount;
  };

  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const difference = deadlineDate.getTime() - today.getTime();
    const days = Math.ceil(difference / (1000 * 3600 * 24));
    return days;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setInputAmount("");
      return;
    }
    const formatted = formatInputCurrency(value);
    setInputAmount(formatted);
  };

  const handleSave = () => {
    const amount = parseInputCurrency(inputAmount);
    if (amount > 0) {
      onUpdateAmount(goal.id, goal.current_amount + amount);
      setInputAmount("");
    }
  };

  const progress = getProgressPercentage(goal);
  const completed = isGoalCompleted(goal);
  const daysLeft = getDaysRemaining(goal.deadline);

  return (
    <Card
      className={`p-6 border-border/60 transition-all duration-300 ${
        completed
          ? "bg-emerald-50/50 border-emerald-200"
          : "hover:shadow-md bg-card"
      }`}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-foreground tracking-tight">
              {goal.name}
            </h3>
            {completed && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Target:{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(goal.target_amount)}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p
            className={`text-3xl font-bold ${
              completed ? "text-emerald-600" : "text-indigo-600"
            }`}
          >
            {Math.round(progress)}%
          </p>
          <p
            className={`text-sm mt-1 font-medium ${
              daysLeft > 0 ? "text-muted-foreground" : "text-rose-500"
            }`}
          >
            {daysLeft > 0 ? `${daysLeft} hari lagi` : "Deadline terlampaui"}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-foreground">
            Terkumpul: {formatCurrency(goal.current_amount)}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.max(0, goal.target_amount - goal.current_amount) === 0
              ? "Selesai!"
              : `${formatCurrency(
                  goal.target_amount - goal.current_amount
                )} lagi`}
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              completed ? "bg-emerald-500" : "bg-indigo-500"
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Amount Input and Actions */}
      <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-xl border border-border/50">
        {!completed ? (
          <>
            <p className="text-sm font-medium text-foreground mr-2">
              Update Tabungan:
            </p>
            <div className="flex-1 flex gap-2">
              <Input
                type="text"
                placeholder="Tambah nominal (Rp)"
                value={inputAmount}
                onChange={handleInputChange}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSave();
                  }
                }}
                className="bg-background h-9"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSave}
                className="border-primary text-primary hover:bg-primary/10 h-9"
              >
                Simpan
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center gap-2 text-emerald-600 font-medium">
            <CheckCircle2 className="w-5 h-5" />
            <span>Target telah tercapai! Selamat!</span>
          </div>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(goal.id)}
          className="text-muted-foreground hover:text-rose-600 hover:bg-rose-50 h-9 px-3"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
