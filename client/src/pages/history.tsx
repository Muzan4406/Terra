import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MoneyDisplay } from "@/components/money-display";
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import type { Deposit, Withdrawal, Earning } from "@shared/schema";

interface TransactionHistory {
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  earnings: Earning[];
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: history, isLoading } = useQuery<TransactionHistory>({
    queryKey: ["/api/transactions/history"],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> En attente</Badge>;
      case "approved":
        return <Badge className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" /> Approuvé</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejeté</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto">
        <header className="flex items-center gap-4 p-4 bg-card border-b border-card-border">
          <Button variant="ghost" size="icon" onClick={() => navigate("/account")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Historique des transactions</h1>
        </header>

        <div className="p-4">
          <Tabs defaultValue="deposits" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="deposits" data-testid="tab-deposits">Dépôts</TabsTrigger>
              <TabsTrigger value="withdrawals" data-testid="tab-withdrawals">Retraits</TabsTrigger>
              <TabsTrigger value="earnings" data-testid="tab-earnings">Revenus</TabsTrigger>
            </TabsList>

            <TabsContent value="deposits" className="mt-4 space-y-3">
              {isLoading ? (
                [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)
              ) : history?.deposits.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <ArrowDownToLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun dépôt</p>
                  </CardContent>
                </Card>
              ) : (
                history?.deposits.map((deposit) => (
                  <Card key={deposit.id} className="hover-elevate">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                            <ArrowDownToLine className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-green-500">
                              +<MoneyDisplay amount={deposit.amount} />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {deposit.paymentMethod}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(deposit.createdAt)}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(deposit.status)}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="withdrawals" className="mt-4 space-y-3">
              {isLoading ? (
                [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)
              ) : history?.withdrawals.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <ArrowUpFromLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun retrait</p>
                  </CardContent>
                </Card>
              ) : (
                history?.withdrawals.map((withdrawal) => (
                  <Card key={withdrawal.id} className="hover-elevate">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                            <ArrowUpFromLine className="h-5 w-5 text-red-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-red-500">
                              -<MoneyDisplay amount={withdrawal.grossAmount} />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Net: <MoneyDisplay amount={withdrawal.netAmount} />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(withdrawal.createdAt)}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(withdrawal.status)}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="earnings" className="mt-4 space-y-3">
              {isLoading ? (
                [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)
              ) : history?.earnings.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun revenu</p>
                  </CardContent>
                </Card>
              ) : (
                history?.earnings.map((earning) => (
                  <Card key={earning.id} className="hover-elevate">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-green-500">
                              +<MoneyDisplay amount={earning.amount} />
                            </p>
                            <p className="text-sm">{earning.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(earning.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {earning.type}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
