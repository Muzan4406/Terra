import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
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
import "./beko-pages.css";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z.string().min(6, "Le nouveau mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string().min(1, "Confirmation requise"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ChangePasswordForm) => {
      const response = await apiRequest("POST", "/api/auth/change-password", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la modification du mot de passe");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Succès",
        description: "Votre mot de passe a été modifié avec succès.",
      });
      navigate("/account");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: ChangePasswordForm) => {
    mutation.mutate(data);
  };

  return (
    <div className="beko-page beko-page--change-password">
      <div className="beko-shell">
        <header className="beko-topbar">
          <button
            type="button"
            onClick={() => navigate("/account")}
            className="beko-back"
            aria-label="Retour au compte"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="beko-brand">BEKO</span>
          <h1>Sécurité du compte</h1>
          <span className="beko-balance-mark" aria-hidden="true">
            <LockKeyhole className="h-5 w-5" />
          </span>
        </header>

        <main>
          <section className="beko-hero beko-fade-in">
            <p className="beko-eyebrow">Protection du compte</p>
            <h2>Modifiez votre mot de passe.</h2>
            <p>Confirmez votre mot de passe actuel, puis choisissez un nouveau mot de passe sécurisé.</p>
          </section>

          <div className="beko-content">
            <section className="beko-panel p-4 sm:p-5">

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-[#14392f]">Mot de passe actuel</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="Entrez votre mot de passe actuel"
                          autoComplete="current-password"
                          className="beko-input pr-12"
                          {...field}
                          data-testid="input-current-password"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#668078] transition-colors hover:bg-[#eaf3e6] hover:text-[#14392f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087c59]"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          aria-label={showCurrentPassword ? "Masquer le mot de passe actuel" : "Afficher le mot de passe actuel"}
                          aria-pressed={showCurrentPassword}
                          data-testid="button-toggle-current-password"
                        >
                          {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-[#14392f]">Nouveau mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Entrez votre nouveau mot de passe"
                          autoComplete="new-password"
                          className="beko-input pr-12"
                          {...field}
                          data-testid="input-new-password"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#668078] transition-colors hover:bg-[#eaf3e6] hover:text-[#14392f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087c59]"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          aria-label={showNewPassword ? "Masquer le nouveau mot de passe" : "Afficher le nouveau mot de passe"}
                          aria-pressed={showNewPassword}
                          data-testid="button-toggle-new-password"
                        >
                          {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-[#14392f]">Confirmer le nouveau mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirmez votre nouveau mot de passe"
                          autoComplete="new-password"
                          className="beko-input pr-12"
                          {...field}
                          data-testid="input-confirm-password"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#668078] transition-colors hover:bg-[#eaf3e6] hover:text-[#14392f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087c59]"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? "Masquer la confirmation" : "Afficher la confirmation"}
                          aria-pressed={showConfirmPassword}
                          data-testid="button-toggle-confirm-password"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="beko-primary-button"
                disabled={mutation.isPending}
                data-testid="button-submit-password"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Modification en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Enregistrer le nouveau mot de passe
                  </>
                )}
              </Button>
            </form>
          </Form>

            </section>

            <section className="beko-notice flex items-start gap-3" aria-label="Conseils de sécurité">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#087653]" aria-hidden="true" />
              <div>
                <h2 className="m-0 text-sm font-bold text-[#14392f]">Quelques repères de sécurité</h2>
                <ul className="mt-2 space-y-1 pl-4 text-xs text-[#527268]">
                  <li>Utilisez au moins 6 caractères.</li>
                  <li>Combinez lettres, chiffres et symboles.</li>
                  <li>N’utilisez pas d’informations personnelles.</li>
                  <li>Ne partagez jamais votre mot de passe.</li>
                </ul>
              </div>
            </section>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
