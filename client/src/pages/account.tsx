import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { MoneyDisplay } from "@/components/money-display";
import { getCountryFlag, getCountryName } from "@/components/country-select";
import { 
  Wallet, ArrowUpFromLine, History, CreditCard, 
  Info, BookOpen, LogOut, ChevronRight, Shield, Maximize2
} from "lucide-react";
import logoImage from "@assets/cigna-healthcare-logo_1768031545630.png";

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-md mx-auto p-4 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
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
    { icon: CreditCard, label: "Gestion de carte bancaire", path: "/wallets", testId: "menu-wallets" },
    { icon: Info, label: "À propos de nous", path: "/about", testId: "menu-about" },
    { icon: BookOpen, label: "Règles de la plateforme", path: "/rules", testId: "menu-rules" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-md mx-auto">
        <div className="bg-foreground text-background p-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-background">
              <AvatarFallback className="bg-background text-foreground text-xl font-bold">
                {user.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-lg truncate" data-testid="text-username">
                  {user.fullName}
                </p>
                {user.isPromoter && (
                  <Badge className="bg-amber-500 text-white text-xs">Promoteur</Badge>
                )}
              </div>
              <p className="text-sm opacity-80" data-testid="text-phone">
                {getCountryFlag(user.country)} {user.phone}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="text-background hover:bg-white/10">
              <Maximize2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold" data-testid="text-balance">
                <MoneyDisplay amount={user.balance} />
              </p>
              <p className="text-sm text-muted-foreground mt-1">Solde du compte</p>
            </CardContent>
          </Card>

          <div className="bg-foreground text-background rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <Button
                variant="ghost"
                className="flex flex-col items-center gap-2 h-auto py-3 text-background hover:bg-white/10"
                onClick={() => navigate("/deposit")}
                data-testid="button-recharge"
              >
                <Wallet className="h-6 w-6" />
                <span className="text-sm">Recharger</span>
              </Button>

              <Button
                variant="ghost"
                className="flex flex-col items-center gap-2 h-auto py-3 text-background hover:bg-white/10"
                onClick={() => navigate("/withdraw")}
                data-testid="button-withdraw"
              >
                <ArrowUpFromLine className="h-6 w-6" />
                <span className="text-sm">Retirer</span>
              </Button>

              <Button
                variant="ghost"
                className="flex flex-col items-center gap-2 h-auto py-3 text-background hover:bg-white/10"
                onClick={() => navigate("/history")}
                data-testid="button-history"
              >
                <History className="h-6 w-6" />
                <span className="text-sm">Historique</span>
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {menuItems.map((item, index) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={`w-full justify-start gap-3 h-14 rounded-none hover-elevate ${
                    index !== menuItems.length - 1 ? "border-b border-border" : ""
                  }`}
                  onClick={() => navigate(item.path)}
                  data-testid={item.testId}
                >
                  <item.icon className="h-5 w-5 text-primary" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              ))}
            </CardContent>
          </Card>

          {user.isAdmin && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-0">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-14 hover-elevate"
                  onClick={() => navigate("/admin")}
                  data-testid="button-admin"
                >
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="flex-1 text-left font-medium">Panneau d'administration</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          )}

          <Button
            variant="outline"
            className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>

          <div className="flex justify-center pt-4">
            <img src={logoImage} alt="Cigna Group" className="h-8 opacity-50" />
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
