import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowUpRight, Headphones, Radio } from "lucide-react";
import { SiTelegram } from "react-icons/si";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/bottom-nav";
import { getTelegramUrl } from "@/lib/telegram-url";
import "./beko-pages.css";

interface PlatformSettings {
  customerService?: string | null;
  telegramGroup?: string | null;
}

export default function CustomerServicePage() {
  const [, navigate] = useLocation();
  const { data: settings, isLoading } = useQuery<PlatformSettings>({
    queryKey: ["/api/settings/public"],
  });

  const contactLinks = [
    {
      title: "Chaîne Telegram",
      description: "Suivez les annonces et informations officielles de Beko.",
      href: getTelegramUrl(settings?.telegramGroup),
      icon: Radio,
      testId: "link-beko-telegram-channel",
    },
    {
      title: "Assistance Telegram",
      description: "Ouvrir Telegram pour contacter notre équipe d’assistance.",
      href: getTelegramUrl(settings?.customerService),
      icon: Headphones,
      testId: "link-beko-telegram-support",
    },
  ];

  return (
    <div className="beko-page">
      <div className="beko-shell">
        <header className="beko-topbar">
          <button
            type="button"
            className="beko-back"
            onClick={() => navigate("/account")}
            aria-label="Retour au compte"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="beko-brand">BEKO</span>
          <h1>Service client</h1>
          <span className="beko-balance-mark" aria-hidden="true">
            <SiTelegram className="h-5 w-5" />
          </span>
        </header>

        <main className="beko-content">
          <section className="beko-hero beko-fade-in">
            <p className="beko-eyebrow">Contact officiel</p>
            <h2>Choisissez votre lien Telegram.</h2>
            <p>Retrouvez les annonces de Beko ou contactez l’assistance dans Telegram. La messagerie intégrée à l’application n’est pas utilisée.</p>
          </section>

          <section className="grid gap-3" aria-label="Liens Telegram">
            <div className="beko-section-heading">
              <h2>Nous contacter</h2>
              <span>Telegram</span>
            </div>

            {isLoading ? (
              <div className="grid gap-3" aria-label="Chargement des liens Telegram">
                <Skeleton className="h-[5.5rem] rounded-2xl" />
                <Skeleton className="h-[5.5rem] rounded-2xl" />
              </div>
            ) : (
              contactLinks.map((link) => {
                const Icon = link.icon;
                const content = (
                  <>
                    <span className="beko-action-icon h-12 w-12 rounded-2xl">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="beko-action-copy">
                      <strong>{link.title}</strong>
                      <small>{link.href ? link.description : "Lien Telegram non configuré pour le moment."}</small>
                    </span>
                    {link.href ? (
                      <ArrowUpRight className="beko-arrow h-5 w-5" aria-hidden="true" />
                    ) : null}
                  </>
                );

                return link.href ? (
                  <a
                    key={link.title}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="beko-action min-h-[5.5rem] rounded-2xl px-3 py-3"
                    data-testid={link.testId}
                  >
                    {content}
                  </a>
                ) : (
                  <div
                    key={link.title}
                    className="beko-action min-h-[5.5rem] cursor-not-allowed rounded-2xl px-3 py-3 opacity-70"
                    aria-disabled="true"
                    data-testid={`${link.testId}-unavailable`}
                  >
                    {content}
                  </div>
                );
              })
            )}
          </section>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}