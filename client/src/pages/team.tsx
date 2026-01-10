import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight } from "lucide-react";

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
  totalCommissions: number;
  totalTeamSize: number;
  totalTeamInvestment: number;
}

export default function TeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: stats, isLoading } = useQuery<TeamStats>({
    queryKey: ["/api/team/stats"],
  });

  const referralLink = user ? `${window.location.origin}/register?reg=${user.referralCode}` : "";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié!", description: `${label} copié dans le presse-papier` });
  };

  if (!user || isLoading) {
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

  const totalTeamSize = (stats?.level1Count || 0) + (stats?.level2Count || 0) + (stats?.level3Count || 0);
  const totalInvestment = (stats?.level1Investment || 0) + (stats?.level2Investment || 0) + (stats?.level3Investment || 0);

  const levels = [
    {
      level: 1,
      label: "LV1",
      commission: "27%",
      teamSize: stats?.level1Count || 0,
      investment: stats?.level1Investment || 0,
      medalColor: "bg-yellow-400",
      medalBorder: "border-yellow-500",
    },
    {
      level: 2,
      label: "LV2",
      commission: "2%",
      teamSize: stats?.level2Count || 0,
      investment: stats?.level2Investment || 0,
      medalColor: "bg-gray-300",
      medalBorder: "border-gray-400",
    },
    {
      level: 3,
      label: "LV3",
      commission: "1%",
      teamSize: stats?.level3Count || 0,
      investment: stats?.level3Investment || 0,
      medalColor: "bg-orange-400",
      medalBorder: "border-orange-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="max-w-md mx-auto">
        <div className="p-4 space-y-4">
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
              Copie
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
                Copie
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
                  <div className="flex items-center gap-1 text-blue-500">
                    <span className="text-sm font-medium">Commission:{level.commission}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{level.teamSize}</p>
                    <p className="text-xs text-gray-500">Taille de l'équipe</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-800">
                      XOF {level.investment.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">investir</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
