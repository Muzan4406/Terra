import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Edit, Loader2, Package, AlertTriangle, Archive, RotateCcw, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type Product,
  type ProductCategory,
} from "@shared/schema";
import { getProductImageMap } from "@shared/product-images";

const productFormSchema = z.object({
  name: z.string().trim().min(1, "Le nom du produit est requis"),
  price: z.number().int().positive("Le prix doit être supérieur à zéro"),
  dailyReturn: z.number().int().positive("Le rendement doit être supérieur à zéro"),
  duration: z.number().int().positive("La durée doit être supérieure à zéro"),
  totalReturn: z.number().int().positive("Le rendement total doit être supérieur à zéro"),
  category: z.enum(PRODUCT_CATEGORIES),
  isActive: z.boolean(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

function NumberField({
  name,
  label,
  control,
}: {
  name: "price" | "dailyReturn" | "duration" | "totalReturn";
  label: string;
  control: ReturnType<typeof useForm<ProductFormData>>["control"];
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={1}
              step={1}
              value={Number.isFinite(field.value) ? field.value : ""}
              onChange={(event) => field.onChange(event.currentTarget.value === "" ? undefined : event.currentTarget.valueAsNumber)}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
              data-testid={`input-product-${name}`}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default function AdminProductsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
  });

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      category: "wellness",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await apiRequest("POST", "/api/admin/products", data);
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "La création du produit a échoué");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Produit créé" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/all"] });
      setDialogOpen(false);
      setEditingProduct(null);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ productId, data }: { productId: string; data: ProductFormData }) => {
      const response = await apiRequest("PATCH", `/api/admin/products/${productId}`, data);
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "La mise à jour du produit a échoué");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Produit mis à jour" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/products"] });
      setDialogOpen(false);
      setEditingProduct(null);
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ productId, isActive }: { productId: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/products/${productId}`, { isActive });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Le statut du produit n’a pas pu être modifié");
      }
      return response.json();
    },
    onSuccess: (_product, variables) => {
      toast({ title: variables.isActive ? "Produit réactivé" : "Produit retiré du catalogue" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/all"] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const productImageMap = getProductImageMap(products ?? []);

  if (!user?.isAdmin) {
    navigate("/");
    return null;
  }

  const openEditor = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      price: product.price,
      dailyReturn: product.dailyReturn,
      duration: product.duration,
      totalReturn: product.totalReturn,
      category: product.category as ProductCategory,
      isActive: product.isActive,
    });
    setDialogOpen(true);
  };

  const openCreateForm = () => {
    setEditingProduct(null);
    form.reset({
      name: "",
      category: "wellness",
      isActive: true,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: ProductFormData) => {
    if (editingProduct) {
      updateMutation.mutate({ productId: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center gap-2 p-4 bg-card border-b border-card-border">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="flex-1 text-lg font-bold sm:text-xl">Catalogue des produits</h1>
          <Button onClick={openCreateForm} data-testid="button-create-product">
            <Plus className="mr-1 h-4 w-4" />
            Ajouter
          </Button>
        </header>

        <div className="p-4 space-y-4">
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="flex items-start gap-3 p-4 text-sm">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <p>
                Les modifications du rendement quotidien et de la durée s’appliquent immédiatement aux
                investissements actifs. Le nouveau prix ne change pas les achats déjà payés.
              </p>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => <Card key={item} className="h-24 animate-pulse" />)}
            </div>
          ) : products?.length ? (
            <div className="space-y-3">
              {products.map((product) => {
                const imageUrl = productImageMap.get(product.id);
                return (
                <Card key={product.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white">
                      {imageUrl ? (
                        <img src={imageUrl} alt={product.name} className="h-full w-full object-contain" loading="lazy" />
                      ) : (
                        <Package className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{product.name}</span>
                        <Badge variant="outline">Niveau {product.level}</Badge>
                        <Badge variant="secondary">
                          {PRODUCT_CATEGORY_LABELS[product.category as ProductCategory]}
                        </Badge>
                        <Badge className={product.isActive ? "bg-green-600" : ""} variant={product.isActive ? "default" : "secondary"}>
                          {product.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Achat {product.price.toLocaleString("fr-FR")} FCFA · Gain quotidien {product.dailyReturn.toLocaleString("fr-FR")} FCFA
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {product.duration} jours · Total annoncé {product.totalReturn.toLocaleString("fr-FR")} FCFA
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ productId: product.id, isActive: !product.isActive })}
                        aria-label={product.isActive ? `Retirer ${product.name} du catalogue` : `Réactiver ${product.name}`}
                      >
                        {product.isActive ? <Archive className="mr-1 h-4 w-4" /> : <RotateCcw className="mr-1 h-4 w-4" />}
                        {product.isActive ? "Retirer" : "Réactiver"}
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => openEditor(product)} aria-label={`Modifier ${product.name}`} data-testid={`edit-product-${product.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-8 text-center text-muted-foreground">
                <Package className="h-10 w-10" />
                Aucun produit trouvé.
              </CardContent>
            </Card>
          )}
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingProduct(null);
          }}
        >
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? `Modifier ${editingProduct.name}` : "Créer un produit"}</DialogTitle>
            </DialogHeader>
            {!editingProduct && (
              <p className="text-sm text-muted-foreground">
                La prochaine photo disponible de la catégorie sera attribuée automatiquement.
              </p>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du produit</FormLabel>
                      <FormControl><Input {...field} data-testid="input-product-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <NumberField name="price" label="Prix (FCFA)" control={form.control} />
                  <NumberField name="dailyReturn" label="Gain quotidien (FCFA)" control={form.control} />
                  <NumberField name="duration" label="Durée (jours)" control={form.control} />
                  <NumberField name="totalReturn" label="Total annoncé (FCFA)" control={form.control} />
                </div>
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={field.value}
                          onChange={field.onChange}
                          data-testid="select-product-category"
                        >
                          {PRODUCT_CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                              {PRODUCT_CATEGORY_LABELS[category]}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Produit actif</FormLabel>
                        <p className="text-xs text-muted-foreground">Un produit inactif ne peut plus être acheté.</p>
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
                  disabled={updateMutation.isPending || createMutation.isPending}
                  data-testid="button-save-product"
                >
                  {updateMutation.isPending || createMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement…</>
                  ) : editingProduct ? "Enregistrer les modifications" : "Créer le produit"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}