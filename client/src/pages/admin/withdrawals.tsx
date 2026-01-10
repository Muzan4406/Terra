import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MoneyDisplay } from "@/components/money-display";
import { getCountryFlag } from "@/components/country-select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Search, Check, X, Clock, Loader2 } from "lucide-react";
import type { Withdrawal, User, Wallet } from "@shared/schema";

interface WithdrawalWithDetails extends Withdrawal {
  user: User;
  wallet: Wallet;
}

export default function AdminWithdrawalsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const { data: withdrawals, isLoading } = useQuery<WithdrawalWithDetails[]>({
    queryKey: [`/api/admin/withdrawals?filter=${filter}`],
  });

  const actionMutation = useMutation({
    mutationFn: async ({ withdrawalId, action }: { withdrawalId: string; action: "approve" | "reject" }) => {
      const res = await apiRequest("POST", `/api/admin/withdrawals/${withdrawalId}/${action}`, {});
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: variables.action === "approve" ? "Retrait approuvé" : "Retrait rejeté"
      });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0]?.toString().startsWith('/api/admin/withdrawals') || false });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  if (!user?.isAdmin) {
    navigate("/");
    return null;
  }

  const filteredWithdrawals = withdrawals?.filter((w) => {
    if (searchTerm) {
      return w.wallet.accountNumber.includes(searchTerm) || w.user.phone.includes(searchTerm);
    }
    return true;
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center gap-4 p-4 bg-card border-b border-card-border">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Gestion des retraits</h1>
        </header>

        <div className="p-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par numéro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-1">
              {(["pending", "approved", "rejected", "all"] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f === "pending" && "En attente"}
                  {f === "approved" && "Approuvés"}
                  {f === "rejected" && "Rejetés"}
                  {f === "all" && "Tous"}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : filteredWithdrawals?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun retrait trouvé</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredWithdrawals?.map((withdrawal) => (
                <Card key={withdrawal.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-lg text-red-500">
                            -<MoneyDisplay amount={withdrawal.grossAmount} />
                          </span>
                          <span className="text-sm text-muted-foreground">
                            (Net: <MoneyDisplay amount={withdrawal.netAmount} className="text-green-500" />)
                          </span>
                          <Badge variant={
                            withdrawal.status === "pending" ? "secondary" :
                            withdrawal.status === "approved" ? "default" : "destructive"
                          }>
                            {withdrawal.status === "pending" && "En attente"}
                            {withdrawal.status === "approved" && "Approuvé"}
                            {withdrawal.status === "rejected" && "Rejeté"}
                          </Badge>
                          {withdrawal.user.isPromoter && (
                            <Badge className="bg-amber-500">Promoteur</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <p><span className="text-muted-foreground">Nom compte:</span> {withdrawal.wallet.accountName}</p>
                          <p><span className="text-muted-foreground">Numéro:</span> {withdrawal.wallet.accountNumber}</p>
                          <p><span className="text-muted-foreground">Pays:</span> {getCountryFlag(withdrawal.wallet.country)} {withdrawal.wallet.country}</p>
                          <p><span className="text-muted-foreground">Moyen:</span> {withdrawal.wallet.paymentMethod}</p>
                          <p><span className="text-muted-foreground">Frais:</span> <MoneyDisplay amount={withdrawal.feeAmount} /></p>
                          <p><span className="text-muted-foreground">Utilisateur:</span> {withdrawal.user.fullName}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(withdrawal.createdAt)}</p>
                      </div>

                      {withdrawal.status === "pending" && (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={() => actionMutation.mutate({ withdrawalId: withdrawal.id, action: "approve" })}
                            disabled={actionMutation.isPending}
                            data-testid={`approve-${withdrawal.id}`}
                          >
                            {actionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            Valider
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => actionMutation.mutate({ withdrawalId: withdrawal.id, action: "reject" })}
                            disabled={actionMutation.isPending}
                            data-testid={`reject-${withdrawal.id}`}
                          >
                            <X className="h-4 w-4" />
                            Rejeter
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
