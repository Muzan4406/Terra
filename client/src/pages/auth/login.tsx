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
import { Loader2 } from "lucide-react";
import type { z } from "zod";
import heroImage from "@assets/Img_2026_01_09_18_58_01_1768036005304.jpeg";

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
      <div className="w-full">
        <img 
          src={heroImage} 
          alt="Hero" 
          className="w-full h-48 sm:h-56 md:h-64 object-cover rounded-b-[2rem]"
        />
      </div>

      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <p className="text-sm text-gray-600 mb-2">Numéro de portable</p>
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
                            <SelectContent>
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
                        placeholder="Numéro de portable"
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
                  <p className="text-sm text-gray-600 mb-2">Mot de passe</p>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Mot de passe"
                      className="h-12 border-gray-200 rounded-xl bg-white"
                      data-testid="input-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-medium text-base mt-4"
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
          <span className="text-gray-500">Se connecter Client</span>
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
