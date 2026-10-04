import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/bottom-nav";
import { DEFAULT_BUSINESS_SETTINGS } from "@shared/schema";
import { ArrowRight, Copy, UsersRound } from "lucide-react";
import { Link } from "wouter";
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
}

interface ReferralSettings {
  referralLevel1Percentage: number;
  referralLevel2Percentage: number;
  referralLevel3Percentage: number;
}

const formatMoney = (amount: number) =>
  Number(amount || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

export default function TeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: stats, isLoading, isError, refetch } = useQuery<TeamStats>({
    queryKey: ["/api/team/stats"],
    enabled: Boolean(user),
  });
  const { data: settings } = useQuery<ReferralSettings>({
    queryKey: ["/api/settings/public"],
    enabled: Boolean(user),
  });

  const referralLevels = [
    {
      level: 1,
      count: stats?.level1Count ?? 0,
      investors: stats?.level1Investors ?? 0,
      investment: stats?.level1Investment ?? 0,
      commission: stats?.level1Commissions ?? 0,
      rate: settings?.referralLevel1Percentage ?? DEFAULT_BUSINESS_SETTINGS.referralLevel1Percentage,
    },
    {
      level: 2,
      count: stats?.level2Count ?? 0,
      investors: stats?.level2Investors ?? 0,
      investment: stats?.level2Investment ?? 0,
      commission: stats?.level2Commissions ?? 0,
      rate: settings?.referralLevel2Percentage ?? DEFAULT_BUSINESS_SETTINGS.referralLevel2Percentage,
    },
    {
      level: 3,
      count: stats?.level3Count ?? 0,
      investors: stats?.level3Investors ?? 0,
      investment: stats?.level3Investment ?? 0,
      commission: stats?.level3Commissions ?? 0,
      rate: settings?.referralLevel3Percentage ?? DEFAULT_BUSINESS_SETTINGS.referralLevel3Percentage,
    },
  ];
  const totalMembers = referralLevels.reduce((sum, item) => sum + item.count, 0);

  const copyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(user?.referralCode ?? "");
      toast({ title: "Code copié", description: "Partagez-le pour inviter un nouveau membre." });
    } catch {
      toast({
        title: "Copie impossible",
        description: "Autorisez l’accès au presse-papiers puis réessayez.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="beko-page beko-page--dark">
      <div className="beko-shell">
        <header className="beko-topbar">
          <span className="beko-brand">BEKO</span>
          <h1>Mon équipe</h1>
          <span className="beko-action-icon h-10 w-10"><UsersRound size={19} /></span>
        </header>
        <main>
          <section className="beko-hero">
            <p className="beko-eyebrow">Votre réseau Beko</p>
            <h2>Grandissons ensemble.</h2>
            <p>Suivez les membres invités, leurs investissements et vos commissions par niveau.</p>
          </section>
          <div className="beko-content">
            <section className="beko-referral-card">
              <p className="beko-referral-label">Votre code de parrainage</p>
              <div className="beko-referral-row">
                <strong className="beko-referral-value">{user?.referralCode || "—"}</strong>
                <button type="button" className="beko-copy-button" onClick={() => void copyReferralCode()}>
                  <Copy size={15} /> Copier
                </button>
              </div>
            </section>

            <section className="beko-team-totals" aria-label="Résumé de l’équipe">
              <div className="beko-team-total">
                <span>Membres au total</span>
                <strong>{isLoading ? "…" : totalMembers}</strong>
              </div>
              <div className="beko-team-total">
                <span>Commissions reçues</span>
                <strong>{isLoading ? "…" : `${formatMoney(stats?.totalCommissions ?? 0)} F`}</strong>
              </div>
            </section>

            {isError ? (
              <div className="beko-alert is-danger" role="alert">
                <strong>Équipe indisponible</strong>
                Impossible de charger les statistiques de votre équipe.
                <button type="button" className="beko-inline-link mt-2 block" onClick={() => void refetch()}>
                  Réessayer
                </button>
              </div>
            ) : (
              <section className="grid gap-3" aria-label="Niveaux de parrainage">
                <div className="beko-section-heading">
                  <h2>Votre équipe par niveau</h2>
                  <span>{totalMembers} membre{totalMembers === 1 ? "" : "s"}</span>
                </div>
                {referralLevels.map((item) => (
                  <Link
                    key={item.level}
                    href={`/team/level/${item.level}`}
                    className="beko-level-card"
                    data-level={item.level}
                  >
                    <div className="beko-level-head">
                      <span className="beko-level-medal">{item.level}</span>
                      <span className="beko-level-title">
                        <strong>Niveau {item.level}</strong>
                        <small>{item.count} membre{item.count === 1 ? "" : "s"} · {item.investors} investisseur{item.investors === 1 ? "" : "s"}</small>
                      </span>
                      <span className="beko-level-rate">
                        <strong>{item.rate}%</strong>
                        <small>commission</small>
                      </span>
                      <ArrowRight size={17} aria-hidden="true" />
                    </div>
                    <div className="beko-level-stats">
                      <div className="beko-level-stat">
                        <span>Investissements</span>
                        <strong>{formatMoney(item.investment)} FCFA</strong>
                      </div>
                      <div className="beko-level-stat">
                        <span>Vos commissions</span>
                        <strong>{formatMoney(item.commission)} FCFA</strong>
                      </div>
                      <div className="beko-level-stat">
                        <span>Membres actifs</span>
                        <strong>{item.investors}</strong>
                      </div>
                    </div>
                  </Link>
                ))}
              </section>
            )}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}