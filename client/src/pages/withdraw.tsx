import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { withdrawalSchema, ELIGIBLE_COUNTRIES } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyDisplay } from "@/components/money-display";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Loader2, Wallet, AlertCircle, Clock, Lock, CreditCard } from "lucide-react";
import type { z } from "zod";
import type { Wallet as WalletType } from "@shared/schema";

type WithdrawalFormData = z.infer<typeof withdrawalSchema>;

export default function WithdrawPage() {
  const { user, refetchUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: wallets } = useQuery<WalletType[]>({
    queryKey: ["/api/wallets"],
  });

  const form = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: 1200,
      walletId: "",
    },
  });

  const watchAmount = form.watch("amount");
  const feeAmount = Math.round(watchAmount * 0.15);
  const netAmount = watchAmount - feeAmount;

  const withdrawMutation = useMutation({
    mutationFn: async (data: WithdrawalFormData) => {
      const res = await apiRequest("POST", "/api/withdrawals", data);
      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Demande de retrait envoyée", 
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

  const onSubmit = (data: WithdrawalFormData) => {
    withdrawMutation.mutate(data);
  };

  if (!user) return null;

  const country = ELIGIBLE_COUNTRIES.find((c) => c.code === user.country);
  const withdrawalHours = country?.withdrawalHours || { start: 8, end: 17 };
  const currentHour = new Date().getHours();
  const isWithinHours = currentHour >= withdrawalHours.start && currentHour < withdrawalHours.end;

  const canWithdraw = user.hasProduct && !user.withdrawalBlocked && isWithinHours;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto">
        <header className="flex items-center gap-4 p-4 bg-card border-b border-card-border">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Retrait</h1>
        </header>

        <div className="p-4 space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Solde disponible</p>
                <p className="font-bold"><MoneyDisplay amount={user.balance} /></p>
              </div>
            </CardContent>
          </Card>

          {!user.hasProduct && (
            <Card className="border-amber-500/30 bg-amber-500/10">
              <CardContent className="p-4 flex items-start gap-3">
                <Lock className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">Produit requis</p>
                  <p className="text-sm text-muted-foreground">
                    Vous devez acheter un produit VIP pour débloquer les retraits.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {user.withdrawalBlocked && (
            <Card className="border-destructive/30 bg-destructive/10">
              <CardContent className="p-4 flex items-start gap-3">
                <Lock className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Retrait bloqué</p>
                  <p className="text-sm text-muted-foreground">
                    Votre capacité de retrait a été bloquée. Contactez le service client.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {!wallets?.length && (
            <Card className="border-amber-500/30 bg-amber-500/10">
              <CardContent className="p-4 flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">Portefeuille requis</p>
                  <p className="text-sm text-muted-foreground">
                    Vous devez enregistrer un portefeuille de retrait.
                  </p>
                  <Button 
                    size="sm" 
                    className="mt-2"
                    onClick={() => navigate("/wallets")}
                  >
                    Ajouter un portefeuille
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Demande de retrait</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-md text-sm">
                <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-700 dark:text-blue-400">
                    Heures de retrait: {withdrawalHours.start}h - {withdrawalHours.end}h
                  </p>
                  <p className="text-muted-foreground">
                    {isWithinHours 
                      ? "Retraits disponibles maintenant" 
                      : "Retraits non disponibles actuellement"
                    }
                  </p>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant à retirer (min. 1200 FCFA)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={1200}
                            max={user.balance}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="walletId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Portefeuille de réception</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-wallet">
                              <SelectValue placeholder="Choisir un portefeuille" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {wallets?.map((wallet) => (
                              <SelectItem key={wallet.id} value={wallet.id}>
                                {wallet.paymentMethod} - {wallet.accountNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Card className="bg-muted/50">
                    <CardContent className="p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Montant demandé</span>
                        <span><MoneyDisplay amount={watchAmount} /></span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span>Frais (15%)</span>
                        <span>-<MoneyDisplay amount={feeAmount} /></span>
                      </div>
                      <div className="border-t border-border pt-2 flex justify-between font-bold">
                        <span>Montant net à recevoir</span>
                        <span className="text-green-500"><MoneyDisplay amount={netAmount} /></span>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-md text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      Retrait minimum: <span className="font-semibold">1 200 FCFA</span> | 
                      Frais: <span className="font-semibold">15%</span> | 
                      1 retrait max/jour
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!canWithdraw || !wallets?.length || withdrawMutation.isPending}
                    data-testid="button-submit-withdraw"
                  >
                    {withdrawMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      "Demander le retrait"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
