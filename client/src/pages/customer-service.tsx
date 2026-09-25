import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
      title: "Service client en ligne",
      subtitle: "Assistance clientèle principale",
      description: "Service en ligne 24h/24 et 7j/7",
      url: settings?.customerService || "https://t.me/+DOnUcJs7idVmN2E0",
      testId: "link-customer-service",
    },
    {
      id: "officialChannel",
      title: "Chaîne officielle",
      subtitle: "Actualités et annonces",
      description: "Restez informé des dernières nouvelles",
      url: settings?.officialChannel || "https://t.me/+DOnUcJs7idVmN2E0",
      testId: "link-official-channel",
    },
    {
      id: "discussionGroup",
      title: "Groupe officiel",
      subtitle: "Communauté d'investisseurs",
      description: "Échangez avec d'autres membres",
      url: settings?.discussionGroup || "https://t.me/+DOnUcJs7idVmN2E0",
      testId: "link-discussion-group",
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #4ECDC4 0%, #44A08D 50%, #093637 100%)' }}>
      <div className="max-w-md mx-auto">
        <header className="flex items-center gap-4 px-4 py-4" style={{ background: 'linear-gradient(90deg, #4ECDC4 0%, #44A08D 100%)' }}>
          <button 
            onClick={() => navigate("/account")}
            className="text-white hover:text-white/80"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-white flex-1 text-center pr-5">
            Service client
          </h1>
        </header>

        <div className="relative px-4 pt-8 pb-4">
          <div 
            className="absolute top-0 left-0 right-0 h-64 bg-white"
            style={{
              borderRadius: '0 0 50% 50% / 0 0 100px 100px',
            }}
          />

          <div className="relative z-10 flex flex-col items-center">
            <div className="relative mb-4">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-teal-50 flex items-center justify-center">
                <span className="text-4xl font-bold text-teal-700" aria-hidden="true">T</span>
              </div>
              <div className="absolute -right-1 top-4 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                SUR
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-teal-500 mb-3">Accueillir</h2>
            <p className="text-center text-gray-600 text-sm leading-relaxed px-4 mb-8">
              Comment puis-je vous aider aujourd'hui ?<br />
              Veuillez cliquer sur le bouton ci-dessous pour<br />
              envoyer un message.
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
                onClick={() => window.open(link.url, "_blank")}
                className="w-full text-left rounded-xl p-4 transition-transform active:scale-98"
                style={{
                  background: 'linear-gradient(135deg, #FFD93D 0%, #FF9500 100%)',
                }}
                data-testid={link.testId}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg">{link.title}</h3>
                    <p className="text-white/90 text-sm">{link.subtitle}</p>
                    <p className="text-white/80 text-xs mt-0.5">{link.description}</p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-white flex-shrink-0" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
