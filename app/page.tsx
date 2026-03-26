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
import { AIAdvisor } from "@/components/ai-advisor";


type Page =
  | "dashboard"
  | "transactions"
  | "analytics"
  | "ai-advisor"
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
      setCurrentUser(user.id);

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
      case "ai-advisor":
         return <AIAdvisor currentUser={currentUser} />;
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
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        currentUser={currentUser}
      />

      {/*
        PERUBAHAN LAYOUT UTAMA:
        - Desktop (lg+): margin-left 256px (sidebar lebar), tidak ada padding atas/bawah
        - Mobile: margin-top 56px (topbar), margin-bottom 64px (bottom nav)
      */}
      <main className="flex-1 overflow-auto lg:ml-64 mt-14 mb-16 lg:mt-0 lg:mb-0">
        {renderPage()}
      </main>
    </div>
  );
}
