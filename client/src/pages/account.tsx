import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { getCountryDialCode } from "@/components/country-select";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronRight, Globe, Copy, Info, HelpCircle, 
  Headphones, RefreshCw, Lock, Shield, LogOut,
  ArrowRight, CreditCard, FileText
} from "lucide-react";
import bannerImage from "@assets/smilingdoctor-globalhealth-blog-1200x673_1768031545518.webp";
import bankImage from "@assets/images_(30)_1768037288811.jpeg";
import invoiceImage from "@assets/images_(31)_1768037288700.jpeg";

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
      icon: Info, 
      label: "À propos de nous", 
      iconBg: "bg-blue-100",
      iconColor: "text-blue-500",
      action: () => navigate("/about"),
      testId: "menu-about" 
    },
    { 
      icon: HelpCircle, 
      label: "Centre d'aide", 
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-500",
      action: () => window.open(settings?.discussionGroup || "https://t.me/+DOnUcJs7idVmN2E0", "_blank"),
      testId: "menu-help" 
    },
    { 
      icon: Headphones, 
      label: "Service client", 
      iconBg: "bg-green-100",
      iconColor: "text-green-500",
      action: () => window.open(settings?.customerService || "https://t.me/+DOnUcJs7idVmN2E0", "_blank"),
      testId: "menu-support" 
    },
    { 
      icon: RefreshCw, 
      label: "Échange", 
      iconBg: "bg-teal-100",
      iconColor: "text-teal-500",
      action: () => navigate("/history"),
      testId: "menu-exchange" 
    },
    { 
      icon: Lock, 
      label: "Mot de passe de transaction", 
      iconBg: "bg-red-100",
      iconColor: "text-red-500",
      action: () => navigate("/account"),
      testId: "menu-password" 
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="max-w-md mx-auto bg-white">
        <div 
          className="relative pt-6 pb-4 px-4"
          style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #87ceeb 100%)' }}
        >
          <div className="absolute top-2 right-2">
            <button 
              className="flex items-center gap-1 text-white/80 text-xs"
              data-testid="button-language"
            >
              <Globe className="h-4 w-4" />
              <span>langue</span>
            </button>
          </div>
          
          <div className="absolute right-0 top-0 w-32 h-32 opacity-30">
            <img 
              src={bannerImage} 
              alt="" 
              className="w-full h-full object-cover"
            />
          </div>

          <div className="relative z-10">
            <h1 className="text-2xl font-bold text-white mb-1">Cigna Group</h1>
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

          <div className="grid grid-cols-3 gap-4 mt-6 relative z-10">
            <div className="text-left">
              <p className="text-white text-lg font-bold" data-testid="text-balance">
                {formatNumber(user.balance)}FCFA
              </p>
              <p className="text-white/70 text-xs">Solde du compte</p>
            </div>
            <div className="text-center">
              <p className="text-white text-lg font-bold" data-testid="text-total-earnings">
                {formatNumber(user.totalEarnings)}FCFA
              </p>
              <p className="text-white/70 text-xs">Revenu total</p>
            </div>
            <div className="text-right">
              <p className="text-white text-lg font-bold" data-testid="text-today-earnings">
                {formatNumber(user.todayEarnings)}FCFA
              </p>
              <p className="text-white/70 text-xs">Revenu d'aujourd'hui</p>
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
              <img src={bankImage} alt="" className="w-16 h-16 object-cover rounded-lg opacity-80" />
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
              <img src={invoiceImage} alt="" className="w-16 h-16 object-cover rounded-lg opacity-80" />
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
