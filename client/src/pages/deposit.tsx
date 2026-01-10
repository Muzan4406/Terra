import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Loader2, CreditCard, Clock } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import type { PaymentChannel } from "@shared/schema";

export default function DepositPage() {
  const { user, refetchUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [amount, setAmount] = useState<number>(3000);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");

  const { data: channels } = useQuery<PaymentChannel[]>({
    queryKey: ["/api/payment-channels"],
  });

  const depositMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/deposits", {
        amount,
        channelId: selectedChannelId,
        accountName: user?.fullName || "",
        accountNumber: user?.phone || "",
        country: user?.country || "",
        paymentMethod: channels?.find(c => c.id === selectedChannelId)?.name || "",
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
    if (amount < 3000) {
      toast({ 
        title: "Erreur", 
        description: "Le montant minimum est de 3 000 FCFA",
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
            <h1 className="text-xl font-bold text-gray-800">Recharge</h1>
          </div>
          <button onClick={() => navigate("/history")} className="text-gray-600">
            <Clock className="h-6 w-6" />
          </button>
        </header>

        <div className="p-4 space-y-6">
          <div>
            <p className="text-gray-500 text-sm mb-2">Entrez un autre montant</p>
            <div className="flex items-baseline gap-2">
              <span className="text-blue-600 font-bold text-xl">FCFA</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                className="text-3xl font-bold text-gray-800 bg-transparent border-none outline-none w-full"
                min={3000}
                data-testid="input-amount"
              />
            </div>
          </div>

          <div className="space-y-3">
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
                  {channel.isApi ? "AUTOMATIQUE" : "SEMI-AUTO"}
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
              Si la recharge n'est pas confirmée, cliquez ici
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
