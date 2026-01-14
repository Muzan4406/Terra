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
import { ArrowLeft, Save, MessageCircle, Send, Users, Loader2, History, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const settingsSchema = z.object({
  customerService: z.string().url("URL invalide").or(z.literal("")),
  officialChannel: z.string().url("URL invalide").or(z.literal("")),
  discussionGroup: z.string().url("URL invalide").or(z.literal("")),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface PlatformSettings {
  customerService: string;
  officialChannel: string;
  discussionGroup: string;
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
  officialChannel: "Chaîne officielle",
  discussionGroup: "Groupe de discussion",
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
          <h1 className="text-xl font-bold">Paramètres</h1>
        </header>

        <div className="p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Liens Telegram</CardTitle>
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
                              placeholder="https://t.me/..." 
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
                            <Send className="h-4 w-4 text-primary" />
                            Chaîne officielle
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="https://t.me/..." 
                              data-testid="input-official-channel"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="discussionGroup"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            Groupe de discussion
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="https://t.me/..." 
                              data-testid="input-discussion-group"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                  Aucun historique disponible
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
