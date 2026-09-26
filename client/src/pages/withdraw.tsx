import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DEFAULT_BUSINESS_SETTINGS, ELIGIBLE_COUNTRIES } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Loader2, CreditCard, ChevronRight } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import type { Wallet as WalletType } from "@shared/schema";

interface PublicFinancialSettings {
  withdrawalMinimum: number;
  withdrawalFeePercentage: number;
}

export default function WithdrawPage() {
  const { user, refetchUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>("");
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");

  const { data: wallets } = useQuery<WalletType[]>({
    queryKey: ["/api/wallets"],
  });
  const { data: platformSettings } = useQuery<PublicFinancialSettings>({
    queryKey: ["/api/settings/public"],
  });

  const amountNum = parseInt(amount) || 0;
  const withdrawalMinimum =
    platformSettings?.withdrawalMinimum ?? DEFAULT_BUSINESS_SETTINGS.withdrawalMinimum;
  const withdrawalFeePercentage =
    platformSettings?.withdrawalFeePercentage ??
    DEFAULT_BUSINESS_SETTINGS.withdrawalFeePercentage;
  const feeRate = withdrawalFeePercentage / 100;
  const feeAmount = Math.round(amountNum * feeRate);
  const netAmount = amountNum - feeAmount;

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/withdrawals", {
        amount: amountNum,
        walletId: selectedWalletId,
      });
      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Demande de retrait envoyée", 
        description: "Votre demande sera traitée sous peu." 
      });
      refetchUser();
      navigate("/");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = () => {
    if (amountNum < withdrawalMinimum) {
      toast({ 
        title: "Erreur", 
        description: `Le montant minimum est de ${withdrawalMinimum.toLocaleString("fr-FR")} FCFA`,
        variant: "destructive" 
      });
      return;
    }
    if (!selectedWalletId) {
      toast({ 
        title: "Erreur", 
        description: "Veuillez sélectionner un compte bancaire",
        variant: "destructive" 
      });
      return;
    }
    if (amountNum > (user?.balance || 0)) {
      toast({ 
        title: "Erreur", 
        description: "Solde insuffisant",
        variant: "destructive" 
      });
      return;
    }
    withdrawMutation.mutate();
  };

  if (!user) return null;

  const country = ELIGIBLE_COUNTRIES.find((c) => c.code === user.country);
  const withdrawalHours = country?.withdrawalHours || { start: 10, end: 17 };
  const currentHour = new Date().getHours();
  const isWithinHours = currentHour >= withdrawalHours.start && currentHour < withdrawalHours.end;
  const canWithdraw = user.hasProduct && !user.withdrawalBlocked && isWithinHours;

  const selectedWallet = wallets?.find(w => w.id === selectedWalletId);

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <div className="max-w-md mx-auto">
        <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <button onClick={() => navigate("/")} className="text-gray-600">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold text-blue-600">Demander un retrait</h1>
          <div className="w-6"></div>
        </header>

        <div className="bg-blue-500 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-400 rounded-lg flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">
                FCFA {user.balance.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-blue-100">Solde du compte</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {!user.hasProduct && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-700 font-medium">Produit VIP requis</p>
              <p className="text-sm text-amber-600">Vous devez acheter un produit VIP pour débloquer les retraits.</p>
            </div>
          )}

          {user.withdrawalBlocked && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-medium">Retrait bloqué</p>
              <p className="text-sm text-red-600">Contactez le service client.</p>
            </div>
          )}

          <button
            onClick={() => navigate("/wallets")}
            className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200"
            data-testid="button-select-wallet"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-gray-600" />
              </div>
              <span className="text-blue-600 font-medium">
                {selectedWallet 
                  ? `${selectedWallet.paymentMethod} - ${selectedWallet.accountNumber}`
                  : "Choisir un portefeuille"
                }
              </span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>

          {wallets && wallets.length > 0 && !selectedWalletId && (
            <div className="space-y-2">
              {wallets.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => setSelectedWalletId(wallet.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    selectedWalletId === wallet.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white"
                  }`}
                  data-testid={`wallet-${wallet.id}`}
                >
                  <CreditCard className="h-5 w-5 text-gray-500" />
                  <span className="text-gray-700">{wallet.paymentMethod} - {wallet.accountNumber}</span>
                </button>
              ))}
            </div>
          )}

          {wallets && wallets.length > 0 && selectedWalletId && (
            <button
              onClick={() => setSelectedWalletId("")}
              className="text-blue-500 text-sm"
            >
              Changer de compte
            </button>
          )}

          <div>
            <p className="text-blue-600 font-medium mb-2">Montant du retrait</p>
            <div className="flex items-center border-b border-gray-300 pb-2">
              <span className="text-blue-600 font-medium mr-2">FCFA</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Saisissez le montant"
                className="flex-1 text-gray-800 bg-transparent outline-none"
                min={withdrawalMinimum}
                data-testid="input-amount"
              />
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-blue-600">
                Montant net estimé : FCFA {netAmount > 0 ? netAmount.toFixed(2) : "0.00"}
              </span>
              <span className="text-gray-500">Frais : {withdrawalFeePercentage}%</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canWithdraw || !wallets?.length || !platformSettings || withdrawMutation.isPending}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            data-testid="button-submit"
          >
            {withdrawMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              "Envoyer la demande"
            )}
          </button>

          <div>
            <h3 className="text-blue-600 font-bold mb-3">À savoir avant votre retrait</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>1. Le montant minimum de retrait est de {withdrawalMinimum.toLocaleString("fr-FR")} FCFA.</p>
              <p>2. Les heures de retrait sont de {withdrawalHours.start}h à {withdrawalHours.end}h, avec une limite de 3 retraits par jour.</p>
              <p>3. {withdrawalFeePercentage}% des frais de retrait seront utilisés pour couvrir les charges de la plateforme.</p>
              <p>4. Les retraits seront disponibles sous 2 heures, et exceptionnellement sous 24 heures.</p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
