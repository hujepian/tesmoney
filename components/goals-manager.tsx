"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import {
  Trash2, Plus, CheckCircle2, Loader2, Trophy, Calendar, Star, Target, Sparkles, TrendingUp, Clock, Award
} from "lucide-react";
import { api, type Goal } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Helpers
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

interface GoalsManagerProps {
  currentUser: string;
}

interface GoalItemProps {
  goal: Goal;
  onUpdateAmount: (id: string, amount: number) => void;
  onDelete: (id: string) => void;
}

export function GoalsManager({ currentUser }: GoalsManagerProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: "", targetAmount: "", deadline: "" });

  useEffect(() => { loadGoals(); }, []);

  const loadGoals = async () => {
    try {
      setGoals(await api.goals.list());
    } catch {
      toast.error("Gagal memuat target");
    } finally {
      setLoading(false);
    }
  };

  const handleTargetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setNewGoal({ ...newGoal, targetAmount: v === "" ? "" : formatInputCurrency(v) });
  };

  const addGoal = async () => {
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.deadline) {
      toast.error("Silakan isi semua field");
      return;
    }
    try {
      const goal = await api.goals.add({
        name: newGoal.name,
        target_amount: parseInputCurrency(newGoal.targetAmount),
        deadline: newGoal.deadline,
      });
      setGoals([goal, ...goals]);
      setNewGoal({ name: "", targetAmount: "", deadline: "" });
      setFormOpen(false);
      toast.success("Target berhasil ditambahkan");
    } catch {
      toast.error("Gagal menambah target");
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      await api.goals.delete(id);
      setGoals(goals.filter((g) => g.id !== id));
      toast.success("Target dihapus");
    } catch {
      toast.error("Gagal menghapus target");
    }
  };

  const updateGoalAmount = async (id: string, amount: number) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;
    const newAmount = Math.max(0, Math.min(amount, goal.target_amount));
    try {
      await api.goals.updateAmount(id, newAmount);
      setGoals(goals.map((g) => g.id === id ? { ...g, current_amount: newAmount } : g));
      if (newAmount >= goal.target_amount) {
        toast.success("Selamat! Target tercapai! 🎉");
      } else {
        toast.success("Progress diperbarui");
      }
    } catch {
      toast.error("Gagal memperbarui progress");
    }
  };

  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#030014] via-[#0a0a2a] to-[#000000] selection:bg-violet-500/30">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-600/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/30 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-600/20 rounded-full blur-[150px]" />
      </div>

      <div className="relative p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">

          {/* Header Section with Stats */}
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-500/30">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white via-violet-200 to-purple-300 bg-clip-text text-transparent">
                    Financial Goals
                  </h1>
                </div>
                <p className="text-slate-400 text-sm ml-2">
                  Wujudkan impian finansialmu satu langkah setiap hari
                </p>
              </div>

              <Button
                onClick={() => setFormOpen(!formOpen)}
                className="group relative bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-2xl h-12 px-6 shadow-xl shadow-violet-600/30 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                {formOpen ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Tutup Form
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Buat Target Baru
                  </>
                )}
              </Button>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6"
            >
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Tabungan</p>
                    <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totalSaved)}</p>
                  </div>
                  <div className="p-2 bg-violet-500/20 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-violet-400" />
                  </div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Target</p>
                    <p className="text-2xl font-bold text-white mt-1">{formatCurrency(totalTarget)}</p>
                  </div>
                  <div className="p-2 bg-emerald-500/20 rounded-xl">
                    <Award className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Progress Keseluruhan</p>
                    <p className="text-2xl font-bold text-white mt-1">{Math.round(overallProgress)}%</p>
                  </div>
                  <div className="p-2 bg-amber-500/20 rounded-xl">
                    <Trophy className="w-5 h-5 text-amber-400" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Form Tambah Target */}
          <AnimatePresence>
            {formOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden mb-8"
              >
                <Card className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Nama Impian
                      </label>
                      <Input
                        placeholder="Contoh: Liburan ke Eropa"
                        value={newGoal.name}
                        onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                        className="bg-black/30 border-white/10 rounded-xl h-11 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/30 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Target Dana
                      </label>
                      <Input
                        placeholder="Rp 0"
                        type="text"
                        inputMode="numeric"
                        value={newGoal.targetAmount}
                        onChange={handleTargetAmountChange}
                        className="bg-black/30 border-white/10 rounded-xl h-11 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/30 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Deadline
                      </label>
                      <Input
                        type="date"
                        value={newGoal.deadline}
                        onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                        className="bg-black/30 border-white/10 rounded-xl h-11 text-white focus:border-violet-500 focus:ring-violet-500/30 transition-all"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={addGoal}
                        className="w-full h-11 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Simpan Target
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Daftar Goals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
              <div className="col-span-full flex justify-center py-20">
                <div className="relative">
                  <Loader2 className="w-12 h-12 animate-spin text-violet-500" />
                  <div className="absolute inset-0 blur-xl bg-violet-500/30 rounded-full animate-pulse" />
                </div>
              </div>
            ) : goals.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="col-span-full text-center py-20 border-2 border-dashed border-white/10 rounded-3xl bg-white/5 backdrop-blur-sm"
              >
                <div className="relative inline-block">
                  <Star className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <Sparkles className="w-8 h-8 text-violet-400 absolute -top-2 -right-2 animate-pulse" />
                </div>
                <p className="text-slate-400 font-medium">Belum ada target finansial</p>
                <p className="text-slate-500 text-sm mt-1">Mulai wujudkan impianmu sekarang!</p>
              </motion.div>
            ) : (
              goals.map((goal, index) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GoalItem
                    goal={goal}
                    onUpdateAmount={updateGoalAmount}
                    onDelete={deleteGoal}
                  />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoalItem({ goal, onUpdateAmount, onDelete }: GoalItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editAmount, setEditAmount] = useState(goal.current_amount.toString());
  const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
  const isCompleted = goal.current_amount >= goal.target_amount;
  const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysLeft <= 7 && daysLeft > 0 && !isCompleted;

  const handleSave = () => {
    onUpdateAmount(goal.id, Number(editAmount));
    setIsEditing(false);
  };

  return (
    <Card className={`group relative overflow-hidden rounded-3xl backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
      isCompleted
        ? "bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-transparent border-emerald-500/30"
        : isUrgent
        ? "bg-gradient-to-br from-orange-500/20 via-red-500/10 to-transparent border-orange-500/30"
        : "bg-gradient-to-br from-white/10 via-white/5 to-transparent border-white/10 hover:border-violet-500/30"
    }`}>
      {/* Glow Effect */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${
        isCompleted ? "bg-emerald-500/5" : "bg-violet-500/5"
      } blur-xl`} />
      
      <div className="relative p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {goal.name}
              {isUrgent && !isCompleted && (
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Urgent
                </span>
              )}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(goal.deadline).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              {!isCompleted && daysLeft > 0 && (
                <p className={`text-xs flex items-center gap-1 ${daysLeft <= 7 ? 'text-orange-400' : 'text-slate-400'}`}>
                  <Clock className="w-3 h-3" />
                  {daysLeft} hari tersisa
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={() => onDelete(goal.id)}
            size="sm"
            variant="ghost"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400 font-medium">Progress</span>
            <span className={`font-bold ${isCompleted ? 'text-emerald-400' : 'text-violet-400'}`}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="relative w-full bg-slate-800/50 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full rounded-full ${
                isCompleted
                  ? "bg-gradient-to-r from-emerald-400 to-green-500"
                  : "bg-gradient-to-r from-violet-500 to-purple-500"
              }`}
            />
            {progress > 0 && progress < 100 && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-shimmer" />
            )}
          </div>
        </div>

        <div className="flex justify-between items-baseline">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white">{formatCurrency(goal.current_amount)}</p>
            <p className="text-xs text-slate-500">dari {formatCurrency(goal.target_amount)}</p>
          </div>
          {isCompleted && (
            <div className="flex items-center gap-1 bg-emerald-500/20 px-3 py-1 rounded-full">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">Tercapai!</span>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="flex gap-2 pt-2">
            <Input
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className="bg-black/50 border-white/10 rounded-xl h-10 text-white focus:border-violet-500"
            />
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold rounded-xl px-4"
            >
              Simpan
            </Button>
            <Button
              onClick={() => setIsEditing(false)}
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"
            >
              Batal
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setIsEditing(true)}
            disabled={isCompleted}
            className={`w-full font-semibold rounded-xl h-10 transition-all ${
              isCompleted
                ? "bg-slate-700/50 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg hover:shadow-violet-600/30 hover:scale-[1.02] active:scale-95"
            }`}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isCompleted ? "Target Tercapai" : "Tambah Progress"}
          </Button>
        )}
      </div>
    </Card>
  );
}