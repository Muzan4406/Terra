import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BottomNav } from "@/components/bottom-nav";

const exchangeCodeSchema = z.object({
  code: z.string().min(1, "Veuillez saisir le code cadeau"),
});

type ExchangeCodeForm = z.infer<typeof exchangeCodeSchema>;

interface PlatformSettings {
  customerService: string;
  officialChannel: string;
  discussionGroup: string;
}

export default function ExchangeCodePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [successAmount, setSuccessAmount] = useState<number | null>(null);

  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["/api/settings/public"],
  });

  const form = useForm<ExchangeCodeForm>({
    resolver: zodResolver(exchangeCodeSchema),
    defaultValues: {
      code: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ExchangeCodeForm) => {
      const response = await apiRequest("POST", "/api/bonus-codes/exchange", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de l'échange du code");
      }
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 border-b bg-white">
          <button 
            onClick={() => navigate("/account")}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            data-testid="button-back"
          >
            <ChevronLeft className="w-7 h-7 text-gray-800" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Utiliser un code bonus</h1>
        </div>

        {/* Form Container */}
        <div className="flex-1 px-4 py-6 relative z-10 pb-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              Saisissez le code bonus qui vous a été communiqué. Les conditions associées s’appliquent.
            </p>

            <a
              href={settings?.officialChannel || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-8 group active:bg-gray-100 transition-colors"
              aria-disabled={!settings?.officialChannel}
              onClick={(event) => {
                if (!settings?.officialChannel) event.preventDefault();
              }}
              data-testid="link-whatsapp-group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center shadow-md">
                  <SiWhatsapp className="w-6 h-6 text-white" />
                </div>
                <span className="text-gray-900 font-bold text-lg">
                          {settings?.officialChannel ? "Informations officielles" : "Lien officiel non configuré"}
                </span>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-gray-400" />
            </a>

            <div className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <label className="text-gray-900 font-bold text-lg flex items-center gap-1">
                          <span className="text-red-500">*</span> Code bonus
                        </label>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="Saisissez votre code"
                              className="h-12 bg-transparent border-0 border-b-2 border-gray-100 rounded-none px-0 text-lg placeholder:text-gray-300 focus-visible:ring-0 focus-visible:border-blue-500 transition-all"
                              {...field}
                              data-testid="input-bonus-code"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {successAmount && (
                    <div className="p-3 bg-green-50 text-green-700 rounded-lg text-center font-bold animate-in fade-in zoom-in">
                      Bonus reçu : +{successAmount.toLocaleString("fr-FR")} FCFA
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-14 bg-[#0088FF] hover:bg-[#0077EE] active:bg-[#0066DD] text-white text-xl font-bold rounded-full shadow-lg transition-all"
                    disabled={mutation.isPending}
                    data-testid="button-exchange-code"
                  >
                    {mutation.isPending ? "Vérification..." : "Confirmer"}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
