import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  Package,
  PackageCheck,
  TrendingUp,
} from "lucide-react";
import { Link } from "wouter";
import "./beko-pages.css";

interface UserProduct {
  id: string;
  productId: string;
  purchasedAt: string;
  pendingReturns: number;
  cyclesCompleted: number;
  isActive: boolean;
  assignedByAdmin: boolean;
  product: {
    id: string;
    name: string;
    level: number;
    price: number;
    dailyReturn: number;
    totalReturn: number;
    duration: number;
  };
}

const formatMoney = (amount: number) =>
  Number(amount || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

function formatDate(value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date indisponible"
    : date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
}

function getCycleEndDate(purchasedAt: string, durationDays: number) {
  const purchaseDate = new Date(purchasedAt);
  if (Number.isNaN(purchaseDate.getTime())) return "Date indisponible";
  const cycleEnd = new Date(purchaseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
  return formatDate(cycleEnd);
}

export default function MyProductsPage() {
  const { user } = useAuth();
  const {
    data: products,
    isLoading,
    isError,
    refetch,
  } = useQuery<UserProduct[]>({
    queryKey: ["/api/user/products"],
    enabled: Boolean(user),
  });

  const activeProducts = products?.filter((product) => product.isActive) ?? [];
  const completedProducts = products?.filter((product) => !product.isActive) ?? [];

  if (!user) return null;

  return (
    <div className="beko-page beko-page--my-products">
      <div className="beko-shell">
        <header className="beko-topbar">
          <Link href="/account" className="beko-back" aria-label="Retour au compte" data-testid="button-back">
            <ArrowLeft size={19} />
          </Link>
          <h1>Mes investissements</h1>
          <span className="beko-brand">BEKO</span>
        </header>

        <main>
          <section className="beko-hero">
            <p className="beko-eyebrow">Votre portefeuille Beko</p>
            <h2>Suivez vos produits.</h2>
            <p>Consultez vos produits et leurs gains bloqués. Les gains sont crédités au solde de retrait uniquement à la fin du cycle défini par l’administration.</p>
          </section>

          <div className="beko-content">
            {isLoading ? (
              <div className="grid gap-3" role="status" aria-label="Chargement des investissements">
                <Skeleton className="h-12 w-full rounded-2xl bg-emerald-100" />
                <Skeleton className="h-64 w-full rounded-3xl bg-emerald-100" />
                <Skeleton className="h-64 w-full rounded-3xl bg-emerald-100" />
              </div>
            ) : isError ? (
              <div className="beko-alert is-danger" role="alert">
                <strong>Investissements indisponibles</strong>
                Impossible de charger vos produits pour le moment.
                <button type="button" className="beko-inline-link mt-2 block" onClick={() => void refetch()}>
                  Réessayer
                </button>
              </div>
            ) : products?.length ? (
              <>
                {activeProducts.length > 0 && (
                  <section className="grid gap-3" aria-label="Produits actifs">
                    <div className="beko-section-heading">
                      <h2>En cours</h2>
                      <span>{activeProducts.length} produit{activeProducts.length === 1 ? "" : "s"}</span>
                    </div>
                    {activeProducts.map((investment) => {
                      const duration = Math.max(1, Number(investment.product.duration) || 1);
                      const cyclesCompleted = Math.min(
                        duration,
                        Math.max(0, Number(investment.cyclesCompleted) || 0),
                      );
                      const daysRemaining = Math.max(0, duration - cyclesCompleted);

                      return (
                        <article
                          key={investment.id}
                          className="beko-panel beko-product-card"
                          data-testid={`card-product-${investment.id}`}
                        >
                          <div className="beko-product-card-head">
                            <span className="beko-action-icon h-11 w-11"><Package size={20} /></span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="m-0 truncate text-base font-extrabold">{investment.product.name}</h3>
                                <span className="beko-product-status"><TrendingUp size={12} /> Actif</span>
                              </div>
                              <p className="mt-1 text-xs text-[#668078]">Produit niveau {investment.product.level}</p>
                            </div>
                          </div>

                          <div className="beko-product-days">
                            <div>
                              <span>Jours restants</span>
                              <strong data-testid="text-days-remaining">{daysRemaining}</strong>
                            </div>
                            <span className="beko-product-days-icon"><Clock3 size={22} /></span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="beko-product-stat">
                              <span>Montant investi</span>
                              <strong>{formatMoney(investment.product.price)} FCFA</strong>
                            </div>
                            <div className="beko-product-stat">
                              <span>Gain quotidien bloqué</span>
                              <strong>+{formatMoney(investment.product.dailyReturn)} FCFA</strong>
                            </div>
                            <div className="beko-product-stat">
                              <span>Gains bloqués</span>
                              <strong data-testid="text-cumulative-revenue">{formatMoney(investment.pendingReturns)} FCFA</strong>
                            </div>
                            <div className="beko-product-stat">
                              <span>Total à maturité</span>
                              <strong>{formatMoney(investment.product.totalReturn)} FCFA</strong>
                            </div>
                          </div>

                          <div className="beko-product-lock-note">
                            <LockKeyhole size={18} aria-hidden="true" />
                            <span>
                              Les gains restent bloqués. À la fin du cycle de {duration} jours défini par l’administration, le montant cumulé sera crédité uniquement au solde de retrait.
                            </span>
                          </div>

                          <div className="beko-product-dates">
                            <span><CalendarDays size={14} /> Acheté le {formatDate(investment.purchasedAt)}</span>
                            <span><Clock3 size={14} /> Fin du cycle prévue : {getCycleEndDate(investment.purchasedAt, duration)}</span>
                          </div>
                          {investment.assignedByAdmin && (
                            <span className="beko-product-admin-note">Produit attribué par l’administration</span>
                          )}
                        </article>
                      );
                    })}
                  </section>
                )}

                {completedProducts.length > 0 && (
                  <section className="grid gap-3" aria-label="Produits terminés">
                    <div className="beko-section-heading">
                      <h2>Terminés</h2>
                      <span>{completedProducts.length} produit{completedProducts.length === 1 ? "" : "s"}</span>
                    </div>
                    {completedProducts.map((investment) => (
                      <article
                        key={investment.id}
                        className="beko-panel beko-product-card is-completed"
                        data-testid={`card-product-completed-${investment.id}`}
                      >
                        <div className="beko-product-card-head">
                          <span className="beko-action-icon h-11 w-11"><PackageCheck size={20} /></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="m-0 truncate text-base font-extrabold">{investment.product.name}</h3>
                              <span className="beko-product-status is-completed"><CheckCircle2 size={12} /> Terminé</span>
                            </div>
                            <p className="mt-1 text-xs text-[#668078]">Produit niveau {investment.product.level}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="beko-product-stat">
                            <span>Montant investi</span>
                            <strong>{formatMoney(investment.product.price)} FCFA</strong>
                          </div>
                          <div className="beko-product-stat">
                            <span>Gain total prévu</span>
                            <strong>{formatMoney(investment.product.totalReturn)} FCFA</strong>
                          </div>
                        </div>
                        <div className="beko-product-dates">
                          <span><CalendarDays size={14} /> Acheté le {formatDate(investment.purchasedAt)}</span>
                          <span><CheckCircle2 size={14} /> Cycle de {investment.product.duration} jours terminé</span>
                        </div>
                      </article>
                    ))}
                  </section>
                )}
              </>
            ) : (
              <div className="beko-panel grid justify-items-center gap-3 px-6 py-9 text-center">
                <span className="beko-action-icon h-12 w-12"><Package size={22} /></span>
                <strong className="text-sm">Aucun investissement pour le moment</strong>
                <p className="m-0 text-xs text-[#668078]">Vos produits actifs et terminés apparaîtront dans cette liste.</p>
                <Link href="/invest" className="beko-primary-button mt-1 max-w-xs no-underline" data-testid="button-invest">
                  Découvrir les produits
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}