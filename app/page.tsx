"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/sidebar";
import { Dashboard } from "@/components/dashboard";
import { TransactionTracker } from "@/components/transaction-tracker";
import { Analytics } from "@/components/analytics";
import { BudgetManager } from "@/components/budget-manager";
import { UserManager } from "@/components/user-manager";
import { GoalsManager } from "@/components/goals-manager";
import { WalletManager } from "@/components/wallet-manager";

type Page =
  | "dashboard"
  | "transactions"
  | "analytics"
  | "budget"
  | "users"
  | "goals"
  | "wallets";

export default function Home() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [currentUser, setCurrentUser] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUser(user.email || "User");

      // Load saved page
      const savedPage = localStorage.getItem("currentPage") as Page;
      if (savedPage) setCurrentPage(savedPage);

      setLoading(false);
    };
    getUser();
  }, [router, supabase]);

  useEffect(() => {
    localStorage.setItem("currentPage", currentPage);
  }, [currentPage]);

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard currentUser={currentUser} />;
      case "wallets":
        return <WalletManager currentUser={currentUser} />;
      case "transactions":
        return <TransactionTracker currentUser={currentUser} />;
      case "analytics":
        return <Analytics currentUser={currentUser} />;
      case "budget":
        return <BudgetManager currentUser={currentUser} />;
      case "users":
        return (
          <UserManager
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
          />
        );
      case "goals":
        return <GoalsManager currentUser={currentUser} />;
      default:
        return <Dashboard currentUser={currentUser} />;
    }
  };

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    // md:flex-row: Sampingan di desktop, flex-col: Tumpuk di mobile
    <div className="flex flex-col md:flex-row h-screen bg-background overflow-hidden">
      
      {/* Sidebar (Ingat: di components/sidebar.tsx, tambahkan class 'hidden md:flex') */}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        currentUser={currentUser}
      />

      {/* Main Content: pb-20 agar konten tidak tertutup navigasi bawah saat di HP */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0 px-4 md:px-8">
        {renderPage()}
      </main>

      {/* --- BOTTOM NAVIGATION (Hanya muncul di Mobile) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t bg-white px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        
        {/* Tombol Dasbor */}
        <button 
          onClick={() => setCurrentPage("dashboard")}
          className={`flex flex-col items-center gap-1 flex-1 ${currentPage === "dashboard" ? "text-purple-600" : "text-slate-400"}`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-medium">Dasbor</span>
        </button>

        {/* Tombol Transaksi */}
        <button 
          onClick={() => setCurrentPage("transactions")}
          className={`flex flex-col items-center gap-1 flex-1 ${currentPage === "transactions" ? "text-purple-600" : "text-slate-400"}`}
        >
          <ArrowLeftRight size={20} />
          <span className="text-[10px] font-medium">Transaksi</span>
        </button>

        {/* Tombol Dompet */}
        <button 
          onClick={() => setCurrentPage("wallets")}
          className={`flex flex-col items-center gap-1 flex-1 ${currentPage === "wallets" ? "text-purple-600" : "text-slate-400"}`}
        >
          <Wallet size={20} />
          <span className="text-[10px] font-medium">Dompet</span>
        </button>

        {/* Tombol Analitik */}
        <button 
          onClick={() => setCurrentPage("analytics")}
          className={`flex flex-col items-center gap-1 flex-1 ${currentPage === "analytics" ? "text-purple-600" : "text-slate-400"}`}
        >
          <PieChart size={20} />
          <span className="text-[10px] font-medium">Analitik</span>
        </button>

      </nav>
    </div>
  );
