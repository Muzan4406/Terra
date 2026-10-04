import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { loginSchema, ELIGIBLE_COUNTRIES } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LockKeyhole, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { CountryFlagIcon } from "@/components/beko-icons";
import { AuthFieldIcon } from "@/components/auth-field-icon";
import type { z } from "zod";

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "",
      country: "CI",
      password: "",
    },
  });

  const selectedCountry = ELIGIBLE_COUNTRIES.find(c => c.code === form.watch("country"));

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.phone, data.country, data.password);
      toast({ title: "Connexion réussie", description: "Bienvenue!" });
      navigate("/");
    } catch (error) {
      toast({
        title: "Erreur de connexion",
        description: error instanceof Error ? error.message : "Vérifiez vos informations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-6 pt-6 pb-2 max-w-md mx-auto w-full text-center">
        <BrandLogo className="mx-auto mb-2 h-28 w-28 object-contain" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Connexion</h1>
        <p className="mt-2 text-sm text-gray-500">Accédez à votre espace personnel</p>
      </div>

      <div className="auth-form-panel px-6 py-8 max-w-md mx-auto w-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <p className="text-sm text-gray-600 mb-2">Numéro de téléphone</p>
                  <FormControl>
                    <div className="flex min-w-0 items-center gap-1.5 rounded-2xl border border-[#dce8db] bg-[#f3f8f2] p-1.5 transition-colors focus-within:border-[#a8c9ad] focus-within:ring-2 focus-within:ring-[#dcebdd]">
                      <AuthFieldIcon icon={UserRound} />
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field: countryField }) => (
                          <Select value={countryField.value} onValueChange={countryField.onChange}>
                            <SelectTrigger className="h-11 w-24 shrink-0 rounded-lg border-0 border-r border-[#dce8db] bg-transparent px-1.5 focus:ring-0">
                              <SelectValue>
                                {selectedCountry ? (
                                  <span className="flex items-center gap-1.5">
                                    <CountryFlagIcon code={selectedCountry.code} className="h-5 w-5" />
                                    <span>+{selectedCountry.dialCode}</span>
                                  </span>
                                ) : "+225"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="country-select-content">
                              {ELIGIBLE_COUNTRIES.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  <span className="flex items-center gap-2">
                                    <CountryFlagIcon code={country.code} />
                                    <span>{country.name}</span>
                                    <span className="ml-auto text-muted-foreground">+{country.dialCode}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          autoComplete="tel"
                          placeholder="Votre numéro de téléphone"
                          className="h-11 min-w-0 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                          data-testid="input-phone"
                        />
                      </FormControl>
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
                  <p className="text-sm text-gray-600 mb-2">Mot de passe du compte</p>
                  <FormControl>
                    <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-[#dce8db] bg-[#f3f8f2] p-1.5 transition-colors focus-within:border-[#a8c9ad] focus-within:ring-2 focus-within:ring-[#dcebdd]">
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          autoComplete="current-password"
                          placeholder="Saisissez votre mot de passe"
                          className="h-11 min-w-0 flex-1 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
                          data-testid="input-password"
                        />
                      </FormControl>
                      <AuthFieldIcon icon={LockKeyhole} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base mt-4 shadow-md"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>
        </Form>

        <div className="flex justify-between mt-8 text-sm">
          <span className="text-gray-500">Nouveau ici ?</span>
          <Link href="/register">
            <span className="text-gray-700 font-medium cursor-pointer" data-testid="link-register">
              S'inscrire
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
