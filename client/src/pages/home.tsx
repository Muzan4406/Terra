import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { TelegramPopup } from "@/components/telegram-popup";
import { 
  CreditCard, 
  Banknote, 
  Headphones, 
  ClipboardList,
  Bell
} from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState, useCallback } from "react";

interface PlatformSettings {
  customerService: string;
  officialChannel: string;
  discussionGroup: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [tickerOffset, setTickerOffset] = useState(0);
  const [showTelegramPopup, setShowTelegramPopup] = useState(true);

  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["/api/settings/public"],
  });

  const handleCloseTelegramPopup = useCallback(() => {
    setShowTelegramPopup(false);
  }, []);

  const telegramLink = "https://t.me/+OVhsmITUUu03ZThk";

  const notifications = [
    "*7426 Recharger XOF 50,000",
    "*2047 Recharger XOF 250,000",
    "*0558 Recharger XOF 100,000",
    "*8934 Retrait XOF 75,000",
  ];

  const formatNumber = (num: number) => {
    return num.toLocaleString("fr-FR");
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerOffset((prev) => (prev + 1) % notifications.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [notifications.length]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Skeleton className="h-screen w-full max-w-md" />
      </div>
    );
  }

  const actionButtons = [
    { 
      icon: CreditCard, 
      label: "RECHARGER", 
      path: "/deposit", 
      testId: "button-recharge",
      bgColor: "bg-amber-100",
      iconColor: "text-amber-600",
      borderColor: "border-amber-200"
    },
    { 
      icon: Banknote, 
      label: "RETRAIT", 
      path: "/withdraw", 
      testId: "button-withdraw",
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      borderColor: "border-green-200"
    },
    { 
      icon: Headphones, 
      label: "SERVICE CLIENT", 
      path: "/customer-service", 
      testId: "button-service",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      borderColor: "border-blue-200"
    },
    { 
      icon: ClipboardList, 
      label: "TÂCHES", 
      path: "/tasks", 
      testId: "button-tasks",
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
      borderColor: "border-orange-200"
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-800">Terra oil</h1>
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
            <Bell className="w-4 h-4 text-amber-600" />
          </div>
        </div>

        <div className="px-5 py-10 bg-gradient-to-br from-emerald-800 via-emerald-700 to-amber-600 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">Terra oil</p>
          <h2 className="mt-2 text-2xl font-bold">Bienvenue dans votre espace</h2>
          <p className="mt-2 text-sm text-white/85">
            Consultez vos produits et suivez vos opérations depuis un seul endroit.
          </p>
        </div>

        <div className="px-4 py-5">
          <div className="grid grid-cols-4 gap-3">
            {actionButtons.map((btn, index) => (
              <button
                key={index}
                className="flex flex-col items-center gap-2 group"
                onClick={() => navigate(btn.path)}
                data-testid={btn.testId}
              >
                <div className={`w-16 h-16 rounded-full ${btn.bgColor} border-2 ${btn.borderColor} flex items-center justify-center shadow-md group-hover:shadow-lg group-active:scale-95 transition-all`}>
                  <btn.icon className={`h-7 w-7 ${btn.iconColor}`} />
                </div>
                <span className="text-xs text-gray-700 font-semibold text-center leading-tight">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mx-4 flex items-center gap-2 py-3 px-4 bg-amber-50 rounded-lg border border-amber-100 overflow-hidden">
          <div className="flex-shrink-0 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
            HOT
          </div>
          <div className="overflow-hidden flex-1">
            <div className="whitespace-nowrap animate-marquee text-sm text-gray-700">
              {notifications.map((notif, i) => (
                <span key={i} className="mx-4">{notif}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4 shadow-sm" style={{ background: "linear-gradient(135deg, #d4a574 0%, #c4956a 100%)" }}>
            <p className="text-2xl font-bold text-gray-900" data-testid="text-balance">
              XOF {formatNumber(user.balance)}
            </p>
            <p className="text-sm text-gray-800 mt-1">Solde du compte</p>
          </div>

          <div className="rounded-xl p-4 shadow-sm" style={{ background: "linear-gradient(135deg, #d4a574 0%, #c4956a 100%)" }}>
            <p className="text-2xl font-bold text-gray-900" data-testid="text-earnings">
              XOF {formatNumber(user.totalEarnings)}
            </p>
            <p className="text-sm text-gray-800 mt-1">Revenu cumulé</p>
          </div>
        </div>

      </div>

      <BottomNav />

      <TelegramPopup 
        isOpen={showTelegramPopup} 
        onClose={handleCloseTelegramPopup}
        telegramLink={telegramLink}
      />

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 15s linear infinite;
        }
      `}</style>
    </div>
  );
}
