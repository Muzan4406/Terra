import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";

interface AshtechConfig {
  readiness: {
    apiKeyConfigured: boolean;
    webhookSecretConfigured: boolean;
    publicUrlConfigured: boolean;
  };
  countries: Array<{
    code: string;
    name: string;
    currency: string;
    operators: string[];
  }>;
  enabledCountryCodes: string[];
  catalogueError?: string;
}

export function AshtechCountrySettings() {
  const { toast } = useToast();
  const [enabledCountryCodes, setEnabledCountryCodes] = useState<string[]>([]);
  const { data, isLoading } = useQuery<AshtechConfig>({
    queryKey: ["/api/admin/ashtech/config"],
    queryFn: async () => {
      const response = await fetch("/api/admin/ashtech/config");
      if (!response.ok) throw new Error("Impossible de charger la configuration AshTech Pay.");
      return response.json();
    },
  });

  useEffect(() => {
    setEnabledCountryCodes(data?.enabledCountryCodes ?? []);
  }, [data?.enabledCountryCodes]);

  const ready = Boolean(
    data?.readiness.apiKeyConfigured &&
    data?.readiness.webhookSecretConfigured &&
    data?.readiness.publicUrlConfigured,
  );
  const dirty = (data?.enabledCountryCodes ?? []).slice().sort().join(",") !==
    enabledCountryCodes.slice().sort().join(",");

  const saveMutation = useMutation({
    mutationFn: async (countryCodes: string[]) => {
      const response = await apiRequest("PATCH", "/api/admin/ashtech/config", {
        enabledCountryCodes: countryCodes,
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Impossible d'enregistrer les pays.");
      }
      return response.json();
    },
    onSuccess: (result) => {
      setEnabledCountryCodes(result.enabledCountryCodes ?? []);
      toast({ title: "Pays AshTech Pay mis à jour" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ashtech/config"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const toggleCountry = (code: string, checked: boolean) => {
    setEnabledCountryCodes((current) => checked
      ? [...current, code]
      : current.filter((item) => item !== code));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paiement automatique AshTech Pay</CardTitle>
        <p className="text-sm text-muted-foreground">
          Les pays activés utilisent le paiement Mobile Money direct. Les autres conservent les liens de paiement existants.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
          ready ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-900"
        }`}>
          {ready ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> : <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />}
          <div>
            <p className="font-medium">{ready ? "Configuration prête" : "Configuration incomplète"}</p>
            <p className="mt-1">
              Clé API: {data?.readiness.apiKeyConfigured ? "configurée" : "absente"} ·
              {" "}Secret webhook: {data?.readiness.webhookSecretConfigured ? "configuré" : "absent"} ·
              {" "}URL publique HTTPS: {data?.readiness.publicUrlConfigured ? "configurée" : "absente"}
            </p>
            {!ready && (
              <p className="mt-1">
                Configurez ASHTECH_API_KEY, ASHTECH_WEBHOOK_SECRET et APP_PUBLIC_URL avant d'activer un pays.
              </p>
            )}
          </div>
        </div>

        {data?.catalogueError && (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {data.catalogueError}
          </p>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement du catalogue...
          </div>
        ) : data?.countries.length ? (
          <div className="divide-y rounded-lg border">
            {data.countries.map((country) => (
              <div key={country.code} className="flex items-center justify-between gap-4 p-3">
                <div className="min-w-0">
                  <p className="font-medium">{country.name} <span className="text-xs text-muted-foreground">({country.code})</span></p>
                  <p className="text-xs text-muted-foreground">
                    {country.currency} · {country.operators.join(", ")}
                  </p>
                </div>
                <Switch
                  checked={enabledCountryCodes.includes(country.code)}
                  onCheckedChange={(checked) => toggleCountry(country.code, checked)}
                  disabled={
                    saveMutation.isPending ||
                    (!ready && !enabledCountryCodes.includes(country.code))
                  }
                  aria-label={`Activer AshTech Pay pour ${country.name}`}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {data?.readiness.apiKeyConfigured
              ? "Aucun pays éligible n'est disponible dans le catalogue AshTech Pay."
              : "Le catalogue apparaîtra après configuration de la clé API."}
          </p>
        )}

        <Button
          onClick={() => saveMutation.mutate(enabledCountryCodes)}
          disabled={
            !dirty ||
            saveMutation.isPending ||
            (!ready && enabledCountryCodes.length > 0)
          }
          className="w-full"
        >
          {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enregistrer les pays
        </Button>
        {!ready && (data?.enabledCountryCodes.length ?? 0) > 0 && (
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate([])}
            disabled={saveMutation.isPending}
            className="w-full"
          >
            Désactiver AshTech Pay pour tous les pays
          </Button>
        )}
      </CardContent>
    </Card>
  );
}