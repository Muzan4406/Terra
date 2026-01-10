import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { 
  DollarSign, 
  FileText, 
  Building2, 
  Info, 
  FileCheck, 
  Headphones, 
  CheckCircle,
  Bell
} from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import bannerImage from "@assets/Img_2026_01_09_18_58_01_1768031521173.jpeg";

interface PlatformSettings {
  customerService: string;
  officialChannel: string;
  discussionGroup: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [tickerOffset, setTickerOffset] = useState(0);

  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["/api/settings/public"],
  });

  const formatNumber = (num: number) => {
    return num.toLocaleString("fr-FR");
  };

  const notifications = [
    "**2047 a rechargé 250,000",
    "******0558 a rechargé 100,000",
    "**8934 a rechargé 50,000",
    "******1234 a retiré 75,000",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerOffset((prev) => (prev + 1) % notifications.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [notifications.length]);

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Skeleton className="h-screen w-full max-w-md" />
      </div>
    );
  }

  const actionButtons = [
    { icon: DollarSign, label: "Recharger", path: "/deposit", testId: "button-recharge" },
    { icon: DollarSign, label: "Retirer", path: "/withdraw", testId: "button-withdraw" },
    { icon: FileText, label: "Historique", path: "/history", testId: "button-history" },
    { icon: Building2, label: "Pointage", path: "/tasks", testId: "button-pointage" },
    { icon: Info, label: "À propos", path: "/about", testId: "button-about" },
    { icon: FileCheck, label: "Règlement", path: "/rules", testId: "button-rules" },
    { icon: Headphones, label: "Aide", path: "/customer-service", testId: "button-aide" },
    { icon: CheckCircle, label: "Centre de tâches", path: "/tasks", testId: "button-tasks" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="relative w-full h-48 overflow-hidden bg-gradient-to-r from-gray-100 to-gray-200">
          <img 
            src={bannerImage} 
            alt="MaxiCharger" 
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-4 text-white">
            <h2 className="text-xl font-bold drop-shadow-lg">MaxiCharger</h2>
            <p className="text-lg font-semibold drop-shadow-lg">DC HiPower</p>
            <p className="text-sm drop-shadow-lg">320kW | 640 kW</p>
          </div>
        </div>

        <div className="px-4 py-6">
          <div className="grid grid-cols-4 gap-4">
            {actionButtons.map((btn, index) => (
              <button
                key={index}
                className="flex flex-col items-center gap-2"
                onClick={() => {
                  if (btn.path) {
                    navigate(btn.path);
                  }
                }}
                data-testid={btn.testId}
              >
                <div className="w-14 h-14 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
                  <btn.icon className="h-6 w-6 text-green-500" />
                </div>
                <span className="text-xs text-gray-600 font-medium">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mx-4 flex items-center gap-2 py-3 border-y border-gray-100 overflow-hidden">
          <Bell className="h-5 w-5 text-green-500 flex-shrink-0" />
          <div className="overflow-hidden flex-1">
            <p className="text-sm text-gray-600 whitespace-nowrap animate-pulse">
              {notifications[tickerOffset]} {notifications[(tickerOffset + 1) % notifications.length]}
            </p>
          </div>
        </div>

        <div className="mx-4 mt-4 rounded-2xl overflow-hidden relative" style={{ minHeight: '180px' }}>
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${bannerImage})`,
              filter: 'brightness(0.6)',
            }}
          />
          <div className="relative z-10 p-6 flex flex-col items-center justify-center h-full text-center" style={{ minHeight: '180px' }}>
            <h3 className="text-2xl font-bold text-white mb-2">Centre de Tâches</h3>
            <p className="text-white/90 text-sm mb-4">
              Complétez les tâches et<br />obtenez des bonus généreux
            </p>
            <button
              onClick={() => navigate("/tasks")}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors"
              data-testid="button-enter-tasks"
            >
              cliquez pour<br />entrer
            </button>
          </div>
        </div>

        <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <img 
                  src={bannerImage} 
                  alt="" 
                  className="w-8 h-8 object-cover rounded"
                />
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900" data-testid="text-balance">
              FCFA {formatNumber(user.balance)}
            </p>
            <p className="text-xs text-gray-500">Solde du compte</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <img 
                  src={bannerImage} 
                  alt="" 
                  className="w-8 h-8 object-cover rounded"
                />
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900" data-testid="text-earnings">
              FCFA {formatNumber(user.totalEarnings)}
            </p>
            <p className="text-xs text-gray-500">Revenus cumulés</p>
          </div>
        </div>

        <div className="mx-4 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-green-500 rounded-full"></div>
            <h3 className="text-sm font-semibold text-gray-800">Partenaires</h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="aspect-video bg-gray-100 rounded-lg overflow-hidden"
              >
                <img 
                  src={bannerImage} 
                  alt={`Partenaire ${i}`} 
                  className="w-full h-full object-cover opacity-70"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="h-8"></div>
      </div>

      <BottomNav />
    </div>
  );
}
