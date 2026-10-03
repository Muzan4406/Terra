import { useLocation } from "wouter";
import { ArrowLeft, ChevronRight, Headphones } from "lucide-react";

export default function CustomerServicePage() {
  const [, navigate] = useLocation();

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
                <Headphones className="h-12 w-12 text-primary" aria-hidden="true" />
              </div>
              <div className="absolute -right-1 top-4 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                AIDE
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-primary mb-3">Comment pouvons-nous vous aider ?</h2>
            <p className="text-center text-gray-600 text-sm leading-relaxed px-4 mb-8">
              Écrivez directement à notre équipe.<br />
              Nous vous répondrons dans cette conversation.
            </p>
          </div>
        </div>

        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={() => navigate("/customer-service/chat")}
            className="flex min-h-[76px] w-full items-center gap-3 rounded-2xl bg-[#174f3d] p-4 text-left text-white shadow-md transition-colors hover:bg-[#103f30]"
            data-testid="button-open-support-chat"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
              <Headphones className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Discuter avec le service client</span>
              <span className="mt-0.5 block text-xs text-white/75">Échange direct et sécurisé avec l’équipe support</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          </button>
        </div>

      </div>
    </div>
  );
}
