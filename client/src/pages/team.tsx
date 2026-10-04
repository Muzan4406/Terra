import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, ChevronRight, Copy, Link2, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { DEFAULT_BUSINESS_SETTINGS } from "@shared/schema";
import "./team-page.css";

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
  });

  const referralLink = user ? `${window.location.origin}/register?reg=${user.referralCode}` : "";

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copié", description: `${label} copié dans le presse-papier` });
    } catch {
      toast({
        title: "Copie impossible",
        description: "Autorisez l'accès au presse-papiers puis réessayez.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || !user || isLoading) {
    return (
      <div className="team-page">
        <div className="team-shell">
          <header className="team-header">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="team-back-button"
              aria-label="Retour à l'accueil"
            >
              <ArrowLeft size={19} aria-hidden="true" />
            </button>
            <h1>Mon équipe</h1>
            <span className="team-header-spacer" />
          </header>
          <main className="team-skeleton" aria-label="Chargement de l'équipe">
            <Skeleton className="team-skeleton-block h-28 w-full" />
            <Skeleton className="team-skeleton-block mt-4 h-20 w-full" />
            <Skeleton className="team-skeleton-block mt-4 h-24 w-full" />
            <Skeleton className="team-skeleton-block mt-3 h-24 w-full" />
            <Skeleton className="team-skeleton-block mt-3 h-24 w-full" />
          </main>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="team-page">
        <div className="team-shell">
          <header className="team-header">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="team-back-button"
              aria-label="Retour à l'accueil"
            >
              <ArrowLeft size={19} aria-hidden="true" />
            </button>
            <h1>Mon équipe</h1>
            <span className="team-header-spacer" />
          </header>
          <main className="team-content">
            <div className="team-empty" role="alert">
              <span className="team-empty-icon"><Users size={20} aria-hidden="true" /></span>
              <h3>Impossible de charger votre équipe</h3>
              <p>Vérifiez votre connexion puis réessayez.</p>
              <button type="button" onClick={() => void refetch()} className="team-copy-button team-retry-button">
                Réessayer
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const totalTeamSize = stats?.totalTeamSize ??
    ((stats?.level1Count || 0) + (stats?.level2Count || 0) + (stats?.level3Count || 0));
  const totalInvestment = stats?.totalTeamInvestment ??
    ((stats?.level1Investment || 0) + (stats?.level2Investment || 0) + (stats?.level3Investment || 0));

  const levels = [
    {
      level: 1,
      label: "Niveau 1",
      count: stats?.level1Count || 0,
      investors: stats?.level1Investors || 0,
      investment: stats?.level1Investment || 0,
      commission: stats?.level1Commissions || 0,
      rate: businessSettings?.referralLevel1Percentage ?? DEFAULT_BUSINESS_SETTINGS.referralLevel1Percentage,
      className: "level-one",
    },
    {
      level: 2,
      label: "Niveau 2",
      count: stats?.level2Count || 0,
      investors: stats?.level2Investors || 0,
      investment: stats?.level2Investment || 0,
      commission: stats?.level2Commissions || 0,
      rate: businessSettings?.referralLevel2Percentage ?? DEFAULT_BUSINESS_SETTINGS.referralLevel2Percentage,
      className: "level-two",
    },
    {
      level: 3,
      label: "Niveau 3",
      count: stats?.level3Count || 0,
      investors: stats?.level3Investors || 0,
      investment: stats?.level3Investment || 0,
      commission: stats?.level3Commissions || 0,
      rate: businessSettings?.referralLevel3Percentage ?? DEFAULT_BUSINESS_SETTINGS.referralLevel3Percentage,
      className: "level-three",
    },
  ];

  return (
    <div className="team-page">
      <div className="team-shell">
        <header className="team-header">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="team-back-button"
            aria-label="Retour à l'accueil"
          >
            <ArrowLeft size={19} aria-hidden="true" />
          </button>
          <h1>Mon équipe</h1>
          <span className="team-header-spacer" />
        </header>

        <main className="team-content">
          <section className="team-hero">
            <p className="team-hero-kicker">BEKO · PARRAINAGE</p>
            <h2>Votre réseau grandit avec vous.</h2>
            <p>Partagez votre invitation et suivez l'activité de votre équipe, niveau par niveau.</p>
          </section>

          <section className="team-share-card" aria-label="Votre lien et code de parrainage">
            <div className="team-share-row">
              <span className="team-share-icon"><Link2 size={19} aria-hidden="true" /></span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="team-share-label">Lien d'invitation</p>
                <input
                  type="text"
                  readOnly
                  aria-label="Lien de parrainage"
                  value={referralLink}
                  className="team-share-value"
                  data-testid="input-referral-link"
                />
              </div>
              <button
                type="button"
                onClick={() => void copyToClipboard(referralLink, "Lien")}
                className="team-copy-button"
                data-testid="button-copy-link"
              >
                <Copy size={12} className="mr-1.5 inline" aria-hidden="true" />
                Copier
              </button>
            </div>
            <div className="team-share-row">
              <span className="team-share-icon"><Check size={19} aria-hidden="true" /></span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="team-share-label">Code d'invitation</p>
                <span className="team-share-value code" data-testid="text-referral-code">{user.referralCode}</span>
              </div>
              <button
                type="button"
                onClick={() => void copyToClipboard(user.referralCode, "Code")}
                className="team-copy-button"
                data-testid="button-copy-code"
              >
                <Copy size={12} className="mr-1.5 inline" aria-hidden="true" />
                Copier
              </button>
            </div>
          </section>

          <div className="team-section-title">
            <h2>Vue d'ensemble</h2>
            <span>Votre réseau</span>
          </div>
          <section className="team-stat-ribbon" aria-label="Statistiques totales de l'équipe">
            <div className="team-stat">
              <span>Membres de l'équipe</span>
              <strong data-testid="text-total-team">{totalTeamSize}</strong>
            </div>
            <div className="team-stat">
              <span>Investissement total</span>
              <strong data-testid="text-total-investment">
                {Number(totalInvestment || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
                <small>FCFA</small>
              </strong>
            </div>
          </section>

          <div className="team-section-title">
            <h2>Niveaux de l'équipe</h2>
            <span>Commissions par niveau</span>
          </div>

          {totalTeamSize === 0 && (
            <section className="team-empty" aria-label="Équipe vide">
              <span className="team-empty-icon"><Users size={20} aria-hidden="true" /></span>
              <h3>Votre réseau commence ici</h3>
              <p>Partagez votre lien ou votre code. Les nouveaux membres apparaîtront dans les niveaux de votre équipe.</p>
            </section>
          )}
          <section className="team-level-list" aria-label="Détails des niveaux">
            {levels.map((level) => (
              <Link
                key={level.level}
                href={`/team/level/${level.level}`}
                className={`team-level-card ${level.className}`}
                data-testid={`link-level-${level.level}`}
                aria-label={`${level.label}, voir les membres`}
              >
                <div className="team-level-top">
                  <div className="team-level-label">
                    <span className="team-level-medal">{level.level}</span>
                    <span>
                      <strong>{level.label}</strong>
                      <small>{level.investors} membre{level.investors === 1 ? "" : "s"} actif{level.investors === 1 ? "" : "s"}</small>
                    </span>
                  </div>
                  <div className="team-level-rate">
                    <strong>{level.rate}%</strong>
                    <span>commission</span>
                  </div>
                  <ChevronRight className="team-level-chevron" size={18} aria-hidden="true" />
                </div>
                <div className="team-level-metrics">
                  <div className="team-level-metric">
                    <strong>{level.count}</strong>
                    <span>Membres</span>
                  </div>
                  <div className="team-level-metric">
                    <strong>{formatMoney(level.investment)}</strong>
                    <span>Investissements</span>
                  </div>
                  <div className="team-level-metric">
                    <strong>{formatMoney(level.commission)}</strong>
                    <span>Commissions</span>
                  </div>
                </div>
              </Link>
            ))}
          </section>

          <section className="team-commission-total">
            <span>Commissions totales créditées</span>
            <strong>{formatMoney(stats?.totalCommissions || 0)}</strong>
          </section>

          <section className="team-explainer">
            <h2>Comment fonctionne votre équipe</h2>
            <p>Invitez des membres avec votre lien ou votre code. Chaque personne est rattachée à un niveau de parrainage; consultez les détails d'un niveau pour suivre ses membres et son activité.</p>
          </section>
        </main>
      </div>
    </div>
  );
}