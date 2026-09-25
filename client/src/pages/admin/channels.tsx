import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, Edit, Trash2, CreditCard, Link2, Zap, Loader2, History, Clock, User } from "lucide-react";
import type { PaymentChannel } from "@shared/schema";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const channelSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  redirectUrl: z.string().optional(),
  isApi: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type ChannelFormData = z.infer<typeof channelSchema>;

interface ChannelAuditEntry {
  id: string;
  channelId: string;
  changedById: string;
  action: string;
  previousData: any;
  newData: any;
  changedAt: string;
  changedBy: { fullName: string; phone: string };
  channel?: { name: string; redirectUrl: string | null };
}

export default function AdminChannelsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<PaymentChannel | null>(null);
  const [viewingHistoryId, setViewingHistoryId] = useState<string | null>(null);

  const { data: channels, isLoading } = useQuery<PaymentChannel[]>({
    queryKey: ["/api/admin/payment-channels"],
  });

  const { data: channelHistory } = useQuery<ChannelAuditEntry[]>({
    queryKey: ["/api/admin/payment-channels", viewingHistoryId, "history"],
    queryFn: async () => {
      if (!viewingHistoryId) return [];
      const res = await fetch(`/api/admin/payment-channels/${viewingHistoryId}/history`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!viewingHistoryId,
  });

  const { data: allAuditHistory } = useQuery<ChannelAuditEntry[]>({
    queryKey: ["/api/admin/payment-channels-audit/all"],
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

  const getActionLabel = (action: string) => {
    switch (action) {
      case "create": return "Création";
      case "update": return "Modification";
      case "delete": return "Suppression";
      default: return action;
    }
  };

  const form = useForm<ChannelFormData>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      name: "",
      redirectUrl: "",
      isApi: false,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ChannelFormData) => {
      const res = await apiRequest("POST", "/api/admin/payment-channels", data);
      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Canal créé" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-channels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-channels"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ channelId, data }: { channelId: string; data: Partial<ChannelFormData> }) => {
      const res = await apiRequest("PATCH", `/api/admin/payment-channels/${channelId}`, data);
      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Canal mis à jour" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-channels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-channels"] });
      setEditingChannel(null);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/payment-channels/${channelId}`, {});
      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Canal supprimé" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-channels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-channels"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  if (!user?.isAdmin) {
    navigate("/");
    return null;
  }

  const onSubmit = (data: ChannelFormData) => {
    if (editingChannel) {
      updateMutation.mutate({ channelId: editingChannel.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center gap-4 p-4 bg-card border-b border-card-border">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Moyens de paiement</h1>
        </header>

        <div className="p-4 space-y-4">
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingChannel(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2" data-testid="button-add-channel">
                <Plus className="h-4 w-4" />
                Ajouter un canal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingChannel ? "Modifier le canal" : "Nouveau canal"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du canal</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: LeekPay" data-testid="input-channel-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="redirectUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL de redirection (optionnel)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://..." data-testid="input-channel-url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isApi"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel>API automatique</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Paiement 100% automatique (ex: LeekPay API)
                          </p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel>Actif</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Canal visible pour les utilisateurs
                          </p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-channel"
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 h-20" />
                </Card>
              ))}
            </div>
          ) : channels?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun moyen de paiement n’est configuré.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {channels?.map((channel) => (
                <Card key={channel.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{channel.name}</span>
                          {channel.isApi ? (
                            <Badge className="bg-purple-500 gap-1">
                              <Zap className="h-3 w-3" /> API
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Link2 className="h-3 w-3" /> Lien
                            </Badge>
                          )}
                          {channel.isActive ? (
                            <Badge className="bg-green-500">Actif</Badge>
                          ) : (
                            <Badge variant="secondary">Inactif</Badge>
                          )}
                        </div>
                        {channel.redirectUrl && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {channel.redirectUrl}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setViewingHistoryId(viewingHistoryId === channel.id ? null : channel.id)}
                          data-testid={`history-${channel.id}`}
                          className={viewingHistoryId === channel.id ? "bg-blue-100 dark:bg-blue-900/30" : ""}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setEditingChannel(channel);
                            form.reset({
                              name: channel.name,
                              redirectUrl: channel.redirectUrl || "",
                              isApi: channel.isApi,
                              isActive: channel.isActive,
                            });
                            setIsDialogOpen(true);
                          }}
                          data-testid={`edit-${channel.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => deleteMutation.mutate(channel.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`delete-${channel.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {viewingHistoryId === channel.id && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-2 mb-3">
                          <History className="h-4 w-4 text-blue-500" />
                          <span className="font-medium text-sm">Historique des modifications</span>
                        </div>
                        {channelHistory && channelHistory.length > 0 ? (
                          <div className="space-y-2">
                            {channelHistory.map((entry) => (
                              <div key={entry.id} className="p-3 bg-muted/50 rounded-lg border border-border">
                                <div className="flex items-center justify-between mb-1">
                                  <Badge 
                                    className={
                                      entry.action === "create" ? "bg-green-500" : 
                                      entry.action === "update" ? "bg-blue-500" : 
                                      "bg-red-500"
                                    }
                                  >
                                    {getActionLabel(entry.action)}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDateTime(entry.changedAt)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-sm mt-2">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">{entry.changedBy.fullName}</span>
                                  <span className="text-muted-foreground">({entry.changedBy.phone})</span>
                                </div>
                                {entry.action === "update" && entry.newData && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    {entry.newData.name && <p>Nom: {entry.newData.name}</p>}
                                    {entry.newData.redirectUrl !== undefined && <p>URL: {entry.newData.redirectUrl || "(vide)"}</p>}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Aucun historique disponible</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-red-500" />
                Journal des modifications
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Toutes les modifications effectuées sur les canaux de paiement
              </p>
            </CardHeader>
            <CardContent>
              {allAuditHistory && allAuditHistory.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {allAuditHistory.map((entry) => (
                    <div key={entry.id} className="p-4 bg-muted/50 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={
                              entry.action === "create" ? "bg-green-500" : 
                              entry.action === "update" ? "bg-blue-500" : 
                              "bg-red-500"
                            }
                          >
                            {getActionLabel(entry.action)}
                          </Badge>
                          <span className="font-medium text-sm">
                            {entry.channel?.name || "Canal supprimé"}
                          </span>
                        </div>
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

                      {entry.action === "update" && (
                        <div className="mt-2 p-2 bg-background rounded border text-xs space-y-1">
                          {entry.previousData && (
                            <div>
                              <span className="text-red-500 font-medium">Avant: </span>
                              {entry.previousData.redirectUrl !== undefined && (
                                <span className="break-all">URL: {entry.previousData.redirectUrl || "(vide)"}</span>
                              )}
                              {entry.previousData.name && <span> | Nom: {entry.previousData.name}</span>}
                            </div>
                          )}
                          {entry.newData && (
                            <div>
                              <span className="text-green-600 font-medium">Après: </span>
                              {entry.newData.redirectUrl !== undefined && (
                                <span className="break-all">URL: {entry.newData.redirectUrl || "(vide)"}</span>
                              )}
                              {entry.newData.name && <span> | Nom: {entry.newData.name}</span>}
                            </div>
                          )}
                        </div>
                      )}

                      {entry.action === "create" && entry.newData && (
                        <div className="mt-2 p-2 bg-background rounded border text-xs">
                          <span className="text-green-600 font-medium">Créé avec: </span>
                          {entry.newData.name && <span>Nom: {entry.newData.name}</span>}
                          {entry.newData.redirectUrl && <span className="break-all"> | URL: {entry.newData.redirectUrl}</span>}
                        </div>
                      )}

                      {entry.action === "delete" && entry.previousData && (
                        <div className="mt-2 p-2 bg-background rounded border text-xs">
                          <span className="text-red-500 font-medium">Supprimé: </span>
                          {entry.previousData.name && <span>Nom: {entry.previousData.name}</span>}
                          {entry.previousData.redirectUrl && <span className="break-all"> | URL: {entry.previousData.redirectUrl}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun historique de modification enregistré.
                  <br />
                  <span className="text-xs">Note: Le suivi des modifications a commencé récemment. Les modifications antérieures ne sont pas disponibles.</span>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
