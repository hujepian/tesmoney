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
} from "lucide-react";
import { api, type Wallet as WalletType } from "@/lib/api";
import { toast } from "sonner";

interface WalletManagerProps {
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

const WALLET_TYPES = [
  { id: "bank", label: "Bank", icon: CreditCard },
  { id: "ewallet", label: "E-Wallet", icon: Wallet },
  { id: "cash", label: "Tunai", icon: Banknote },
  { id: "other", label: "Lainnya", icon: Wallet },
];

export function WalletManager({ currentUser }: WalletManagerProps) {
  const [wallets, setWallets] = useState<
    (WalletType & { currentBalance: number })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newWallet, setNewWallet] = useState({
    name: "",
    type: "bank",
    initial_balance: "",
  });

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      const [walletsData, transactionsData] = await Promise.all([
        api.wallets.list(),
        api.transactions.list(),
      ]);

      // Calculate current balance for each wallet
      const walletsWithBalance = walletsData.map((wallet) => {
        const walletTransactions = transactionsData.filter(
          (t) => t.wallet_id === wallet.id
        );

        const income = walletTransactions
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0);

        const expense = walletTransactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          ...wallet,
          currentBalance: wallet.initial_balance + income - expense,
        };
      });

      setWallets(walletsWithBalance);
    } catch (error) {
      toast.error("Gagal memuat data dompet");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setNewWallet({ ...newWallet, initial_balance: "" });
      return;
    }
    const formatted = formatInputCurrency(value);
    setNewWallet({ ...newWallet, initial_balance: formatted });
  };

  const addWallet = async () => {
    if (!newWallet.name) {
      toast.error("Nama dompet harus diisi");
      return;
    }

    setSubmitting(true);
    try {
      const numericBalance = parseInputCurrency(newWallet.initial_balance);
      const wallet = await api.wallets.add({
        name: newWallet.name,
        type: newWallet.type,
        initial_balance: numericBalance,
        color: "#4f46e5", // Default color
      });

      setWallets([
        ...wallets,
        { ...wallet, currentBalance: wallet.initial_balance },
      ]);
      setNewWallet({ name: "", type: "bank", initial_balance: "" });
      toast.success("Dompet berhasil ditambahkan");
    } catch (error) {
      toast.error("Gagal menambah dompet");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteWallet = async (id: string) => {
    if (
      !confirm(
        "Yakin hapus dompet ini? Riwayat transaksi terkait mungkin ikut terhapus atau kehilangan referensi."
      )
    )
      return;

    try {
      await api.wallets.delete(id);
      setWallets(wallets.filter((w) => w.id !== id));
      toast.success("Dompet dihapus");
    } catch (error) {
      toast.error("Gagal menghapus dompet");
      console.error(error);
    }
  };

  return (
    <div className="p-8 ml-64 bg-background min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Dompet Saya</h1>
          <p className="text-muted-foreground mt-1">
            Kelola berbagai sumber danamu di sini.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <Card className="p-6 border-border/60 order-last lg:order-first h-fit">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Tambah Dompet
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">
                  Nama Dompet
                </label>
                <Input
                  placeholder="Contoh: BCA Utama, GoPay, Dompet Saku"
                  value={newWallet.name}
                  onChange={(e) =>
                    setNewWallet({ ...newWallet, name: e.target.value })
                  }
                  className="mt-2 bg-background"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  Tipe
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {WALLET_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() =>
                          setNewWallet({ ...newWallet, type: type.id })
                        }
                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                          newWallet.type === type.id
                            ? "bg-primary/10 border-primary text-primary"
                            : "border-input hover:bg-secondary text-muted-foreground"
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
                <label className="text-sm font-medium text-foreground">
                  Saldo Awal (Rp)
                </label>
                <Input
                  type="text"
                  placeholder="0"
                  value={newWallet.initial_balance}
                  onChange={handleBalanceChange}
                  className="mt-2 bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Saldo saat ini di akun tersebut.
                </p>
              </div>

              <Button
                onClick={addWallet}
                className="w-full gap-2"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Simpan Dompet
              </Button>
            </div>
          </Card>

          {/* List */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : wallets.length === 0 ? (
              <div className="col-span-full text-center py-12 border-2 border-dashed border-muted rounded-xl bg-secondary/30">
                <p className="text-muted-foreground">
                  Belum ada dompet. Tambahkan yang pertama!
                </p>
              </div>
            ) : (
              wallets.map((wallet) => {
                const typeInfo =
                  WALLET_TYPES.find((t) => t.id === wallet.type) ||
                  WALLET_TYPES[3];
                const Icon = typeInfo.icon;
                return (
                  <Card
                    key={wallet.id}
                    className="p-6 border-border/60 hover:shadow-md transition-all relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => deleteWallet(wallet.id)}
                        className="p-2 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">
                          {wallet.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {typeInfo.label}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Saldo Saat Ini
                      </p>
                      <p className="text-2xl font-bold text-foreground tracking-tight">
                        {formatCurrency(wallet.currentBalance)}
                      </p>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
