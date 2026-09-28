import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import referralIcon from "@assets/prime-de-parrainage-3d-icon-png-download-4862975_1790362738847.png";
import { DEFAULT_BUSINESS_SETTINGS } from "@shared/schema";

interface TeamStats {
  level1Count: number;
  level2Count: number;
  level3Count: number;
  level1Investors: number;
  level2Investors: number;
  level3Investors: number;
  level1Investment: number;
  level2Investment: number;
  level3Investment: number;
  level1Commissions: number;
  level2Commissions: number;
  level3Commissions: number;
  totalCommissions: number;
  totalTeamSize: number;
  totalTeamInvestment: number;
}

interface PublicBusinessSettings {
  referralLevel1Percentage: number;
  referralLevel2Percentage: number;
  referralLevel3Percentage: number;
}

export default function TeamPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const {
    data: stats,
    isLoading,
    isError,
    refetch,
  } = useQuery<TeamStats>({
    queryKey: ["/api/team/stats"],
    enabled: !!user,
  });
  const { data: businessSettings } = useQuery<PublicBusinessSettings>({
    queryKey: ["/api/settings/public"],
  });

  const referralLink = user ? `${window.location.origin}/register?reg=${user.referralCode}` : "";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié!", description: `${label} copié dans le presse-papier` });
  };

  if (authLoading || !user || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        <div className="max-w-md mx-auto p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        <div className="mx-auto max-w-md p-4">
          <div className="rounded-xl bg-white p-6 text-center shadow-sm">
            <p className="font-semibold text-gray-800">Impossible de charger votre équipe.</p>
            <p className="mt-2 text-sm text-gray-600">Vérifiez votre connexion puis réessayez.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Réessayer
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const totalTeamSize = (stats?.level1Count || 0) + (stats?.level2Count || 0) + (stats?.level3Count || 0);
  const totalInvestment = (stats?.level1Investment || 0) + (stats?.level2Investment || 0) + (stats?.level3Investment || 0);
  const totalCommissions = stats?.totalCommissions || 0;

  const level1Rate =
    businessSettings?.referralLevel1Percentage ??
    DEFAULT_BUSINESS_SETTINGS.referralLevel1Percentage;
  const level2Rate =
    businessSettings?.referralLevel2Percentage ??
    DEFAULT_BUSINESS_SETTINGS.referralLevel2Percentage;
  const level3Rate =
    businessSettings?.referralLevel3Percentage ??
    DEFAULT_BUSINESS_SETTINGS.referralLevel3Percentage;

  const levels = [
    {
      level: 1,
      label: "LV1",
      teamSize: stats?.level1Count || 0,
      commissionEarned: stats?.level1Commissions || 0,
      commissionRate: level1Rate,
      medalColor: "bg-yellow-400",
      medalBorder: "border-yellow-500",
    },
    {
      level: 2,
      label: "LV2",
      teamSize: stats?.level2Count || 0,
      commissionEarned: stats?.level2Commissions || 0,
      commissionRate: level2Rate,
      medalColor: "bg-gray-300",
      medalBorder: "border-gray-400",
    },
    {
      level: 3,
      label: "LV3",
      teamSize: stats?.level3Count || 0,
      commissionEarned: stats?.level3Commissions || 0,
      commissionRate: level3Rate,
      medalColor: "bg-orange-400",
      medalBorder: "border-orange-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="max-w-md mx-auto">
        <div className="p-4 space-y-4">
          <section className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm" aria-label="Parrainage">
            <img src={referralIcon} alt="" className="h-14 w-14 shrink-0 object-contain" />
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-gray-800">Votre équipe</h1>
              <p className="text-sm text-gray-600">Partagez votre code et suivez les membres de votre réseau.</p>
            </div>
          </section>

          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-3 shadow-sm">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 bg-transparent text-sm text-gray-600 outline-none truncate"
              data-testid="input-referral-link"
            />
            <button
              onClick={() => copyToClipboard(referralLink, "Lien")}
              className="bg-blue-500 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
              data-testid="button-copy-link"
            >
              Copier le lien
            </button>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800">Code d'invitation</h2>
            <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-3 shadow-sm">
              <span className="flex-1 text-gray-700 font-medium" data-testid="text-referral-code">
                {user.referralCode}
              </span>
              <button
                onClick={() => copyToClipboard(user.referralCode, "Code")}
                className="bg-blue-500 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
                data-testid="button-copy-code"
              >
                Copier le code
              </button>
            </div>
          </div>

          <div className="bg-yellow-400 rounded-xl p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-700 text-sm">Taille de l'équipe</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="text-total-team">
                  {totalTeamSize}
                </p>
              </div>
              <div>
                <p className="text-gray-700 text-sm">Investissement total</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="text-total-investment">
                  {totalInvestment.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {levels.map((level) => (
              <div
                key={level.level}
                className="bg-white rounded-xl p-4 shadow-sm"
                data-testid={`card-level-${level.level}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full ${level.medalColor} ${level.medalBorder} border-2 flex items-center justify-center`}>
                      <span className="text-xs font-bold text-white">{level.level}</span>
                    </div>
                    <span className="font-bold text-gray-800 text-lg">{level.label}</span>
                  </div>
                  <Link href={`/team/level/${level.level}`}>
                    <div className="flex items-center gap-1 text-blue-500 cursor-pointer hover:text-blue-600" data-testid={`link-level-${level.level}`}>
                      <span className="text-sm font-medium">Voir les membres</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </Link>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{level.teamSize}</p>
                    <p className="text-xs text-gray-500">Taille de l'équipe</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-green-600">
                      {level.commissionEarned.toLocaleString("fr-FR")} FCFA
                    </p>
                    <p className="text-xs text-gray-500">
                      Total crédité · taux actuel {level.commissionRate}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm mt-4">
            <h3 className="text-blue-600 font-bold mb-3">Comment ça fonctionne</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>1. Partagez votre lien ou code d'invitation avec vos amis et votre famille.</p>
              <p>2. Les commissions sont liées aux achats de produits VIP effectués dans votre réseau.</p>
              <p>3. Consultez les détails de chaque niveau dans votre espace avant de prendre une décision.</p>
              <p>4. Les membres sont répartis sur trois niveaux de parrainage.</p>
              <p>5. Le montant des commissions est visible dans le récapitulatif de votre équipe.</p>
              <p>6. Les commissions créditées apparaissent dans le solde et l'historique du compte.</p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
