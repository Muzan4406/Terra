import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { DollarSign, Users, MessageCircle, ArrowRight, Copy } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/cigna-healthcare-logo_1768031545630.png";
import lotteryImage from "@assets/Img_2026_01_09_18_58_01_1768031521173.jpeg";

interface PlatformSettings {
  customerService: string;
  officialChannel: string;
  discussionGroup: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["/api/settings/public"],
  });

  const formatNumber = (num: number) => {
    return num.toLocaleString("fr-FR");
  };

  const referralLink = user ? `${window.location.origin}/register?ref=${user.referralCode}` : "";

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Copié!",
      description: "Le lien de parrainage a été copié.",
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Skeleton className="h-screen w-full max-w-md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="max-w-md mx-auto bg-white">
        <header className="flex items-center justify-center py-4 bg-white">
          <div className="flex items-center gap-2">
            <img src={logoImage} alt="Logo" className="h-14 object-contain" />
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-green-600 tracking-wide">Cigna</span>
              <span className="text-[10px] text-green-600 tracking-[0.2em] uppercase -mt-1">Group</span>
            </div>
          </div>
        </header>

        <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}>
          <div className="grid grid-cols-3 divide-x divide-white/20 py-6">
            <div className="text-center text-white px-2">
              <p className="text-lg font-bold" data-testid="text-balance">XOF{formatNumber(user.balance)}</p>
              <p className="text-xs opacity-90 mt-1">Solde de Recharge</p>
            </div>
            <div className="text-center text-white px-2">
              <p className="text-lg font-bold" data-testid="text-product-earnings">XOF{formatNumber(user.todayEarnings)}</p>
              <p className="text-xs opacity-90 mt-1">Revenu des Produits</p>
            </div>
            <div className="text-center text-white px-2">
              <p className="text-lg font-bold" data-testid="text-withdrawal-balance">XOF{formatNumber(user.totalEarnings)}</p>
              <p className="text-xs opacity-90 mt-1">Solde de Retrait</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-300 via-yellow-200 to-yellow-300 py-5 px-4">
            <div className="grid grid-cols-4 gap-4">
              <button
                className="flex flex-col items-center gap-2"
                onClick={() => navigate("/deposit")}
                data-testid="button-recharge"
              >
                <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center shadow-md">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">Recharger</span>
              </button>

              <button
                className="flex flex-col items-center gap-2"
                onClick={() => navigate("/withdraw")}
                data-testid="button-withdraw"
              >
                <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center shadow-md">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">Retirer</span>
              </button>

              <button
                className="flex flex-col items-center gap-2"
                onClick={() => navigate("/team")}
                data-testid="button-team"
              >
                <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center shadow-md">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">Équipe</span>
              </button>

              <button
                className="flex flex-col items-center gap-2"
                onClick={() => window.open(settings?.officialChannel || "https://t.me/+DOnUcJs7idVmN2E0", "_blank")}
                data-testid="button-telegram"
              >
                <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center shadow-md">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">Telegram</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-lg font-bold text-gray-800 mb-3">Mon Équipe</h3>
          <p className="text-sm text-gray-500 break-all mb-3" data-testid="text-referral-link">
            {referralLink}
          </p>
          <div className="flex items-center gap-3">
            <button
              className="bg-green-500 hover:bg-green-600 text-white text-sm px-5 py-2 rounded-lg font-medium flex items-center gap-2"
              onClick={copyReferralLink}
              data-testid="button-copy-link"
            >
              <Copy className="h-4 w-4" />
              Copier
            </button>
            <button
              className="text-gray-600 text-sm font-medium flex items-center gap-1 hover:text-green-600"
              onClick={() => navigate("/team")}
              data-testid="button-goto-team"
            >
              Aller sur
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mx-4 mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Tirage au Sort</h3>
            <p className="text-sm text-gray-500 mb-3">
              La roue de la chance continue de tourner avec de superbes cadeaux
            </p>
            <button
              className="text-green-600 text-sm font-medium flex items-center gap-1 hover:underline"
              onClick={() => window.open(settings?.discussionGroup || "https://t.me/+DOnUcJs7idVmN2E0", "_blank")}
              data-testid="button-goto-lottery"
            >
              Aller sur
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <img 
              src={lotteryImage} 
              alt="Tirage au Sort" 
              className="w-full h-32 object-cover"
            />
          </div>
        </div>

        <div className="h-8"></div>
      </div>

      <BottomNav />
    </div>
  );
}
