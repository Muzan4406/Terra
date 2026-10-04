import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Copy, Link2, RotateCw, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { DEFAULT_BUSINESS_SETTINGS } from "@shared/schema";
import "./beko-pages.css";

interface TeamStats {
  level1Count: number;
  level2Count: number;
  level3Count: number;
  level1Investors: number;
  level2Investors: number;
  level3Investors: number;
  level1Investment: number;
  level2Investment: number;
  level3Investment: number;
  level1Commissions: number;
  level2Commissions: number;
  level3Commissions: number;
  totalCommissions: number;
  totalTeamSize: number;
  totalTeamInvestment: number;
}

interface PublicBusinessSettings {
  referralLevel1Percentage: number;
  referralLevel2Percentage: number;
  referralLevel3Percentage: number;
}

const formatMoney = (value: number) =>
  `${Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} FCFA`;

export default function TeamPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const {
    data: stats,
    isLoading,
    isError,
    refetch,
  } = useQuery<TeamStats>({
    queryKey: ["/api/team/stats"],
    enabled: !!user,
  });
  const { data: businessSettings } = useQuery<PublicBusinessSettings>({
    queryKey: ["/api/settings/public"],
    enabled: !!user,
  });

  const referralLink = user ? `${window.location.origin}/register?reg=${encodeURIComponent(user.referralCode)}` : "";

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copié", description: `${label} copié dans le presse-papiers.` });
    } catch {
      toast({
        title: "Copie impossible",
        description: "Autorisez l’accès au presse-papiers puis réessayez.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || !user || isLoading) {
    return (
      <div className="beko-page beko-page--dark">
        <div className="beko-shell">
          <header className="beko-topbar">
            <button type="button" className="beko-back" onClick={() => navigate("/")} aria-label="Retour à l’accueil"><ArrowLeft size={19} /></button>
            <h1>Mon équipe</h1>
            <span className="beko-brand">BEKO</span>
          </header>
          <main className="beko-content">
            <Skeleton className="h-36 w-full rounded-3xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </main>
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="beko-page beko-page--dark">
        <div className="beko-shell">
          <header className="beko-topbar">
            <button type="button" className="beko-back" onClick={() => navigate("/")} aria-label="Retour à l’accueil"><ArrowLeft size={19} /></button>
            <h1>Mon équipe</h1>
            <span className="beko-brand">BEKO</span>
          </header>
          <main className="beko-content">
            <section className="beko-panel grid justify-items-center gap-3 p-7 text-center" role="alert">
              <span className="beko-action-icon h-12 w-12"><Users size={22} /></span>
              <h2 className="m-0 text-base font-extrabold">Impossible de charger votre équipe</h2>
              <p className="m-0 text-sm text-[#668078]">Vérifiez votre connexion puis réessayez.</p>
              <button type="button" className="beko-primary-button max-w-48" onClick={() => void refetch()}><RotateCw size={16} /> Réessayer</button>
            </section>
          </main>
        </div>
      </div>
    );
  }

  const totalTeamSize = stats.totalTeamSize ??
    (stats.level1Count + stats.level2Count + stats.level3Count);
  const totalInvestment = stats.totalTeamInvestment ??
    (stats.level1Investment + stats.level2Investment + stats.level3Investment);

  const levels = [
    {
      level: 1,
      count: stats.level1Count,
      investors: stats.level1Investors,
      investment: stats.level1Investment,
      commission: stats.level1Commissions,
      rate: businessSettings?.referralLevel1Percentage ?? DEFAULT_BUSINESS_SETTINGS.referralLevel1Percentage,
    },
    {
      level: 2,
      count: stats.level2Count,
      investors: stats.level2Investors,
      investment: stats.level2Investment,
      commission: stats.level2Commissions,
      rate: businessSettings?.referralLevel2Percentage ?? DEFAULT_BUSINESS_SETTINGS.referralLevel2Percentage,
    },
    {
      level: 3,
      count: stats.level3Count,
      investors: stats.level3Investors,
      investment: stats.level3Investment,
      commission: stats.level3Commissions,
      rate: businessSettings?.referralLevel3Percentage ?? DEFAULT_BUSINESS_SETTINGS.referralLevel3Percentage,
    },
  ];

  return (
    <div className="beko-page beko-page--dark">
      <div className="beko-shell">
        <header className="beko-topbar">
          <button type="button" className="beko-back" onClick={() => navigate("/")} aria-label="Retour à l’accueil">
            <ArrowLeft size={19} />
          </button>
          <h1>Mon équipe</h1>
          <span className="beko-brand">BEKO</span>
        </header>

        <main>
          <section className="beko-hero">
            <p className="beko-eyebrow">BEKO · Parrainage</p>
            <h2>Grandissez ensemble.</h2>
            <p>Invitez vos proches et suivez l’activité de votre réseau, niveau par niveau.</p>
          </section>

          <div className="beko-content">
            <section className="beko-referral-card" aria-label="Votre lien et code de parrainage">
              <div className="beko-referral-row">
                <span className="beko-action-icon"><Link2 size={19} /></span>
                <div className="min-w-0 flex-1">
                  <p className="beko-referral-label">Lien d’invitation</p>
                  <input
                    type="text"
                    readOnly
                    aria-label="Lien de parrainage"
                    value={referralLink}
                    className="beko-referral-value"
                    data-testid="input-referral-link"
                  />
                </div>
                <button type="button" onClick={() => void copyToClipboard(referralLink, "Lien")} className="beko-copy-button" data-testid="button-copy-link">
                  <Copy size={13} /> Copier
                </button>
              </div>
              <div className="beko-referral-row">
                <span className="beko-action-icon"><Check size={19} /></span>
                <div className="min-w-0 flex-1">
                  <p className="beko-referral-label">Code de parrainage</p>
                  <span className="beko-referral-value font-mono" data-testid="text-referral-code">{user.referralCode}</span>
                </div>
                <button type="button" onClick={() => void copyToClipboard(user.referralCode, "Code")} className="beko-copy-button" data-testid="button-copy-code">
                  <Copy size={13} /> Copier
                </button>
              </div>
            </section>

            <section className="grid gap-2" aria-label="Statistiques de l’équipe">
              <div className="beko-section-heading">
                <h2>Vue d’ensemble</h2>
                <span>Votre réseau</span>
              </div>
              <div className="beko-team-totals">
                <div className="beko-team-total">
                  <span>Membres de l’équipe</span>
                  <strong data-testid="text-total-team">{totalTeamSize}</strong>
                </div>
                <div className="beko-team-total">
                  <span>Investissement total</span>
                  <strong className="text-[1rem]">{formatMoney(totalInvestment)}</strong>
                </div>
              </div>
            </section>

            <section className="grid gap-2" aria-label="Niveaux de l’équipe">
              <div className="beko-section-heading">
                <h2>Niveaux de l’équipe</h2>
                <span>Commissions par niveau</span>
              </div>
              {totalTeamSize === 0 && (
                <div className="beko-notice">
                  <strong>Votre réseau commence ici</strong>
                  Partagez votre lien ou votre code. Les nouveaux membres apparaîtront dans les niveaux de votre équipe.
                </div>
              )}
              {levels.map((level) => (
                <Link
                  key={level.level}
                  href={`/team/level/${level.level}`}
                  className="beko-level-card"
                  data-level={level.level}
                  data-testid={`link-level-${level.level}`}
                  aria-label={`Niveau ${level.level}, voir les membres`}
                >
                  <div className="beko-level-head">
                    <span className="beko-level-medal">{level.level}</span>
                    <span className="beko-level-title">
                      <strong>Niveau {level.level}</strong>
                      <small>{level.investors} membre{level.investors === 1 ? "" : "s"} actif{level.investors === 1 ? "" : "s"}</small>
                    </span>
                    <span className="beko-level-rate">
                      <strong>{level.rate}%</strong>
                      <small>commission</small>
                    </span>
                    <ChevronRight size={18} className="text-[#83a18e]" />
                  </div>
                  <div className="beko-level-stats">
                    <div className="beko-level-stat"><span>Membres</span><strong>{level.count}</strong></div>
                    <div className="beko-level-stat"><span>Actifs</span><strong>{level.investors}</strong></div>
                    <div className="beko-level-stat"><span>Investissements</span><strong>{formatMoney(level.investment)}</strong></div>
                    <div className="beko-level-stat"><span>Commissions</span><strong>{formatMoney(level.commission)}</strong></div>
                  </div>
                </Link>
              ))}
            </section>

            <section className="beko-withdraw-balance">
              <span>Commissions totales créditées</span>
              <strong>{formatMoney(stats.totalCommissions)}</strong>
            </section>

            <div className="beko-notice flex items-start gap-2">
              <ArrowUpRight className="mt-0.5 shrink-0 text-[#087653]" size={18} />
              <span>Ouvrez un niveau pour consulter les membres qui composent votre réseau.</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}