import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { getCountryDialCode } from "@/components/country-select";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronRight, Globe, Copy, Info, 
  Headphones, RefreshCw, Lock, Shield, LogOut,
  ArrowRight, Package, FileCheck2
} from "lucide-react";

interface PlatformSettings {
  customerService: string;
  officialChannel: string;
  discussionGroup: string;
}

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: supportUnreadCount = 0 } = useQuery<number>({
    queryKey: ["/api/support/unread-count"],
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["/api/settings/public"],
  });

  const formatNumber = (num: number) => {
    return num.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const copyUserId = () => {
    if (user) {
      navigator.clipboard.writeText(user.referralCode);
      toast({
       title: "Code copié",
       description: "Votre identifiant de parrainage est prêt à être partagé.",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-[#f2eee3] pb-24">
        <div className="mx-auto max-w-md space-y-4 p-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <BottomNav />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const menuItems = [
    { 
      icon: Package, 
      label: "Mes produits",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-500",
      action: () => navigate("/my-products"),
      testId: "menu-products" 
    },
    { 
      icon: Info, 
      label: "À propos",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-500",
      action: () => navigate("/about"),
      testId: "menu-about" 
    },
    {
      icon: FileCheck2,
      label: "Preuves de retrait",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-700",
      action: () => navigate("/withdrawal-proofs"),
      testId: "menu-withdrawal-proofs",
    },
    { 
      icon: Headphones, 
      label: "Service client", 
      iconBg: "bg-green-100",
      iconColor: "text-green-500",
      action: () => navigate("/customer-service/chat"),
      testId: "menu-support" 
    },
    { 
      icon: RefreshCw, 
      label: "Utiliser un code bonus",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-500",
      action: () => navigate("/exchange-code"),
      testId: "menu-exchange" 
    },
    { 
      icon: Lock, 
      label: "Modifier mot de passe", 
      iconBg: "bg-red-100",
      iconColor: "text-red-500",
      action: () => navigate("/change-password"),
      testId: "menu-password" 
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#f2eee3] pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md overflow-hidden bg-[#fbf8f0] shadow-[0_12px_36px_rgba(40,54,42,0.08)]">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-800 px-4 pb-5 pt-7 sm:px-5">
          <div className="absolute right-2 top-2 z-20">
            <button 
              className="flex min-h-10 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/10"
              data-testid="button-language"
            >
              <Globe className="h-4 w-4" />
              <span>Langue</span>
            </button>
          </div>
          
          <div className="relative z-10">
            <h1 className="mb-3 w-fit rounded-xl bg-[#fbf8f0]/95 px-3 py-1.5 shadow-sm">
              <span className="text-sm font-bold uppercase tracking-[0.12em] text-white">Mon compte</span>
            </h1>
            <p className="text-lg font-semibold tracking-[0.01em] text-white" data-testid="text-phone">
              {getCountryDialCode(user.country)} {user.phone}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium tracking-[0.04em] text-white/80" data-testid="text-user-id">{user.referralCode}</span>
              <button onClick={copyUserId} aria-label="Copier le code de parrainage" className="flex h-9 w-9 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/15" data-testid="button-copy-id">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative z-10 mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/20 bg-white/10 p-3.5 shadow-sm backdrop-blur-md sm:gap-3 sm:p-4">
            <div className="text-center flex flex-col items-center justify-center min-w-0">
              <p className="w-full truncate text-[15px] font-bold leading-tight tabular-nums text-white sm:text-base" data-testid="text-balance">
                {formatNumber(user.depositBalance)}
              </p>
              <p className="mt-1 text-[10px] leading-tight text-white/80 sm:text-xs">Solde dépôt</p>
            </div>
            <div className="flex min-w-0 flex-col items-center justify-center border-l border-white/25 px-1 text-center sm:px-2">
              <p className="w-full truncate text-[15px] font-bold leading-tight tabular-nums text-white sm:text-base" data-testid="text-withdrawal-balance">
                {formatNumber(user.withdrawalBalance)}
              </p>
              <p className="mt-1 text-[10px] leading-tight text-white/80 sm:text-xs">Solde retrait</p>
            </div>
            <div className="flex min-w-0 flex-col items-center justify-center border-t border-white/25 px-1 pt-2 text-center sm:px-2">
              <p className="w-full truncate text-[15px] font-bold leading-tight tabular-nums text-white sm:text-base" data-testid="text-total-earnings">
                {formatNumber(user.totalEarnings)}
              </p>
              <p className="mt-1 text-[10px] leading-tight text-white/80 sm:text-xs">Revenus cumulés</p>
            </div>
            <div className="text-center flex flex-col items-center justify-center min-w-0 border-t border-l border-white/25 px-1 pt-2 sm:px-2">
              <p className="w-full truncate text-[15px] font-bold leading-tight tabular-nums text-white sm:text-base" data-testid="text-today-earnings">
                {formatNumber(user.todayEarnings)}
              </p>
              <p className="mt-1 text-[10px] leading-tight text-white/80 sm:text-xs">Revenu du jour</p>
            </div>
          </div>

          <div className="relative z-10 mt-3 grid grid-cols-2 gap-2.5 sm:gap-3">
            <button
              className="flex min-h-[104px] items-start justify-between gap-2 rounded-2xl border border-white/20 bg-[#1d6870]/40 p-3 text-left shadow-sm backdrop-blur-sm transition-colors hover:bg-[#1d6870]/50 active:scale-[0.98] sm:p-3.5"
              onClick={() => navigate("/wallets")}
              data-testid="button-bank-account"
            >
              <div className="flex min-w-0 flex-1 flex-col items-start">
                <p className="mb-2 text-sm font-bold leading-snug text-white">Mes portefeuilles</p>
                <div className="mt-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <ArrowRight className="h-4 w-4 text-white" aria-hidden="true" />
                </div>
              </div>
            </button>
            
            <button
              className="flex min-h-[104px] items-start justify-between gap-2 rounded-2xl border border-white/20 bg-[#1d6870]/40 p-3 text-left shadow-sm backdrop-blur-sm transition-colors hover:bg-[#1d6870]/50 active:scale-[0.98] sm:p-3.5"
              onClick={() => navigate("/history")}
              data-testid="button-invoice"
            >
              <div className="flex min-w-0 flex-1 flex-col items-start">
                <p className="mb-2 text-sm font-bold leading-snug text-white">Mon historique</p>
                <div className="mt-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <ArrowRight className="h-4 w-4 text-white" aria-hidden="true" />
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-[#fbf8f0] px-3 pb-1 pt-2 sm:px-4">
          {menuItems.map((item, index) => (
            <button
              key={item.testId}
              className={`flex min-h-[64px] w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[#f1eadb] active:bg-[#ebe1cf] sm:gap-4 sm:px-4 ${
                index !== menuItems.length - 1 ? "border-b border-[#e9e2d4]" : ""
              }`}
              onClick={item.action}
              data-testid={item.testId}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.iconBg}`}>
                <item.icon className={`h-5 w-5 ${item.iconColor}`} aria-hidden="true" />
              </div>
              <span className="flex-1 text-left font-semibold text-[#30453c]">{item.label}</span>
              {item.testId === "menu-support" && supportUnreadCount > 0 && (
                <span className="shrink-0 rounded-full bg-[#dff1df] px-2 py-1 text-[10px] font-bold text-[#24603b]">
                  Nouveau · {supportUnreadCount}
                </span>
              )}
              <ChevronRight className="h-5 w-5 shrink-0 text-[#9c9d91]" aria-hidden="true" />
            </button>
          ))}
        </div>

        {user.isAdmin && (
          <div className="mx-4 mt-3">
            <button
              className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-[#d8e2d6] bg-[#eaf0e6] px-4 py-3 transition-colors hover:bg-[#e1eadc] sm:gap-4"
              onClick={() => navigate("/admin")}
              data-testid="button-admin"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#d6e4d1]">
                <Shield className="h-5 w-5 text-[#315c48]" />
              </div>
              <span className="flex-1 text-left font-semibold text-[#315c48]">Panneau d'administration</span>
              <ChevronRight className="h-5 w-5 text-[#66846f]" />
            </button>
          </div>
        )}

        <div className="px-4 pb-5 pt-3">
          <button
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-[#a65249] transition-colors hover:bg-[#f7e9e2]"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5" />
            Déconnexion
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
