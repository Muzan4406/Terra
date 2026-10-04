import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { TelegramChannelPopup } from "@/components/telegram-channel-popup";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { getTelegramUrl } from "@/lib/telegram-url";
import refrigeratorImage from "@assets/Screenshot_20261003-112959.ChatGPT~2_1791093850642.jpg";
import coffeeMachineImage from "@assets/Screenshot_20261003-113315.ChatGPT~2_1791093850375.jpg";

interface PlatformSettings {
  telegramGroup?: string | null;
}

export default function HomePage() {
  const { user } = useAuth();
  const [showTelegramInvite, setShowTelegramInvite] = useState(false);

  const { data: settings } = useQuery<PlatformSettings>({
    queryKey: ["/api/settings/public"],
  });

  useEffect(() => {
    if (!user) return;
    try {
      setShowTelegramInvite(sessionStorage.getItem(`beko:telegram-invite:${user.id}`) !== "dismissed");
    } catch {
      setShowTelegramInvite(true);
    }
  }, [user?.id]);

  const telegramChannelUrl = getTelegramUrl(settings?.telegramGroup);

  const handleCloseTelegramInvite = () => {
    setShowTelegramInvite(false);
    if (!user) return;
    try {
      sessionStorage.setItem(`beko:telegram-invite:${user.id}`, "dismissed");
    } catch {
      // The invitation can still be dismissed for this page view.
    }
  };

  const formatNumber = (num: number) => num.toLocaleString("fr-FR");

  if (!user) {
    return (
      <div className="fixed inset-0 flex h-[100dvh] items-center justify-center overflow-hidden bg-[#f3f2e9]">
        <Skeleton className="h-screen w-full max-w-md" />
      </div>
    );
  }

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
            <h2 className="mt-0.5 text-[25px] font-bold leading-[1.15] tracking-[-0.045em] text-[#14553f]">
              Bienvenue, {user.fullName.split(" ")[0]} !
            </h2>
            <p className="mt-1.5 text-sm text-[#687a70]">Suivez vos soldes et vos produits en toute simplicité.</p>
          </section>

          <section className="home-appliance-section" aria-labelledby="home-appliances-title">
            <div className="home-appliance-heading">
              <h2 id="home-appliances-title">Le confort de la maison</h2>
              <span>Inspirations Beko</span>
            </div>
            <div className="home-appliance-grid">
              <article className="home-appliance-card">
                <img src={refrigeratorImage} alt="Réfrigérateur moderne dans une cuisine lumineuse" />
                <div className="home-appliance-copy">
                  <strong>Réfrigérateurs</strong>
                  <span>Fraîcheur au quotidien</span>
                </div>
              </article>
              <article className="home-appliance-card">
                <img src={coffeeMachineImage} alt="Machine à café moderne posée sur un plan de cuisine" />
                <div className="home-appliance-copy">
                  <strong>Machines à café</strong>
                  <span>Les petits plaisirs du matin</span>
                </div>
              </article>
            </div>
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

            </div>
          </section>
        </main>
      </div>

      <BottomNav />

      <TelegramChannelPopup
        isOpen={showTelegramInvite && !!telegramChannelUrl}
        onClose={handleCloseTelegramInvite}
        telegramLink={telegramChannelUrl || ""}
      />
    </div>
  );
}