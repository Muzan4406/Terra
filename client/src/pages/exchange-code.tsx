import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { ArrowLeft, Gift, CheckCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BottomNav } from "@/components/bottom-nav";

const exchangeCodeSchema = z.object({
  code: z.string().min(1, "Code requis"),
});

type ExchangeCodeForm = z.infer<typeof exchangeCodeSchema>;

export default function ExchangeCodePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [successAmount, setSuccessAmount] = useState<number | null>(null);

  const form = useForm<ExchangeCodeForm>({
    resolver: zodResolver(exchangeCodeSchema),
    defaultValues: {
      code: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ExchangeCodeForm) => {
      const response = await apiRequest("POST", "/api/bonus-codes/exchange", data);
      return response.json();
    },
    onSuccess: (data) => {
      setSuccessAmount(data.amount);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      form.reset();
      toast({
        title: "Félicitations!",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: ExchangeCodeForm) => {
    setSuccessAmount(null);
    mutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-500 to-teal-700 pb-20">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 p-4 text-white">
          <button 
            onClick={() => navigate("/account")}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Échange de code bonus</h1>
        </div>

        <div className="bg-white rounded-t-3xl min-h-[calc(100vh-140px)] p-6">
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center shadow-lg relative">
              <Gift className="w-12 h-12 text-white" />
              <div className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4 text-yellow-800" />
              </div>
            </div>
          </div>

          <h2 className="text-center text-xl font-bold text-gray-800 mb-2">
            Entrez votre code bonus
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Saisissez un code valide pour recevoir votre bonus directement sur votre solde.
          </p>

          {successAmount && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-green-700 font-semibold">Bonus reçu!</p>
                  <p className="text-2xl font-bold text-green-600">
                    +{successAmount.toLocaleString("fr-FR")} FCFA
                  </p>
                </div>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Code bonus</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Ex: BONUS2024"
                        className="h-14 text-center text-lg font-mono uppercase tracking-widest border-gray-300 rounded-xl focus:border-teal-500 focus:ring-teal-500"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        data-testid="input-bonus-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg"
                disabled={mutation.isPending}
                data-testid="button-exchange-code"
              >
                {mutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Vérification...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    Échanger le code
                  </span>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-8 space-y-4">
            <div className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl border border-teal-100">
              <h3 className="text-sm font-semibold text-teal-800 mb-2">Comment obtenir des codes bonus ?</h3>
              <ul className="text-xs text-teal-700 space-y-1">
                <li>Suivez nos réseaux sociaux</li>
                <li>Participez à nos événements spéciaux</li>
                <li>Invitez des amis sur la plateforme</li>
                <li>Abonnez-vous à notre newsletter</li>
              </ul>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <h3 className="text-sm font-semibold text-amber-800 mb-1">Note importante</h3>
              <p className="text-xs text-amber-700">
                Chaque code ne peut être utilisé qu'une seule fois par utilisateur. 
                Les codes peuvent avoir une date d'expiration et un nombre d'utilisations limité.
              </p>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
