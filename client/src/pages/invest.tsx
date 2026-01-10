import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { MoneyDisplay } from "@/components/money-display";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Crown, Clock, TrendingUp, Loader2, Sparkles } from "lucide-react";
import type { Product, UserProduct } from "@shared/schema";

interface ProductWithOwnership extends Product {
  owned: boolean;
  userProduct?: UserProduct;
}

export default function InvestPage() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery<ProductWithOwnership[]>({
    queryKey: ["/api/products"],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await apiRequest("POST", "/api/products/purchase", { productId });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Achat réussi!", 
        description: "Votre investissement est maintenant actif. Vous recevrez vos gains quotidiens automatiquement." 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      refetchUser();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const getVipColor = (level: number) => {
    const colors = [
      "from-amber-500 to-yellow-400",
      "from-blue-500 to-cyan-400",
      "from-purple-500 to-pink-400",
      "from-emerald-500 to-green-400",
      "from-red-500 to-orange-400",
      "from-indigo-600 to-violet-500",
    ];
    return colors[level - 1] || colors[0];
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-md mx-auto p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-md mx-auto">
        <header className="p-4 bg-card border-b border-card-border">
          <h1 className="text-xl font-bold">Plan d'investissement</h1>
          <p className="text-sm text-muted-foreground">Choisissez un produit VIP pour commencer à gagner</p>
        </header>

        <div className="p-4">
          <Card className="mb-4 bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Votre solde disponible</p>
                  <p className="text-2xl font-bold" data-testid="text-balance">
                    <MoneyDisplay amount={user.balance} />
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {products?.map((product) => (
              <Card 
                key={product.id} 
                className={`overflow-hidden hover-elevate ${product.owned ? 'border-primary/50' : ''}`}
              >
                <div className={`h-2 bg-gradient-to-r ${getVipColor(product.level)}`} />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getVipColor(product.level)} flex items-center justify-center`}>
                        <Crown className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{product.name}</h3>
                        {product.owned && (
                          <Badge variant="secondary" className="text-xs">Actif</Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {product.duration} jours
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                    <div className="bg-muted/50 rounded-md p-2">
                      <p className="text-xs text-muted-foreground">Prix d'achat</p>
                      <p className="font-bold text-sm">
                        <MoneyDisplay amount={product.price} showCurrency={false} />
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-2">
                      <p className="text-xs text-muted-foreground">Gain/jour</p>
                      <p className="font-bold text-sm text-green-500">
                        +<MoneyDisplay amount={product.dailyReturn} showCurrency={false} />
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-2">
                      <p className="text-xs text-muted-foreground">Gain total</p>
                      <p className="font-bold text-sm text-primary">
                        <MoneyDisplay amount={product.totalReturn} showCurrency={false} />
                      </p>
                    </div>
                  </div>

                  {product.owned ? (
                    <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span>Générant des revenus quotidiens</span>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      disabled={user.balance < product.price || purchaseMutation.isPending}
                      onClick={() => purchaseMutation.mutate(product.id)}
                      data-testid={`button-buy-${product.level}`}
                    >
                      {purchaseMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Achat en cours...
                        </>
                      ) : user.balance < product.price ? (
                        "Solde insuffisant"
                      ) : (
                        <>
                          Acheter pour <MoneyDisplay amount={product.price} />
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
