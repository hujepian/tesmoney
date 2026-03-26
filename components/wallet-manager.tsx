"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import {
  Trash2,
  Plus,
  Wallet,
  CreditCard,
  Banknote,
  Loader2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Sparkles,
  PiggyBank,
  Building2,
  Smartphone,
  Coins,
  Globe,
} from "lucide-react";
import { api, type Wallet as WalletType } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface WalletManagerProps {
  currentUser: string;
}

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

const WALLET_TYPES = [
  { id: "bank",    label: "Bank",     icon: Building2, gradient: "from-blue-500 to-cyan-500", bgGradient: "from-blue-500/20 to-cyan-500/10" },
  { id: "ewallet", label: "E-Wallet", icon: Smartphone, gradient: "from-purple-500 to-pink-500", bgGradient: "from-purple-500/20 to-pink-500/10" },
  { id: "cash",    label: "Tunai",    icon: Coins, gradient: "from-emerald-500 to-teal-500", bgGradient: "from-emerald-500/20 to-teal-500/10" },
  { id: "other",   label: "Lainnya",  icon: Globe, gradient: "from-slate-500 to-zinc-500", bgGradient: "from-slate-500/20 to-zinc-500/10" },
];

export function WalletManager({ currentUser }: WalletManagerProps) {
  const [wallets, setWallets] = useState<
    (WalletType & { currentBalance: number })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [newWallet, setNewWallet] = useState({
    name: "",
    type: "bank",
    initial_balance: "",
  });

  useEffect(() => { loadWallets(); }, []);

  const loadWallets = async () => {
    try {
      const [walletsData, transactionsData] = await Promise.all([
        api.wallets.list(),
        api.transactions.list(),
      ]);

      const walletsWithBalance = walletsData.map((wallet) => {
        const txs = transactionsData.filter((t) => t.wallet_id === wallet.id);
        const income  = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        return { ...wallet, currentBalance: wallet.initial_balance + income - expense };
      });

      setWallets(walletsWithBalance);
    } catch {
      toast.error("Gagal memuat data dompet");
    } finally {
      setLoading(false);
    }
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setNewWallet({ ...newWallet, initial_balance: v === "" ? "" : formatInputCurrency(v) });
  };

  const addWallet = async () => {
    if (!newWallet.name) { toast.error("Nama dompet harus diisi"); return; }

    setSubmitting(true);
    try {
      const wallet = await api.wallets.add({
        name: newWallet.name,
        type: newWallet.type,
        initial_balance: parseInputCurrency(newWallet.initial_balance),
        color: "#4f46e5",
      });
      setWallets([...wallets, { ...wallet, currentBalance: wallet.initial_balance }]);
      setNewWallet({ name: "", type: "bank", initial_balance: "" });
      setFormOpen(false);
      toast.success("Dompet berhasil ditambahkan");
    } catch {
      toast.error("Gagal menambah dompet");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteWallet = async (id: string) => {
    if (!confirm("Yakin hapus dompet ini? Riwayat transaksi terkait mungkin kehilangan referensi."))
      return;
    try {
      await api.wallets.delete(id);
      setWallets(wallets.filter((w) => w.id !== id));
      toast.success("Dompet dihapus");
    } catch {
      toast.error("Gagal menghapus dompet");
    }
  };

  // Total saldo semua dompet
  const totalBalance = wallets.reduce((s, w) => s + w.currentBalance, 0);
  const positiveWallets = wallets.filter(w => w.currentBalance > 0).length;
  const negativeWallets = wallets.filter(w => w.currentBalance < 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#030014] via-[#0a0a2a] to-[#000000] selection:bg-emerald-500/30">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-600/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/30 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-600/20 rounded-full blur-[150px]" />
      </div>

      <div className="relative p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">

          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/30">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white via-emerald-200 to-teal-300 bg-clip-text text-transparent">
                    Kelola Dompet
                  </h1>
                </div>
                <p className="text-slate-400 text-sm ml-2">
                  Atur semua sumber keuanganmu dalam satu tempat
                </p>
              </div>

              <Button
                onClick={() => setFormOpen(!formOpen)}
                className="group relative bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-2xl h-12 px-6 shadow-xl shadow-emerald-600/30 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                {formOpen ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Tutup Form
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Dompet
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          {/* Layout Grid */}
          <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-4 lg:space-y-0">

            {/* ── FORM ── */}
            <AnimatePresence>
              {(formOpen || window.innerWidth >= 1024) && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="lg:block"
                >
                  <Card className="relative overflow-hidden bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl border border-white/20 rounded-3xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                    
                    <div className="relative p-6">
                      <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-emerald-500/20 rounded-xl">
                          <Sparkles className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h2 className="text-lg font-bold text-white">
                          Tambah Dompet Baru
                        </h2>
                      </div>

                      <div className="space-y-5">
                        <div>
                          <label className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
                            <Wallet className="w-4 h-4" />
                            Nama Dompet
                          </label>
                          <Input
                            placeholder="Contoh: BCA Utama, GoPay, Tunai"
                            value={newWallet.name}
                            onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })}
                            className="bg-black/30 border-white/10 rounded-xl h-11 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/30 transition-all"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
                            <CreditCard className="w-4 h-4" />
                            Tipe Dompet
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {WALLET_TYPES.map((type) => {
                              const Icon = type.icon;
                              const isActive = newWallet.type === type.id;
                              return (
                                <button
                                  key={type.id}
                                  onClick={() => setNewWallet({ ...newWallet, type: type.id })}
                                  className={`group relative flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                                    isActive
                                      ? `bg-gradient-to-r ${type.gradient} text-white shadow-lg scale-[1.02]`
                                      : "bg-black/30 border border-white/10 text-slate-400 hover:bg-white/10 hover:scale-[1.02]"
                                  }`}
                                >
                                  <Icon className="w-4 h-4" />
                                  {type.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
                            <Coins className="w-4 h-4" />
                            Saldo Awal
                          </label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="Rp 0"
                            value={newWallet.initial_balance}
                            onChange={handleBalanceChange}
                            className="bg-black/30 border-white/10 rounded-xl h-11 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/30 transition-all"
                          />
                          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Saldo awal yang tersedia saat ini
                          </p>
                        </div>

                        <Button
                          onClick={addWallet}
                          disabled={submitting}
                          className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                        >
                          {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Plus className="w-4 h-4 mr-2" />
                          )}
                          Simpan Dompet
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── DAFTAR DOMPET ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Banner Total Saldo */}
              {wallets.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="relative overflow-hidden bg-gradient-to-r from-emerald-600/20 via-teal-600/10 to-transparent backdrop-blur-xl border border-emerald-500/30 rounded-2xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent" />
                    <div className="relative p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <PiggyBank className="w-3 h-3" />
                            Total Kekayaan
                          </p>
                          <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                            {formatCurrency(totalBalance)}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {positiveWallets} dompet positif
                            </span>
                            {negativeWallets > 0 && (
                              <span className="text-xs text-rose-400 flex items-center gap-1">
                                <TrendingDown className="w-3 h-3" />
                                {negativeWallets} dompet negatif
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                          <Wallet className="w-7 h-7 text-white" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* Grid Kartu Dompet */}
              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
                    <div className="absolute inset-0 blur-xl bg-emerald-500/30 rounded-full animate-pulse" />
                  </div>
                </div>
              ) : wallets.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-20 border-2 border-dashed border-white/10 rounded-3xl bg-white/5 backdrop-blur-sm"
                >
                  <div className="relative inline-block">
                    <Wallet className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <Sparkles className="w-8 h-8 text-emerald-400 absolute -top-2 -right-2 animate-pulse" />
                  </div>
                  <p className="text-slate-400 font-medium">Belum ada dompet</p>
                  <p className="text-slate-500 text-sm mt-1">Tambahkan dompet pertama untuk mulai mengelola keuangan</p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {wallets.map((wallet, index) => {
                    const typeInfo = WALLET_TYPES.find((t) => t.id === wallet.type) ?? WALLET_TYPES[3];
                    const Icon = typeInfo.icon;
                    const isNegative = wallet.currentBalance < 0;
                    const isPositive = wallet.currentBalance > 0;
                    const percentageChange = wallet.initial_balance !== 0 
                      ? ((wallet.currentBalance - wallet.initial_balance) / Math.abs(wallet.initial_balance)) * 100 
                      : wallet.currentBalance > 0 ? 100 : 0;

                    return (
                      <motion.div
                        key={wallet.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="group relative overflow-hidden rounded-2xl backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/10 hover:border-emerald-500/30">
                          {/* Background Gradient */}
                          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r ${typeInfo.bgGradient} blur-3xl pointer-events-none`} />
                          
                          <div className="relative p-5">
                            {/* Tombol Hapus */}
                            <button
                              onClick={() => deleteWallet(wallet.id)}
                              className="absolute top-3 right-3 p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 z-10"
                              aria-label="Hapus dompet"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-3 mb-4">
                              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${typeInfo.gradient} flex items-center justify-center shadow-lg`}>
                                <Icon className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0 pr-6">
                                <h3 className="font-bold text-white text-lg truncate">{wallet.name}</h3>
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${typeInfo.gradient}`} />
                                  {typeInfo.label}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between items-baseline">
                                <span className="text-xs text-slate-400 font-medium">Saldo Saat Ini</span>
                                {Math.abs(percentageChange) > 0 && wallet.initial_balance !== wallet.currentBalance && (
                                  <span className={`text-xs font-medium flex items-center gap-0.5 ${percentageChange > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {percentageChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {Math.abs(percentageChange).toFixed(1)}%
                                  </span>
                                )}
                              </div>
                              <p className={`text-2xl font-bold tracking-tight ${
                                isNegative ? "text-rose-400" : isPositive ? "text-white" : "text-slate-400"
                              }`}>
                                {formatCurrency(wallet.currentBalance)}
                              </p>
                              {wallet.initial_balance !== wallet.currentBalance && (
                                <p className="text-xs text-slate-500">
                                  Awal: {formatCurrency(wallet.initial_balance)}
                                </p>
                              )}
                            </div>

                            {/* Progress Indicator */}
                            {wallet.initial_balance > 0 && wallet.currentBalance !== wallet.initial_balance && (
                              <div className="mt-3">
                                <div className="w-full bg-slate-800/50 rounded-full h-1 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(Math.abs((wallet.currentBalance / wallet.initial_balance) * 100), 100)}%` }}
                                    className={`h-full rounded-full ${percentageChange > 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-rose-500 to-orange-500'}`}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}