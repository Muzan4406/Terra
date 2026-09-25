import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { solarImages } from "@/lib/solar-images";

interface PlatformSettings {
  customerService: string;
  officialChannel: string;
  discussionGroup: string;
}

export default function CustomerServicePage() {
  const [, navigate] = useLocation();

  const { data: settings, isLoading } = useQuery<PlatformSettings>({
    queryKey: ["/api/settings/public"],
  });

  const serviceLinks = [
    {
      id: "customerService",
      title: "Écrire au service client",
      subtitle: "Pour toute question concernant votre compte",
      description: "Service en ligne 24h/24 et 7j/7",
      url: settings?.customerService || "",
      testId: "link-customer-service",
    },
    {
      id: "officialChannel",
      title: "Chaîne officielle",
      subtitle: "Actualités et annonces",
      description: "Restez informé des dernières nouvelles",
      url: settings?.officialChannel || "",
      testId: "link-official-channel",
    },
    {
      id: "discussionGroup",
      title: "Groupe de discussion",
      subtitle: "Communauté d'investisseurs",
      description: "Échangez avec d'autres membres",
      url: settings?.discussionGroup || "",
      testId: "link-discussion-group",
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-md mx-auto">
        <header className="flex items-center gap-4 border-b border-border/70 bg-card/75 px-4 py-4 backdrop-blur-lg">
          <button 
            onClick={() => navigate("/account")}
            className="text-foreground hover:text-primary"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground flex-1 text-center pr-5">
            Service client
          </h1>
        </header>

        <div className="relative h-40 w-full overflow-hidden">
          <img src={solarImages[0].src} alt={solarImages[0].alt} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-teal-950/45 to-transparent" />
        </div>

        <div className="relative px-4 pt-8 pb-4">
          <div 
            className="absolute top-0 left-0 right-0 h-64 bg-card/75"
            style={{
              borderRadius: '0 0 50% 50% / 0 0 100px 100px',
            }}
          />

          <div className="relative z-10 flex flex-col items-center">
            <div className="relative mb-4">
              <div className="w-32 h-32 rounded-full border-4 border-card shadow-lg bg-accent/45 flex items-center justify-center">
                <span className="font-serif text-4xl font-bold text-primary" aria-hidden="true">T</span>
              </div>
              <div className="absolute -right-1 top-4 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                AIDE
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-primary mb-3">Comment pouvons-nous vous aider ?</h2>
            <p className="text-center text-gray-600 text-sm leading-relaxed px-4 mb-8">
              Choisissez le canal adapté à votre demande.<br />
              Les liens disponibles sont configurés par l’équipe Terra.
            </p>
          </div>
        </div>

        <div className="px-4 pb-8 space-y-3">
          {isLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
          ) : (
            serviceLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => link.url && window.open(link.url, "_blank", "noopener,noreferrer")}
                disabled={!link.url}
                className="w-full text-left rounded-xl border border-border/80 bg-card/85 p-4 shadow-sm transition-transform active:scale-98 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid={link.testId}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-foreground font-semibold text-lg">{link.title}</h3>
                    <p className="text-muted-foreground text-sm">{link.subtitle}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{link.url ? link.description : "Ce lien n’est pas encore configuré."}</p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-primary flex-shrink-0" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
