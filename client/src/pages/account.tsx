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
  ArrowRight, Package
} from "lucide-react";
import { solarImages } from "@/lib/solar-images";
import { BrandLogo } from "@/components/brand-logo";

interface PlatformSettings {
  customerService: string;
  officialChannel: string;
  discussionGroup: string;
}

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

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
        title: "Copié!",
        description: "L'ID utilisateur a été copié.",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        <div className="max-w-md mx-auto p-4 space-y-4">
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
      label: "Mes produits VIP", 
      iconBg: "bg-purple-100",
      iconColor: "text-purple-500",
      action: () => navigate("/my-products"),
      testId: "menu-products" 
    },
    { 
      icon: Info, 
      label: "À propos de nous", 
      iconBg: "bg-blue-100",
      iconColor: "text-blue-500",
      action: () => navigate("/about"),
      testId: "menu-about" 
    },
    { 
      icon: Headphones, 
      label: "Service client", 
      iconBg: "bg-green-100",
      iconColor: "text-green-500",
      action: () => navigate("/customer-service"),
      testId: "menu-support" 
    },
    { 
      icon: RefreshCw, 
      label: "Échange de code", 
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
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="max-w-md mx-auto bg-white">
        <div className="relative overflow-hidden px-4 pb-4 pt-6">
          <div className="absolute inset-0">
            <img src={solarImages[4].src} alt={solarImages[4].alt} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 to-emerald-900/55" />
          </div>
          <div className="absolute right-2 top-2 z-20">
            <button 
              className="flex items-center gap-1 text-white/80 text-xs"
              data-testid="button-language"
            >
              <Globe className="h-4 w-4" />
              <span>langue</span>
            </button>
          </div>
          
          <div className="relative z-10">
            <h1 className="mb-1 w-fit rounded-md bg-white/95 px-2 py-1">
              <BrandLogo className="h-8 w-auto" />
            </h1>
            <p className="text-white text-lg font-medium" data-testid="text-phone">
              {getCountryDialCode(user.country)} {user.phone}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-white/80 text-sm" data-testid="text-user-id">{user.referralCode}</span>
              <button onClick={copyUserId} className="text-white/80" data-testid="button-copy-id">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-6 relative z-10 bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="text-center flex flex-col items-center justify-center min-w-0">
              <p className="text-white font-bold text-base leading-tight truncate w-full" data-testid="text-balance">
                {formatNumber(user.balance)}
              </p>
              <p className="text-white/70 text-xs mt-1">Solde du compte</p>
            </div>
            <div className="text-center flex flex-col items-center justify-center min-w-0 border-x border-white/20 px-2">
              <p className="text-white font-bold text-base leading-tight truncate w-full" data-testid="text-total-earnings">
                {formatNumber(user.totalEarnings)}
              </p>
              <p className="text-white/70 text-xs mt-1">Revenu cumulé</p>
            </div>
            <div className="text-center flex flex-col items-center justify-center min-w-0">
              <p className="text-white font-bold text-base leading-tight truncate w-full" data-testid="text-today-earnings">
                {formatNumber(user.todayEarnings)}
              </p>
              <p className="text-white/70 text-xs mt-1">Revenu du jour</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 relative z-10">
            <button
              className="bg-blue-400/30 backdrop-blur-sm rounded-xl p-3 flex items-start justify-between"
              onClick={() => navigate("/wallets")}
              data-testid="button-bank-account"
            >
              <div>
                <p className="text-white font-bold text-sm mb-2">Compte bancaire</p>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-white" />
                </div>
              </div>
              <img src={solarImages[0].src} alt={solarImages[0].alt} className="h-16 w-16 rounded-lg object-cover opacity-90" />
            </button>
            
            <button
              className="bg-blue-400/30 backdrop-blur-sm rounded-xl p-3 flex items-start justify-between"
              onClick={() => navigate("/history")}
              data-testid="button-invoice"
            >
              <div>
                <p className="text-white font-bold text-sm mb-2">Ma facture</p>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-white" />
                </div>
              </div>
              <img src={solarImages[3].src} alt={solarImages[3].alt} className="h-16 w-16 rounded-lg object-cover opacity-90" />
            </button>
          </div>
        </div>

        <div className="bg-white">
          {menuItems.map((item, index) => (
            <button
              key={item.testId}
              className={`w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 ${
                index !== menuItems.length - 1 ? "border-b border-gray-100" : ""
              }`}
              onClick={item.action}
              data-testid={item.testId}
            >
              <div className={`w-10 h-10 rounded-full ${item.iconBg} flex items-center justify-center`}>
                <item.icon className={`h-5 w-5 ${item.iconColor}`} />
              </div>
              <span className="flex-1 text-left text-gray-800 font-medium">{item.label}</span>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          ))}
        </div>

        {user.isAdmin && (
          <div className="mx-4 mt-4">
            <button
              className="w-full flex items-center gap-4 px-4 py-4 bg-blue-50 rounded-xl hover:bg-blue-100"
              onClick={() => navigate("/admin")}
              data-testid="button-admin"
            >
              <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <span className="flex-1 text-left text-blue-800 font-medium">Panneau d'administration</span>
              <ChevronRight className="h-5 w-5 text-blue-400" />
            </button>
          </div>
        )}

        <div className="px-4 py-4">
          <button
            className="w-full flex items-center justify-center gap-2 py-3 text-red-500 font-medium hover:bg-red-50 rounded-xl"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5" />
            Déconnexion
          </button>
        </div>

        <div className="h-4"></div>
      </div>

      <BottomNav />
    </div>
  );
}
