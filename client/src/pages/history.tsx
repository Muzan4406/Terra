import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  FileText,
  RotateCw,
  WalletCards,
} from "lucide-react";
import type { Deposit, Withdrawal, Earning } from "@shared/schema";
import "./beko-pages.css";

interface TransactionHistory {
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  earnings: Earning[];
}

type TabType = "all" | "deposit" | "withdrawal" | "earning";
type StatusType = "all" | "approved" | "pending" | "rejected";
type HistoryEntry =
  | { kind: "deposit"; data: Deposit }
  | { kind: "withdrawal"; data: Withdrawal }
  | { kind: "earning"; data: Earning };

const formatMoney = (amount: number) =>
  Number(amount || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

const formatDate = (value: string | Date) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
};

const statusLabel = (status: string) => {
  if (status === "approved") return "Validé";
  if (status === "pending") return "En cours";
  if (status === "rejected") return "Refusé";
  return status;
};

export default function HistoryPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [activeStatus, setActiveStatus] = useState<StatusType>("all");
  const { data: history, isLoading, isError, refetch } = useQuery<TransactionHistory>({
    queryKey: ["/api/transactions/history"],
    enabled: !!user,
  });

  if (!user) return null;

  const deposits = history?.deposits ?? [];
  const withdrawals = history?.withdrawals ?? [];
  const earnings = history?.earnings ?? [];
  const allEntries: HistoryEntry[] = [
    ...deposits.map((data) => ({ kind: "deposit" as const, data })),
    ...withdrawals.map((data) => ({ kind: "withdrawal" as const, data })),
    ...earnings.map((data) => ({ kind: "earning" as const, data })),
  ].sort((left, right) => new Date(right.data.createdAt).getTime() - new Date(left.data.createdAt).getTime());

  const statusTabs: { id: StatusType; label: string; count: number }[] = [
    { id: "all", label: "Tous", count: allEntries.length },
    { id: "approved", label: "Succès", count: deposits.filter((item) => item.status === "approved").length + withdrawals.filter((item) => item.status === "approved").length },
    { id: "pending", label: "En cours", count: deposits.filter((item) => item.status === "pending").length + withdrawals.filter((item) => item.status === "pending").length },
    { id: "rejected", label: "Échoué", count: deposits.filter((item) => item.status === "rejected").length + withdrawals.filter((item) => item.status === "rejected").length },
  ];
  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: "all", label: "Tout", count: allEntries.length },
    { id: "deposit", label: "Dépôts", count: deposits.length },
    { id: "withdrawal", label: "Retraits", count: withdrawals.length },
    { id: "earning", label: "Revenus", count: earnings.length },
  ];

  const renderEntry = (entry: HistoryEntry) => {
    if (entry.kind === "deposit") {
      const deposit = entry.data;
      return (
        <article key={`deposit-${deposit.id}`} className="beko-record beko-fade-in" data-testid={`deposit-${deposit.id}`}>
          <div className="beko-record-head">
            <div className="beko-record-type">
              <span className="beko-record-icon"><ArrowDownLeft size={19} /></span>
              <div className="min-w-0">
                <div className="beko-record-title">Dépôt</div>
                <div className="beko-record-date">{formatDate(deposit.createdAt)}</div>
              </div>
            </div>
            <div className="text-right">
              <span className="beko-status" data-status={deposit.status}>{statusLabel(deposit.status)}</span>
              <div className="beko-record-amount mt-2">{formatMoney(deposit.amount)}<small>FCFA</small></div>
            </div>
          </div>
          <div className="beko-record-details">
            <div className="beko-record-detail"><span>Moyen de paiement</span><strong>{deposit.paymentMethod}</strong></div>
            <div className="beko-record-detail"><span>Référence</span><strong>{deposit.ashtechReference || deposit.ashtechTransactionId || "—"}</strong></div>
          </div>
        </article>
      );
    }
    if (entry.kind === "withdrawal") {
      const withdrawal = entry.data;
      return (
        <article key={`withdrawal-${withdrawal.id}`} className="beko-record beko-fade-in" data-testid={`withdrawal-${withdrawal.id}`}>
          <div className="beko-record-head">
            <div className="beko-record-type">
              <span className="beko-record-icon"><ArrowUpRight size={19} /></span>
              <div className="min-w-0">
                <div className="beko-record-title">Retrait</div>
                <div className="beko-record-date">{formatDate(withdrawal.createdAt)}</div>
              </div>
            </div>
            <div className="text-right">
              <span className="beko-status" data-status={withdrawal.status}>{statusLabel(withdrawal.status)}</span>
              <div className="beko-record-amount mt-2">{formatMoney(withdrawal.grossAmount)}<small>FCFA demandés</small></div>
            </div>
          </div>
          <div className="beko-record-details">
            <div className="beko-record-detail"><span>Frais</span><strong>{formatMoney(withdrawal.feeAmount)} FCFA</strong></div>
            <div className="beko-record-detail"><span>Montant net</span><strong>{formatMoney(withdrawal.netAmount)} FCFA</strong></div>
          </div>
        </article>
      );
    }
    const earning = entry.data;
    return (
      <article key={`earning-${earning.id}`} className="beko-record beko-fade-in" data-testid={`earning-${earning.id}`}>
        <div className="beko-record-head">
          <div className="beko-record-type">
            <span className="beko-record-icon"><CircleDollarSign size={19} /></span>
            <div className="min-w-0">
              <div className="beko-record-title">{earning.description}</div>
              <div className="beko-record-date">{formatDate(earning.createdAt)}</div>
            </div>
          </div>
          <div className="beko-record-amount">+{formatMoney(earning.amount)}<small>FCFA</small></div>
        </div>
        <div className="beko-record-details">
          <div className="beko-record-detail"><span>Type de revenu</span><strong>{earning.type}</strong></div>
        </div>
      </article>
    );
  };

  const kindEntries = activeTab === "all"
    ? allEntries
    : allEntries.filter((entry) => entry.kind === activeTab);
  const visibleEntries = activeStatus === "all"
    ? kindEntries
    : kindEntries.filter((entry) =>
      entry.kind !== "earning" && entry.data.status === activeStatus,
    );

  return (
    <div className="beko-page">
      <div className="beko-shell">
        <header className="beko-topbar">
          <button type="button" className="beko-back" onClick={() => navigate("/account")} aria-label="Retour au compte" data-testid="button-back">
            <ArrowLeft size={19} />
          </button>
          <h1>Historique du compte</h1>
          <span className="beko-brand">BEKO</span>
        </header>
        <main>
          <section className="beko-hero">
            <p className="beko-eyebrow">Toutes vos opérations</p>
            <h2>Vos finances, au même endroit.</h2>
            <p>Dépôts, retraits et revenus enregistrés sur votre compte Beko.</p>
          </section>
          <div className="beko-content">
            <section className="beko-tabs" role="tablist" aria-label="Filtrer par statut">
              {statusTabs.map((tab) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeStatus === tab.id}
                  key={tab.id}
                  onClick={() => setActiveStatus(tab.id)}
                  className="beko-tab"
                  data-testid={`status-${tab.id}`}
                >
                  {tab.label}<small>{tab.count}</small>
                </button>
              ))}
            </section>

            <section className="beko-kind-tabs" role="tablist" aria-label="Catégorie de transaction">
              {tabs.map((tab) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="beko-kind-tab"
                  data-testid={`tab-${tab.id}`}
                >
                  {tab.label}<small>{tab.count}</small>
                </button>
              ))}
            </section>

            {isLoading ? (
              <div className="grid gap-3" aria-label="Chargement de l’historique">
                {[0, 1, 2].map((item) => <Skeleton key={item} className="h-36 w-full rounded-2xl" />)}
              </div>
            ) : isError ? (
              <section className="beko-panel grid justify-items-center gap-3 p-6 text-center" role="alert">
                <span className="beko-action-icon"><RotateCw size={21} /></span>
                <div>
                  <h2 className="m-0 text-base font-extrabold">Historique indisponible</h2>
                  <p className="mb-0 mt-1 text-sm text-[#668078]">Vérifiez votre connexion puis réessayez.</p>
                </div>
                <button type="button" className="beko-primary-button max-w-48" onClick={() => void refetch()}>Réessayer</button>
              </section>
            ) : visibleEntries.length === 0 ? (
              <section className="beko-panel grid justify-items-center gap-2 px-6 py-10 text-center">
                <span className="beko-action-icon h-12 w-12"><FileText size={21} /></span>
                <h2 className="m-0 text-base font-extrabold">
                  {activeStatus !== "all" && activeTab === "earning" ? "Les revenus ne portent pas de statut" :
                    activeTab === "all" ? `Aucune opération ${activeStatus === "all" ? "" : "avec ce statut "}pour le moment` :
                      activeTab === "deposit" ? "Aucun dépôt correspondant" :
                        activeTab === "withdrawal" ? "Aucun retrait correspondant" : "Aucun revenu enregistré"}
                </h2>
                <p className="m-0 max-w-xs text-sm leading-relaxed text-[#668078]">
                  Vos opérations apparaîtront ici dès qu’elles seront enregistrées sur votre compte.
                </p>
                {activeTab === "all" && activeStatus === "all" && (
                  <button type="button" className="beko-inline-link mt-2" onClick={() => navigate("/account")}>Retour à mon compte</button>
                )}
              </section>
            ) : (
              <section className="grid gap-3" aria-label="Opérations du compte">
                <div className="beko-section-heading">
                  <h2>{activeTab === "all" ? "Opérations récentes" : tabs.find((tab) => tab.id === activeTab)?.label}</h2>
                  <span>{visibleEntries.length} enregistrement(s)</span>
                </div>
                {visibleEntries.map(renderEntry)}
              </section>
            )}

            <div className="beko-notice flex items-start gap-2">
              <CalendarDays className="mt-0.5 shrink-0 text-[#087653]" size={17} />
              <span>Les dates et montants affichés proviennent de vos opérations enregistrées.</span>
            </div>
            <button type="button" className="beko-action" onClick={() => navigate("/wallets")}>
              <span className="beko-action-icon"><WalletCards size={19} /></span>
              <span className="beko-action-copy"><strong>Mes portefeuilles</strong><small>Gérer mes moyens de réception</small></span>
              <Clock3 className="beko-arrow" size={17} />
            </button>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}