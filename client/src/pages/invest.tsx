import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import type { Product, UserProduct } from "@shared/schema";

import product1Img from "@assets/79d84350-9aa4-4031-ad23-c22766584042_1768037288627.webp";
import product2Img from "@assets/images_(30)_1768037288811.jpeg";
import product3Img from "@assets/images_(31)_1768037288700.jpeg";
import product4Img from "@assets/images_(32)_1768037288765.jpeg";
import product5Img from "@assets/images_(33)_1768037288733.jpeg";

interface ProductWithOwnership extends Product {
  owned: boolean;
  userProduct?: UserProduct;
}

const productImages = [
  product1Img,
  product2Img,
  product3Img,
  product4Img,
  product5Img,
  product3Img,
];

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
        description: "Votre investissement est maintenant actif." 
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

  const formatNumber = (num: number) => {
    return num.toLocaleString("fr-FR");
  };

  const calculateProfitRate = (dailyReturn: number, price: number) => {
    return ((dailyReturn / price) * 100).toFixed(1);
  };

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-md mx-auto p-4 space-y-4">
          <Skeleton className="h-8 w-64 mx-auto" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto">
        <header className="py-6 px-4 bg-white">
          <h1 className="text-xl font-bold text-center text-gray-800">
            Liste des Appareils d'Investissement
          </h1>
        </header>

        <div className="px-4 py-2 space-y-4">
          {products?.map((product, index) => {
            const productImage = productImages[index] || productImages[0];
            
            return (
              <div 
                key={product.id} 
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex gap-4">
                  <div className="w-24 h-28 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    <img 
                      src={productImage} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg text-blue-600">
                        {product.name}
                      </h3>
                      <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
                        Hot
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Revenu quotidien:</span>
                        <span className="font-medium text-gray-800">{formatNumber(product.dailyReturn)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Revenu total:</span>
                        <span className="font-medium text-gray-800">{formatNumber(product.totalReturn)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Taux de profit quotidien:</span>
                        <span className="font-medium text-gray-800">{calculateProfitRate(product.dailyReturn, product.price)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Période de revenu:</span>
                        <span className="font-medium text-gray-800">{product.duration} Jour</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                  <span className="text-blue-600 text-sm font-medium cursor-pointer">
                    Détail &gt;&gt;
                  </span>
                  
                  {product.owned ? (
                    <div className="flex items-center overflow-hidden rounded-full border border-gray-300">
                      <span className="px-4 py-2 text-sm text-gray-700 bg-white font-bold">
                        {formatNumber(product.price)} F CFA
                      </span>
                      <span className="bg-green-500 text-white text-sm px-5 py-2 font-medium">
                        Actif
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center overflow-hidden rounded-full border border-gray-300">
                      <span className="px-4 py-2 text-sm text-gray-700 bg-white font-bold">
                        {formatNumber(product.price)} F CFA
                      </span>
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        disabled={purchaseMutation.isPending}
                        onClick={() => purchaseMutation.mutate(product.id)}
                        data-testid={`button-buy-${product.level}`}
                      >
                        {purchaseMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "investir"
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
