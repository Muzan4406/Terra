import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  registerSchema,
  ELIGIBLE_COUNTRIES,
  DEFAULT_BUSINESS_SETTINGS,
} from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { z } from "zod";
import { solarImages } from "@/lib/solar-images";
import { BrandLogo } from "@/components/brand-logo";

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register } = useAuth();
  const { data: businessSettings } = useQuery<{ signupBonus: number }>({
    queryKey: ["/api/settings/public"],
  });
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const signupBonus =
    businessSettings?.signupBonus ?? DEFAULT_BUSINESS_SETTINGS.signupBonus;

  const params = new URLSearchParams(search);
  const inviteCode = params.get("reg") || "";

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      country: "CI",
      password: "",
      invitationCode: inviteCode,
    },
  });

  const selectedCountry = ELIGIBLE_COUNTRIES.find(c => c.code === form.watch("country"));

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await register(data);
      toast({ 
        title: "Inscription réussie!", 
        description: `Bonus de ${signupBonus.toLocaleString("fr-FR")} FCFA crédité sur votre compte!`
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Erreur d'inscription",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="auth-hero-image h-40 w-full overflow-hidden sm:h-48 md:h-56">
        <img
          src={solarImages[1].src}
          alt={solarImages[1].alt}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="px-6 pt-8 pb-2 max-w-md mx-auto w-full text-center">
        <h1 className="flex justify-center">
          <BrandLogo className="h-10 w-auto" />
        </h1>
        <p className="mt-2 text-sm text-gray-500">Quelques informations pour ouvrir votre espace</p>
      </div>

      <div className="auth-form-panel px-6 py-6 max-w-md mx-auto w-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <p className="text-sm text-gray-600 mb-2">Nom complet</p>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Votre nom complet"
                      autoComplete="name"
                      className="h-12 border-gray-200 rounded-xl bg-white"
                      data-testid="input-fullname"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <p className="text-sm text-gray-600 mb-2">Numéro de téléphone</p>
                  <FormControl>
                    <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white">
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field: countryField }) => (
                          <Select value={countryField.value} onValueChange={countryField.onChange}>
                            <SelectTrigger className="w-24 border-0 border-r border-gray-200 rounded-none bg-transparent focus:ring-0 h-12">
                              <SelectValue>
                                {selectedCountry ? `+${selectedCountry.dialCode}` : "+225"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="country-select-content">
                              {ELIGIBLE_COUNTRIES.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  +{country.dialCode}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <Input
                        {...field}
                        type="tel"
                        autoComplete="tel"
                        placeholder="Votre numéro de téléphone"
                        className="flex-1 border-0 h-12 focus-visible:ring-0 bg-transparent"
                        data-testid="input-phone"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <p className="text-sm text-gray-600 mb-2">Choisissez un mot de passe</p>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      autoComplete="new-password"
                      placeholder="6 caractères minimum"
                      className="h-12 border-gray-200 rounded-xl bg-white"
                      data-testid="input-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="invitationCode"
              render={({ field }) => (
                <FormItem>
                  <p className="text-sm text-gray-600 mb-2">Code d'invitation (optionnel)</p>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Code de parrainage"
                      className="h-12 border-gray-200 rounded-xl bg-white"
                      data-testid="input-invitation"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base mt-2 shadow-md"
              disabled={isLoading}
              data-testid="button-register"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inscription...
                </>
              ) : (
                "S'inscrire"
              )}
            </Button>
          </form>
        </Form>

        <div className="flex justify-between mt-6 text-sm">
          <Link href="/login">
            <span className="text-gray-700 font-medium cursor-pointer" data-testid="link-login">
              Se connecter
            </span>
          </Link>
          <span className="text-gray-500">Déjà un compte ?</span>
        </div>
      </div>
    </div>
  );
}
