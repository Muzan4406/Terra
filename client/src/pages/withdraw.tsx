import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DEFAULT_BUSINESS_SETTINGS } from "@shared/schema";
import { getWithdrawalHoursForCountry, isWithdrawalWindowOpen } from "@shared/withdrawal-time";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, ArrowRight, Check, Clock3, Loader2, WalletCards } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Wallet as WalletType } from "@shared/schema";
import { PaymentMethodPngIcon } from "@/components/beko-icons";
import "./beko-pages.css";

interface PublicFinancialSettings {
  withdrawalMinimum: number;
  withdrawalFeePercentage: number;
  withdrawalStartHourGmt: number;
  withdrawalEndHourGmt: number;
}

const formatMoney = (amount: number) =>
  Number(amount || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

export default function WithdrawPage() {
  const { user, refetchUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const {
    data: wallets,
    isLoading: walletsLoading,
    isError: walletsError,
    refetch: refetchWallets,
  } = useQuery<WalletType[]>({ queryKey: ["/api/wallets"], enabled: !!user });
  const {
    data: platformSettings,
    isLoading: settingsLoading,
    isError: settingsError,
    refetch: refetchSettings,
  } = useQuery<PublicFinancialSettings>({
    queryKey: ["/api/settings/public"],
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    enabled: !!user,
  });

  const amountNum = Number.parseInt(amount, 10) || 0;
  const withdrawalMinimum = platformSettings?.withdrawalMinimum ?? DEFAULT_BUSINESS_SETTINGS.withdrawalMinimum;
  const withdrawalFeePercentage = platformSettings?.withdrawalFeePercentage ?? DEFAULT_BUSINESS_SETTINGS.withdrawalFeePercentage;
  const feeAmount = Math.round(amountNum * (withdrawalFeePercentage / 100));
  const netAmount = Math.max(0, amountNum - feeAmount);

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/withdrawals", {
        amount: amountNum,
        walletId: selectedWalletId,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(data?.message || "Votre demande de retrait n’a pas pu être envoyée.");
      }
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Demande de retrait envoyée",
        description: "Votre demande sera traitée sous peu.",
      });
      await refetchUser();
      await queryClient.invalidateQueries({ queryKey: ["/api/transactions/history"] });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  const withdrawalHoursGmt = {
    start: platformSettings?.withdrawalStartHourGmt ?? DEFAULT_BUSINESS_SETTINGS.withdrawalStartHourGmt,
    end: platformSettings?.withdrawalEndHourGmt ?? DEFAULT_BUSINESS_SETTINGS.withdrawalEndHourGmt,
  };
  const withdrawalHours = getWithdrawalHoursForCountry(user.country, withdrawalHoursGmt);
  const isWithinHours = isWithdrawalWindowOpen(currentTime, withdrawalHoursGmt);
  const canWithdraw = user.hasProduct && !user.withdrawalBlocked && isWithinHours;
  const selectedWallet = wallets?.find((wallet) => wallet.id === selectedWalletId);
  const walletReady = Boolean(selectedWallet && wallets?.some((wallet) => wallet.id === selectedWalletId));

  const handleSubmit = () => {
    if (amountNum < withdrawalMinimum) {
      toast({
        title: "Montant minimum non atteint",
        description: `Le montant minimum est de ${formatMoney(withdrawalMinimum)} FCFA.`,
        variant: "destructive",
      });
      return;
    }
    if (!walletReady) {
      toast({
        title: "Choisissez un portefeuille",
        description: "Sélectionnez le compte sur lequel recevoir votre retrait.",
        variant: "destructive",
      });
      return;
    }
    if (amountNum > user.withdrawalBalance) {
      toast({
        title: "Solde insuffisant",
        description: "Le montant demandé dépasse votre solde disponible pour retrait.",
        variant: "destructive",
      });
      return;
    }
    withdrawMutation.mutate();
  };

  return (
    <div className="beko-page beko-page--dark beko-page--withdraw">
      <div className="beko-shell">
        <header className="beko-topbar">
          <button type="button" className="beko-back" onClick={() => navigate("/account")} aria-label="Retour au compte">
            <ArrowLeft size={19} />
          </button>
          <h1>Demander un retrait</h1>
          <span className="beko-brand">BEKO</span>
        </header>

        <main>
          <section className="beko-hero">
            <p className="beko-eyebrow">Retrait vers votre portefeuille</p>
            <h2>Recevez vos revenus.</h2>
            <p>Choisissez votre moyen de réception et le montant à retirer.</p>
          </section>
          <div className="beko-content">
            <section className="beko-withdraw-balance">
              <span>Disponible pour retrait</span>
              <strong>{formatMoney(user.withdrawalBalance)} FCFA</strong>
              <span>Votre solde dépôt reste séparé de ce montant.</span>
            </section>

            {!user.hasProduct && (
              <div className="beko-alert">
                <strong>Produit requis</strong>
                Un produit actif est nécessaire pour débloquer les retraits.
                <button type="button" className="beko-inline-link mt-2 block" onClick={() => navigate("/my-products")}>Voir mes produits</button>
              </div>
            )}
            {user.withdrawalBlocked && (
              <div className="beko-alert is-danger">
                <strong>Retraits temporairement bloqués</strong>
                Contactez le service client pour obtenir de l’aide.
                <button type="button" className="beko-inline-link mt-2 block" onClick={() => navigate("/customer-service")}>Contacter le service client</button>
              </div>
            )}
            {!isWithinHours && !user.withdrawalBlocked && user.hasProduct && (
              <div className="beko-notice flex items-start gap-2">
                <Clock3 size={18} className="mt-0.5 shrink-0 text-[#087653]" />
                <span>Les retraits sont actuellement fermés. Réessayez pendant la plage horaire de retrait de votre pays.</span>
              </div>
            )}

            <section className="grid gap-2">
              <div className="beko-section-heading">
                <h2>Montant du retrait</h2>
                <span>Minimum {formatMoney(withdrawalMinimum)} FCFA</span>
              </div>
              <label htmlFor="withdraw-amount" className="sr-only">Montant du retrait en FCFA</label>
              <div className="relative">
                <input
                  id="withdraw-amount"
                  type="number"
                  min={withdrawalMinimum}
                  step="1"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Saisir le montant"
                  className="beko-input pr-20 text-lg font-extrabold tabular-nums"
                  data-testid="input-amount"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-[#668078]">FCFA</span>
              </div>
              <p className="m-0 text-xs text-[#a9b4cf]">Frais de {formatMoney(withdrawalFeePercentage)}% calculés selon les paramètres en vigueur.</p>
            </section>

            <section className="grid gap-2">
              <div className="beko-section-heading">
                <h2>Carte de réception</h2>
                <span>{wallets?.length ?? 0} portefeuille(s)</span>
              </div>
              {walletsLoading ? (
                <Skeleton className="h-24 w-full rounded-2xl" />
              ) : walletsError ? (
                <div className="beko-alert is-danger">
                  <strong>Portefeuilles indisponibles</strong>
                  Impossible de charger vos comptes.
                  <button type="button" className="beko-inline-link mt-2 block" onClick={() => void refetchWallets()}>Réessayer</button>
                </div>
              ) : wallets?.length ? (
                <div className="grid gap-2">
                  {wallets.map((wallet) => (
                    <button
                      type="button"
                      key={wallet.id}
                      onClick={() => setSelectedWalletId(wallet.id)}
                      className={`beko-wallet-option ${selectedWalletId === wallet.id ? "is-selected" : ""}`}
                      aria-pressed={selectedWalletId === wallet.id}
                      data-testid={`wallet-${wallet.id}`}
                    >
                      <PaymentMethodPngIcon method={wallet.paymentMethod} />
                      <span>{wallet.paymentMethod}<small className="mt-1 block font-medium text-[#668078]">{wallet.accountNumber}</small></span>
                      {selectedWalletId === wallet.id ? <Check className="text-[#087653]" size={18} /> : <ArrowRight className="text-[#83a18e]" size={18} />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="beko-panel grid justify-items-center gap-2 px-5 py-7 text-center">
                  <span className="beko-action-icon h-12 w-12"><WalletCards size={22} /></span>
                  <strong className="text-sm">Aucun portefeuille lié</strong>
                  <p className="m-0 text-xs text-[#668078]">Ajoutez un moyen de réception avant de demander un retrait.</p>
                  <button type="button" className="beko-inline-link mt-1" onClick={() => navigate("/wallets")}>Lier un portefeuille</button>
                </div>
              )}
              {wallets?.length ? (
                <button type="button" className="beko-inline-link justify-self-start" onClick={() => navigate("/wallets")}>
                  Gérer mes portefeuilles
                </button>
              ) : null}
            </section>

            {settingsError && (
              <div className="beko-alert is-danger">
                <strong>Paramètres de retrait indisponibles</strong>
                Vérifiez la connexion avant d’envoyer votre demande.
                <button type="button" className="beko-inline-link mt-2 block" onClick={() => void refetchSettings()}>Réessayer</button>
              </div>
            )}

            {selectedWallet && (
              <div className="beko-notice flex items-center gap-2">
                <PaymentMethodPngIcon method={selectedWallet.paymentMethod} className="h-8 w-8 rounded-lg p-0.5" />
                <span>Réception sur {selectedWallet.paymentMethod} · {selectedWallet.accountNumber}</span>
                <Check size={17} className="ml-auto shrink-0 text-[#087653]" />
              </div>
            )}

            <section className="beko-panel grid gap-3 p-4">
              <div className="beko-section-heading">
                <h2>À savoir</h2>
                <span>Avant votre demande</span>
              </div>
              <div className="grid gap-2 text-xs leading-relaxed text-[#668078]">
                <p className="m-0">Le montant minimum de retrait est de <strong className="text-[#14392f]">{formatMoney(withdrawalMinimum)} FCFA</strong>.</p>
                <p className="m-0">Les retraits sont ouverts de {withdrawalHours.start}h à {withdrawalHours.end}h, heure locale ({withdrawalHoursGmt.start}h–{withdrawalHoursGmt.end}h GMT).</p>
                <p className="m-0">Les frais de retrait sont de {formatMoney(withdrawalFeePercentage)}% et sont déduits du montant demandé.</p>
                <p className="m-0">Le traitement peut prendre jusqu’à 2 heures et exceptionnellement jusqu’à 24 heures.</p>
              </div>
            </section>
          </div>
        </main>
      </div>
      <div className="beko-withdraw-dock">
        <div className="beko-withdraw-summary" aria-live="polite">
          <div><span>Frais estimés</span><strong>{formatMoney(feeAmount)} FCFA</strong></div>
          <div><span>Vous recevrez</span><strong>{formatMoney(netAmount)} FCFA</strong></div>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canWithdraw || !walletReady || !platformSettings || settingsLoading || walletsLoading || walletsError || settingsError || withdrawMutation.isPending || amountNum < withdrawalMinimum || amountNum > user.withdrawalBalance}
          className="beko-primary-button"
          data-testid="button-submit"
        >
          {withdrawMutation.isPending ? <><Loader2 size={18} className="animate-spin" /> Envoi en cours…</> : <><ArrowRight size={18} /> Envoyer la demande</>}
        </button>
      </div>
    </div>
  );
}