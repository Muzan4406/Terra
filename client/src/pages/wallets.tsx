import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { walletSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CountryFlagIcon, CountrySelect, getCountryName } from "@/components/country-select";
import { PaymentMethodSelect } from "@/components/payment-method-select";
import { PaymentMethodPngIcon } from "@/components/beko-icons";
import { BottomNav } from "@/components/bottom-nav";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, CreditCard, Trash2, Loader2 } from "lucide-react";
import type { z } from "zod";
import type { Wallet } from "@shared/schema";
import "./beko-pages.css";

type WalletFormData = z.infer<typeof walletSchema>;

export default function WalletsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: wallets, isLoading } = useQuery<Wallet[]>({
    queryKey: ["/api/wallets"],
  });

  const form = useForm<WalletFormData>({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      accountName: "",
      accountNumber: "",
      country: user?.country || "",
      paymentMethod: "",
    },
  });

  const watchCountry = form.watch("country");

  const createMutation = useMutation({
    mutationFn: async (data: WalletFormData) => {
      const res = await apiRequest("POST", "/api/wallets", data);
      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Portefeuille ajouté" });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (walletId: string) => {
      const res = await apiRequest("DELETE", `/api/wallets/${walletId}`, {});
      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Portefeuille supprimé" });
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erreur", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: WalletFormData) => {
    createMutation.mutate(data);
  };

  if (!user) return null;

  return (
    <div className="beko-page">
      <div className="beko-shell">
        <header className="beko-topbar">
          <button
            type="button"
            className="beko-back"
            onClick={() => navigate("/account")}
            aria-label="Retour au compte"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="beko-brand">BEKO</span>
          <h1>Mes portefeuilles</h1>
          <span className="beko-balance-mark" aria-hidden="true">
            <CreditCard size={19} />
          </span>
        </header>

        <main className="beko-content">
          <section className="beko-hero beko-fade-in">
            <p className="beko-eyebrow">Moyens de réception</p>
            <h2>Vos retraits, en toute simplicité.</h2>
            <p>Enregistrez vos comptes Mobile Money pour les retrouver lors de vos demandes de retrait.</p>
          </section>

          <section className="grid gap-3" aria-label="Portefeuilles de retrait">
            <div className="beko-section-heading">
              <h2>Mes portefeuilles</h2>
              <span>{wallets?.length || 0} enregistré(s)</span>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="beko-primary-button" data-testid="button-add-wallet">
                  <Plus className="h-4 w-4" />
                  Ajouter un portefeuille
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[1.35rem] border-[#d8e8d8] bg-[#fcfff9] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-[#14392f]">Nouveau portefeuille</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="accountName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#14392f]">Nom du compte</FormLabel>
                          <FormControl>
                            <Input className="beko-input" {...field} placeholder="Nom complet" data-testid="input-wallet-name" />
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
                          <FormLabel className="text-[#14392f]">Numéro de compte</FormLabel>
                          <FormControl>
                            <Input className="beko-input" {...field} placeholder="Numéro de téléphone" data-testid="input-wallet-number" />
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
                          <FormLabel className="text-[#14392f]">Pays</FormLabel>
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
                          <FormLabel className="text-[#14392f]">Moyen de paiement</FormLabel>
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

                    <Button
                      type="submit"
                      className="beko-primary-button"
                      disabled={createMutation.isPending}
                      data-testid="button-save-wallet"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        "Enregistrer"
                      )}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {isLoading ? (
              <div className="grid gap-3">
                {[1, 2].map((i) => (
                  <div key={i} className="beko-panel h-24 animate-pulse" />
                ))}
              </div>
            ) : wallets?.length === 0 ? (
              <div className="beko-panel grid justify-items-center p-8 text-center">
                <span className="beko-action-icon mb-3 h-14 w-14 rounded-2xl">
                  <CreditCard className="h-7 w-7" />
                </span>
                <p className="font-bold text-[#14392f]">Aucun portefeuille enregistré</p>
                <p className="mt-1 max-w-xs text-sm text-[#668078]">
                  Ajoutez un compte de réception pour faciliter vos retraits.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {wallets?.map((wallet) => (
                  <article key={wallet.id} className="beko-panel p-3">
                    <div className="flex items-center gap-3">
                      <PaymentMethodPngIcon method={wallet.paymentMethod} className="h-12 w-12 rounded-2xl p-1.5" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-[#14392f]">{wallet.accountName}</p>
                        <p className="truncate text-sm text-[#527268]">
                          {wallet.paymentMethod} · {wallet.accountNumber}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-[#668078]">
                          <CountryFlagIcon code={wallet.country} className="h-4 w-4" />
                          {getCountryName(wallet.country)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-[#a94a3d] hover:bg-[#fff0e9] hover:text-[#8c4237]"
                        onClick={() => deleteMutation.mutate(wallet.id)}
                        disabled={deleteMutation.isPending}
                        aria-label={`Supprimer le portefeuille ${wallet.accountName}`}
                        data-testid={`button-delete-${wallet.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
