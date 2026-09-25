import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, User } from "lucide-react";
import { Link, useParams } from "wouter";

interface ReferralUser {
  id: string;
  phone: string;
  country: string;
  totalInvestment: number;
  hasProduct: boolean;
  createdAt: string;
}

const levelConfig: Record<number, { label: string; medalColor: string }> = {
  1: { label: "LV1", medalColor: "bg-yellow-400" },
  2: { label: "LV2", medalColor: "bg-gray-300" },
  3: { label: "LV3", medalColor: "bg-orange-400" },
};

export default function TeamLevelPage() {
  const { user } = useAuth();
  const params = useParams<{ level: string }>();
  const level = parseInt(params.level || "1");

  const { data: referrals, isLoading } = useQuery<ReferralUser[]>({
    queryKey: ["/api/team/referrals", level],
    queryFn: async () => {
      const res = await fetch(`/api/team/referrals/${level}`);
      if (!res.ok) throw new Error("Failed to fetch referrals");
      return res.json();
    },
  });

  const config = levelConfig[level] || levelConfig[1];

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        <div className="max-w-md mx-auto p-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <BottomNav />
      </div>
    );
  }

  const maskPhone = (phone: string) => {
    if (phone.length <= 4) return phone;
    return phone.slice(0, 2) + "****" + phone.slice(-2);
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="max-w-md mx-auto">
        <div className="bg-white p-4 flex items-center gap-3 shadow-sm">
          <Link href="/team" className="p-2 hover:bg-gray-100 rounded-full" data-testid="button-back" aria-label="Retour à l’équipe">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full ${config.medalColor} flex items-center justify-center`}>
              <span className="text-sm font-bold text-white">{level}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-800">Membres · {config.label}</h1>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {referrals && referrals.length > 0 ? (
            referrals.map((referral) => (
              <div
                key={referral.id}
                className="bg-white rounded-xl p-4 shadow-sm"
                data-testid={`card-referral-${referral.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-800">{maskPhone(referral.phone)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${referral.hasProduct ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        {referral.hasProduct ? 'Investisseur' : 'Non investi'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-500">
                        Inscrit le {new Date(referral.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="text-sm font-medium text-gray-700">
                        XOF {referral.totalInvestment.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl p-8 shadow-sm text-center">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun membre au niveau {level}</p>
              <p className="text-sm text-gray-400 mt-1">Partagez votre lien d'invitation pour développer votre réseau.</p>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-blue-700 text-center">
              <span className="font-semibold">{referrals?.length || 0}</span> membre(s) au niveau {level}
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
