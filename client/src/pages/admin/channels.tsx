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
import { ArrowLeft, Plus, Edit, Trash2, CreditCard, Link2, Zap, Loader2 } from "lucide-react";
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

export default function AdminChannelsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<PaymentChannel | null>(null);

  const { data: channels, isLoading } = useQuery<PaymentChannel[]>({
    queryKey: ["/api/admin/payment-channels"],
  });

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
          <h1 className="text-xl font-bold">Canaux de paiement</h1>
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
                <p className="text-muted-foreground">Aucun canal configuré</p>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
