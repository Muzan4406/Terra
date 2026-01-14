import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MoneyDisplay } from "@/components/money-display";
import { getCountryFlag } from "@/components/country-select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, Search, Edit, Ban, Users, ShoppingBag, Lock, 
  Unlock, Award, Key, Wallet, Loader2, ChevronRight, Trash2, Crown,
  TrendingUp, ArrowDownCircle, UserCheck, CreditCard
} from "lucide-react";
import type { User, Product } from "@shared/schema";

interface UserProductItem {
  id: string;
  productId: string;
  cyclesCompleted: number;
  isActive: boolean;
  product: {
    id: string;
    name: string;
    level: number;
    price: number;
  };
}

interface UserWithDetails extends User {
  referralCount: number;
  productCount: number;
  totalInvestment: number;
  withdrawalCount: number;
  referrerName: string | null;
  referrerPhone: string | null;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "banned" | "blocked" | "promoter" | "admin">("all");
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [editBalance, setEditBalance] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [managingUserId, setManagingUserId] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery<UserWithDetails[]>({
    queryKey: [`/api/admin/users?filter=${filter}`],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products/all"],
  });

  const { data: userProducts, refetch: refetchUserProducts } = useQuery<UserProductItem[]>({
    queryKey: ["/api/admin/users", managingUserId, "products"],
    queryFn: async () => {
      if (!managingUserId) return [];
      const res = await fetch(`/api/admin/users/${managingUserId}/products`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!managingUserId,
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}`, updates);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Utilisateur mis à jour" });
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/admin/users')
      });
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const removeProductMutation = useMutation({
    mutationFn: async ({ userProductId }: { userProductId: string }) => {
      const res = await apiRequest("DELETE", `/api/admin/user-products/${userProductId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Produit révoqué avec succès" });
      refetchUserProducts();
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/admin/users')
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const assignProductMutation = useMutation({
    mutationFn: async ({ userId, productId, action }: { userId: string; productId: string; action: "assign" | "remove" }) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/products`, { productId, action });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({ title: variables.action === "assign" ? "Produit attribué" : "Produit retiré" });
      refetchUserProducts();
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/admin/users')
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  if (!user?.isAdmin) {
    navigate("/");
    return null;
  }

  const filteredUsers = users?.filter((u) => {
    if (searchTerm) {
      return u.phone.includes(searchTerm) || 
             u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             u.referralCode.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center gap-4 p-4 bg-card border-b border-card-border">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Gestion des utilisateurs</h1>
        </header>

        <div className="p-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (téléphone, nom, code)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {(["all", "banned", "blocked", "promoter", "admin"] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f === "all" && "Tous"}
                  {f === "banned" && "Bannis"}
                  {f === "blocked" && "Retrait bloqué"}
                  {f === "promoter" && "Promoteurs"}
                  {f === "admin" && "Admins"}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : filteredUsers?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredUsers?.map((u) => (
                <Card key={u.id} className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{u.fullName}</span>
                          {u.isBanned && <Badge variant="destructive">Banni</Badge>}
                          {u.withdrawalBlocked && <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" />Retrait</Badge>}
                          {u.isPromoter && <Badge className="bg-amber-500">Promoteur</Badge>}
                          {u.isSuperAdmin && <Badge className="bg-purple-600"><Crown className="h-3 w-3 mr-1" />Super Admin</Badge>}
                          {u.isAdmin && !u.isSuperAdmin && <Badge>Admin</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getCountryFlag(u.country)} {u.phone}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Wallet className="h-3 w-3" />
                            <MoneyDisplay amount={u.balance} />
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-green-600" />
                            Invest: <MoneyDisplay amount={u.totalInvestment} />
                          </span>
                          <span className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3 text-blue-600" />
                            Dépôts: <MoneyDisplay amount={u.totalDeposits} />
                          </span>
                          <span className="flex items-center gap-1">
                            <ArrowDownCircle className="h-3 w-3 text-orange-600" />
                            {u.withdrawalCount} retraits
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {u.referralCount} filleuls
                          </span>
                          <span className="flex items-center gap-1">
                            <ShoppingBag className="h-3 w-3" />
                            {u.productCount} produits
                          </span>
                          {u.referrerName && (
                            <span className="flex items-center gap-1">
                              <UserCheck className="h-3 w-3 text-purple-600" />
                              Parrain: {u.referrerName} ({u.referrerPhone})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Code: {u.referralCode} | Inscrit: {formatDate(u.createdAt)}
                        </p>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1"
                            onClick={() => {
                              setSelectedUser(u);
                              setEditBalance(u.balance.toString());
                              setManagingUserId(u.id);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            Gérer
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Gérer {u.fullName}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Modifier le solde</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  value={editBalance}
                                  onChange={(e) => setEditBalance(e.target.value)}
                                  data-testid="input-balance"
                                />
                                <Button
                                  onClick={() => updateUserMutation.mutate({
                                    userId: u.id,
                                    updates: { balance: parseInt(editBalance) }
                                  })}
                                  disabled={updateUserMutation.isPending}
                                >
                                  <Wallet className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Réinitialiser le mot de passe</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="password"
                                  placeholder="Nouveau mot de passe"
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  data-testid="input-password"
                                />
                                <Button
                                  onClick={() => {
                                    updateUserMutation.mutate({
                                      userId: u.id,
                                      updates: { password: newPassword }
                                    });
                                    setNewPassword("");
                                  }}
                                  disabled={updateUserMutation.isPending || !newPassword}
                                >
                                  <Key className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Attribuer un produit</Label>
                              <div className="flex gap-2">
                                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choisir un produit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products?.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  onClick={() => {
                                    assignProductMutation.mutate({
                                      userId: u.id,
                                      productId: selectedProductId,
                                      action: "assign"
                                    });
                                    setSelectedProductId("");
                                  }}
                                  disabled={assignProductMutation.isPending || !selectedProductId}
                                >
                                  <ShoppingBag className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {userProducts && userProducts.length > 0 && (
                              <div className="space-y-2">
                                <Label>Produits de l'utilisateur ({userProducts.length})</Label>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {userProducts.map((up) => (
                                    <div key={up.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <Crown className="h-4 w-4 text-yellow-500" />
                                        <div>
                                          <p className="text-sm font-medium">{up.product.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {up.cyclesCompleted}/100 jours • {up.isActive ? "Actif" : "Terminé"}
                                          </p>
                                        </div>
                                      </div>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => removeProductMutation.mutate({ userProductId: up.id })}
                                        disabled={removeProductMutation.isPending}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center justify-between">
                                <Label>Banni</Label>
                                <Switch
                                  checked={u.isBanned}
                                  onCheckedChange={(checked) => updateUserMutation.mutate({
                                    userId: u.id,
                                    updates: { isBanned: checked }
                                  })}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label>Retrait bloqué</Label>
                                <Switch
                                  checked={u.withdrawalBlocked}
                                  onCheckedChange={(checked) => updateUserMutation.mutate({
                                    userId: u.id,
                                    updates: { withdrawalBlocked: checked }
                                  })}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label>Promoteur</Label>
                                <Switch
                                  checked={u.isPromoter}
                                  onCheckedChange={(checked) => updateUserMutation.mutate({
                                    userId: u.id,
                                    updates: { isPromoter: checked }
                                  })}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label>Admin</Label>
                                <Switch
                                  checked={u.isAdmin}
                                  onCheckedChange={(checked) => updateUserMutation.mutate({
                                    userId: u.id,
                                    updates: { isAdmin: checked }
                                  })}
                                />
                              </div>
                              <div className="flex items-center justify-between col-span-2">
                                <Label>Requiert filleul investisseur</Label>
                                <Switch
                                  checked={u.requiresInvestorReferral}
                                  onCheckedChange={(checked) => updateUserMutation.mutate({
                                    userId: u.id,
                                    updates: { requiresInvestorReferral: checked }
                                  })}
                                />
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => navigate(`/admin/users/${u.id}/team`)}
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Voir l'équipe (Niveaux 1-3)
                              <ChevronRight className="h-4 w-4 ml-auto" />
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
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
