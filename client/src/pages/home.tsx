import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { WhatsAppPopup } from "@/components/whatsapp-popup";
import { ArrowDownToLine, ArrowUpFromLine, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useCallback, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";

interface PlatformSettings {
  customerService: string;
  officialChannel: string;
  telegramGroup: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showWhatsAppPopup, setShowWhatsAppPopup] = useState(true);

  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["/api/settings/public"],
  });

  const handleCloseWhatsAppPopup = useCallback(() => {
    setShowWhatsAppPopup(false);
  }, []);

  const formatNumber = (num: number) => num.toLocaleString("fr-FR");

  if (!user) {
    return (
      <div className="fixed inset-0 flex h-[100dvh] items-center justify-center overflow-hidden bg-[#f3f2e9]">
        <Skeleton className="h-screen w-full max-w-md" />
      </div>
    );
  }

  const services = [
    {
      icon: ArrowDownToLine,
      label: "Dépôt",
      description: "Ajouter des fonds au solde dépôt",
      path: "/deposit",
      testId: "button-recharge",
    },
    {
      icon: ArrowUpFromLine,
      label: "Retrait",
      description: "Retirer depuis le solde retrait",
      path: "/withdraw",
      testId: "button-withdraw",
    },
  ];

  return (
    <div className="site-page fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#f3f2e9]">
      <div className="home-shell mx-auto flex h-full max-w-md flex-col overflow-hidden">
        <header className="home-header flex shrink-0 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <BrandLogo className="h-11 w-11 rounded-lg object-contain" alt="" />
            <div>
              <h1 className="text-sm font-bold uppercase tracking-[0.12em] text-primary">Beko</h1>
              <p className="text-[11px] text-muted-foreground">Espace financier</p>
            </div>
          </div>
        </header>

        <main className="home-content min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(8rem+env(safe-area-inset-bottom))]">
          <section className="home-welcome" aria-label="Bienvenue">
            <p className="text-[15px] font-semibold leading-tight text-[#183e32]">Bonjour,</p>
            <h2 className="mt-0.5 text-[25px] font-bold leading-[1.15] tracking-[-0.045em] text-[#14553f]">
              {user.fullName.split(" ")[0]}
            </h2>
            <p className="mt-1.5 text-sm text-[#687a70]">Votre activité et vos soldes</p>
          </section>

          <section
            aria-label="Résumé du compte"
            className="home-account-summary relative isolate mt-5 overflow-hidden rounded-[1.35rem] p-5 text-white shadow-[0_12px_25px_rgba(17,65,49,0.16)]"
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-semibold tracking-[0.025em] text-white/80">
                  Soldes disponibles
                </p>
                <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.1em] text-white/85">
                  XOF
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="min-w-0 rounded-xl border border-white/20 bg-white/10 p-3">
                  <p className="text-[11px] text-white/75">Solde dépôt</p>
                  <p className="mt-1 truncate text-lg font-bold tabular-nums" data-testid="text-deposit-balance">
                    {formatNumber(user.depositBalance)} F
                  </p>
                </div>
                <div className="min-w-0 rounded-xl border border-white/20 bg-white/10 p-3">
                  <p className="text-[11px] text-white/75">Solde retrait</p>
                  <p className="mt-1 truncate text-lg font-bold tabular-nums" data-testid="text-withdrawal-balance">
                    {formatNumber(user.withdrawalBalance)} F
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/20 pt-3.5">
                <div className="min-w-0">
                  <p className="text-[11px] leading-tight text-white/70">Revenus cumulés</p>
                  <p className="mt-1 truncate text-[15px] font-semibold tabular-nums" data-testid="text-earnings">
                    {formatNumber(user.totalEarnings)} F
                  </p>
                </div>
                <div className="min-w-0 border-l border-white/20 pl-4">
                  <p className="text-[11px] leading-tight text-white/70">Revenus du jour</p>
                  <p className="mt-1 truncate text-[15px] font-semibold tabular-nums">
                    {formatNumber(user.todayEarnings)} F
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="home-services mt-7" aria-labelledby="home-services-heading">
            <div className="mb-3.5 flex items-end justify-between">
              <div>
                <h2 id="home-services-heading" className="mt-0.5 text-[19px] font-bold tracking-[-0.035em] text-[#183e32]">
                  Actions rapides
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {services.map((service) => (
                <button
                  key={service.testId}
                  type="button"
                  onClick={() => navigate(service.path)}
                  data-testid={service.testId}
                  className="home-service-tile group min-w-0 rounded-[1.15rem] border p-3.5 text-left transition-transform active:scale-[0.98]"
                >
                  <span className="home-service-image-wrap flex h-[4.15rem] w-[4.15rem] items-center justify-center rounded-full bg-primary/10 text-primary">
                    <service.icon className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <span className="mt-3 flex items-center justify-between gap-1">
                    <span className="text-[16px] font-bold leading-tight tracking-[-0.025em] text-[#183e32]">
                      {service.label}
                    </span>
                    <ChevronRight className="h-[18px] w-[18px] shrink-0 text-[#315e4d]" aria-hidden="true" />
                  </span>
                  <span className="mt-1.5 block text-[11px] leading-[1.4] text-[#687a70]">
                    {service.description}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </main>
      </div>

      <BottomNav />

      <WhatsAppPopup
        isOpen={showWhatsAppPopup && (!!settings?.officialChannel || !!settings?.telegramGroup)}
        onClose={handleCloseWhatsAppPopup}
        whatsappLink={settings?.officialChannel || ""}
        telegramGroupLink={settings?.telegramGroup || ""}
      />
    </div>
  );
}