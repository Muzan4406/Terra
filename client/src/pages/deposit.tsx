import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, fetchWithTimeout } from "@/lib/queryClient";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Info,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { CountrySelect } from "@/components/country-select";
import { PaymentMethodSelect } from "@/components/payment-method-select";
import { PaymentMethodPngIcon } from "@/components/beko-icons";
import { DEFAULT_BUSINESS_SETTINGS } from "@shared/schema";
import "./beko-pages.css";
import "./deposit-page.css";

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
    refetch: refetchOptions,
  } = useQuery<DepositOptions>({
    queryKey: ["/api/deposit-options", country],
    enabled: Boolean(country),
    queryFn: async () => {
      const response = await fetchWithTimeout(`/api/deposit-options?country=${encodeURIComponent(country)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Impossible de charger les moyens de paiement.");
      return result;
    },
  });

  const isAshtechMode = depositOptions?.mode === "ashtech";
  const activeChannels = depositOptions?.mode === "manual"
    ? depositOptions.channels?.filter((channel) => channel.isActive) ?? []
    : [];

  const {
    data: depositStatus,
    isError: statusError,
    refetch: refetchStatus,
  } = useQuery<DepositStatus>({
    queryKey: ["/api/deposits", automaticDeposit?.depositId, "status"],
    enabled: Boolean(automaticDeposit?.depositId && !automaticDeposit.otpRequired),
    queryFn: async () => {
      const response = await fetchWithTimeout(`/api/deposits/${automaticDeposit!.depositId}/status`);
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
        navigate("/account");
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
        variant: "destructive",
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
        description: "Votre solde de dépôt a été crédité.",
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
        variant: "destructive",
      });
      return;
    }
    if (!isAshtechMode && !accountName.trim()) {
      toast({ title: "Erreur", description: "Veuillez entrer votre nom", variant: "destructive" });
      return;
    }
    if (!accountNumber.trim()) {
      toast({ title: "Erreur", description: "Veuillez entrer votre numéro de paiement", variant: "destructive" });
      return;
    }
    if (!country) {
      toast({ title: "Erreur", description: "Veuillez sélectionner votre pays", variant: "destructive" });
      return;
    }
    if (!paymentMethod) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un moyen de paiement", variant: "destructive" });
      return;
    }
    if (!isAshtechMode && !selectedChannelId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un canal de recharge", variant: "destructive" });
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
  const verificationPending = Boolean(depositStatus?.verificationPending);
  const statusHeading = automaticStatus === "approved"
    ? "Dépôt confirmé"
    : automaticStatus === "rejected"
      ? "Paiement non confirmé"
      : verificationPending
        ? "Vérification en cours"
        : automaticDeposit?.otpRequired
          ? "Confirmation opérateur requise"
          : "Paiement en attente";
  const statusCopy = verificationPending
    ? "Le résultat doit être vérifié par le support. Ne lancez pas un second paiement."
    : automaticDeposit?.message ||
      "Validez la demande sur votre téléphone. Votre solde de dépôt sera crédité après confirmation.";

  return (
    <div className="beko-page beko-page--dark beko-page--deposit deposit-page">
      <div className="beko-shell">
        <header className="beko-topbar">
          <button
            type="button"
            onClick={() => navigate("/account")}
            className="beko-back"
            aria-label="Retour au compte"
          >
            <ArrowLeft size={19} aria-hidden="true" />
          </button>
          <h1>Nouveau dépôt</h1>
          <button
            type="button"
            onClick={() => navigate("/history")}
            className="beko-back beko-deposit-history"
            aria-label="Voir l'historique"
          >
            <Clock3 size={18} aria-hidden="true" />
          </button>
        </header>

        <main className={`beko-content deposit-content ${!automaticDeposit ? "has-action-dock" : ""}`}>
          <section className="beko-hero" aria-label="Créer un dépôt">
            <p className="beko-eyebrow">BEKO · PAIEMENT SÉCURISÉ</p>
            <h2>Rechargez votre compte</h2>
            <p>Choisissez votre moyen de paiement et confirmez la demande depuis votre téléphone.</p>
          </section>

          {automaticDeposit ? (
            <section className="beko-panel deposit-status-card" aria-live="polite">
              <div className="deposit-status-head">
                <span className={`deposit-status-symbol ${
                  automaticStatus === "approved" ? "is-success" : automaticStatus === "rejected" ? "is-error" : ""
                }`}>
                  {automaticStatus === "approved"
                    ? <CheckCircle2 size={22} aria-hidden="true" />
                    : automaticStatus === "rejected"
                      ? <AlertCircle size={22} aria-hidden="true" />
                      : <Loader2 size={22} className="animate-spin" aria-hidden="true" />}
                </span>
                <div>
                  <h2>{statusHeading}</h2>
                  <p>{statusCopy}</p>
                  {automaticStatus === "pending" && !verificationPending && !automaticDeposit.otpRequired && (
                    <p className="deposit-live-note">Vérification automatique active · actualisation toutes les 5 secondes</p>
                  )}
                </div>
              </div>

              {automaticDeposit.ussdCode && (
                <div className="deposit-ussd">
                  Code à composer
                  <strong>{automaticDeposit.ussdCode}</strong>
                </div>
              )}

              {automaticDeposit.waveUrl && (
                <a
                  href={automaticDeposit.waveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="deposit-wave-link"
                >
                  Ouvrir le paiement Wave
                </a>
              )}

              {automaticDeposit.otpRequired && automaticStatus === "pending" && (
                <div className="deposit-otp">
                  <label htmlFor="ashtech-otp">Code OTP reçu de votre opérateur</label>
                  <input
                    id="ashtech-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    className="deposit-control"
                    maxLength={12}
                  />
                  <button
                    type="button"
                    onClick={() => otpMutation.mutate()}
                    disabled={!otp.trim() || otpMutation.isPending}
                    className="deposit-status-action primary"
                  >
                    {otpMutation.isPending && <Loader2 size={15} className="mr-2 inline animate-spin" />}
                    Confirmer le code
                  </button>
                </div>
              )}

              {statusError && automaticStatus === "pending" && (
                <div className="deposit-options-message deposit-error-box" role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>La vérification est temporairement indisponible. Le paiement reste en attente; réessayez dans un instant.</span>
                </div>
              )}

              {statusError && automaticStatus === "pending" && (
                <button type="button" onClick={() => void refetchStatus()} className="deposit-status-action">
                  Réessayer la vérification
                </button>
              )}

              {automaticStatus === "approved" && (
                <button type="button" onClick={() => navigate("/account")} className="deposit-status-action primary">
                  Retour au compte
                </button>
              )}
              {automaticStatus === "rejected" && (
                <button
                  type="button"
                  onClick={() => {
                    setAutomaticDeposit(null);
                    setOtp("");
                    setPaymentMethod("");
                    setSelectedChannelId("");
                  }}
                  className="deposit-status-action primary"
                >
                  Nouvelle demande
                </button>
              )}
              <div className="deposit-status-links">
                <button type="button" onClick={() => navigate("/history")}>
                  Consulter l'historique
                </button>
              </div>
            </section>
          ) : (
            <>
              <div className="beko-section-heading">
                <h2>Montant du dépôt</h2>
                <span>Minimum {depositMinimum.toLocaleString("fr-FR")} FCFA</span>
              </div>
              <section className="beko-panel deposit-amount-card" aria-label="Montant à déposer">
                <div className="deposit-amount-entry">
                  <span className="deposit-currency">{isAshtechMode ? depositOptions.currency : "FCFA"}</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0"
                    className="deposit-amount-input"
                    min={depositMinimum}
                    step={1}
                    aria-label="Montant du dépôt"
                    data-testid="input-amount"
                  />
                </div>
                <div className="deposit-amount-meta">
                  <span>Le montant sera ajouté à votre solde de dépôt</span>
                  <span>{isAshtechMode ? depositOptions.currency : "FCFA"}</span>
                </div>
              </section>

              <div className="beko-section-heading">
                <h2>Informations de paiement</h2>
                <span>Étape 1 sur 2</span>
              </div>
              <section className="beko-panel deposit-form-card">
                {!isAshtechMode && (
                  <div className="deposit-field">
                    <label htmlFor="deposit-account-name">Nom du compte de paiement</label>
                    <input
                      id="deposit-account-name"
                      type="text"
                      value={accountName}
                      onChange={(event) => setAccountName(event.target.value)}
                      placeholder="Votre nom complet"
                      className="deposit-control"
                      data-testid="input-account-name"
                    />
                  </div>
                )}
                <div className="deposit-field">
                  <label htmlFor="deposit-account-number">
                    {isAshtechMode ? "Numéro Mobile Money" : "Numéro de paiement"}
                  </label>
                  <input
                    id="deposit-account-number"
                    type="tel"
                    inputMode="tel"
                    value={accountNumber}
                    onChange={(event) => setAccountNumber(event.target.value)}
                    placeholder="Votre numéro de téléphone"
                    className="deposit-control"
                    data-testid="input-account-number"
                  />
                </div>
                <div className="deposit-field">
                  <label htmlFor="deposit-country">Pays</label>
                  <CountrySelect value={country} onValueChange={handleCountryChange} />
                </div>
                <div className="deposit-field">
                  <label htmlFor="deposit-method">Moyen de paiement</label>
                  <PaymentMethodSelect
                    country={country}
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    options={isAshtechMode ? depositOptions.operators : undefined}
                    disabled={optionsLoading || Boolean(optionsError)}
                  />
                </div>
              </section>

              {country && optionsLoading && (
                <div className="deposit-options-message" role="status">
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Chargement des moyens de paiement...
                </div>
              )}
              {optionsError && (
                <div className="deposit-options-message deposit-error-box" role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{optionsError instanceof Error ? optionsError.message : "Moyens de paiement indisponibles."}</span>
                  <button type="button" onClick={() => void refetchOptions()} className="deposit-status-action">
                    Réessayer
                  </button>
                </div>
              )}

              {depositOptions?.mode === "ashtech" && (
                <div className="beko-notice deposit-mode-note">
                  Paiement automatique AshTech Pay. Validez la demande sur votre téléphone; votre solde de dépôt sera crédité après confirmation.
                </div>
              )}

              {depositOptions?.mode === "manual" && (
                <section>
                  <div className="beko-section-heading">
                    <h2>Canal de paiement</h2>
                    <span>{activeChannels.length} disponible{activeChannels.length === 1 ? "" : "s"}</span>
                  </div>
                  {activeChannels.length ? (
                    <div className="deposit-channels">
                      {activeChannels.map((channel) => (
                        <button
                          key={channel.id}
                          type="button"
                          onClick={() => setSelectedChannelId(channel.id)}
                          className={`deposit-channel ${selectedChannelId === channel.id ? "is-selected" : ""}`}
                          aria-pressed={selectedChannelId === channel.id}
                          data-testid={`channel-${channel.id}`}
                        >
                          <span className="deposit-channel-main">
                            <span className="deposit-channel-icon">
                              <PaymentMethodPngIcon method={channel.name} className="h-9 w-9 rounded-lg border-0 bg-transparent p-0" />
                            </span>
                            <span className="deposit-channel-name">{channel.name}</span>
                          </span>
                          <span className="deposit-channel-tag">
                            {channel.isApi ? "AUTOMATIQUE" : "ASSISTÉ"}
                          </span>
                          {selectedChannelId === channel.id && <CheckCircle2 size={16} aria-label="Sélectionné" />}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="deposit-options-message">
                      Aucun canal de paiement n'est configuré pour le moment.
                    </div>
                  )}
                </section>
              )}

              <button type="button" onClick={() => navigate("/history")} className="deposit-history-link">
                Consulter mes opérations
              </button>

              <div className="beko-panel deposit-guidance">
                <p><Info size={14} aria-hidden="true" />Minimum de dépôt : {depositMinimum.toLocaleString("fr-FR")} FCFA.</p>
                {isAshtechMode ? (
                  <p><ShieldCheck size={14} aria-hidden="true" />Ne relancez pas un dépôt automatique tant qu'une demande est en attente.</p>
                ) : (
                  <>
                    <p><ShieldCheck size={14} aria-hidden="true" />Le montant du transfert doit correspondre à la demande créée.</p>
                    <p><ShieldCheck size={14} aria-hidden="true" />Utilisez le numéro du compte de paiement réel. Certains paiements par lien nécessitent un traitement du service client.</p>
                  </>
                )}
              </div>
            </>
          )}
        </main>
      </div>
      {!automaticDeposit && (
        <div className="beko-withdraw-dock">
          <div className="beko-withdraw-summary" aria-live="polite">
            <div>
              <span>Montant du dépôt</span>
              <strong>{amount ? `${Number(amount).toLocaleString("fr-FR")} FCFA` : "À renseigner"}</strong>
            </div>
            <div>
              <span>Crédité sur</span>
              <strong>Solde dépôt</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              depositMutation.isPending ||
              optionsLoading ||
              Boolean(optionsError) ||
              !country ||
              !depositOptions
            }
            className="beko-primary-button"
            data-testid="button-confirm"
          >
            {depositMutation.isPending ? (
              <>
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                Traitement...
              </>
            ) : (
              <>
                <ArrowRight size={18} aria-hidden="true" />
                {isAshtechMode ? "Lancer le paiement" : "Confirmer le dépôt"}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}