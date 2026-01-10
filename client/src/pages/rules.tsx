import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Clock, Wallet, Users, ShoppingBag, Shield } from "lucide-react";

export default function RulesPage() {
  const [, navigate] = useLocation();

  const rules = [
    {
      icon: Wallet,
      title: "Dépôts",
      items: [
        "Dépôt minimum: 3 000 FCFA",
        "Les dépôts sont traités dans les 24h",
        "Utilisez les moyens de paiement disponibles dans votre pays",
      ],
    },
    {
      icon: ShoppingBag,
      title: "Investissements",
      items: [
        "6 niveaux VIP disponibles (VIP1 à VIP6)",
        "Durée fixe: 100 jours par produit",
        "Gains quotidiens automatiques crédités chaque 24h",
        "Les gains sont crédités à la même heure d'achat du produit",
      ],
    },
    {
      icon: Clock,
      title: "Retraits",
      items: [
        "Retrait minimum: 1 200 FCFA",
        "Frais de retrait: 15%",
        "Maximum 1 retrait par jour",
        "Heures: 8h-17h (9h-18h pour Cameroun/Bénin)",
        "Dépôt et produit VIP requis pour débloquer les retraits",
      ],
    },
    {
      icon: Users,
      title: "Parrainage",
      items: [
        "Niveau 1: 25% de commission",
        "Niveau 2: 2% de commission",
        "Niveau 3: 1% de commission",
        "Commissions calculées sur les achats de produits VIP",
      ],
    },
    {
      icon: Shield,
      title: "Sécurité",
      items: [
        "Ne partagez jamais votre mot de passe",
        "Utilisez un mot de passe fort",
        "Vérifiez toujours les informations avant un dépôt",
        "Contactez le service client en cas de problème",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto">
        <header className="flex items-center gap-4 p-4 bg-card border-b border-card-border">
          <Button variant="ghost" size="icon" onClick={() => navigate("/account")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Règles de la plateforme</h1>
        </header>

        <div className="p-4 space-y-4">
          <Card className="border-amber-500/30 bg-amber-500/10">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                Veuillez lire attentivement les règles ci-dessous avant d'utiliser la plateforme. 
                Le non-respect de ces règles peut entraîner la suspension de votre compte.
              </p>
            </CardContent>
          </Card>

          {rules.map((section) => (
            <Card key={section.title}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <section.icon className="h-5 w-5 text-primary" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {section.items.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
