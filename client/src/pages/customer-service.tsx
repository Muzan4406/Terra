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
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-200">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <defs>
                    <linearGradient id="skinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#C68642" />
                      <stop offset="100%" stopColor="#8D5524" />
                    </linearGradient>
                    <linearGradient id="hairGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2C1810" />
                      <stop offset="100%" stopColor="#1a0f0a" />
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="50" r="50" fill="#e0e0e0" />
                  <ellipse cx="50" cy="42" rx="25" ry="28" fill="url(#skinGradient)" />
                  <ellipse cx="50" cy="20" rx="28" ry="18" fill="url(#hairGradient)" />
                  <ellipse cx="50" cy="85" rx="35" ry="25" fill="#1a365d" />
                  <rect x="35" y="60" width="30" height="15" fill="white" />
                  <circle cx="42" cy="40" r="3" fill="#2C1810" />
                  <circle cx="58" cy="40" r="3" fill="#2C1810" />
                  <ellipse cx="50" cy="52" rx="4" ry="2" fill="#C68642" />
                  <path d="M44 56 Q50 60 56 56" stroke="#8B4513" strokeWidth="2" fill="none" />
                  <ellipse cx="75" cy="42" rx="12" ry="8" fill="#333" />
                  <ellipse cx="75" cy="42" rx="8" ry="5" fill="#555" />
                  <rect x="67" y="38" width="3" height="20" fill="#333" />
                </svg>
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
