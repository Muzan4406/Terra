import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Crown, Calendar, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { Link } from "wouter";

interface UserProduct {
  id: string;
  productId: string;
  purchasedAt: string;
  nextPayoutAt: string;
  pendingReturns: number;
  cyclesCompleted: number;
  isActive: boolean;
  assignedByAdmin: boolean;
  product: {
    id: string;
    name: string;
    level: number;
    price: number;
    dailyReturn: number;
    totalReturn: number;
    duration: number;
  };
}

export default function MyProductsPage() {
  const { user } = useAuth();

  const { data: products, isLoading } = useQuery<UserProduct[]>({
    queryKey: ["/api/user/products"],
  });

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        <div className="max-w-md mx-auto p-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <BottomNav />
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString("fr-FR");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getLevelColor = (level: number) => {
    const colors: Record<number, string> = {
      1: "from-blue-400 to-blue-600",
      2: "from-green-400 to-green-600",
      3: "from-purple-400 to-purple-600",
      4: "from-orange-400 to-orange-600",
      5: "from-pink-400 to-pink-600",
      6: "from-yellow-400 to-yellow-600",
    };
    return colors[level] || colors[1];
  };

  const activeProducts = products?.filter(p => p.isActive) || [];
  const completedProducts = products?.filter(p => !p.isActive) || [];

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="max-w-md mx-auto">
        <div className="bg-white p-4 flex items-center gap-3 shadow-sm">
          <Link href="/account" className="p-2 hover:bg-gray-100 rounded-full" data-testid="button-back" aria-label="Retour au compte">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800">Mes produits</h1>
        </div>

        <div className="p-4 space-y-4">
          {products && products.length > 0 ? (
            <>
              {activeProducts.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    Produits actifs ({activeProducts.length})
                  </h2>
                  {activeProducts.map((userProduct) => {
                    const daysRemaining = userProduct.product.duration - userProduct.cyclesCompleted;
                    const progressPercent = (userProduct.cyclesCompleted / userProduct.product.duration) * 100;
                    
                    return (
                      <div
                        key={userProduct.id}
                        className="bg-white rounded-xl overflow-hidden shadow-sm"
                        data-testid={`card-product-${userProduct.id}`}
                      >
                        <div className={`relative overflow-hidden bg-gradient-to-r ${getLevelColor(userProduct.product.level)} p-4`}>
                          <div className="absolute inset-0 bg-slate-950/40" />
                          <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Crown className="w-5 h-5 text-white" />
                              <span className="text-white font-bold text-lg">
                                {userProduct.product.name}
                              </span>
                            </div>
                            <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                              Actif
                            </span>
                          </div>
                        </div>
                        
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-50 rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                                <Clock className="w-4 h-4" />
                                <span className="text-xs font-medium">Jours restants</span>
                              </div>
                              <p className="text-2xl font-bold text-blue-700" data-testid="text-days-remaining">
                                {daysRemaining}
                              </p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-xs font-medium">Gains bloqués</span>
                              </div>
                              <p className="text-xl font-bold text-green-700" data-testid="text-cumulative-revenue">
                                {formatNumber(userProduct.pendingReturns)} F
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-sm">Prix d'achat</span>
                            <span className="font-semibold text-gray-800">
                              {formatNumber(userProduct.product.price)} FCFA
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                              <span className="text-gray-500 text-sm">Gain quotidien bloqué</span>
                            <span className="font-semibold text-green-600">
                              +{formatNumber(userProduct.product.dailyReturn)} FCFA
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-sm">Progression</span>
                            <span className="font-semibold text-gray-800">
                              {userProduct.cyclesCompleted} / {userProduct.product.duration} jours
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Les gains seront versés au solde retrait à la fin du cycle.
                          </p>
                          
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`bg-gradient-to-r ${getLevelColor(userProduct.product.level)} h-2 rounded-full`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                            <Calendar className="w-3 h-3" />
                            <span>Acheté le {formatDate(userProduct.purchasedAt)}</span>
                            {userProduct.assignedByAdmin && (
                              <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full ml-auto">
                                Attribué par admin
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {completedProducts.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-gray-400" />
                    Produits terminés ({completedProducts.length})
                  </h2>
                  {completedProducts.map((userProduct) => (
                    <div
                      key={userProduct.id}
                      className="bg-white rounded-xl overflow-hidden shadow-sm opacity-70"
                      data-testid={`card-product-completed-${userProduct.id}`}
                    >
                      <div className="relative overflow-hidden bg-gray-300 p-4">
                        <div className="absolute inset-0 bg-slate-950/40" />
                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Crown className="w-5 h-5 text-white" />
                            <span className="text-white font-bold text-lg">
                              {userProduct.product.name}
                            </span>
                          </div>
                          <span className="bg-white/30 text-white text-xs px-2 py-1 rounded-full">
                            Terminé
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-sm">Total gagné</span>
                          <span className="font-semibold text-green-600">
                            {formatNumber(userProduct.product.totalReturn)} FCFA
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>Terminé après {userProduct.product.duration} jours</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl p-8 shadow-sm text-center">
              <Crown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucun produit VIP</p>
              <p className="text-sm text-gray-400 mt-1">
                        Les produits associés à votre compte apparaîtront ici.
              </p>
              <Link
                href="/invest"
                className="mt-4 inline-flex bg-blue-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-600"
                data-testid="button-invest"
              >
                Voir les produits disponibles
              </Link>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
