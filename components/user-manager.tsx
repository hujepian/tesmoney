"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, UserCircle, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface UserManagerProps {
  currentUser: string;
  setCurrentUser: (user: string) => void;
}

export function UserManager({ currentUser }: UserManagerProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Berhasil keluar");
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error("Gagal keluar");
    }
  };

  return (
    <div className="p-8 ml-64 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Profil Pengguna
          </h1>
          <p className="text-muted-foreground mt-1">
            Kelola akun dan pengaturan keamanan.
          </p>
        </div>

        <Card className="p-8 border-border/60">
          <div className="flex items-start gap-6 mb-8">
            <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center border-4 border-background shadow-sm">
              <UserCircle className="w-12 h-12 text-indigo-600" />
            </div>
            <div className="pt-2">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                {currentUser}
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </h2>
              <div className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                Akun Aktif
              </div>
            </div>
          </div>

          <div className="border-t border-border/60 pt-6">
            <h3 className="text-sm font-medium text-foreground mb-4">
              Aksi Akun
            </h3>
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="gap-2 bg-rose-600 hover:bg-rose-700"
            >
              <LogOut className="w-4 h-4" />
              Keluar dari Aplikasi
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
