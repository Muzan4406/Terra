import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MoneyDisplay } from "@/components/money-display";
import { getCountryFlag } from "@/components/country-select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Search, Check, X, Ban, Clock, Loader2 } from "lucide-react";
import type { Deposit, User } from "@shared/schema";

interface DepositWithUser extends Deposit {
  user: User;
}

export default function AdminDepositsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const { data: deposits, isLoading } = useQuery<DepositWithUser[]>({
    queryKey: ["/api/admin/deposits", filter],
  });

  const actionMutation = useMutation({
    mutationFn: async ({ depositId, action, ban }: { depositId: string; action: "approve" | "reject"; ban?: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/deposits/${depositId}/${action}`, { ban });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: variables.action === "approve" ? "Dépôt approuvé" : "Dépôt rejeté",
        description: variables.ban ? "L'utilisateur a été banni" : undefined
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deposits"] });
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

  const filteredDeposits = deposits?.filter((d) => {
    if (searchTerm) {
      return d.accountNumber.includes(searchTerm) || d.user.phone.includes(searchTerm);
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
          <h1 className="text-xl font-bold">Gestion des dépôts</h1>
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
          ) : filteredDeposits?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun dépôt trouvé</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredDeposits?.map((deposit) => (
                <Card key={deposit.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">
                            <MoneyDisplay amount={deposit.amount} />
                          </span>
                          <Badge variant={
                            deposit.status === "pending" ? "secondary" :
                            deposit.status === "approved" ? "default" : "destructive"
                          }>
                            {deposit.status === "pending" && "En attente"}
                            {deposit.status === "approved" && "Approuvé"}
                            {deposit.status === "rejected" && "Rejeté"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <p><span className="text-muted-foreground">Nom:</span> {deposit.accountName}</p>
                          <p><span className="text-muted-foreground">Numéro:</span> {deposit.accountNumber}</p>
                          <p><span className="text-muted-foreground">Pays:</span> {getCountryFlag(deposit.country)} {deposit.country}</p>
                          <p><span className="text-muted-foreground">Moyen:</span> {deposit.paymentMethod}</p>
                          <p><span className="text-muted-foreground">Utilisateur:</span> {deposit.user.fullName}</p>
                          <p><span className="text-muted-foreground">Tél:</span> {deposit.user.phone}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(deposit.createdAt)}</p>
                      </div>

                      {deposit.status === "pending" && (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={() => actionMutation.mutate({ depositId: deposit.id, action: "approve" })}
                            disabled={actionMutation.isPending}
                            data-testid={`approve-${deposit.id}`}
                          >
                            {actionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            Valider
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => actionMutation.mutate({ depositId: deposit.id, action: "reject" })}
                            disabled={actionMutation.isPending}
                            data-testid={`reject-${deposit.id}`}
                          >
                            <X className="h-4 w-4" />
                            Rejeter
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => actionMutation.mutate({ depositId: deposit.id, action: "reject", ban: true })}
                            disabled={actionMutation.isPending}
                            data-testid={`ban-${deposit.id}`}
                          >
                            <Ban className="h-4 w-4" />
                            Bannir
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
