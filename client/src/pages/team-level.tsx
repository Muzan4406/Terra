import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, CalendarDays, CircleCheck, UserRound, UsersRound } from "lucide-react";
import { DEFAULT_BUSINESS_SETTINGS } from "@shared/schema";
import "./beko-pages.css";

interface TeamReferral {
  id: string;
  phone: string;
  country: string;
  totalInvestment: number;
  hasProduct: boolean;
  createdAt: string;
}

const formatMoney = (amount: number) =>
  Number(amount || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date indisponible"
    : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function TeamLevelPage() {
  const params = useParams<{ level: string }>();
  const level = Number(params.level);
  const validLevel = Number.isInteger(level) && level >= 1 && level <= 3;
  const levelName = validLevel ? `Niveau ${level}` : "Niveau inconnu";
  const { data: referrals, isLoading, isError, refetch } = useQuery<TeamReferral[]>({
    queryKey: [`/api/team/referrals/${level}`],
    enabled: validLevel,
  });

  return (
    <div className="beko-page beko-page--dark">
      <div className="beko-shell">
        <header className="beko-topbar">
          <Link href="/team" className="beko-back" aria-label="Retour à l’équipe">
            <ArrowLeft size={19} />
          </Link>
          <h1>{levelName}</h1>
          <span className="beko-brand">BEKO</span>
        </header>
        <main>
          <section className="beko-hero">
            <p className="beko-eyebrow">Détails du parrainage</p>
            <h2>Membres du niveau {validLevel ? level : "—"}.</h2>
            <p>Consultez leur date d’inscription, leur statut et leurs investissements.</p>
          </section>
          <div className="beko-content">
            {!validLevel ? (
              <div className="beko-alert is-danger" role="alert">
                <strong>Niveau invalide</strong>
                Choisissez un niveau de parrainage entre 1 et 3.
                <Link href="/team" className="beko-inline-link mt-2 block">Retour à mon équipe</Link>
              </div>
            ) : isLoading ? (
              <div className="beko-panel p-5 text-center text-sm text-[#b4bfd7]" role="status">
                Chargement des membres…
              </div>
            ) : isError ? (
              <div className="beko-alert is-danger" role="alert">
                <strong>Membres indisponibles</strong>
                Impossible de charger ce niveau pour le moment.
                <button type="button" className="beko-inline-link mt-2 block" onClick={() => void refetch()}>
                  Réessayer
                </button>
              </div>
            ) : referrals?.length ? (
              <section className="grid gap-3" aria-label={`Membres du ${levelName}`}>
                <div className="beko-section-heading">
                  <h2>{referrals.length} membre{referrals.length === 1 ? "" : "s"}</h2>
                  <span>{levelName}</span>
                </div>
                {referrals.map((referral) => (
                  <article key={referral.id} className="beko-panel grid gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <span className="beko-action-icon"><UserRound size={19} /></span>
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-sm">{referral.phone}</strong>
                        <span className="text-xs text-[#b4bfd7]">{referral.country}</span>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[.65rem] font-extrabold ${
                        referral.hasProduct ? "bg-emerald-400/15 text-emerald-200" : "bg-white/10 text-[#b4bfd7]"
                      }`}>
                        {referral.hasProduct ? "Investisseur" : "Sans produit"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 border-t border-[#405781] pt-3">
                      <div>
                        <span className="block text-[.65rem] text-[#b4bfd7]">Investissement</span>
                        <strong className="mt-1 block text-sm">{formatMoney(referral.totalInvestment)} FCFA</strong>
                      </div>
                      <div>
                        <span className="flex items-center gap-1 text-[.65rem] text-[#b4bfd7]">
                          <CalendarDays size={12} /> Inscrit le
                        </span>
                        <strong className="mt-1 block text-xs">{formatDate(referral.createdAt)}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            ) : (
              <div className="beko-panel grid justify-items-center gap-3 px-6 py-9 text-center">
                <span className="beko-action-icon h-12 w-12"><UsersRound size={22} /></span>
                <strong className="text-sm">Aucun membre à ce niveau</strong>
                <p className="m-0 text-xs text-[#b4bfd7]">Les personnes qui rejoignent votre équipe apparaîtront ici.</p>
                <CircleCheck size={18} className="text-emerald-300" />
              </div>
            )}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}