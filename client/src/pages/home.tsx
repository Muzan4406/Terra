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
import walletIcon from "@assets/images_(27)_1790362738657.jpeg";
import depositIcon from "@assets/depot-3d-icon-png-download-13937730_1790362738683.png";
import bankIcon from "@assets/images_(25)_1790362738741.jpeg";
import tasksIcon from "@assets/images_(24)_1790362738807.jpeg";

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
  const [tickerOffset, setTickerOffset] = useState(0);
  const [showWhatsAppPopup, setShowWhatsAppPopup] = useState(true);

  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["/api/settings/public"],
  });

  const handleCloseWhatsAppPopup = useCallback(() => {
    setShowWhatsAppPopup(false);
  }, []);

  const notifications = [
    "*7426 Recharger XOF 50,000",
    "*2047 Recharger XOF 250,000",
    "*0558 Recharger XOF 100,000",
    "*8934 Retrait XOF 75,000",
  ];

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
    const interval = setInterval(() => {
      setTickerOffset((prev) => (prev + 1) % notifications.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [notifications.length]);

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
      <div className="fixed inset-0 flex h-[100dvh] items-center justify-center overflow-hidden bg-gray-50">
        <Skeleton className="h-screen w-full max-w-md" />
      </div>
    );
  }

  const actionButtons: HomeAction[] = [
    { 
      image: depositIcon,
      label: "RECHARGER", 
      path: "/deposit", 
      testId: "button-recharge",
    },
    { 
      image: walletIcon,
      label: "RETRAIT", 
      path: "/withdraw", 
      testId: "button-withdraw",
    },
    { 
      image: tasksIcon,
      label: "TÂCHES", 
      path: "/tasks", 
      testId: "button-tasks",
    },
  ];

  return (
    <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-gray-50">
      <div className="mx-auto flex h-full max-w-md flex-col overflow-hidden bg-white shadow-sm">
        <div className="flex shrink-0 items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <h1>
            <BrandLogo className="h-8 w-auto" />
          </h1>
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
            <Bell className="w-4 h-4 text-amber-600" />
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/15" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/80">Terra oil</p>
            <h2 className="mt-1 text-2xl font-bold">Bienvenue dans votre espace</h2>
          </div>
          <button
            type="button"
            onClick={previousSlide}
            aria-label="Image précédente"
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Image suivante"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white"
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
                className={`h-2 w-2 rounded-full ${index === currentSlide ? "bg-white" : "bg-white/50"}`}
              />
            ))}
          </div>
        </div>

        <main className="home-content flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3 pb-[88px]">
          <section
            aria-label="Résumé du compte"
            className="home-account-summary shrink-0 rounded-2xl border border-amber-200/70 bg-gradient-to-br from-[#e7c49d] to-[#c99b6d] p-3 shadow-sm"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="home-summary-icon flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                  <img src={bankIcon} alt="" className="h-full w-full scale-110 object-contain mix-blend-multiply" />
                </span>
                <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-800/75">Mon compte</h2>
              </div>
              <span className="rounded-full bg-white/45 px-2 py-0.5 text-[10px] font-semibold text-slate-800/75">XOF</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-white/50">
              <div className="min-w-0 pr-3">
                <p className="mb-1 text-[11px] font-medium text-slate-800/75">Solde disponible</p>
                <p className="home-account-amount truncate text-lg font-bold leading-tight text-slate-950" data-testid="text-balance">
                  {formatNumber(user.balance)}
                </p>
              </div>
              <div className="min-w-0 pl-3">
                <p className="mb-1 text-[11px] font-medium text-slate-800/75">Revenu cumulé</p>
                <p className="home-account-amount truncate text-lg font-bold leading-tight text-slate-950" data-testid="text-earnings">
                  {formatNumber(user.totalEarnings)}
                </p>
              </div>
            </div>
          </section>

          <section className="home-actions shrink-0" aria-label="Actions rapides">
            <h2 className="sr-only">Actions rapides</h2>
            <div className="grid grid-cols-1 gap-2">
              {actionButtons.map((btn) => (
                <button
                  key={btn.testId}
                  className="home-action-tile group flex min-h-16 min-w-0 items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-left shadow-sm transition-all hover:border-amber-200 hover:shadow-md active:scale-[0.98]"
                  onClick={() => navigate(btn.path)}
                  data-testid={btn.testId}
                >
                  <span className="home-action-icon flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl">
                    <img src={btn.image} alt="" className="h-full w-full scale-110 object-contain mix-blend-multiply" />
                  </span>
                  <span className="min-w-0 text-sm font-bold leading-tight text-slate-700">{btn.label}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="home-news flex min-h-10 shrink-0 items-center gap-2.5 rounded-xl border border-amber-100 bg-amber-50/90 px-3 py-2">
            <span className="shrink-0 rounded-md bg-amber-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              Actu
            </span>
            <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700" data-testid="text-home-notification">
              {notifications[tickerOffset]}
            </p>
          </div>
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
          .home-summary-icon { width: 1.5rem; height: 1.5rem; }
          .home-account-amount { font-size: 1rem; }
          .home-action-tile { min-height: 3.5rem; gap: 0.75rem; padding: 0.5rem 0.75rem; }
          .home-action-icon { width: 2.5rem; height: 2.5rem; }
          .home-news { min-height: 2rem; padding-top: 0.375rem; padding-bottom: 0.375rem; }
        }
        @media (max-height: 540px) {
          .home-hero { height: 5.75rem; }
          .home-content { gap: 0.375rem; padding-top: 0.375rem; }
          .home-account-summary { padding: 0.5rem; }
          .home-account-summary > div:first-child { margin-bottom: 0.25rem; }
          .home-summary-icon { width: 1.25rem; height: 1.25rem; }
          .home-account-summary p { margin-bottom: 0; }
          .home-action-tile { min-height: 3rem; }
          .home-action-icon { width: 2rem; height: 2rem; }
          .home-news { min-height: 1.75rem; }
        }
      `}</style>
    </div>
  );
}
