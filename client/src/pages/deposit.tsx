import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Loader2, CreditCard, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { CountrySelect } from "@/components/country-select";
import { PaymentMethodSelect } from "@/components/payment-method-select";
import { DEFAULT_BUSINESS_SETTINGS } from "@shared/schema";

interface DepositOptions {
  mode: "manual" | "ashtech";
  channels?: Array<{
    id: string;
    name: string;
    redirectUrl: string | null;
    isActive: boolean;
    isApi: boolean;
  }>;
  countryCode?: string;
  countryName?: string;
  currency?: string;
  operators?: string[];
}

interface AutomaticDepositState {
  depositId: string;
  otpRequired: boolean;
  message?: string;
  ussdCode?: string | null;
  waveUrl?: string | null;
}

interface DepositStatus {
  depositId: string;
  status: "pending" | "approved" | "rejected";
  verificationPending: boolean;
}

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
  const [automaticDeposit, setAutomaticDeposit] = useState<AutomaticDepositState | null>(null);
  const [otp, setOtp] = useState("");
  const notifiedStatus = useRef<string | null>(null);

  const { data: businessSettings } = useQuery<{ depositMinimum: number }>({
    queryKey: ["/api/settings/public"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });
  const depositMinimum =
    businessSettings?.depositMinimum ?? DEFAULT_BUSINESS_SETTINGS.depositMinimum;

  const {
    data: depositOptions,
    isLoading: optionsLoading,
    error: optionsError,
  } = useQuery<DepositOptions>({
    queryKey: ["/api/deposit-options", country],
    enabled: Boolean(country),
    queryFn: async () => {
      const response = await fetch(`/api/deposit-options?country=${encodeURIComponent(country)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Impossible de charger les moyens de paiement.");
      return result;
    },
  });

  const isAshtechMode = depositOptions?.mode === "ashtech";
  const activeChannels = depositOptions?.mode === "manual"
    ? depositOptions.channels?.filter((channel) => channel.isActive) ?? []
    : [];

  const { data: depositStatus, isError: statusError } = useQuery<DepositStatus>({
    queryKey: ["/api/deposits", automaticDeposit?.depositId, "status"],
    enabled: Boolean(automaticDeposit?.depositId && !automaticDeposit.otpRequired),
    queryFn: async () => {
      const response = await fetch(`/api/deposits/${automaticDeposit!.depositId}/status`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Impossible de vérifier le statut.");
      return result;
    },
    refetchInterval: (query) => {
      const current = query.state.data as DepositStatus | undefined;
      if (
        current?.status === "approved" ||
        current?.status === "rejected" ||
        current?.verificationPending
      ) return false;
      return 5000;
    },
  });

  const depositMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/deposits", {
        amount: parseInt(amount) || 0,
        channelId: selectedChannelId,
        accountName: accountName.trim() || user?.fullName || "Client",
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
        toast({
          title: "Demande de dépôt envoyée",
          description: "Suivez les instructions du canal de paiement, puis consultez votre historique.",
        });
        refetchUser();
        navigate("/");
        return;
      }

      if (data.depositId) {
        setAutomaticDeposit({
          depositId: data.depositId,
          otpRequired: Boolean(data.otpRequired),
          message: data.message,
          ussdCode: data.ussdCode ?? null,
          waveUrl: data.waveUrl ?? null,
        });
        setOtp("");
        toast({
          title: data.otpRequired ? "Code de confirmation requis" : "Demande de paiement envoyée",
          description: data.message || "Le statut sera vérifié automatiquement.",
        });
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const otpMutation = useMutation({
    mutationFn: async () => {
      if (!automaticDeposit) throw new Error("Aucun dépôt en attente.");
      const response = await apiRequest(
        "POST",
        `/api/deposits/${automaticDeposit.depositId}/ashtech-otp`,
        { otp },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Le code OTP n'a pas été accepté.");
      return result;
    },
    onSuccess: (data) => {
      setAutomaticDeposit((current) => current ? {
        ...current,
        otpRequired: Boolean(data.otpRequired),
        message: data.message || current.message,
        ussdCode: data.ussdCode ?? current.ussdCode,
        waveUrl: data.waveUrl ?? current.waveUrl,
      } : current);
      setOtp("");
      toast({
        title: data.status === "rejected"
          ? "Paiement non confirmé"
          : data.otpRequired
            ? "Code à vérifier"
            : "Code envoyé",
        description: data.message || "Le statut du paiement est en cours de vérification.",
        ...(data.status === "rejected" ? { variant: "destructive" as const } : {}),
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!automaticDeposit || !depositStatus || depositStatus.status === "pending") return;
    const key = `${automaticDeposit.depositId}:${depositStatus.status}`;
    if (notifiedStatus.current === key) return;
    notifiedStatus.current = key;

    if (depositStatus.status === "approved") {
      void refetchUser();
      toast({
        title: "Dépôt confirmé",
        description: "Votre solde a été crédité.",
      });
    } else {
      toast({
        title: "Paiement non confirmé",
        description: "Le dépôt a échoué. Vous pouvez lancer une nouvelle demande.",
        variant: "destructive",
      });
    }
  }, [automaticDeposit, depositStatus, refetchUser, toast]);

  const handleSubmit = () => {
    const amountNum = parseInt(amount) || 0;
    if (amountNum < depositMinimum) {
      toast({ 
        title: "Erreur", 
        description: `Le montant minimum est de ${depositMinimum.toLocaleString("fr-FR")} FCFA`,
        variant: "destructive" 
      });
      return;
    }
    if (!isAshtechMode && !accountName.trim()) {
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
    if (!isAshtechMode && !selectedChannelId) {
      toast({ 
        title: "Erreur", 
        description: "Veuillez sélectionner un canal de recharge",
        variant: "destructive" 
      });
      return;
    }
    if (automaticDeposit?.depositId && depositStatus?.status === "pending") {
      toast({
        title: "Dépôt déjà en cours",
        description: "Attendez la confirmation du paiement avant d'en lancer un autre.",
        variant: "destructive",
      });
      return;
    }
    depositMutation.mutate();
  };

  if (!user) return null;
  const handleCountryChange = (value: string) => {
    setCountry(value);
    setPaymentMethod("");
    setSelectedChannelId("");
  };
  const automaticStatus = depositStatus?.status ?? "pending";

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
          {automaticDeposit ? (
            <section className="space-y-4 rounded-xl border bg-white p-5" aria-live="polite">
              <div className="flex items-start gap-3">
                {automaticStatus === "approved" ? (
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
                ) : automaticStatus === "rejected" ? (
                  <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
                ) : (
                  <Loader2 className="mt-0.5 h-6 w-6 shrink-0 animate-spin text-blue-600" />
                )}
                <div>
                  <h2 className="font-bold text-gray-900">
                    {automaticStatus === "approved"
                      ? "Dépôt confirmé"
                      : automaticStatus === "rejected"
                        ? "Paiement non confirmé"
                        : automaticDeposit.otpRequired
                          ? "Confirmation opérateur requise"
                          : "Paiement en attente"}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {depositStatus?.verificationPending
                      ? "Le résultat doit être vérifié par le support. Ne lancez pas un second paiement."
                      : automaticDeposit.message || "Validez la demande sur votre téléphone. Votre solde sera crédité après confirmation."}
                  </p>
                </div>
              </div>

              {automaticDeposit.ussdCode && (
                <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                  Code à composer : <strong>{automaticDeposit.ussdCode}</strong>
                </p>
              )}

              {automaticDeposit.waveUrl && (
                <a
                  href={automaticDeposit.waveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg bg-blue-600 p-3 text-center font-semibold text-white hover:bg-blue-700"
                >
                  Ouvrir le paiement Wave
                </a>
              )}

              {automaticDeposit.otpRequired && automaticStatus === "pending" && (
                <div className="space-y-2">
                  <label htmlFor="ashtech-otp" className="text-sm font-medium text-gray-700">
                    Code OTP reçu de votre opérateur
                  </label>
                  <input
                    id="ashtech-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-3 text-gray-900 outline-none focus:border-blue-500"
                    maxLength={12}
                  />
                  <button
                    onClick={() => otpMutation.mutate()}
                    disabled={!otp.trim() || otpMutation.isPending}
                    className="flex w-full items-center justify-center rounded-lg bg-blue-600 p-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {otpMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmer le code
                  </button>
                </div>
              )}

              {statusError && automaticStatus === "pending" && (
                <p className="text-sm text-amber-700">
                  La vérification est temporairement indisponible. Le paiement reste en attente; réessayez dans un instant.
                </p>
              )}

              {automaticStatus === "approved" && (
                <button
                  onClick={() => navigate("/")}
                  className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white"
                >
                  Retour à l'accueil
                </button>
              )}
              {automaticStatus === "rejected" && (
                <button
                  onClick={() => {
                    setAutomaticDeposit(null);
                    setOtp("");
                    setPaymentMethod("");
                    setSelectedChannelId("");
                  }}
                  className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white"
                >
                  Nouvelle demande
                </button>
              )}
              <button
                onClick={() => navigate("/history")}
                className="w-full text-sm text-blue-600 hover:underline"
              >
                Consulter l'historique
              </button>
            </section>
          ) : (
            <>
              <div>
                <p className="mb-2 text-sm text-gray-500">Montant du dépôt</p>
                <div className="flex items-baseline gap-2 border-b border-gray-300 pb-2">
                  <span className="text-xl font-bold text-blue-600">
                    {isAshtechMode ? depositOptions.currency : "FCFA"}
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder={String(depositMinimum)}
                    className="w-full border-none bg-transparent text-3xl font-bold text-gray-800 outline-none"
                    min={depositMinimum}
                    step={1}
                    data-testid="input-amount"
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-xl bg-white p-4">
                {!isAshtechMode && (
                  <div>
                    <label className="mb-1 block text-sm text-gray-500">Nom du compte de paiement</label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(event) => setAccountName(event.target.value)}
                      placeholder="Entrez votre nom complet"
                      className="w-full rounded-lg border border-gray-200 p-3 text-gray-800 outline-none focus:border-blue-500"
                      data-testid="input-account-name"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm text-gray-500">
                    {isAshtechMode ? "Numéro Mobile Money" : "Numéro de paiement"}
                  </label>
                  <input
                    type="tel"
                    value={accountNumber}
                    onChange={(event) => setAccountNumber(event.target.value)}
                    placeholder="Entrez votre numéro de téléphone"
                    className="w-full rounded-lg border border-gray-200 p-3 text-gray-800 outline-none focus:border-blue-500"
                    data-testid="input-account-number"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-500">Pays</label>
                  <CountrySelect value={country} onValueChange={handleCountryChange} />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-500">Moyen de paiement</label>
                  <PaymentMethodSelect
                    country={country}
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    options={isAshtechMode ? depositOptions.operators : undefined}
                    disabled={optionsLoading || Boolean(optionsError)}
                  />
                </div>
              </div>

              {optionsLoading && country && (
                <p className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement des moyens de paiement...
                </p>
              )}
              {optionsError && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {optionsError instanceof Error ? optionsError.message : "Moyens de paiement indisponibles."}
                </p>
              )}

              {depositOptions?.mode === "ashtech" && (
                <p className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                  Paiement automatique AshTech Pay. Validez la demande sur votre téléphone; votre solde sera crédité après confirmation du paiement.
                </p>
              )}

              {depositOptions?.mode === "manual" && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Choisissez un canal de paiement</p>
                  {activeChannels.length ? activeChannels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannelId(channel.id)}
                      className={`flex w-full items-center justify-between rounded-xl border-2 p-4 transition-all ${
                        selectedChannelId === channel.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white"
                      }`}
                      data-testid={`channel-${channel.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                          <CreditCard className="h-5 w-5 text-gray-600" />
                        </div>
                        <span className="font-medium text-gray-800">{channel.name}</span>
                      </div>
                      <span className={`rounded px-3 py-1 text-xs font-bold ${
                        channel.isApi
                          ? "bg-blue-500 text-white"
                          : "border border-red-300 bg-red-100 text-red-600"
                      }`}>
                        {channel.isApi ? "AUTOMATIQUE" : "SEMI-AUTOMATIQUE"}
                      </span>
                    </button>
                  )) : (
                    <p className="rounded-lg border border-dashed p-4 text-sm text-gray-500">
                      Aucun canal de paiement n'est configuré.
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={
                  depositMutation.isPending ||
                  optionsLoading ||
                  Boolean(optionsError) ||
                  !country ||
                  !depositOptions ||
                  (isAshtechMode && Boolean(automaticDeposit))
                }
                className="flex w-full items-center justify-center rounded-full bg-blue-500 py-4 text-lg font-bold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="button-confirm"
              >
                {depositMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Traitement...
                  </>
                ) : isAshtechMode ? (
                  "Lancer le paiement"
                ) : (
                  "Confirmer"
                )}
              </button>

              <div className="text-center">
                <button
                  onClick={() => navigate("/history")}
                  className="text-sm text-blue-500 hover:underline"
                >
                  Consultez vos opérations dans l'historique.
                </button>
              </div>

              <div className="space-y-3 text-sm text-gray-600">
                <p>Le montant minimum du dépôt est de {depositMinimum.toLocaleString("fr-FR")} FCFA.</p>
                {isAshtechMode ? (
                  <p>Ne relancez pas un dépôt automatique lorsqu'une confirmation est en attente.</p>
                ) : (
                  <>
                    <p>Le montant du transfert doit correspondre à la demande créée.</p>
                    <p>Le compte de portefeuille saisi doit être celui du compte de paiement réel.</p>
                    <p>Les dépôts par lien peuvent nécessiter un traitement manuel par le service client.</p>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
