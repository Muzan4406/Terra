import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Save, MessageCircle, Radio, Send, Loader2, History, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DEFAULT_BUSINESS_SETTINGS } from "@shared/schema";

const settingsSchema = z.object({
  customerService: z.string().url("URL invalide").or(z.literal("")),
  officialChannel: z.string().url("URL invalide").or(z.literal("")),
  discussionGroup: z.string().url("URL invalide").or(z.literal("")),
  telegramGroup: z.string().url("URL invalide").or(z.literal("")),
  referralLevel1Percentage: z.number().int().min(0).max(100),
  referralLevel2Percentage: z.number().int().min(0).max(100),
  referralLevel3Percentage: z.number().int().min(0).max(100),
  signupBonus: z.number().int().min(0).max(100_000_000),
  withdrawalMinimum: z.number().int().min(1).max(100_000_000),
  withdrawalFeePercentage: z.number().int().min(0).max(100),
}).refine(
  (settings) =>
    settings.referralLevel1Percentage +
      settings.referralLevel2Percentage +
      settings.referralLevel3Percentage <=
    100,
  { message: "La somme des commissions de parrainage ne peut pas dépasser 100%." },
);

type SettingsFormData = z.infer<typeof settingsSchema>;
type BusinessSettingName =
  | "referralLevel1Percentage"
  | "referralLevel2Percentage"
  | "referralLevel3Percentage"
  | "signupBonus"
  | "withdrawalMinimum"
  | "withdrawalFeePercentage";

const businessSettingFields: {
  name: BusinessSettingName;
  label: string;
  unit: "%" | "FCFA";
  min: number;
  max: number;
}[] = [
  { name: "referralLevel1Percentage", label: "Commission de niveau 1", unit: "%", min: 0, max: 100 },
  { name: "referralLevel2Percentage", label: "Commission de niveau 2", unit: "%", min: 0, max: 100 },
  { name: "referralLevel3Percentage", label: "Commission de niveau 3", unit: "%", min: 0, max: 100 },
  { name: "signupBonus", label: "Bonus d’inscription", unit: "FCFA", min: 0, max: 100_000_000 },
  { name: "withdrawalMinimum", label: "Retrait minimum", unit: "FCFA", min: 1, max: 100_000_000 },
  { name: "withdrawalFeePercentage", label: "Frais de retrait", unit: "%", min: 0, max: 100 },
];

interface PlatformSettings {
  customerService: string;
  officialChannel: string;
  discussionGroup: string;
  telegramGroup: string;
  referralLevel1Percentage: number;
  referralLevel2Percentage: number;
  referralLevel3Percentage: number;
  signupBonus: number;
  withdrawalMinimum: number;
  withdrawalFeePercentage: number;
}

interface SettingsAuditEntry {
  id: string;
  settingKey: string;
  previousValue: string | null;
  newValue: string;
  changedById: string;
  changedAt: string;
  changedBy: { fullName: string; phone: string };
}

const settingLabels: Record<string, string> = {
  customerService: "Service client",
  officialChannel: "Chaîne WhatsApp officielle",
  discussionGroup: "Ancien groupe de discussion",
  telegramGroup: "Groupe de discussion Telegram",
  referralLevel1Percentage: "Commission de niveau 1",
  referralLevel2Percentage: "Commission de niveau 2",
  referralLevel3Percentage: "Commission de niveau 3",
  signupBonus: "Bonus d’inscription",
  withdrawalMinimum: "Retrait minimum",
  withdrawalFeePercentage: "Frais de retrait",
};

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<PlatformSettings>({
    queryKey: ["/api/admin/settings"],
    enabled: !!user?.isSuperAdmin,
  });

  const { data: settingsHistory } = useQuery<SettingsAuditEntry[]>({
    queryKey: ["/api/admin/settings/history"],
    enabled: !!user?.isSuperAdmin,
  });

  const formatDateTime = (date: string | Date) => {
    return new Date(date).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      customerService: settings?.customerService || "",
      officialChannel: settings?.officialChannel || "",
      discussionGroup: settings?.discussionGroup || "",
      telegramGroup: settings?.telegramGroup || "",
      ...DEFAULT_BUSINESS_SETTINGS,
    },
    values: settings,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const res = await apiRequest("PATCH", "/api/admin/settings", data);
      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Paramètres mis à jour" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/public"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  if (!user?.isSuperAdmin) {
    navigate("/admin");
    return null;
  }

  const onSubmit = (data: SettingsFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center gap-4 p-4 bg-card border-b border-card-border">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Configuration de la plateforme</h1>
        </header>

        <div className="p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Liens de contact et d’information</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
                  ))}
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="customerService"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-primary" />
                            Service client
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="https://wa.me/..."
                              data-testid="input-customer-service"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="officialChannel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Radio className="h-4 w-4 text-primary" />
                            Chaîne WhatsApp officielle
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="https://whatsapp.com/channel/..."
                              data-testid="input-official-channel"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="telegramGroup"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Send className="h-4 w-4 text-[#229ED9]" />
                            Groupe de discussion Telegram
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="https://t.me/..."
                              data-testid="input-telegram-group"
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            Ce lien s’affiche dans la fenêtre d’accueil avec la chaîne WhatsApp.
                          </p>
                        </FormItem>
                      )}
                    />

                    <div className="border-t border-border pt-6">
                      <h3 className="text-lg font-semibold">Règles financières et parrainage</h3>
                      <p className="mt-1 mb-4 text-sm text-muted-foreground">
                        Ces valeurs s’appliquent aux nouvelles inscriptions, commissions et demandes de retrait après enregistrement.
                        Les opérations déjà enregistrées ne sont pas recalculées.
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {businessSettingFields.map((setting) => (
                          <FormField
                            key={setting.name}
                            control={form.control}
                            name={setting.name}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{setting.label}</FormLabel>
                                <div className="flex items-center gap-2">
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      min={setting.min}
                                      max={setting.max}
                                      step={1}
                                      value={field.value}
                                      onChange={(event) =>
                                        field.onChange(event.target.valueAsNumber)
                                      }
                                      data-testid={`input-setting-${setting.name}`}
                                    />
                                  </FormControl>
                                  <span className="w-12 shrink-0 text-sm text-muted-foreground">
                                    {setting.unit}
                                  </span>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        La somme des trois commissions ne peut pas dépasser 100%.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full gap-2"
                      disabled={updateMutation.isPending}
                      data-testid="button-save-settings"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Enregistrer les paramètres
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-blue-500" />
                Historique des modifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {settingsHistory && settingsHistory.length > 0 ? (
                <div className="space-y-3">
                  {settingsHistory.map((entry) => (
                    <div key={entry.id} className="p-3 bg-muted/50 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-blue-500">
                          {settingLabels[entry.settingKey] || entry.settingKey}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(entry.changedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm mb-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{entry.changedBy.fullName}</span>
                        <span className="text-muted-foreground">({entry.changedBy.phone})</span>
                      </div>
                      <div className="text-xs space-y-1">
                        {entry.previousValue && (
                          <p className="text-red-500 dark:text-red-400 truncate">
                            Ancien: {entry.previousValue}
                          </p>
                        )}
                        <p className="text-green-600 dark:text-green-400 truncate">
                          Nouveau: {entry.newValue}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune modification enregistrée pour le moment.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
