import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, Plus, Gift, Trash2, Users, Calendar, 
  Hash, Coins, Loader2, Edit, Eye, Check, X 
} from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const bonusCodeSchema = z.object({
  code: z.string().min(3, "Code doit contenir au moins 3 caractères"),
  amount: z.coerce.number().min(1, "Montant doit être supérieur à 0"),
  maxUses: z.coerce.number().min(1, "Nombre d'utilisations minimum: 1"),
  expiresAt: z.string().min(1, "Date d'expiration requise"),
});

type BonusCodeFormData = z.infer<typeof bonusCodeSchema>;

interface BonusCode {
  id: string;
  code: string;
  amount: number;
  maxUses: number;
  currentUses: number;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
}

interface BonusCodeUsage {
  id: string;
  bonusCodeId: string;
  userId: string;
  usedAt: string;
  user: {
    id: string;
    fullName: string;
    phone: string;
    country: string;
  };
}

export default function AdminBonusCodesPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCodeId, setSelectedCodeId] = useState<string | null>(null);

  const { data: bonusCodes, isLoading } = useQuery<BonusCode[]>({
    queryKey: ["/api/admin/bonus-codes"],
  });

  const { data: usages } = useQuery<BonusCodeUsage[]>({
    queryKey: ["/api/admin/bonus-codes", selectedCodeId, "usages"],
    enabled: !!selectedCodeId,
  });

  const form = useForm<BonusCodeFormData>({
    resolver: zodResolver(bonusCodeSchema),
    defaultValues: {
      code: "",
      amount: 500,
      maxUses: 100,
      expiresAt: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: BonusCodeFormData) => {
      const res = await apiRequest("POST", "/api/admin/bonus-codes", data);
      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Code bonus créé avec succès" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bonus-codes"] });
      setIsCreateOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/bonus-codes/${id}`, { isActive });
      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Statut mis à jour" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bonus-codes"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/bonus-codes/${id}`);
      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Code bonus supprimé" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bonus-codes"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  if (!user?.isAdmin) {
    navigate("/");
    return null;
  }

  const onSubmit = (data: BonusCodeFormData) => {
    createMutation.mutate(data);
  };

  const getCodeStatus = (code: BonusCode) => {
    if (!code.isActive) return { label: "Désactivé", variant: "secondary" as const };
    if (new Date(code.expiresAt) < new Date()) return { label: "Expiré", variant: "destructive" as const };
    if (code.currentUses >= code.maxUses) return { label: "Épuisé", variant: "outline" as const };
    return { label: "Actif", variant: "default" as const };
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between gap-4 p-4 bg-card border-b border-card-border">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Codes bonus</h1>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" data-testid="button-create-code">
                <Plus className="h-4 w-4" />
                Nouveau code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un code bonus</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            placeholder="Ex: BONUS2024"
                            className="uppercase"
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            data-testid="input-code"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant (FCFA)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            type="number"
                            placeholder="500"
                            data-testid="input-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxUses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Utilisations max</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            type="number"
                            placeholder="100"
                            data-testid="input-max-uses"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expiresAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date d'expiration</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            type="datetime-local"
                            data-testid="input-expires-at"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-code"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Création...
                      </>
                    ) : (
                      <>
                        <Gift className="h-4 w-4 mr-2" />
                        Créer le code
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </header>

        <div className="p-4 space-y-4">
          {isLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)
          ) : bonusCodes && bonusCodes.length > 0 ? (
            bonusCodes.map((code) => {
              const status = getCodeStatus(code);
              return (
                <Card key={code.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center">
                            <Gift className="h-5 w-5 text-teal-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-lg">{code.code}</span>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </div>
                            <p className="text-2xl font-bold text-primary">
                              {code.amount.toLocaleString("fr-FR")} FCFA
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{code.currentUses}/{code.maxUses} utilisations</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Expire le {format(new Date(code.expiresAt), "dd MMM yyyy", { locale: fr })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => setSelectedCodeId(code.id)}
                              data-testid={`button-view-usages-${code.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Utilisations de {code.code}</DialogTitle>
                            </DialogHeader>
                            <div className="max-h-64 overflow-y-auto space-y-2">
                              {usages && usages.length > 0 ? (
                                usages.map((usage) => (
                                  <div key={usage.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                    <div>
                                      <p className="font-medium">{usage.user.fullName}</p>
                                      <p className="text-sm text-muted-foreground">{usage.user.phone}</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {format(new Date(usage.usedAt), "dd/MM/yyyy HH:mm", { locale: fr })}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-center text-muted-foreground py-4">
                                  Aucune utilisation
                                </p>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Switch
                          checked={code.isActive}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: code.id, isActive: checked })}
                          data-testid={`switch-toggle-${code.id}`}
                        />

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Supprimer ce code bonus ?")) {
                              deleteMutation.mutate(code.id);
                            }
                          }}
                          data-testid={`button-delete-${code.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">Aucun code bonus</p>
                <p className="text-muted-foreground mb-4">
                  Créez votre premier code bonus pour récompenser vos utilisateurs
                </p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un code
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
