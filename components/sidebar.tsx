"use client";

import {
  LayoutDashboard,
  Wallet,
  PieChart,
  PiggyBank,
  Target,
  Users,
  CreditCard,
  Banknote,
} from "lucide-react";

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: any) => void;
  currentUser: string;
}

export function Sidebar({
  currentPage,
  setCurrentPage,
  currentUser,
}: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dasbor", icon: LayoutDashboard },
    { id: "wallets", label: "Dompet", icon: CreditCard },
    { id: "transactions", label: "Transaksi", icon: Wallet },
    { id: "analytics", label: "Analitik", icon: PieChart },
    { id: "budget", label: "Anggaran", icon: Banknote },
    { id: "goals", label: "Target", icon: Target },
    { id: "users", label: "Profil", icon: Users },
  ];

  return (
    <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-xl h-screen flex flex-col fixed left-0 top-0 z-30">
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

      <className="hidden md:flex flex-col w-64 bg-white border-r h-screen sticky top-0">
        <p className="px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Menu
        </p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
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
  );
}
