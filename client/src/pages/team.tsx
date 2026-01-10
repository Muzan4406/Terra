import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { MoneyDisplay } from "@/components/money-display";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, TrendingUp, Link2, UserPlus } from "lucide-react";
import { REFERRAL_LEVELS } from "@shared/schema";

interface TeamStats {
  level1Count: number;
  level2Count: number;
  level3Count: number;
  level1Investors: number;
  level2Investors: number;
  level3Investors: number;
  totalCommissions: number;
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
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-md mx-auto p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-md mx-auto">
        <header className="p-4 bg-card border-b border-card-border">
          <h1 className="text-xl font-bold">Mon équipe</h1>
          <p className="text-sm text-muted-foreground">Parrainez et gagnez des commissions</p>
        </header>

        <div className="p-4 space-y-4">
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm opacity-80">Total des commissions</p>
                  <p className="text-2xl font-bold" data-testid="text-commissions">
                    <MoneyDisplay amount={stats?.totalCommissions || 0} />
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {REFERRAL_LEVELS.map((level) => (
                  <div key={level.level} className="bg-white/10 rounded-md p-2">
                    <p className="text-xs opacity-80">Niveau {level.level}</p>
                    <p className="font-bold">{level.percentage}%</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Lien de parrainage</h3>
              </div>
              
              <div className="bg-muted p-3 rounded-md text-sm break-all">
                {referralLink}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(referralLink, "Lien")}
                  data-testid="button-copy-link"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copier le lien
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(user.referralCode, "Code")}
                  data-testid="button-copy-code"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copier le code
                </Button>
              </div>

              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-md">
                <Badge variant="secondary" className="font-mono" data-testid="text-referral-code">
                  {user.referralCode}
                </Badge>
                <span className="text-sm text-muted-foreground">Votre code de parrainage</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Statistiques de l'équipe</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <UserPlus className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium">Niveau 1 (25%)</p>
                      <p className="text-xs text-muted-foreground">Filleuls directs</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" data-testid="text-level1-count">{stats?.level1Count || 0}</p>
                    <p className="text-xs text-green-500">{stats?.level1Investors || 0} investisseurs</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Niveau 2 (2%)</p>
                      <p className="text-xs text-muted-foreground">Filleuls de niveau 2</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" data-testid="text-level2-count">{stats?.level2Count || 0}</p>
                    <p className="text-xs text-green-500">{stats?.level2Investors || 0} investisseurs</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium">Niveau 3 (1%)</p>
                      <p className="text-xs text-muted-foreground">Filleuls de niveau 3</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" data-testid="text-level3-count">{stats?.level3Count || 0}</p>
                    <p className="text-xs text-green-500">{stats?.level3Investors || 0} investisseurs</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
