"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  LayoutDashboard,
  Wallet,
  PieChart,
  PiggyBank,
  Target,
  Users,
  CreditCard,
  Banknote,
  Menu,
  X,  
} from "lucide-react";

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: any) => void;
  currentUser: string;
}

const menuItems = [
  { id: "dashboard",    label: "Dasbor",    icon: LayoutDashboard },
  { id: "wallets",      label: "Dompet",    icon: CreditCard },
  { id: "transactions", label: "Transaksi", icon: Wallet },
  { id: "analytics",   label: "Analitik",  icon: PieChart },
  { id: "budget",      label: "Anggaran",  icon: Banknote },
  { id: "goals",       label: "Target",    icon: Target },
  { id: "ai-advisor",  label: "AI Advisor",   icon: Sparkles },  
  { id: "users",       label: "Profil",    icon: Users },
];

// Menu items yang tampil di bottom nav mobile (max 5)
const bottomNavItems = [
  { id: "dashboard", label: "Dasbor", icon: LayoutDashboard },
  { id: "transactions", label: "Transaksi", icon: Wallet },
  { id: "analytics", label: "Analitik", icon: PieChart },
  { id: "budget", label: "Anggaran", icon: Banknote },
  { id: "ai-advisor",  label: "Maya AI",  icon: Sparkles },
];

export function Sidebar({
  currentPage,
  setCurrentPage,
  currentUser,
}: SidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* ─── DESKTOP SIDEBAR (≥ lg) ─── */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-card/50 backdrop-blur-xl h-screen flex-col fixed left-0 top-0 z-30">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              MoneyTracker
            </h1>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 py-4">
          <p className="px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Menu
          </p>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/50">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {currentUser.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate text-foreground">
                {currentUser}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── MOBILE TOPBAR ─── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Wallet className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">
            MoneyTracker
          </span>
        </div>

        {/* Hamburger – hanya untuk menu item yang tidak ada di bottom nav */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Buka menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* ─── MOBILE DRAWER (slide-in dari kanan) ─── */}
      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="lg:hidden fixed top-0 right-0 bottom-0 z-50 w-72 bg-card border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-foreground">MoneyTracker</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {currentUser.substring(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate text-foreground">
                    {currentUser}
                  </p>
                  <p className="text-xs text-muted-foreground">Akun Aktif</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── MOBILE BOTTOM NAV ─── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border h-16 flex items-center justify-around px-2 safe-area-bottom">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full max-w-[72px] rounded-xl transition-all duration-200 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all duration-200 ${
                  isActive ? "bg-primary/10" : ""
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
