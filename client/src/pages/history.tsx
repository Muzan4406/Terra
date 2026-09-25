import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ChevronRight } from "lucide-react";
import type { Deposit, Withdrawal, Earning } from "@shared/schema";
import { useState } from "react";

interface TransactionHistory {
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  earnings: Earning[];
}

type TabType = "solde" | "depot" | "retrait";

export default function HistoryPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>("retrait");

  const { data: history, isLoading } = useQuery<TransactionHistory>({
    queryKey: ["/api/transactions/history"],
  });

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString("fr-FR");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium">
            Validé
          </span>
        );
      case "pending":
        return (
          <span className="bg-yellow-500 text-white text-xs px-3 py-1 rounded-full font-medium">
            En cours
          </span>
        );
      case "rejected":
        return (
          <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-medium">
            Rejeté
          </span>
        );
      default:
        return (
          <span className="bg-gray-500 text-white text-xs px-3 py-1 rounded-full font-medium">
            {status}
          </span>
        );
    }
  };

  if (!user) return null;

  const tabs: { id: TabType; label: string }[] = [
    { id: "solde", label: "Solde" },
    { id: "depot", label: "Dépôt" },
    { id: "retrait", label: "Retrait" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto">
        <header className="flex items-center gap-4 px-4 py-4 bg-white">
          <button 
            onClick={() => navigate("/")}
            className="text-gray-600 hover:text-gray-900"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 flex-1 text-center pr-5">
            Historique des opérations
          </h1>
        </header>

        <div className="px-4 py-2">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-4 py-2 rounded text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200"
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
                <ChevronRight className={`h-3 w-3 ${activeTab === tab.id ? "rotate-90" : ""}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {isLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)
          ) : activeTab === "retrait" ? (
            history?.withdrawals.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Aucun retrait
              </div>
            ) : (
              history?.withdrawals.map((withdrawal) => (
                <div 
                  key={withdrawal.id} 
                  className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm"
                  data-testid={`withdrawal-${withdrawal.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-lg font-bold text-gray-900">
                        FCFA {formatAmount(withdrawal.grossAmount)}
                      </p>
                      <p className="text-sm text-gray-600">Montant du retrait</p>
                    </div>
                    {getStatusBadge(withdrawal.status)}
                  </div>
                  <div className="border-t border-gray-100 pt-3 mt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Montant reçu :</span>
                      <span className="text-gray-900">FCFA {formatAmount(withdrawal.netAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Heure du retrait :</span>
                      <span className="text-gray-900">{formatDate(withdrawal.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : activeTab === "depot" ? (
            history?.deposits.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Aucun dépôt
              </div>
            ) : (
              history?.deposits.map((deposit) => (
                <div 
                  key={deposit.id} 
                  className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm"
                  data-testid={`deposit-${deposit.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-lg font-bold text-gray-900">
                        FCFA {formatAmount(deposit.amount)}
                      </p>
                      <p className="text-sm text-gray-600">Montant du dépôt</p>
                    </div>
                    {getStatusBadge(deposit.status)}
                  </div>
                  <div className="border-t border-gray-100 pt-3 mt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Méthode :</span>
                      <span className="text-gray-900">{deposit.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Heure du dépôt :</span>
                      <span className="text-gray-900">{formatDate(deposit.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            history?.earnings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Aucun revenu
              </div>
            ) : (
              history?.earnings.map((earning) => (
                <div 
                  key={earning.id} 
                  className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm"
                  data-testid={`earning-${earning.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-lg font-bold text-green-600">
                        +FCFA {formatAmount(earning.amount)}
                      </p>
                      <p className="text-sm text-gray-600">{earning.description}</p>
                    </div>
                    <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                      {earning.type === "daily" ? "Quotidien" : 
                       earning.type === "referral" ? "Parrainage" : 
                       earning.type === "bonus" ? "Bonus" : 
                       earning.type === "task" ? "Tâche" : earning.type}
                    </span>
                  </div>
                  <div className="border-t border-gray-100 pt-3 mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Date :</span>
                      <span className="text-gray-900">{formatDate(earning.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}
