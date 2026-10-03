import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MoneyDisplay } from "@/components/money-display";
import { 
  ArrowLeft, Users, ArrowDownToLine, ArrowUpFromLine, ShoppingBag, 
  Settings, CreditCard, TrendingUp, UserCheck, ChevronRight, Gift, MessageSquareText, FileCheck2
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  todayRegistrations: number;
  todayDeposits: number;
  todayWithdrawals: number;
  totalDepositsAmount: number;
  totalWithdrawalsAmount: number;
  totalWithdrawalsCount: number;
  todayWithdrawalsAmount: number;
  usersWithProducts: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard"],
  });

  if (!user?.isAdmin) {
    navigate("/");
    return null;
  }

  const menuItems = [
    { icon: ArrowDownToLine, label: "Dépôts en attente", path: "/admin/deposits", count: stats?.pendingDeposits, color: "text-green-500" },
    { icon: ArrowUpFromLine, label: "Retraits en attente", path: "/admin/withdrawals", count: stats?.pendingWithdrawals, color: "text-red-500" },
    { icon: FileCheck2, label: "Preuves de retrait", path: "/admin/withdrawal-proofs", color: "text-amber-600" },
    { icon: MessageSquareText, label: "Messages du service client", path: "/admin/support", color: "text-teal-500" },
    { icon: Users, label: "Gestion des utilisateurs", path: "/admin/users", color: "text-blue-500" },
    { icon: ShoppingBag, label: "Gestion des produits", path: "/admin/products", color: "text-amber-500" },
    { icon: CreditCard, label: "Canaux de paiement", path: "/admin/channels", color: "text-purple-500" },
    { icon: Gift, label: "Codes bonus", path: "/admin/bonus-codes", color: "text-teal-500" },
    ...(user?.isSuperAdmin ? [{ icon: Settings, label: "Paramètres", path: "/admin/settings", color: "text-gray-500" }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center gap-4 p-4 bg-card border-b border-card-border">
          <Button variant="ghost" size="icon" onClick={() => navigate("/account")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Vue d’ensemble · Administration</h1>
        </header>

        <div className="p-4 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {isLoading ? (
              [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)
            ) : (
              <>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                  <p className="text-xs text-muted-foreground">Utilisateurs au total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <UserCheck className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats?.todayRegistrations || 0}</p>
                  <p className="text-xs text-muted-foreground">Nouvelles inscriptions aujourd’hui</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats?.usersWithProducts || 0}</p>
                        <p className="text-xs text-muted-foreground">Avec produits</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">
                          <MoneyDisplay amount={stats?.totalDepositsAmount || 0} showCurrency={false} />
                        </p>
                        <p className="text-xs text-muted-foreground">Total dépôts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistiques des retraits</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center p-3 bg-red-500/10 rounded-lg text-center">
                <p className="text-xl font-bold">{stats?.totalWithdrawalsCount || 0}</p>
                <p className="text-xs text-muted-foreground">Nombre total</p>
              </div>
              <div className="flex flex-col items-center p-3 bg-orange-500/10 rounded-lg text-center">
                <p className="text-lg font-bold">
                  <MoneyDisplay amount={stats?.totalWithdrawalsAmount || 0} showCurrency={false} />
                </p>
                <p className="text-xs text-muted-foreground">Montant total</p>
              </div>
              <div className="flex flex-col items-center p-3 bg-yellow-500/10 rounded-lg text-center">
                <p className="text-lg font-bold">
                  <MoneyDisplay amount={stats?.todayWithdrawalsAmount || 0} showCurrency={false} />
                </p>
                <p className="text-xs text-muted-foreground">Aujourd'hui</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistiques du jour</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
                <ArrowDownToLine className="h-6 w-6 text-green-500" />
                <div>
                  <p className="text-lg font-bold">{stats?.todayDeposits || 0}</p>
                  <p className="text-xs text-muted-foreground">Dépôts aujourd'hui</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg">
                <ArrowUpFromLine className="h-6 w-6 text-red-500" />
                <div>
                  <p className="text-lg font-bold">{stats?.todayWithdrawals || 0}</p>
                  <p className="text-xs text-muted-foreground">Retraits aujourd'hui</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gestion de la plateforme</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {menuItems.map((item, index) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex w-full items-center justify-start gap-3 px-4 h-14 rounded-none hover-elevate ${
                    index !== menuItems.length - 1 ? "border-b border-border" : ""
                  }`}
                  data-testid={`admin-menu-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                        {item.count}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
