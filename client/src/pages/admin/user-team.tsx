import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, TrendingUp, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  fullName: string;
  phone: string;
  country: string;
  referralCode: string;
  balance: number;
  totalEarnings: number;
  isAdmin: boolean;
  hasProduct: boolean;
  createdAt: string;
}

interface TeamMember {
  id: string;
  fullName: string;
  phone: string;
  country: string;
  balance: number;
  hasProduct: boolean;
  totalInvestment: number;
  createdAt: string;
}

interface TeamStats {
  level1: TeamMember[];
  level2: TeamMember[];
  level3: TeamMember[];
  totalTeamSize: number;
  totalInvestment: number;
}

export default function AdminUserTeamPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/admin/users", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${id}`);
      if (!res.ok) throw new Error("Utilisateur non trouvé");
      return res.json();
    },
  });

  const { data: teamStats, isLoading: teamLoading } = useQuery<TeamStats>({
    queryKey: ["/api/admin/users", id, "team"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${id}/team`);
      if (!res.ok) throw new Error("Équipe non trouvée");
      return res.json();
    },
  });

  const isLoading = userLoading || teamLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user || !teamStats) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-gray-500">Utilisateur non trouvé</p>
            <Button onClick={() => navigate("/admin/users")} className="mt-4">
              Retour
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => num.toLocaleString("fr-FR");
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const levelColors = {
    1: { bg: "bg-yellow-100", border: "border-yellow-400", text: "text-yellow-700", badge: "bg-yellow-400" },
    2: { bg: "bg-gray-100", border: "border-gray-400", text: "text-gray-700", badge: "bg-gray-400" },
    3: { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-700", badge: "bg-orange-400" },
  };

  const renderTeamLevel = (level: number, members: TeamMember[]) => {
    const colors = levelColors[level as keyof typeof levelColors];
    const commissionRate = level === 1 ? "25%" : level === 2 ? "2%" : "1%";
    
    return (
      <div key={level} className="bg-white rounded-xl overflow-hidden shadow-sm">
        <div className={`${colors.bg} ${colors.border} border-b p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 ${colors.badge} rounded-full flex items-center justify-center`}>
                <span className="text-white font-bold">{level}</span>
              </div>
              <div>
                <h3 className={`font-bold ${colors.text}`}>Niveau {level}</h3>
                <p className="text-sm text-gray-500">Taux de commission: {commissionRate}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-800">{members.length}</p>
              <p className="text-xs text-gray-500">membres</p>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          {members.length > 0 ? (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{member.fullName}</p>
                      <p className="text-sm text-gray-500">
                        {member.country} • {member.phone}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      {member.hasProduct && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                      <p className="font-semibold text-gray-800">
                        {formatNumber(member.totalInvestment)} F
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Inscrit le {formatDate(member.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-4">Aucun membre à ce niveau</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto">
        <header className="bg-white p-4 flex items-center gap-4 shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/users")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Équipe de {user.fullName}</h1>
            <p className="text-sm text-gray-500">{user.phone} • {user.country}</p>
          </div>
        </header>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-500 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5" />
                <span className="text-sm opacity-80">Taille totale</span>
              </div>
              <p className="text-3xl font-bold">{teamStats.totalTeamSize}</p>
            </div>
            <div className="bg-green-500 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm opacity-80">Investissement total</span>
              </div>
              <p className="text-2xl font-bold">{formatNumber(teamStats.totalInvestment)} F</p>
            </div>
          </div>

          {renderTeamLevel(1, teamStats.level1)}
          {renderTeamLevel(2, teamStats.level2)}
          {renderTeamLevel(3, teamStats.level3)}
        </div>
      </div>
    </div>
  );
}
