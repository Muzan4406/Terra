import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Loader2, CreditCard, Clock } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { CountrySelect } from "@/components/country-select";
import { PaymentMethodSelect } from "@/components/payment-method-select";
import type { PaymentChannel } from "@shared/schema";

export default function DepositPage() {
  const { user, refetchUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>("");
  const [accountName, setAccountName] = useState<string>(user?.fullName || "");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [country, setCountry] = useState<string>(user?.country || "");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");

  const { data: channels } = useQuery<PaymentChannel[]>({
    queryKey: ["/api/payment-channels"],
  });

  const depositMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/deposits", {
        amount: parseInt(amount) || 0,
        channelId: selectedChannelId,
        accountName,
        accountNumber,
        country,
        paymentMethod,
      });
      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.redirectUrl) {
        window.open(data.redirectUrl, "_blank");
      }
      toast({ 
        title: "Demande de dépôt envoyée", 
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
    const amountNum = parseInt(amount) || 0;
    if (amountNum < 3000) {
      toast({ 
        title: "Erreur", 
        description: "Le montant minimum est de 3 000 FCFA",
        variant: "destructive" 
      });
      return;
    }
    if (!accountName.trim()) {
      toast({ 
        title: "Erreur", 
        description: "Veuillez entrer votre nom",
        variant: "destructive" 
      });
      return;
    }
    if (!accountNumber.trim()) {
      toast({ 
        title: "Erreur", 
        description: "Veuillez entrer votre numéro de paiement",
        variant: "destructive" 
      });
      return;
    }
    if (!country) {
      toast({ 
        title: "Erreur", 
        description: "Veuillez sélectionner votre pays",
        variant: "destructive" 
      });
      return;
    }
    if (!paymentMethod) {
      toast({ 
        title: "Erreur", 
        description: "Veuillez sélectionner un moyen de paiement",
        variant: "destructive" 
      });
      return;
    }
    if (!selectedChannelId) {
      toast({ 
        title: "Erreur", 
        description: "Veuillez sélectionner un canal de recharge",
        variant: "destructive" 
      });
      return;
    }
    depositMutation.mutate();
  };

  if (!user) return null;

  const activeChannels = channels?.filter((c) => c.isActive) || [];

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <div className="max-w-md mx-auto">
        <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="text-gray-600">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">Dépôt</h1>
          </div>
          <button onClick={() => navigate("/history")} className="text-gray-600">
            <Clock className="h-6 w-6" />
          </button>
        </header>

        <div className="p-4 space-y-6">
          <div>
            <p className="text-gray-500 text-sm mb-2">Montant du dépôt</p>
            <div className="flex items-baseline gap-2 border-b border-gray-300 pb-2">
              <span className="text-blue-600 font-bold text-xl">FCFA</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="3000"
                className="text-3xl font-bold text-gray-800 bg-transparent border-none outline-none w-full"
                min={3000}
                data-testid="input-amount"
              />
            </div>
          </div>

          <div className="space-y-4 bg-white rounded-xl p-4">
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Nom du compte de paiement</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Entrez votre nom complet"
                className="w-full p-3 border border-gray-200 rounded-lg text-gray-800 outline-none focus:border-blue-500"
                data-testid="input-account-name"
              />
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">Numéro de paiement</label>
              <input
                type="tel"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Entrez votre numéro de téléphone"
                className="w-full p-3 border border-gray-200 rounded-lg text-gray-800 outline-none focus:border-blue-500"
                data-testid="input-account-number"
              />
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">Pays</label>
              <CountrySelect value={country} onValueChange={setCountry} />
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">Moyen de paiement</label>
              <PaymentMethodSelect 
                country={country} 
                value={paymentMethod} 
                onValueChange={setPaymentMethod} 
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-gray-500 text-sm">Choisissez un canal de paiement</p>
            {activeChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setSelectedChannelId(channel.id)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  selectedChannelId === channel.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
                data-testid={`channel-${channel.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-800">{channel.name}</span>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-bold ${
                  channel.isApi 
                    ? "bg-blue-500 text-white" 
                    : "bg-red-100 text-red-600 border border-red-300"
                }`}>
                  {channel.isApi ? "AUTOMATIQUE" : "SEMI-AUTOMATIQUE"}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={depositMutation.isPending}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            data-testid="button-confirm"
          >
            {depositMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              "Confirmer"
            )}
          </button>

          <div className="text-center">
            <button 
              onClick={() => navigate("/history")}
              className="text-blue-500 text-sm hover:underline"
            >
              Une demande n’apparaît pas dans votre historique ? Consultez vos opérations.
            </button>
          </div>

          <div className="space-y-4 text-sm text-gray-600">
            <p>1. Le montant minimum du dépôt est de 3 000 FCFA. Les fonds inférieurs à ce montant ne seront pas crédités.</p>
            <p>2. Le montant du transfert doit correspondre à la commande que vous avez créée, sinon les fonds ne seront pas crédités.</p>
            <p>3. Le compte de portefeuille que vous avez saisi doit être le même que le compte de paiement réel.</p>
            <p>4. Veuillez patienter 10 à 20 minutes après le transfert. Si vos fonds n'ont pas été crédités pendant une période prolongée, veuillez contacter le service client.</p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
