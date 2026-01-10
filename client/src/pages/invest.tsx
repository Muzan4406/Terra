import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, X, CheckCircle, TrendingUp, Clock, Coins } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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

const productDescriptions = [
  "Machine d'entrée de gamme idéale pour commencer votre parcours d'investissement. Rendement stable et fiable.",
  "Équipement de diagnostic avancé offrant un excellent rapport qualité-prix pour les investisseurs débutants.",
  "Scanner médical de haute précision avec des rendements quotidiens attractifs.",
  "Appareil d'imagerie médicale performant pour des gains réguliers et sécurisés.",
  "Technologie de pointe en imagerie offrant des retours sur investissement élevés.",
  "Notre machine premium avec les meilleurs rendements du marché pour les investisseurs expérimentés.",
];

export default function InvestPage() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<ProductWithOwnership | null>(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number>(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showConfirmPurchase, setShowConfirmPurchase] = useState(false);
  const [productToPurchase, setProductToPurchase] = useState<ProductWithOwnership | null>(null);
  const [productToPurchaseIndex, setProductToPurchaseIndex] = useState<number>(0);

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
      setShowConfirmPurchase(false);
      setProductToPurchase(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
      setShowConfirmPurchase(false);
    },
  });

  const formatNumber = (num: number) => {
    return num.toLocaleString("fr-FR");
  };

  const calculateProfitRate = (dailyReturn: number, price: number) => {
    return ((dailyReturn / price) * 100).toFixed(1);
  };

  const handleShowDetails = (product: ProductWithOwnership, index: number) => {
    setSelectedProduct(product);
    setSelectedProductIndex(index);
    setShowDetails(true);
  };

  const handlePurchaseClick = (product: ProductWithOwnership, index: number) => {
    setProductToPurchase(product);
    setProductToPurchaseIndex(index);
    setShowConfirmPurchase(true);
  };

  const confirmPurchase = () => {
    if (productToPurchase) {
      purchaseMutation.mutate(productToPurchase.id);
    }
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
          <h1 className="text-base font-bold text-center text-gray-800">
            Liste des Machines Cigna Group
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
                  <button 
                    className="text-blue-600 text-sm font-medium cursor-pointer hover:underline"
                    onClick={() => handleShowDetails(product, index)}
                    data-testid={`button-details-${product.level}`}
                  >
                    Détail &gt;&gt;
                  </button>
                  
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
                        onClick={() => handlePurchaseClick(product, index)}
                        data-testid={`button-buy-${product.level}`}
                      >
                        investir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-xs mx-auto p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-blue-600 text-base">
              {selectedProduct?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Détails de la machine
            </DialogDescription>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-3">
              <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100">
                <img 
                  src={productImages[selectedProductIndex] || productImages[0]} 
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <p className="text-gray-600 text-xs">
                {productDescriptions[selectedProductIndex] || productDescriptions[0]}
              </p>
              
              <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Coins className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Prix d'achat</p>
                    <p className="font-bold text-sm text-gray-800">{formatNumber(selectedProduct.price)} F CFA</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Revenu quotidien</p>
                    <p className="font-bold text-sm text-green-600">{formatNumber(selectedProduct.dailyReturn)} F CFA</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Revenu total (100 jours)</p>
                    <p className="font-bold text-sm text-purple-600">{formatNumber(selectedProduct.totalReturn)} F CFA</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Durée du cycle</p>
                    <p className="font-bold text-sm text-gray-800">{selectedProduct.duration} jours</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Taux de profit:</span>
                <span className="font-bold text-blue-600">
                  {calculateProfitRate(selectedProduct.dailyReturn, selectedProduct.price)}%
                </span>
              </div>
            </div>
          )}
          
          <DialogFooter className="pt-2">
            {selectedProduct?.owned ? (
              <Button size="sm" className="w-full bg-green-500 hover:bg-green-600" disabled>
                <CheckCircle className="w-3 h-3 mr-1" />
                Déjà actif
              </Button>
            ) : (
              <Button 
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  if (selectedProduct) {
                    setShowDetails(false);
                    handlePurchaseClick(selectedProduct, selectedProductIndex);
                  }
                }}
              >
                Investir maintenant
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmPurchase} onOpenChange={setShowConfirmPurchase}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'achat</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Voulez-vous vraiment acheter cette machine?</p>
                {productToPurchase && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                        <img 
                          src={productImages[productToPurchaseIndex] || productImages[0]} 
                          alt={productToPurchase.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{productToPurchase.name}</p>
                        <p className="text-blue-600 font-bold">{formatNumber(productToPurchase.price)} F CFA</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      <p>Votre solde: <span className="font-bold text-gray-800">{formatNumber(user.balance)} F CFA</span></p>
                      <p>Après achat: <span className={`font-bold ${user.balance >= productToPurchase.price ? 'text-green-600' : 'text-red-600'}`}>
                        {formatNumber(user.balance - productToPurchase.price)} F CFA
                      </span></p>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={purchaseMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmPurchase}
              disabled={purchaseMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {purchaseMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : (
                "Confirmer l'achat"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}
