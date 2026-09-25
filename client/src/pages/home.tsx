import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { WhatsAppPopup } from "@/components/whatsapp-popup";
import { Bell, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useCallback, useState } from "react";
import { solarImages } from "@/lib/solar-images";
import { BrandLogo } from "@/components/brand-logo";

interface PlatformSettings {
  customerService: string;
  officialChannel: string;
  discussionGroup: string;
}

interface HomeService {
  image: string;
  imageAlt: string;
  label: string;
  description: string;
  path: string;
  testId: string;
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

  const services: HomeService[] = [
    {
      image: solarImages[0].src,
      imageAlt: "Installation de panneaux solaires",
      label: "Dépôt",
      description: "Investissez dans l’énergie solaire",
      path: "/deposit",
      testId: "button-recharge",
    },
    {
      image: solarImages[4].src,
      imageAlt: "Maison équipée de panneaux solaires",
      label: "Retrait",
      description: "Retirez vos gains facilement",
      path: "/withdraw",
      testId: "button-withdraw",
    },
  ];

  return (
    <div className="site-page fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#f3f2e9]">
      <div className="home-shell mx-auto flex h-full max-w-md flex-col overflow-hidden">
        <header className="home-header flex shrink-0 items-center justify-between px-5">
          <h1 className="leading-none">
            <BrandLogo className="h-9 w-auto" />
          </h1>
          <div
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8eee8] text-[#174f3d]"
          >
            <Bell className="h-4 w-4" />
          </div>
        </header>

        <main className="home-content min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(8rem+env(safe-area-inset-bottom))]">
          <section className="home-welcome" aria-label="Bienvenue">
            <p className="text-[15px] font-semibold leading-tight text-[#183e32]">Bonjour,</p>
            <h2 className="mt-0.5 text-[25px] font-bold leading-[1.15] tracking-[-0.045em] text-[#14553f]">
              Bienvenue sur Terra
            </h2>
            <p className="mt-1.5 text-sm text-[#687a70]">Votre espace personnel</p>
          </section>

          <section
            aria-label="Résumé du compte"
            className="home-account-summary relative isolate mt-5 overflow-hidden rounded-[1.35rem] p-5 text-white shadow-[0_12px_25px_rgba(17,65,49,0.16)]"
          >
            <img
              src={solarImages[3].src}
              alt=""
              aria-hidden="true"
              className="home-summary-image"
            />
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] font-semibold tracking-[0.025em] text-white/80">
                  Solde du compte
                </p>
                <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.1em] text-white/85">
                  XOF
                </span>
              </div>
              <p
                className="mt-2 truncate text-[clamp(2rem,9vw,2.65rem)] font-bold leading-none tracking-[-0.055em] tabular-nums"
                data-testid="text-balance"
              >
                {formatNumber(user.balance)} <span className="text-[0.68em] font-semibold tracking-normal">F</span>
              </p>

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
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7a8d7e]">Terra</p>
                <h2 id="home-services-heading" className="mt-0.5 text-[19px] font-bold tracking-[-0.035em] text-[#183e32]">
                  Nos services
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
                  <span className="home-service-image-wrap block h-[4.15rem] w-[4.15rem] overflow-hidden rounded-full">
                    <img
                      src={service.image}
                      alt={service.imageAlt}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
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
        isOpen={showWhatsAppPopup && !!settings?.officialChannel}
        onClose={handleCloseWhatsAppPopup}
        whatsappLink={settings?.officialChannel || ""}
      />
    </div>
  );
}