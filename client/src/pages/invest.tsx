import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { getProductImageMap } from "@shared/product-images";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type Product,
  type ProductCategory,
  type UserProduct,
} from "@shared/schema";

interface ProductWithOwnership extends Product {
  owned: boolean;
  ownedCount: number;
  userProduct?: UserProduct;
}

export default function InvestPage() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>("fixed");

  const {
    data: products,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ProductWithOwnership[]>({
    queryKey: ["/api/products"],
    retry: 1,
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
        description: "Votre achat est maintenant actif." 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/products"] });
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

  const formatNumber = (num: number) => {
    return num.toLocaleString("fr-FR");
  };

  const calculateProfitRate = (dailyReturn: number, price: number) => {
    return ((dailyReturn / price) * 100).toFixed(1);
  };

  const productImageMap = getProductImageMap(products ?? []);
  const visibleProducts = (products ?? []).filter(
    (product) => product.category === selectedCategory,
  );

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto p-4 space-y-4">
          <Skeleton className="h-8 w-64 mx-auto" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto">
        <header className="flex items-center justify-center gap-3 bg-white px-4 py-4">
          <BrandLogo className="h-12 w-12 rounded-lg object-contain" alt="" />
          <h1 className="text-base font-bold text-gray-800">Investir</h1>
        </header>

        <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Solde dépôt</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{formatNumber(user.depositBalance)} F</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Solde retrait</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{formatNumber(user.withdrawalBalance)} F</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 py-4">
          {PRODUCT_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={selectedCategory === category}
              onClick={() => setSelectedCategory(category)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                selectedCategory === category
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {PRODUCT_CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>

        <div className="px-4 pb-4 space-y-4">
          {isError ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-center"
            >
              <p className="text-sm text-red-800">
                {error instanceof Error
                  ? error.message
                  : "Impossible de charger les produits d’investissement."}
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => void refetch()}
              >
                Réessayer
              </Button>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center text-sm text-gray-600">
              Aucun produit n’est disponible dans cette catégorie.
            </div>
          ) : (
          visibleProducts.map((product) => {
            const imageUrl = productImageMap.get(product.id);
            return (
              <div
                key={product.id}
                className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-white">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="h-8 w-8 text-gray-300" aria-hidden="true" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold text-gray-900">
                      {product.name}
                    </h3>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                      <div>
                        <p className="text-[11px] text-gray-500">Prix</p>
                        <p className="text-xs font-semibold text-gray-900">{formatNumber(product.price)} FCFA</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-500">Gain quotidien</p>
                        <p className="text-xs font-semibold text-gray-900">{formatNumber(product.dailyReturn)} FCFA</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-500">Gains à l’échéance</p>
                        <p className="text-xs font-semibold text-gray-900">{formatNumber(product.totalReturn)} FCFA</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-500">Durée</p>
                        <p className="text-xs font-semibold text-gray-900">{product.duration} jours</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-500">
                      Taux quotidien indicatif : {calculateProfitRate(product.dailyReturn, product.price)}%
                    </p>
                    <Button
                      type="button"
                      className="mt-3 h-9 w-full"
                      disabled={purchaseMutation.isPending}
                      onClick={() => purchaseMutation.mutate(product.id)}
                      data-testid={`button-buy-${product.level}`}
                    >
                      {purchaseMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Traitement…</>
                      ) : product.ownedCount > 0 ? (
                        "Acheter à nouveau"
                      ) : (
                        "Acheter"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>

    </div>
  );
}
