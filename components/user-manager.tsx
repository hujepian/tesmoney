"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  LogOut, UserCircle, ShieldCheck, Edit2, Check, X, 
  Mail, Calendar, Award, Sparkles, Settings, Fingerprint,
  Activity, Heart, Zap, Star, Crown
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface UserManagerProps {
  currentUser: string;
  setCurrentUser: (user: string) => void;
}

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export function UserManager({ currentUser, setCurrentUser }: UserManagerProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalIncome: 0,
    totalExpense: 0,
    memberDays: 0,
  });

  useEffect(() => {
    loadUserProfile();
    loadUserStats();
  }, [currentUser]);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserProfile({
          id: user.id,
          email: user.email || "",
          display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Pengguna",
          created_at: user.created_at || new Date().toISOString(),
        });
        setEditName(user.user_metadata?.display_name || user.email?.split("@")[0] || "Pengguna");
      }
    } catch (error) {
      console.error("Failed to load profile", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      const transactions = await api.transactions.list();
      const totalIncome = transactions.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + t.amount, 0);
      const totalExpense = transactions.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0);
      
      // Hitung hari sejak bergabung
      const createdAt = new Date(userProfile?.created_at || new Date());
      const today = new Date();
      const memberDays = Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      setStats({
        totalTransactions: transactions.length,
        totalIncome,
        totalExpense,
        memberDays: memberDays || 1,
      });
    } catch (error) {
      console.error("Failed to load stats", error);
    }
  };

  const handleUpdateDisplayName = async () => {
    if (!editName.trim()) {
      toast.error("Nama tidak boleh kosong");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: editName.trim() }
      });

      if (error) throw error;

      setUserProfile(prev => prev ? { ...prev, display_name: editName.trim() } : null);
      setCurrentUser(editName.trim());
      setIsEditing(false);
      toast.success("Nama berhasil diperbarui");
    } catch (error) {
      toast.error("Gagal memperbarui nama");
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Berhasil keluar");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Gagal keluar");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
        <div className="relative">
          <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .profile-bg {
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
        .avatar-wrapper {
          background: linear-gradient(135deg, #10b981, #3b82f6);
          padding: 3px;
          border-radius: 50%;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        .float-animation {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      <div className="profile-bg min-h-screen p-4 sm:p-6 lg:p-8 relative">
        {/* Ambient Orbs */}
        <div className="pointer-events-none fixed top-20 left-1/4 w-80 h-80 rounded-full bg-indigo-600/15 blur-3xl animate-pulse" />
        <div className="pointer-events-none fixed bottom-20 right-1/4 w-72 h-72 rounded-full bg-emerald-600/10 blur-3xl animate-pulse delay-1000" />
        <div className="pointer-events-none fixed top-1/3 right-1/3 w-64 h-64 rounded-full bg-purple-600/8 blur-3xl animate-pulse delay-2000" />

        <div className="max-w-5xl mx-auto relative space-y-5 sm:space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg float-animation">
                  <UserCircle className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-emerald-200 to-teal-300 bg-clip-text text-transparent">
                  Profil Pengguna
                </h1>
              </div>
              <p className="text-white/35 text-sm">Kelola akun dan pantau aktivitas keuanganmu</p>
            </div>
            <div className="glass-card px-3 py-1.5 rounded-full self-start sm:self-auto flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-white/50">Akun Terverifikasi</span>
            </div>
          </div>

          {/* Main Profile Card */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="relative h-32 bg-gradient-to-r from-emerald-600/20 via-indigo-600/20 to-purple-600/20">
              <div className="absolute inset-0 opacity-30" style={{backgroundImage: `url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')`}} />
            </div>
            
            <div className="relative px-5 pb-6">
              {/* Avatar */}
              <div className="flex justify-center -mt-12 mb-4">
                <div className="avatar-wrapper rounded-full">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <UserCircle className="w-14 h-14 text-white" />
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="text-center mb-6">
                {isEditing ? (
                  <div className="flex items-center justify-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-64 bg-white/10 border-white/20 text-white text-center"
                      autoFocus
                    />
                    <button
                      onClick={handleUpdateDisplayName}
                      className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditName(userProfile?.display_name || "");
                      }}
                      className="p-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="text-xl font-bold text-white">
                      {userProfile?.display_name}
                    </h2>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-emerald-400 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20">
                    <Crown className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400">Member</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20">
                    <Star className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] text-indigo-400">Aktif</span>
                  </div>
                </div>
              </div>

              {/* User Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">Email</p>
                    <p className="text-xs text-white/80 truncate">{userProfile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <div className="flex-1">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">Bergabung Sejak</p>
                    <p className="text-xs text-white/80">{userProfile?.created_at ? formatDate(userProfile.created_at) : "-"}</p>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="stat-card rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-3 h-3 text-emerald-400" />
                    <span className="text-[9px] text-white/40">Transaksi</span>
                  </div>
                  <p className="text-lg font-bold text-white">{stats.totalTransactions}</p>
                </div>
                <div className="stat-card rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span className="text-[9px] text-white/40">Pemasukan</span>
                  </div>
                  <p className="text-sm font-bold text-white truncate">{formatCurrency(stats.totalIncome)}</p>
                </div>
                <div className="stat-card rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="w-3 h-3 text-rose-400" />
                    <span className="text-[9px] text-white/40">Pengeluaran</span>
                  </div>
                  <p className="text-sm font-bold text-white truncate">{formatCurrency(stats.totalExpense)}</p>
                </div>
                <div className="stat-card rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-3 h-3 text-amber-400" />
                    <span className="text-[9px] text-white/40">Hari Aktif</span>
                  </div>
                  <p className="text-lg font-bold text-white">{stats.memberDays}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-white/10 pt-5">
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Settings className="w-3 h-3" />
                  Pengaturan Akun
                </h3>
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="gap-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white w-full sm:w-auto shadow-lg transition-all hover:scale-[1.02]"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar dari Aplikasi
                </Button>
                <p className="text-[10px] text-white/30 mt-3 text-center sm:text-left">
                  Dengan keluar, Anda akan diarahkan ke halaman login
                </p>
              </div>
            </div>
          </div>

          {/* Achievement Badge */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl">
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Pencapaian</h3>
                <p className="text-[10px] text-white/35">Semangat mengelola keuangan!</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {stats.totalTransactions >= 10 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400">10+ Transaksi</span>
                </div>
              )}
              {stats.memberDays >= 30 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                  <Heart className="w-3 h-3 text-indigo-400" />
                  <span className="text-[10px] text-indigo-400">Member 1 Bulan</span>
                </div>
              )}
              {stats.totalIncome > 0 && stats.totalExpense > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <Fingerprint className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] text-amber-400">Keuangan Aktif</span>
                </div>
              )}
              {stats.totalTransactions === 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <Sparkles className="w-3 h-3 text-white/30" />
                  <span className="text-[10px] text-white/30">Mulai catat transaksi</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// Tambahkan komponen yang belum diimport
const TrendingUp = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendingDown = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);