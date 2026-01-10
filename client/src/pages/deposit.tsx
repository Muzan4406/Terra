import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { depositSchema } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CountrySelect } from "@/components/country-select";
import { PaymentMethodSelect } from "@/components/payment-method-select";
import { MoneyDisplay } from "@/components/money-display";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Loader2, Wallet, AlertCircle } from "lucide-react";
import type { z } from "zod";
import type { PaymentChannel } from "@shared/schema";

type DepositFormData = z.infer<typeof depositSchema>;

const PRESET_AMOUNTS = [3000, 5000, 10000, 20000, 50000, 100000];

export default function DepositPage() {
  const { user, refetchUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const { data: channels } = useQuery<PaymentChannel[]>({
    queryKey: ["/api/payment-channels"],
  });

  const form = useForm<DepositFormData>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      amount: 3000,
      channelId: "",
      accountName: "",
      accountNumber: "",
      country: user?.country || "",
      paymentMethod: "",
    },
  });

  const watchCountry = form.watch("country");
  const watchChannelId = form.watch("channelId");

  const selectedChannel = channels?.find((c) => c.id === watchChannelId);

  const depositMutation = useMutation({
    mutationFn: async (data: DepositFormData) => {
      const res = await apiRequest("POST", "/api/deposits", data);
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
        description: "Votre demande sera traitée par l'administrateur." 
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

  const onSubmit = (data: DepositFormData) => {
    depositMutation.mutate(data);
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    form.setValue("amount", amount);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto">
        <header className="flex items-center gap-4 p-4 bg-card border-b border-card-border">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Recharger</h1>
        </header>

        <div className="p-4 space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Solde actuel</p>
                <p className="font-bold"><MoneyDisplay amount={user.balance} /></p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Montant à déposer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {PRESET_AMOUNTS.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant={selectedAmount === amount ? "default" : "outline"}
                    className="h-12"
                    onClick={() => handleAmountSelect(amount)}
                    data-testid={`amount-${amount}`}
                  >
                    <MoneyDisplay amount={amount} showCurrency={false} />
                  </Button>
                ))}
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant personnalisé (min. 3000 FCFA)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={3000}
                            onChange={(e) => {
                              field.onChange(parseInt(e.target.value) || 0);
                              setSelectedAmount(null);
                            }}
                            data-testid="input-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="channelId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Canal de recharge</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-channel">
                              <SelectValue placeholder="Choisir un canal" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {channels?.filter((c) => c.isActive).map((channel) => (
                              <SelectItem key={channel.id} value={channel.id}>
                                {channel.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du compte de paiement</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nom complet" data-testid="input-account-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro de paiement</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Numéro de téléphone" data-testid="input-account-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pays</FormLabel>
                        <FormControl>
                          <CountrySelect value={field.value} onValueChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moyen de paiement</FormLabel>
                        <FormControl>
                          <PaymentMethodSelect
                            country={watchCountry}
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-md text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">
                      Dépôt minimum: <span className="font-semibold">3 000 FCFA</span>
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={depositMutation.isPending}
                    data-testid="button-submit-deposit"
                  >
                    {depositMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      "Procéder au paiement"
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
