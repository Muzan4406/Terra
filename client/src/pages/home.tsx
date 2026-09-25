import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { WhatsAppPopup } from "@/components/whatsapp-popup";
import {
  ChevronLeft,
  ChevronRight,
  Bell
} from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState, useCallback } from "react";
import { solarImages } from "@/lib/solar-images";
import { BrandLogo } from "@/components/brand-logo";

interface PlatformSettings {
  customerService: string;
  officialChannel: string;
  discussionGroup: string;
}

interface HomeAction {
  image: string;
  label: string;
  path: string;
  testId: string;
}

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showWhatsAppPopup, setShowWhatsAppPopup] = useState(true);

  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["/api/settings/public"],
  });

  const handleCloseWhatsAppPopup = useCallback(() => {
    setShowWhatsAppPopup(false);
  }, []);

  const formatNumber = (num: number) => {
    return num.toLocaleString("fr-FR");
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((previous) => (previous + 1) % solarImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
    };
  }, []);

  const nextSlide = () => {
    setCurrentSlide((previous) => (previous + 1) % solarImages.length);
  };

  const previousSlide = () => {
    setCurrentSlide((previous) => (previous - 1 + solarImages.length) % solarImages.length);
  };

  if (!user) {
    return (
      <div className="fixed inset-0 flex h-[100dvh] items-center justify-center overflow-hidden bg-[#f2eee3]">
        <Skeleton className="h-screen w-full max-w-md" />
      </div>
    );
  }

  const actionButtons: HomeAction[] = [
    { 
      image: solarImages[0].src,
      label: "DÉPOSER", 
      path: "/deposit", 
      testId: "button-recharge",
    },
    { 
      image: solarImages[4].src,
      label: "RETIRER", 
      path: "/withdraw", 
      testId: "button-withdraw",
    },
  ];

  return (
    <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#f2eee3]">
      <div className="mx-auto flex h-full max-w-md flex-col overflow-hidden bg-[#fbf8f0]/90 shadow-[0_12px_36px_rgba(40,54,42,0.08)] backdrop-blur-sm">
        <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-[#e9e2d4] bg-[#fbf8f0]/95 px-4 py-2.5">
          <h1>
            <BrandLogo className="h-8 w-auto" />
          </h1>
          <div aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2e6cd] text-[#9a682d]">
            <Bell className="h-4 w-4" />
          </div>
        </div>

        <div className="home-hero relative w-full shrink-0 overflow-hidden bg-gray-900">
          {solarImages.map((image, index) => (
            <div
              key={image.src}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentSlide ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden={index !== currentSlide}
            >
              <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-[#132b25]/75 via-[#132b25]/10 to-black/10" />
          <div className="absolute bottom-4 left-4 right-14 text-white sm:left-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-white/85">TerraOil · votre espace</p>
            <h2 className="mt-1 font-serif text-[clamp(1.25rem,5vw,1.7rem)] font-semibold leading-tight tracking-[-0.025em]">Vos repères, réunis au même endroit</h2>
          </div>
          <button
            type="button"
            onClick={previousSlide}
            aria-label="Image précédente"
            className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white transition-colors hover:bg-black/50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Image suivante"
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white transition-colors hover:bg-black/50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-2 right-4 flex gap-1.5">
            {solarImages.map((image, index) => (
              <button
                key={image.src}
                type="button"
                onClick={() => setCurrentSlide(index)}
                aria-label={`Afficher l’image ${index + 1}`}
                aria-current={index === currentSlide}
                className={`h-2.5 w-2.5 rounded-full border border-white/40 transition-transform ${index === currentSlide ? "scale-110 bg-white" : "bg-white/50"}`}
              />
            ))}
          </div>
        </div>

        <main className="home-content flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-3 pb-[calc(6rem+env(safe-area-inset-bottom))]">
          <section
            aria-label="Résumé du compte"
            className="home-account-summary shrink-0 rounded-2xl border border-[#ddc399] bg-gradient-to-br from-[#efdbba] to-[#d6ad7c] p-3.5 shadow-sm sm:p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
               <h2 className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#39453b]/80">Vue d’ensemble</h2>
              </div>
              <span className="rounded-full bg-[#fbf8f0]/55 px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] text-[#39453b]/80">XOF</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-white/50">
              <div className="min-w-0 pr-3">
                  <p className="mb-1 text-xs font-medium text-[#39453b]/80">Solde du compte</p>
                 <p className="home-account-amount truncate text-xl font-bold leading-tight tabular-nums text-[#26372d]" data-testid="text-balance">
                  {formatNumber(user.balance)}
                </p>
              </div>
              <div className="min-w-0 pl-3">
                  <p className="mb-1 text-xs font-medium text-[#39453b]/80">Revenus cumulés</p>
                 <p className="home-account-amount truncate text-xl font-bold leading-tight tabular-nums text-[#26372d]" data-testid="text-earnings">
                  {formatNumber(user.totalEarnings)}
                </p>
              </div>
            </div>
          </section>

          <section className="home-actions shrink-0" aria-label="Actions rapides">
            <h2 className="sr-only">Actions rapides</h2>
            <div className="grid grid-cols-2 gap-3">
              {actionButtons.map((btn) => (
                <button
                  key={btn.testId}
                  className="home-action-tile group flex min-h-36 min-w-0 flex-col items-center justify-center gap-3 rounded-2xl border border-[#e5ddce] bg-[#fbf8f0] p-3.5 text-center shadow-sm transition-all hover:border-[#d6bd91] hover:shadow-md active:scale-[0.98] sm:min-h-40 sm:p-4"
                  onClick={() => navigate(btn.path)}
                  data-testid={btn.testId}
                >
                  <span className="home-action-icon flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.35rem] sm:h-[4.5rem] sm:w-[4.5rem]">
                    <img src={btn.image} alt="" className="h-full w-full object-cover" />
                  </span>
                  <span className="min-w-0 text-sm font-bold leading-tight tracking-[0.09em] text-[#3a4b40]">{btn.label}</span>
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

      <style>{`
        .home-hero { height: clamp(138px, 24vh, 208px); }
        @media (max-height: 700px) {
          .home-hero { height: clamp(112px, 19vh, 138px); }
          .home-content { gap: 0.5rem; padding-top: 0.5rem; }
          .home-account-summary { padding: 0.625rem; }
          .home-account-summary > div:first-child { margin-bottom: 0.375rem; }
          .home-account-amount { font-size: 1rem; }
          .home-action-tile { min-height: 8rem; gap: 0.75rem; padding: 0.75rem; }
          .home-action-icon { width: 3.5rem; height: 3.5rem; }
        }
        @media (max-height: 540px) {
          .home-hero { height: 5.75rem; }
          .home-content { gap: 0.375rem; padding-top: 0.375rem; }
          .home-account-summary { padding: 0.5rem; }
          .home-account-summary > div:first-child { margin-bottom: 0.25rem; }
          .home-account-summary p { margin-bottom: 0; }
          .home-action-tile { min-height: 6.5rem; gap: 0.5rem; padding: 0.5rem; }
          .home-action-icon { width: 3rem; height: 3rem; }
        }
      `}</style>
    </div>
  );
}
