import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MoneyDisplay } from "@/components/money-display";
import { BottomNav } from "@/components/bottom-nav";
import { Wallet, ArrowUpFromLine, MessageCircle, Send, Users, ExternalLink } from "lucide-react";
import { Link, useLocation } from "wouter";
import logoImage from "@assets/cigna-healthcare-logo_1768031545630.png";
import bannerImage from "@assets/smilingdoctor-globalhealth-blog-1200x673_1768031545518.webp";
import footerImage from "@assets/Img_2026_01_09_18_58_01_1768031521173.jpeg";

interface PlatformSettings {
  customerService: string;
  officialChannel: string;
  discussionGroup: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["/api/settings/public"],
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-screen w-full max-w-md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-md mx-auto">
        <header className="flex items-center justify-between p-4 bg-card border-b border-card-border">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">Cigna Group</span>
          </div>
          <img src={logoImage} alt="Logo" className="h-10 object-contain" />
        </header>

        <div className="w-full">
          <img 
            src={bannerImage} 
            alt="Banner" 
            className="w-full h-48 object-cover"
          />
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4 hover-elevate"
              onClick={() => navigate("/deposit")}
              data-testid="button-recharge"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium">Recharger</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4 hover-elevate"
              onClick={() => navigate("/withdraw")}
              data-testid="button-withdraw"
            >
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <ArrowUpFromLine className="h-5 w-5 text-green-500" />
              </div>
              <span className="text-sm font-medium">Retrait</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4 hover-elevate"
              onClick={() => window.open(settings?.customerService || "https://t.me/+DOnUcJs7idVmN2E0", "_blank")}
              data-testid="button-support"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-sm font-medium">Service client</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card className="hover-elevate">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Solde du compte</p>
                <p className="text-xl font-bold text-foreground" data-testid="text-balance">
                  <MoneyDisplay amount={user.balance} />
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Revenu d'aujourd'hui</p>
                <p className="text-xl font-bold text-green-500" data-testid="text-today-earnings">
                  <MoneyDisplay amount={user.todayEarnings} />
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">Liens utiles</h3>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 hover-elevate"
                  onClick={() => window.open(settings?.officialChannel || "https://t.me/+DOnUcJs7idVmN2E0", "_blank")}
                  data-testid="link-channel"
                >
                  <Send className="h-4 w-4 text-primary" />
                  <span>Chaîne officielle</span>
                  <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 hover-elevate"
                  onClick={() => window.open(settings?.discussionGroup || "https://t.me/+DOnUcJs7idVmN2E0", "_blank")}
                  data-testid="link-group"
                >
                  <Users className="h-4 w-4 text-primary" />
                  <span>Groupe de discussion</span>
                  <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full mt-4">
          <img 
            src={footerImage} 
            alt="Promo" 
            className="w-full h-48 object-cover"
          />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
